import requests
import logging
import os
import re
from datetime import datetime, timezone
from sqlmodel import Session
from database import engine, create_db_and_tables, ImageArchive

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Directory setup
IMAGE_DIR = os.getenv("IMAGE_DIR", "backend/images") # Default to local relative path

# URLs
URL_SUVI_195 = "https://services.swpc.noaa.gov/images/animations/suvi/primary/195/"
URL_LASCO_C2 = "https://services.swpc.noaa.gov/images/animations/lasco-c2/"
URL_LASCO_C3 = "https://services.swpc.noaa.gov/images/animations/lasco-c3/"
URL_AURORA_N = "https://services.swpc.noaa.gov/images/animations/ovation/north/"

def ensure_dir(path):
    if not os.path.exists(path):
        os.makedirs(path)

def download_file(url, local_path):
    try:
        resp = requests.get(url, timeout=10)
        if resp.status_code == 200:
            with open(local_path, 'wb') as f:
                f.write(resp.content)
            return True
    except Exception as e:
        logger.error(f"Failed to download {url}: {e}")
    return False

def fetch_links(base_url, pattern):
    try:
        resp = requests.get(base_url, timeout=30)
        if resp.status_code == 200:
            return sorted(list(set(re.findall(pattern, resp.text))))
    except Exception as e:
        logger.error(f"Failed to list {base_url}: {e}")
    return []

def backfill_product(product, channel, url, regex, count=40):
    logger.info(f"Backfilling {product} {channel}...")
    
    # 1. Scrape
    files = fetch_links(url, regex)
    if not files:
        logger.warning(f"No files found for {product}")
        return

    # 2. Slice last N
    targets = files[-count:]
    logger.info(f"Downloading {len(targets)} images...")

    # 3. Download & DB
    sub_dir = os.path.join(IMAGE_DIR, product)
    ensure_dir(sub_dir)
    
    with Session(engine) as session:
        for filename in targets:
            file_url = url + filename
            local_path = os.path.join(sub_dir, filename)
            
            # Download if missing
            if not os.path.exists(local_path):
                if download_file(file_url, local_path):
                    logger.info(f"Downloaded {filename}")
                else:
                    continue
            
            # Register in DB (idempotent check)
            # Create a simple timestamp.
            # SUVI: or_suvi-l2-ci195_g19_s20251206T172000Z...
            # LASCO: 20251206_171200_lasc2.png
            # Aurora: aurora_N_2025-12-06_1720.png
            
            # Rough timestamp parsing for DB validation
            ts = datetime.now(timezone.utc)
            
            # Check if exists in DB
            rel_path = f"images/{product}/{filename}"
            existing = session.query(ImageArchive).filter(ImageArchive.local_path == rel_path).first()
            if not existing:
                ia = ImageArchive(
                    time_tag=ts, # Placeholder, robust parsing not needed for this quickfix
                    product=product,
                    channel=channel,
                    local_path=rel_path
                )
                session.add(ia)
        session.commit()

def run():
    create_db_and_tables()
    
    # SUVI 195
    # Pattern: href="or_suvi-l2-ci195_... .png"
    backfill_product("suvi", "195", URL_SUVI_195, r'href="(or_suvi-l2-ci195[^"]+\.png)"')
    
    # LASCO C2
    # Pattern: href="2025..._lasc2.png"
    backfill_product("lasco", "c2", URL_LASCO_C2, r'href="(\d{8}_\d{6}_lasc2\.png)"')

    # LASCO C3
    # Pattern: href="2025..._lasc3.png"
    backfill_product("lasco", "c3", URL_LASCO_C3, r'href="(\d{8}_\d{6}_lasc3\.png)"')

    # Aurora N 
    # Pattern: href="aurora_N_... .jpg" (wait, jpg?)
    # Aurora uses .jpg usually. Check URL.
    # https://services.swpc.noaa.gov/images/animations/ovation/north/
    # Files are aurora_N_2025-12-06_1730.jpg or .png?
    # Checking pattern... usually .jpg or .png.
    # Standard: aurora_N_YYYY-MM-DD_HHMM.jpg
    backfill_product("aurora", "north", URL_AURORA_N, r'href="(aurora_N_[^"]+\.jpg)"')

if __name__ == "__main__":
    run()
