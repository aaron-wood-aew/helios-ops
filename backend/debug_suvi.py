import requests
import re

URL = "https://services.swpc.noaa.gov/images/animations/suvi/primary/131/"

def check_suvi():
    try:
        resp = requests.get(URL)
        print(f"Status: {resp.status_code}")
        
        # Regex for: or_suvi-l2-ci195_g19_s20251206T035200Z_e20251206T035600Z_v1-0-2.png
        # Note: Directory listings often truncate or format differently.
        # Let's print a sample of the text.
        print("Page sample (first 500 chars):")
        print(resp.text[:500])
        
        # Current Regex
        pattern = r'href="(or_suvi-l2-ci\d+_g\d+_s(\d{8}T\d{6}Z)_.*?\.png)"'
        matches = re.findall(pattern, resp.text)
        print(f"Matches found: {len(matches)}")
        if len(matches) > 0:
            print(f"First match: {matches[0]}")
    except Exception as e:
        print(f"Fail: {e}")

if __name__ == "__main__":
    check_suvi()
