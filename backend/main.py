from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import select, Session
from database import create_db_and_tables, engine, XRayFlux, ProtonFlux, SolarWind, KpIndex
from scheduler import start_scheduler
from datetime import datetime
from contextlib import asynccontextmanager

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
