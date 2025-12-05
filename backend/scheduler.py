import requests
from apscheduler.schedulers.background import BackgroundScheduler
from sqlmodel import Session, select
from datetime import datetime
from database import engine, XRayFlux, ProtonFlux, SolarWind, KpIndex

# NOAA JSON Endpoints (Same as frontend but used for archiving)
URL_XRAY = "https://services.swpc.noaa.gov/json/goes/primary/xrays-1-day.json"
URL_PROTON = "https://services.swpc.noaa.gov/json/goes/primary/integral-protons-1-day.json"
URL_PLASMA = "https://services.swpc.noaa.gov/products/solar-wind/plasma-5-minute.json"
URL_MAG = "https://services.swpc.noaa.gov/products/solar-wind/mag-5-minute.json"
URL_KP = "https://services.swpc.noaa.gov/json/planetary_k_index_1m.json"

def fetch_and_store_xray():
    try:
        data = requests.get(URL_XRAY).json()
        with Session(engine) as session:
            for item in data:
                # Deduplicate: simple check or insert on conflict ignore (sqlite specific)
                # For simplicity in this script, we'll check existence of last item or rely on PK
                dt = datetime.strptime(item['time_tag'], "%Y-%m-%dT%H:%M:%SZ")
                short = item['flux'] # Structure varies, wait. Xray json is list of objects?
                # Actually Xray JSON structure: [{"time_tag":..., "energy": "0.5-4.0A", "flux": 1e-6}, ...]
                # It separates short/long into different rows. We need to pivot or store differently.
                # Let's verify structure first. If it's separated, our model `short_wave` & `long_wave` needs careful handling.
                pass 
                # Implementing simple overwrite for now
    except Exception as e:
        print(f"Error fetching XRay: {e}")

# REVISED STRATEGY: 
# The NOAA JSONs often have 1-day of data. We don't want to re-insert everything every 5 mins.
# We should only insert NEW timestamps.

def ingest_xray():
    # XRay format: [{"time_tag": "2023...", "energy": "0.5-4.0A", "flux": ...}]
    try:
        resp = requests.get(URL_XRAY).json()
        # Group by timestamp
        grouped = {}
        for row in resp:
            t = row['time_tag']
            if t not in grouped: grouped[t] = {}
            grouped[t][row['energy']] = row['flux']
        
        with Session(engine) as session:
            for t, val in grouped.items():
                if "0.5-4.0A" in val and "1.0-8.0A" in val:
                    dt = datetime.strptime(t, "%Y-%m-%dT%H:%M:%SZ")
                    # Check if exists
                    if not session.get(XRayFlux, dt):
                        entry = XRayFlux(time_tag=dt, short_wave=val["0.5-4.0A"], long_wave=val["1.0-8.0A"])
                        session.add(entry)
            session.commit()
    except Exception as e:
        print(f"XRay Ingest Fail: {e}")

def ingest_proton():
    try:
        resp = requests.get(URL_PROTON).json()
        # Format: [{"time_tag":..., "energy": ">=10MeV", "flux":...}]
        grouped = {}
        for row in resp:
            t = row['time_tag']
            if t not in grouped: grouped[t] = {}
            grouped[t][row['energy']] = row['flux']

        with Session(engine) as session:
            for t, val in grouped.items():
                if ">=10MeV" in val and ">=100MeV" in val:
                    dt = datetime.strptime(t, "%Y-%m-%dT%H:%M:%SZ")
                    if not session.get(ProtonFlux, dt):
                        entry = ProtonFlux(time_tag=dt, p10=val[">=10MeV"], p100=val[">=100MeV"])
                        session.add(entry)
            session.commit()
    except Exception as e:
        print(f"Proton Ingest Fail: {e}")

def ingest_solar_wind():
    # Plasma: [time, density, speed, temp] (Skip header)
    # Mag: [time, bx, by, bz, lon, lat, bt]
    try:
        plasma_raw = requests.get(URL_PLASMA).json()
        mag_raw = requests.get(URL_MAG).json()
        
        # Convert to dict for easy lookup by time
        plasma_data = {row[0]: row for row in plasma_raw[1:]} # row: [time, den, spd, temp]
        
        with Session(engine) as session:
             for mag_row in mag_raw[1:]: # [time, bx, by, bz, lon, lat, bt]
                t_str = mag_row[0]
                if t_str in plasma_data:
                    p_row = plasma_data[t_str]
                    dt = datetime.strptime(t_str, "%Y-%m-%d %H:%M:%S.%f")
                    if not session.get(SolarWind, dt):
                        entry = SolarWind(
                            time_tag=dt,
                            speed=float(p_row[2]),
                            density=float(p_row[1]),
                            temperature=float(p_row[3]),
                            bz=float(mag_row[3]),
                            bt=float(mag_row[6])
                        )
                        session.add(entry)
             session.commit()
    except Exception as e:
         print(f"Wind Ingest Fail: {e}")

def ingest_kp():
    try:
        resp = requests.get(URL_KP).json()
        with Session(engine) as session:
            for row in resp:
                t = row['time_tag']
                dt = datetime.strptime(t, "%Y-%m-%d %H:%M:%S")
                if not session.get(KpIndex, dt):
                    entry = KpIndex(time_tag=dt, kp_index=float(row['kp_index']))
                    session.add(entry)
            session.commit()
    except Exception as e:
        print(f"Kp Ingest Fail: {e}")


def start_scheduler():
    scheduler = BackgroundScheduler()
    # Run immediately on startup
    scheduler.add_job(ingest_xray, 'interval', minutes=5, next_run_time=datetime.now())
    scheduler.add_job(ingest_proton, 'interval', minutes=5, next_run_time=datetime.now())
    scheduler.add_job(ingest_solar_wind, 'interval', minutes=5, next_run_time=datetime.now())
    scheduler.add_job(ingest_kp, 'interval', minutes=5, next_run_time=datetime.now())
    scheduler.start()
