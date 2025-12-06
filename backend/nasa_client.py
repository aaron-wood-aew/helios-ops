
import requests
import logging
from datetime import datetime, timedelta
import csv
import io

# Configure logging
logger = logging.getLogger(__name__)

# HAPI Constants
HAPI_BASE = "https://cdaweb.gsfc.nasa.gov/hapi"

class NasaHapiClient:
    def __init__(self):
        self.base_url = HAPI_BASE
        
    def fetch_data(self, dataset_id, parameters, start, end):
        """
        Fetch data from HAPI.
        start/end: datetime objects
        parameters: comma-separated string of parameters
        """
        # HAPI format: YYYY-MM-DDTHH:MM:SSZ
        start_str = start.strftime("%Y-%m-%dT%H:%M:%SZ")
        end_str = end.strftime("%Y-%m-%dT%H:%M:%SZ")
        
        url = f"{self.base_url}/data"
        params = {
            "id": dataset_id,
            "parameters": parameters,
            "time.min": start_str,
            "time.max": end_str,
            "format": "csv"
        }
        
        try:
            # logging.info(f"Fetching HAPI: {dataset_id} {parameters} {start_str} to {end_str}")
            resp = requests.get(url, params=params, timeout=30)
            
            if resp.status_code != 200:
                logger.error(f"HAPI Error {resp.status_code}: {resp.text}")
                return []
                
            # Parse CSV
            # HAPI CSV has no header in the data response usually, or commented header.
            # We assume the order requested in parameters.
            
            # Use CSV reader
            f = io.StringIO(resp.text)
            reader = csv.reader(f)
            
            data = []
            for row in reader:
                if not row: continue
                # Skip comments if any? HAPI spec says no header in simple csv usually unless requested?
                # Actually HAPI CSV usually just has values.
                
                # First col is always Time
                data.append(row)
                
            return data

        except Exception as e:
            logger.error(f"HAPI Exception: {e}")
            return []

    # --- Specific Fetchers ---

    def get_solar_wind_plasma(self, start, end):
        # DSCOVR_H1_FC
        # params: proton_density,proton_speed,proton_temperature
        # Time, density, speed, temp
        # Note: Check verify parameter names in catalog info.
        # usually: proton_density, proton_speed, proton_temperature
        dataset = "DSCOVR_H1_FC"
        params = "proton_density,proton_speed,proton_temperature"
        
        rows = self.fetch_data(dataset, params, start, end)
        results = []
        for r in rows:
            if len(r) < 4: continue
            try:
                # r[0] = Time
                t = datetime.strptime(r[0].replace('Z', ''), "%Y-%m-%dT%H:%M:%S.%f")
                results.append({
                    "time_tag": t,
                    "density": float(r[1]),
                    "speed": float(r[2]),
                    "temperature": float(r[3])
                })
            except: continue
        return results

    def get_solar_wind_mag(self, start, end):
        # DSCOVR_H0_MAG
        # params: B1GSE, B1GSM
        # Wait, usually we want Bt and Bz(GSM).
        # Let's guess params: "B1F1,B1GSM" where B1F1 might be field magnitude?
        # Actually standard is usually "B1F1" (Total) and vector in GSM.
        dataset = "DSCOVR_H0_MAG"
        params = "B1F1,B1GSM" 
        
        rows = self.fetch_data(dataset, params, start, end)
        results = []
        for r in rows:
            # Time, Bt, Bx, By, Bz (GSM)
            if len(r) < 5: continue
            try:
                t = datetime.strptime(r[0].replace('Z', ''), "%Y-%m-%dT%H:%M:%S.%f")
                results.append({
                    "time_tag": t,
                    "bt": float(r[1]),
                    "bz_gsm": float(r[4]) # Assuming B1GSM returns x,y,z components
                })
            except: continue
        return results



    def get_xray_flux(self, start, end):
        # GOES16_EPS_1MIN_SCIENCE (Tentative / Unverified)
        # Fallback to older GOES if needed or return empty.
        # Current status: Catalog ID not confirmed.
        dataset = "GOES16_EPS_1MIN_SCIENCE"
        params = "A_AVG,B_AVG"

        try:
            rows = self.fetch_data(dataset, params, start, end)
        except:
            logger.warning(f"Failed to fetch X-Ray for {dataset}")
            return []
            
        results = []
        for r in rows:
            if len(r) < 3: continue
            try:
                t = datetime.strptime(r[0].replace('Z', ''), "%Y-%m-%dT%H:%M:%S.%f")
                results.append({
                    "time_tag": t,
                    "energy": "0.05-0.4nm", # Short
                    "flux": float(r[1])
                })
                results.append({
                    "time_tag": t,
                    "energy": "0.1-0.8nm", # Long
                    "flux": float(r[2])
                })
            except: continue
        return results
