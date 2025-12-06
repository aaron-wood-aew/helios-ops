import requests
from apscheduler.schedulers.background import BackgroundScheduler
from sqlmodel import Session, select
from datetime import datetime
from database import engine, XRayFlux, ProtonFlux, SolarWind, KpIndex, ElectronFlux, DstIndex

# NOAA JSON Endpoints (Same as frontend but used for archiving)
URL_XRAY = "https://services.swpc.noaa.gov/json/goes/primary/xrays-1-day.json"
URL_PROTON = "https://services.swpc.noaa.gov/json/goes/primary/integral-protons-1-day.json"
URL_PLASMA = "https://services.swpc.noaa.gov/products/solar-wind/plasma-6-hour.json"
URL_MAG = "https://services.swpc.noaa.gov/products/solar-wind/mag-6-hour.json"
URL_KP = "https://services.swpc.noaa.gov/json/planetary_k_index_1m.json"
URL_ELECTRON = "https://services.swpc.noaa.gov/json/goes/primary/integral-electrons-1-day.json"
URL_DST = "https://services.swpc.noaa.gov/products/kyoto-dst.json"

def fetch_and_store_xray():
    # Deprecated in favor of ingest_xray
    pass

def ingest_xray():
    # XRay format: [{"time_tag": "2023...", "energy": "0.05-0.4nm", "flux": ...}]
    try:
        resp = requests.get(URL_XRAY).json()
        grouped = {}
        for row in resp:
            t = row['time_tag']
            if t not in grouped: grouped[t] = {}
            grouped[t][row['energy']] = row['flux']
        
        with Session(engine) as session:
            for t, val in grouped.items():
                # Note: NOAA changed units/keys. 
                # 0.5-4.0A ~= 0.05-0.4nm
                if "0.05-0.4nm" in val and "0.1-0.8nm" in val:
                    dt = datetime.strptime(t, "%Y-%m-%dT%H:%M:%SZ")
                    if not session.get(XRayFlux, dt):
                        entry = XRayFlux(time_tag=dt, short_wave=val["0.05-0.4nm"], long_wave=val["0.1-0.8nm"])
                        session.add(entry)
            session.commit()
    except Exception as e:
        print(f"XRay Ingest Fail: {e}")

def ingest_proton():
    try:
        resp = requests.get(URL_PROTON).json()
        grouped = {}
        for row in resp:
            t = row['time_tag']
            if t not in grouped: grouped[t] = {}
            grouped[t][row['energy']] = row['flux']

        with Session(engine) as session:
            for t, val in grouped.items():
                if ">=10 MeV" in val and ">=100 MeV" in val:
                    dt = datetime.strptime(t, "%Y-%m-%dT%H:%M:%SZ")
                    if not session.get(ProtonFlux, dt):
                        entry = ProtonFlux(time_tag=dt, p10=val[">=10 MeV"], p100=val[">=100 MeV"])
                        session.add(entry)
            session.commit()
    except Exception as e:
        print(f"Proton Ingest Fail: {e}")

def ingest_electron():
    try:
        resp = requests.get(URL_ELECTRON).json()
        # [{"time_tag": "...", "satellite": 18, "flux": ..., "energy": ">=2 MeV"}]
        # Filter for >=2 MeV and primary satellite (usually the file provided is purely primary)
        
        with Session(engine) as session:
            for row in resp:
                if row['energy'] == ">=2 MeV":
                    dt = datetime.strptime(row['time_tag'], "%Y-%m-%dT%H:%M:%SZ")
                    if not session.get(ElectronFlux, dt):
                        entry = ElectronFlux(time_tag=dt, flux=row['flux'], energy=row['energy'])
                        session.add(entry)
            session.commit()
    except Exception as e:
        print(f"Electron Ingest Fail: {e}")

def ingest_dst():
    try:
        resp = requests.get(URL_DST).json()
        # Format: [["time_tag", "dst"], ["2023...", "-5"], ...] (Header row included)
        rows = resp[1:] # Skip header
        
        with Session(engine) as session:
            for row in rows:
                t_str = row[0] # "2025-01-01 00:00:00"
                dst_val = float(row[1])
                dt = datetime.strptime(t_str, "%Y-%m-%d %H:%M:%S")
                
                if not session.get(DstIndex, dt):
                    entry = DstIndex(time_tag=dt, dst=dst_val)
                    session.add(entry)
            session.commit()
    except Exception as e:
         print(f"Dst Ingest Fail: {e}")

def ingest_solar_wind():
    try:
        plasma_raw = requests.get(URL_PLASMA).json()
        mag_raw = requests.get(URL_MAG).json()
        
        plasma_data = {row[0]: row for row in plasma_raw[1:]} 
        
        with Session(engine) as session:
             for mag_row in mag_raw[1:]:
                t_str = mag_row[0]
                if t_str in plasma_data:
                    p_row = plasma_data[t_str]
                    # Solar wind 5-min/6-hour usually has milliseconds. 
                    # If parsing fails, try falling back to no-micros.
                    try:
                        dt = datetime.strptime(t_str, "%Y-%m-%d %H:%M:%S.%f")
                    except ValueError:
                        dt = datetime.strptime(t_str, "%Y-%m-%d %H:%M:%S")

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
                # Handle potential T separator
                t = t.replace('T', ' ')
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
    jobs = [ingest_xray, ingest_proton, ingest_electron, ingest_dst, ingest_solar_wind, ingest_kp]
    
    for job in jobs:
        scheduler.add_job(job, 'interval', minutes=5, next_run_time=datetime.now())
    
    scheduler.start()
