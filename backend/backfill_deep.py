import requests
import logging
import os
import re
from datetime import datetime, timezone, timedelta
from sqlmodel import Session, select
from database import engine, create_db_and_tables, KpIndex, ImageArchive

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# URLs
URL_KP_DAILY = "https://services.swpc.noaa.gov/text/daily-geomagnetic-indices.txt"
# This file contains 3-hourly Kp for the current quarter or year.
# Format: YYYY MM DD   Kp0-3 Kp3-6 ...
# We need to check if there are quarterly archives.
# Usually: https://services.swpc.noaa.gov/text/daily_geomag_indices_2024.txt ?
# Let's start with the current file.

URL_SUVI_195 = "https://services.swpc.noaa.gov/images/animations/suvi/primary/195/"
URL_LASCO_C2 = "https://services.swpc.noaa.gov/images/animations/lasco-c2/"
URL_LASCO_C3 = "https://services.swpc.noaa.gov/images/animations/lasco-c3/"
URL_AURORA_N = "https://services.swpc.noaa.gov/images/animations/ovation/north/"

def ingest_kp_history():
    logger.info("Fetching Kp History...")
    try:
        resp = requests.get(URL_KP_DAILY)
        lines = resp.text.splitlines()
        
        with Session(engine) as session:
            count = 0
            for line in lines:
                if line.startswith('#') or not line.strip(): continue
                
                # Format (example): 
                # 2025 12 06    2  3  2  3  4  3  2  2
                parts = line.split()
                if len(parts) < 11: continue # Year Month Day + 8 Kp values + other stats
                
                try:
                    year, month, day = int(parts[0]), int(parts[1]), int(parts[2])
                    date_base = datetime(year, month, day, tzinfo=timezone.utc)
                    
                    # 8 values for 3-hour intervals: 00-03, 03-06, ...
                    kp_values = parts[3:11]
                    
                    for i, kp_str in enumerate(kp_values):
                        # Kp is integer in this file usually, unless -1
                        kp = float(kp_str)
                        if kp < 0: continue
                        
                        time_tag = date_base + timedelta(hours=3*i)
                        
                        # Use merge to deduplicate
                        rec = KpIndex(time_tag=time_tag, kp_index=kp, estimated_kp=kp)
                        session.merge(rec)
                        count += 1
                except Exception as e:
                    continue
            
            session.commit()
            logger.info(f"Ingested {count} Kp records.")
    except Exception as e:
        logger.error(f"Kp Ingest failed: {e}")

def fetch_links(base_url, pattern):
    try:
        resp = requests.get(base_url, timeout=30)
        return sorted(list(set(re.findall(pattern, resp.text))))
    except Exception as e:
        logger.error(f"Error fetching {base_url}: {e}")
        return []

def index_images(product, channel, url, regex):
    logger.info(f"Indexing {product} {channel}...")
    files = fetch_links(url, regex)
    if not files: return
    
    with Session(engine) as session:
        count = 0
        for filename in files:
            try:
                ts = datetime.now(timezone.utc) # fallback
                if product == 'suvi':
                    # or_suvi-l2-ci195_g19_s20251206T172000Z...
                    m = re.search(r's(\d{8}T\d{6}Z)', filename)
                    if m: ts = datetime.strptime(m.group(1), "%Y%m%dT%H%M%SZ").replace(tzinfo=timezone.utc)
                elif product == 'lasco':
                    # 20251206_171200_lasc2.png
                    m = re.search(r'(\d{8}_\d{4})', filename)
                    if m: ts = datetime.strptime(m.group(1), "%Y%m%d_%H%M").replace(tzinfo=timezone.utc)
                elif product == 'aurora':
                    # aurora_N_2025-12-06_1720.jpg
                    m = re.search(r'(\d{4}-\d{2}-\d{2}_\d{2}\d{2})', filename)
                    if m: ts = datetime.strptime(m.group(1), "%Y-%m-%d_%H%M").replace(tzinfo=timezone.utc)
                
                # Check DB
                rel_path = f"images/{product}/{filename}"
                existing = session.query(ImageArchive).filter(ImageArchive.local_path == rel_path).first()
                if not existing:
                    ia = ImageArchive(
                        time_tag=ts,
                        product=product,
                        channel=channel,
                        local_path=rel_path
                    )
                    session.add(ia)
                    count += 1
            except Exception as e:
                logger.error(f"Failed to index {filename}: {e}")
                continue
        try:
            session.commit()
            logger.info(f"Indexed {count} images for {product}.")
        except Exception as e:
            logger.error(f"Commit failed for {product}: {e}")

def run():
    create_db_and_tables()
    ingest_kp_history()
    
    # Image Indexing (Live Sources)
    # Regex: Look for filenames ending in .png or .jpg, specific to product
    # Note: LASCO is .jpg on the server (e.g. 20251205_1800_c2_512.jpg)
    index_images("suvi", "195", URL_SUVI_195, r'or_suvi-l2-ci195[^"]+\.png')
    index_images("lasco", "c2", URL_LASCO_C2, r'\d{8}_\d{4}_c2_512\.jpg') 
    index_images("lasco", "c3", URL_LASCO_C3, r'\d{8}_\d{4}_c3_512\.jpg')
    index_images("aurora", "north", URL_AURORA_N, r'aurora_N_[^"]+\.jpg')

if __name__ == "__main__":
    run()
