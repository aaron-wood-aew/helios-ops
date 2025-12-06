# Helios.Ops Space Weather Dashboard

A single-pane-of-glass operational dashboard for monitoring Space Weather events in real-time. Features live data from NOAA SWPC, local archiving, and a historical replay system (Time Travel).

![Helios.Ops Dashboard](assets/screenshot.png)

## Technology Stack

*   **Frontend:** React 19, TypeScript, Vite, Tailwind CSS (v4), Recharts.
*   **Backend:** Python 3.11, FastAPI, SQLModel (SQLite + WAL), APScheduler.
*   **Containerization:** Docker, Docker Compose, Nginx.
*   **Data Sources:** NOAA SWPC (Live), NASA DONKI (History).

## Deployment (Docker)

The recommended way to run Helios.Ops is via Docker Compose. This ensures the database and image archives are persisted.

```bash
docker compose up --build
```

- **Frontend:** [http://localhost](http://localhost) (port 80)
- **Backend:** [http://localhost:8000](http://localhost:8000)

## Local Development

### 1. Backend Setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### 2. Frontend Setup
```bash
npm install
npm run dev
```

## Features

### 📡 Live Operations
- **Solar Imagery:** Real-time **GOES-16 SUVI** feed (131Å - 304Å) & **LASCO C2/C3**.
- **Physics Charts:**
    - **X-Ray Flux:** Solar flare monitoring.
    - **Proton Flux:** Radiation storm monitoring.
    - **Solar Wind:** Plasma Speed, Density, Temperature.
    - **IMF:** Bt/Bz Magnetic Field components.
    - **Geomagnetic:** Kp Index & Dst Index.
- **Aurora Forecast:** Hemispherical power and probability maps.

### 📼 Archive Mode (Time Travel)
- **Automatic Archiving:** The backend automatically ingests and stores data/images.
- **Replay System:** Enter "Archive Mode" to replay historical events using locally stored data.
- **Inventory:** Visualize data coverage and gaps.

## Data Science
See [USER_GUIDE.md](USER_GUIDE.md) for a detailed explanation of the scientific data points and their operational significance.
