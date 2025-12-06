from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import select, Session
from database import create_db_and_tables, engine, XRayFlux, ProtonFlux, SolarWind, KpIndex, ElectronFlux, DstIndex, ImageArchive
from scheduler import start_scheduler
from datetime import datetime
from contextlib import asynccontextmanager
import requests
import re
from fastapi.staticfiles import StaticFiles
import os

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    start_scheduler()
    yield

app = FastAPI(title="Helios.Ops Backend", lifespan=lifespan)

# Ensure directory exists first or StaticFiles might complain if missing on startup
if not os.path.exists("images"):
    os.makedirs("images")
app.mount("/static/images", StaticFiles(directory="images"), name="images")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/history/images")
def get_history_images(
    product: str, 
    start: str, 
    end: str, 
    channel: str = None
):
    """
    Get list of archived images for a product/channel within time range.
    Returns: [{"time": "...", "url": "..."}]
    """
    try:
        start_dt = datetime.fromisoformat(start.replace('Z', '+00:00'))
        end_dt = datetime.fromisoformat(end.replace('Z', '+00:00'))
    except ValueError:
        return []

    with Session(engine) as session:
        query = select(ImageArchive).where(
            ImageArchive.product == product,
            ImageArchive.time_tag >= start_dt,
            ImageArchive.time_tag <= end_dt
        )
        if channel:
            query = query.where(ImageArchive.channel == channel)
        
        results = session.exec(query.order_by(ImageArchive.time_tag)).all()
        
        # Construct full URL
        # Assuming backend is on localhost:8000 for now. 
        # In a real app, use request.base_url or configured domain.
        base_url = "http://localhost:8000/static/"
        
        data = []
        for row in results:
            # local_path is like "images/suvi/..."
            # mounted at /static/images -> we want /static/images/suvi/...
            # row.local_path starts with "images/", stripping it to append to base matches mount?
            # Actually, if local_path is "images/suvi/foo.png", and mount is "images" -> "/static/images/suvi/foo.png" works if we strip the leading "images/" or if we mount root?
            
            # Let's fix pathing. 
            # If mount: app.mount("/static/images", StaticFiles(directory="images"))
            # File "images/suvi/foo.png" is accessible at "/static/images/suvi/foo.png"
            
            # row.local_path = "images/suvi/foo.png"
            # We want "http://localhost:8000" + "/static/" + "images/suvi/foo.png" 
            # -> "http://localhost:8000/static/images/suvi/foo.png"
            
            # Wait, if I mount "images" to "/static/images", then requesting "/static/images/suvi/foo.png" looks inside "images" directory for "suvi/foo.png".
            # So I need to strip the leading "images/" from row.local_path if it's there.
            
            rel_path = row.local_path
            if rel_path.startswith("images/"):
                rel_path = rel_path[7:]
            
            url = f"{base_url}images/{rel_path}"
            
            data.append({
                "time": row.time_tag.isoformat(),
                "url": url
            })
            
        return data

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
