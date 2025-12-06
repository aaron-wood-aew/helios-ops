from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel, create_engine, Session

class XRayFlux(SQLModel, table=True):
    time_tag: datetime = Field(primary_key=True)
    short_wave: Optional[float] = Field(default=None) # 0.5-4.0 A
    long_wave: Optional[float] = Field(default=None)  # 1.0-8.0 A

class ProtonFlux(SQLModel, table=True):
    time_tag: datetime = Field(primary_key=True)
    p10: Optional[float] = Field(default=None) # >= 10 MeV
    p100: Optional[float] = Field(default=None) # >= 100 MeV

class SolarWind(SQLModel, table=True):
    time_tag: datetime = Field(primary_key=True)
    speed: Optional[float] = Field(default=None)
    density: Optional[float] = Field(default=None)
    temperature: Optional[float] = Field(default=None)
    bz: Optional[float] = Field(default=None)
    bt: Optional[float] = Field(default=None)

class KpIndex(SQLModel, table=True):
    time_tag: datetime = Field(primary_key=True)
    kp_index: Optional[float] = Field(default=None)

class ElectronFlux(SQLModel, table=True):
    time_tag: datetime = Field(primary_key=True)
    flux: Optional[float] = Field(default=None) # > 2 MeV
    energy: Optional[str] = Field(default=None) # ">=2 MeV"

class DstIndex(SQLModel, table=True):
    time_tag: datetime = Field(primary_key=True)
    dst: Optional[float] = Field(default=None)

class ImageArchive(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    time_tag: datetime
    product: str # "suvi", "lasco", "aurora"
    channel: str # e.g. "131", "c2", "north"
    local_path: str # e.g. "images/suvi/20251206_034400_131.png"

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    hashed_password: str
    is_active: bool = Field(default=True)
    is_superuser: bool = Field(default=False)

import os

# Database Setup
sqlite_file_name = os.getenv("DB_PATH", "space_weather.db")
sqlite_url = f"sqlite:///{sqlite_file_name}"

engine = create_engine(sqlite_url, connect_args={"check_same_thread": False, "timeout": 30})

from sqlalchemy import text

# ...

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)
    with engine.connect() as connection:
        connection.execute(text("PRAGMA journal_mode=WAL;"))

def get_session():
    with Session(engine) as session:
        yield session
