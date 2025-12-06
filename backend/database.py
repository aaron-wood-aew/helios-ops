from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel, create_engine, Session

class XRayFlux(SQLModel, table=True):
    time_tag: datetime = Field(primary_key=True)
    short_wave: float # 0.5-4.0 A
    long_wave: float  # 1.0-8.0 A

class ProtonFlux(SQLModel, table=True):
    time_tag: datetime = Field(primary_key=True)
    p10: float # >= 10 MeV
    p100: float # >= 100 MeV

class SolarWind(SQLModel, table=True):
    time_tag: datetime = Field(primary_key=True)
    speed: float
    density: float
    temperature: float
    bz: float
    bt: float

class KpIndex(SQLModel, table=True):
    time_tag: datetime = Field(primary_key=True)
    kp_index: float

class ElectronFlux(SQLModel, table=True):
    time_tag: datetime = Field(primary_key=True)
    flux: float # > 2 MeV
    energy: str # ">=2 MeV"

class DstIndex(SQLModel, table=True):
    time_tag: datetime = Field(primary_key=True)
    dst: float

# Database Setup
sqlite_file_name = "space_weather.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"

engine = create_engine(sqlite_url)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
