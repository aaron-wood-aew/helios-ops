import requests
import logging
from datetime import datetime, timezone
from sqlmodel import Session, select
from database import engine, create_db_and_tables, SolarWind, ProtonFlux, ElectronFlux, XRayFlux, KpIndex
from dateutil import parser
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# NOAA Data URLs (7-day files)
URL_PLASMA_7_DAY = "https://services.swpc.noaa.gov/products/solar-wind/plasma-7-day.json"
URL_MAG_7_DAY = "https://services.swpc.noaa.gov/products/solar-wind/mag-7-day.json"
URL_PROTON_7_DAY = "https://services.swpc.noaa.gov/json/goes/primary/integral-protons-7-day.json"
URL_ELECTRON_7_DAY = "https://services.swpc.noaa.gov/json/goes/primary/integral-electrons-7-day.json"
URL_XRAY_7_DAY = "https://services.swpc.noaa.gov/json/goes/primary/xrays-7-day.json"
URL_KP_7_DAY = "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json" # usually contains recent hystory

def fetch_json(url):
    try:
        resp = requests.get(url, timeout=30)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        logger.error(f"Failed to fetch {url}: {e}")
        return []

def safe_float(val):
    if val is None: return None
    try:
        return float(val)
    except:
        return None

def backfill():
    logger.info("Starting Data Backfill (7 Days)...")
    create_db_and_tables()

    with Session(engine) as session:
        # 1. Solar Wind
        logger.info("Fetching Solar Wind (7-day)...")
        plasma = fetch_json(URL_PLASMA_7_DAY)
        mag = fetch_json(URL_MAG_7_DAY)
        
        # Helpers to parse JSON lists (header row assumed for plasma/mag products)
        # Plasma: [time_tag, density, speed, temperature]
        # Mag: [time_tag, bx, by, bz, lon, lat, total]
        
        # Index data by timestamp
        data_map = {} 
        
        if plasma and isinstance(plasma, list) and len(plasma) > 1:
            headers = plasma[0]
            for row in plasma[1:]:
                try:
                    t_str = row[0]
                    t = parser.parse(t_str)
                    if t.tzinfo is None: t = t.replace(tzinfo=timezone.utc)
                    
                    data_map[t] = {
                        "time_tag": t,
                        "density": safe_float(row[1]),
                        "speed": safe_float(row[2]),
                        "temperature": safe_float(row[3]),
                        "bz": None,
                        "bt": None
                    }
                except Exception as e:
                    continue

        if mag and isinstance(mag, list) and len(mag) > 1:
            for row in mag[1:]:
                try:
                    t_str = row[0]
                    t = parser.parse(t_str)
                    if t.tzinfo is None: t = t.replace(tzinfo=timezone.utc)
                    
                    if t in data_map:
                        data_map[t]["bz"] = safe_float(row[3])
                        data_map[t]["bt"] = safe_float(row[6])
                    else:
                        # CREATE entry if missing (MAG only)
                        data_map[t] = {
                            "time_tag": t,
                            "density": None, "speed": None, "temperature": None,
                            "bz": safe_float(row[3]),
                            "bt": safe_float(row[6])
                        }
                except:
                    continue
                    
        # Batch Insert SolarWind
        logger.info(f"Inserting {len(data_map)} Solar Wind records...")
        for item in data_map.values():
            # Check existing (naive check, usually reliance on PK)
            # For backfill, we can use merge or just ignore conflicts if PK is time
            # SolarWind PK is (time_tag)
            
            # Using session.merge unfortunately selects first. 
            # Let's try direct instantiation and session.merge
            sw = SolarWind(**item)
            session.merge(sw)
        
        session.commit()
        
        # 2. X-Ray
        logger.info("Fetching X-Ray (7-day)...")
        xray_data = fetch_json(URL_XRAY_7_DAY)
        count = 0
        for x in xray_data:
            try:
                t = parser.parse(x['time_tag'])
                if t.tzinfo is None: t = t.replace(tzinfo=timezone.utc)
                
                flux_l = safe_float(x.get('flux')) # Primary
                # Note: NOAA JSON structure varies.
                # Usually: time_tag, flux, energy
                # But 'xrays-7-day.json' might be list of dicts: time_tag, energy, flux
                
                # Verify structure
                energy = x.get('energy')
                
                # Check mapping.
                # Provide defaults
                short = 0.0
                long_x = 0.0
                
                if energy == '0.05-0.4nm': short = flux_l
                if energy == '0.1-0.8nm': long_x = flux_l
                
                # This simplistic loop might overwrite rows if multiple energies share timestamp. 
                # Better: Group by timestamp first.
            except:
                pass
        
        # Re-doing X-Ray correctly:
        # Group by time
        xray_map = {}
        for x in xray_data:
            try:
                t = parser.parse(x['time_tag'])
                if t.tzinfo is None: t = t.replace(tzinfo=timezone.utc)
                if t not in xray_map: xray_map[t] = {"time_tag": t, "flux_short": None, "flux_long": None}
                
                val = safe_float(x.get('flux'))
                if x.get('energy') == '0.05-0.4nm': xray_map[t]['flux_short'] = val
                if x.get('energy') == '0.1-0.8nm': xray_map[t]['flux_long'] = val
            except: continue
            
        for item in xray_map.values():
            rec = XRayFlux(**item)
            session.merge(rec)
        session.commit()
        logger.info(f"Inserted X-Ray records.")

        # 3. Proton
        logger.info("Fetching Proton (7-day)...")
        p_data = fetch_json(URL_PROTON_7_DAY)
        p_map = {}
        for p in p_data:
            try:
                t = parser.parse(p['time_tag'])
                if t.tzinfo is None: t = t.replace(tzinfo=timezone.utc)
                if t not in p_map: p_map[t] = {"time_tag": t, "flux_10mev": None, "flux_100mev": None}
                
                val = safe_float(p.get('flux'))
                e = p.get('energy')
                if e == '>=10 MeV': p_map[t]['flux_10mev'] = val
                if e == '>=100 MeV': p_map[t]['flux_100mev'] = val
            except: continue
        for item in p_map.values():
            session.merge(ProtonFlux(**item))
        session.commit()

        # 4. Electron
        logger.info("Fetching Electron (7-day)...")
        e_data = fetch_json(URL_ELECTRON_7_DAY)
        e_map = {}
        for e in e_data:
            try:
                t = parser.parse(e['time_tag'])
                if t.tzinfo is None: t = t.replace(tzinfo=timezone.utc)
                if t not in e_map: e_map[t] = {"time_tag": t, "flux_2mev": None}
                
                val = safe_float(e.get('flux'))
                if e.get('energy') == '>=2 MeV': e_map[t]['flux_2mev'] = val
            except: continue
        for item in e_map.values():
            session.merge(ElectronFlux(**item))
        session.commit()

        # 5. Kp Index
        logger.info("Fetching Kp Index...")
        k_data = fetch_json(URL_KP_7_DAY)
        # Format: [time_tag, kp_index, ...]
        if k_data and isinstance(k_data, list) and len(k_data) > 1:
            for row in k_data[1:]:
                try:
                    t = parser.parse(row[0])
                    if t.tzinfo is None: t = t.replace(tzinfo=timezone.utc)
                    kp = safe_float(row[1])
                    if kp is not None:
                        session.merge(KpIndex(time_tag=t, kp_index=kp))
                except: continue
        session.commit()
        
        logger.info("Backfill Complete.")

if __name__ == "__main__":
    backfill()
