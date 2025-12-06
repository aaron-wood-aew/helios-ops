from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import select, Session
from database import create_db_and_tables, engine, XRayFlux, ProtonFlux, SolarWind, KpIndex, ElectronFlux, DstIndex
from scheduler import start_scheduler
from datetime import datetime
from contextlib import asynccontextmanager
import requests
import re

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    start_scheduler()
    yield

app = FastAPI(title="Helios.Ops Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/history/xray")
def get_xray_history(start: datetime, end: datetime):
    with Session(engine) as session:
        statement = select(XRayFlux).where(XRayFlux.time_tag >= start, XRayFlux.time_tag <= end).order_by(XRayFlux.time_tag)
        results = session.exec(statement).all()
        return results

@app.get("/history/proton")
def get_proton_history(start: datetime, end: datetime):
    with Session(engine) as session:
        statement = select(ProtonFlux).where(ProtonFlux.time_tag >= start, ProtonFlux.time_tag <= end).order_by(ProtonFlux.time_tag)
        results = session.exec(statement).all()
        return results

@app.get("/history/wind")
def get_wind_history(start: datetime, end: datetime):
    with Session(engine) as session:
        statement = select(SolarWind).where(SolarWind.time_tag >= start, SolarWind.time_tag <= end).order_by(SolarWind.time_tag)
        results = session.exec(statement).all()
        return results

@app.get("/history/kp")
def get_kp_history(start: datetime, end: datetime):
    with Session(engine) as session:
        statement = select(KpIndex).where(KpIndex.time_tag >= start, KpIndex.time_tag <= end).order_by(KpIndex.time_tag)
        results = session.exec(statement).all()
        return results

@app.get("/history/electron")
def get_electron_history(start: datetime, end: datetime):
    with Session(engine) as session:
        statement = select(ElectronFlux).where(ElectronFlux.time_tag >= start, ElectronFlux.time_tag <= end).order_by(ElectronFlux.time_tag)
        results = session.exec(statement).all()
        return results

@app.get("/history/dst")
def get_dst_history(start: datetime, end: datetime):
    with Session(engine) as session:
        statement = select(DstIndex).where(DstIndex.time_tag >= start, DstIndex.time_tag <= end).order_by(DstIndex.time_tag)
        results = session.exec(statement).all()
        return results

@app.get("/api/status")
def get_archive_status():
    from sqlalchemy import func
    stats = {}
    models = {
        "xray": XRayFlux,
        "proton": ProtonFlux,
        "solar_wind": SolarWind,
        "kp": KpIndex,
        "electron": ElectronFlux,
        "dst": DstIndex
    }
    
    with Session(engine) as session:
        for name, model in models.items():
            try:
                # Get Count
                count = session.exec(select(func.count()).select_from(model)).one()
                # Get Min/Max
                min_time = session.exec(select(func.min(model.time_tag))).one()
                max_time = session.exec(select(func.max(model.time_tag))).one()
                
                stats[name] = {
                    "count": count,
                    "start": min_time,
                    "end": max_time
                }
            except Exception as e:
                stats[name] = {"error": str(e)}
                
    return stats

@app.get("/api/suvi/{channel}")
def get_suvi_images(channel: str):
    # Validate channel to prevent SSRF
    if channel not in ["131", "171", "195", "284", "304", "094"]:
        return {"error": "Invalid channel", "images": []}

    base_url = f"https://services.swpc.noaa.gov/images/animations/suvi/primary/{channel}/"
    try:
        response = requests.get(base_url, timeout=10)
        response.raise_for_status()
        
        # Regex to find .png files in the href attributes
        # Format: href="or_suvi-l2-ci195_g19_s20251205T235200Z_e20251205T235600Z_v1-0-2.png"
        matches = re.findall(r'href="(or_suvi-l2.*?.png)"', response.text)
        
        # Deduplicate and sort
        unique_matches = sorted(list(set(matches)))
        
        # Construct full URLs
        full_urls = [base_url + m for m in unique_matches]
        
        return {"images": full_urls}
    except Exception as e:
        print(f"Error fetching SUVI images: {e}")
        return {"error": str(e), "images": []}
