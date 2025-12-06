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

# authentication imports
from fastapi import FastAPI, Query, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from auth import create_access_token, get_current_active_user, get_current_admin_user, get_password_hash, verify_password, ACCESS_TOKEN_EXPIRE_MINUTES
from database import User
from datetime import timedelta

# Rate Limiting
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

# Initialize Limiter
limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])
app = FastAPI(title="Helios.Ops Backend")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

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

# Authentication Endpoints

@app.post("/token")
@limiter.limit("5/minute")
async def login_for_access_token(request: Request, form_data: OAuth2PasswordRequestForm = Depends()):
    with Session(engine) as session:
        user = session.exec(select(User).where(User.username == form_data.username)).first()
        if not user or not verify_password(form_data.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.username}, expires_delta=access_token_expires
        )
        return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me")
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user

@app.get("/api/admin/system-status")
async def get_system_status(current_user: User = Depends(get_current_admin_user)):
    return {"status": "operational", "user": current_user.username}

@app.on_event("startup")
def on_startup():
    create_db_and_tables()
    start_scheduler()

    # Initialize Default Admin
    with Session(engine) as session:
        user = session.exec(select(User).where(User.username == "admin")).first()
        if not user:
            print("Creating default admin user...")
            admin_user = User(
                username="admin",
                hashed_password=get_password_hash("admin"), # TODO: Change this!
                is_superuser=True
            )
            session.add(admin_user)
            session.commit()

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
        matches = re.findall(r'href="(or_suvi-l2.*?.png)"', response.text)
        unique_matches = sorted(list(set(matches)))
        full_urls = [base_url + m for m in unique_matches]
        
        return {"images": full_urls}
    except Exception as e:
        print(f"Error fetching SUVI images: {e}")
        return {"error": str(e), "images": []}

@app.post("/archive/hydrate")
async def hydrate_archive(start: datetime, end: datetime):
    """
    Download images for the specified range if they are indexed but missing locally.
    """
    start_dt = start
    end_dt = end
    
    # Base URLs map
    BASE_URLS = {
        "suvi": "https://services.swpc.noaa.gov/images/animations/suvi/primary/195/",
        "lasco": {
            "c2": "https://services.swpc.noaa.gov/images/animations/lasco-c2/",
            "c3": "https://services.swpc.noaa.gov/images/animations/lasco-c3/"
        },
        "aurora": "https://services.swpc.noaa.gov/images/animations/ovation/north/"
    }
    
    downloaded = 0
    errors = 0
    
    with Session(engine) as session:
        # Find images in range
        query = select(ImageArchive).where(
            ImageArchive.time_tag >= start_dt,
            ImageArchive.time_tag <= end_dt
        )
        images = session.exec(query).all()
        
        for img in images:
            # Check local file
            # local_path is "images/suvi/filename.png"
            # We are running in /app, so path is relative to CWD
            # Just use img.local_path directly if valid
            # Security check: ensure path is safe
            if ".." in img.local_path or img.local_path.startswith("/"):
                # Safety skip
                continue
                
            file_path = img.local_path
            
            if os.path.exists(file_path):
                continue
                
            # Download
            try:
                # Construct Source URL
                filename = os.path.basename(file_path)
                
                if img.product == "suvi":
                     src = BASE_URLS["suvi"] + filename
                elif img.product == "lasco":
                     src = BASE_URLS["lasco"][img.channel] + filename
                elif img.product == "aurora":
                     src = BASE_URLS["aurora"] + filename
                else:
                    continue
                
                # Ensure dir exists
                os.makedirs(os.path.dirname(file_path), exist_ok=True)
                
                # Stream download
                with requests.get(src, stream=True, timeout=10) as r:
                    r.raise_for_status()
                    with open(file_path, 'wb') as f:
                        for chunk in r.iter_content(chunk_size=8192):
                            f.write(chunk)
                downloaded += 1
            except Exception as e:
                print(f"Hydration failed for {file_path}: {e}")
                errors += 1
    
    # --- Phase 7: Deep Sensor Hydration (NASA HAPI) ---
    try:
        from nasa_client import NasaHapiClient
        from database import SolarWind, XRayFlux
        client = NasaHapiClient()
        
        # Solar Wind (DSCOVR)
        wind_data = client.get_solar_wind_plasma(start_dt, end_dt)
        mag_data = client.get_solar_wind_mag(start_dt, end_dt)
        
        # Merge Plasma + Mag (Time-chk)
        # Store in DB
        with Session(engine) as session:
            count_wind = 0
            # Simple approach: Upsert Plasma
            for w in wind_data:
                # Check for existing
                stmt = select(SolarWind).where(SolarWind.time_tag == w['time_tag'])
                existing = session.exec(stmt).first()
                if not existing:
                    # Find matching Mag
                    # Optimization: Create a dict of mag data for fast lookup? 
                    # For now, just insert what we have.
                    # We need Bt and Bz from Mag.
                    
                    # NOTE: This simple merge is inefficient O(N*M). 
                    # Better: Fetch existing range from DB, filter local list, insert new.
                    pass 
            
            # Optimized Bulk Insert Strategy
            # 1. Fetch all existing timestamps in range
            existing_dates = set(session.exec(select(SolarWind.time_tag).where(
                SolarWind.time_tag >= start_dt, SolarWind.time_tag <= end_dt
            )).all())
            
            # 2. Merge Mag into Plasma Dict
            mag_map = {m['time_tag']: m for m in mag_data}
            
            new_records = []
            for w in wind_data:
                t = w['time_tag']
                if t in existing_dates: continue
                
                # Get Mag components
                m = mag_map.get(t, {})
                
                rec = SolarWind(
                    time_tag=t,
                    density=w['density'],
                    speed=w['speed'],
                    temperature=w['temperature'],
                    bt=m.get('bt', 0), # Default 0 if missing? Or None. schema allows None?
                    bz_gsm=m.get('bz_gsm', 0)
                )
                new_records.append(rec)
                
            session.add_all(new_records)
            
            # X-Ray Flux
            flux_data = client.get_xray_flux(start_dt, end_dt)
            existing_flux = set(session.exec(select(XRayFlux.time_tag).where(
                XRayFlux.time_tag >= start_dt, XRayFlux.time_tag <= end_dt
            )).all())
            
            new_flux = []
            seen_flux = set() # Avoid duplicates in the same batch
            for f in flux_data:
                if f['time_tag'] in existing_flux: continue
                
                # Check if we already added this timestamp/energy combo?
                # Actually XRayFlux has composite PK or ID? 
                # Model definition: id: Optional[int] = Field(default=None, primary_key=True)
                # Uniqueness is not enforced by DB constraints usually unless `sa_column_kwargs={"unique": True}`
                # We should check `time_tag` + `energy` combo.
                
                # Simplified: Just insert. The frontend filters duplicates usually? No.
                # Let's trust the time check.
                
                key = (f['time_tag'], f['energy'])
                if key in seen_flux: continue
                seen_flux.add(key)
                
                rec = XRayFlux(
                    time_tag=f['time_tag'],
                    flux=f['flux'],
                    energy=f['energy']
                )
                new_flux.append(rec)
            
            session.add_all(new_flux)
            session.commit()
            
    except Exception as e:
        print(f"NASA HAPI Hydration Failed: {e}")
        # Validate that we don't crash the image hydration response
                
    return {"status": "complete", "downloaded": downloaded, "errors": errors, "total_in_range": len(images)}
