import requests

URL_LASCO_C2 = "https://services.swpc.noaa.gov/products/animations/lasco-c2.json"
URL_AURORA_N = "https://services.swpc.noaa.gov/products/animations/ovation_north_24h.json"

def check_lasco():
    try:
        data = requests.get(URL_LASCO_C2).json()
        if data:
            print(f"LASCO Sample: {data[0]}")
            # Expected: { "time_tag": "...", "url": "..." } or similar
    except Exception as e:
        print(f"LASCO Fail: {e}")

def check_aurora():
    try:
        data = requests.get(URL_AURORA_N).json()
        if data:
            print(f"AURORA Sample: {data[0]}")
    except Exception as e:
        print(f"AURORA Fail: {e}")

if __name__ == "__main__":
    check_lasco()
    check_aurora()
