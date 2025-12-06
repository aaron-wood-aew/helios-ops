import requests
from datetime import datetime

URL_XRAY = "https://services.swpc.noaa.gov/json/goes/primary/xrays-1-day.json"
URL_PROTON = "https://services.swpc.noaa.gov/json/goes/primary/integral-protons-1-day.json"
URL_PLASMA = "https://services.swpc.noaa.gov/products/solar-wind/plasma-5-minute.json"
URL_MAG = "https://services.swpc.noaa.gov/products/solar-wind/mag-5-minute.json"

def check_xray():
    try:
        data = requests.get(URL_XRAY).json()
        grouped = {}
        for row in data:
            t = row['time_tag']
            if t not in grouped: grouped[t] = {}
            grouped[t][row['energy']] = row['flux']
        
        # Check first item keys
        if grouped:
            first_t = list(grouped.keys())[0]
            print(f"XRAY Keys for {first_t}: {list(grouped[first_t].keys())}")
    except Exception as e:
        print(f"XRAY Fail: {e}")

def check_proton():
    try:
        data = requests.get(URL_PROTON).json()
        grouped = {}
        for row in data:
            t = row['time_tag']
            if t not in grouped: grouped[t] = {}
            grouped[t][row['energy']] = row['flux']

        if grouped:
            first_t = list(grouped.keys())[0]
            print(f"PROTON Keys for {first_t}: {list(grouped[first_t].keys())}")
    except Exception as e:
        print(f"PROTON Fail: {e}")

def check_wind():
    URL_PLASMA_6H = "https://services.swpc.noaa.gov/products/solar-wind/plasma-6-hour.json"
    URL_MAG_6H = "https://services.swpc.noaa.gov/products/solar-wind/mag-6-hour.json"
    
    try:
        plasma = requests.get(URL_PLASMA_6H).json()
        print(f"Plasma 6H Row Count: {len(plasma)}")
        
        mag = requests.get(URL_MAG_6H).json()
        print(f"Mag 6H Row Count: {len(mag)}")
        
    except Exception as e:
        print(f"WIND 6H Fail: {e}")

if __name__ == "__main__":
    check_xray()
    check_proton()
    check_wind()
