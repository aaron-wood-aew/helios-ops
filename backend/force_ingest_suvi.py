from scheduler import ingest_suvi
import time

print("Starting SUVI Ingest...")
start = time.time()
ingest_suvi()
print(f"Finished SUVI Ingest in {time.time() - start:.2f}s")
