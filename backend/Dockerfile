FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    gosu \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source
COPY . .

# Create a non-root user
RUN addgroup --system appgroup && adduser --system --group appuser

# Create directories and set base permissions (ownership will be fixed by entrypoint)
RUN mkdir -p /app/data /app/images && chown -R appuser:appgroup /app

# Setup Entrypoint
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Expose port (internal only)
EXPOSE 8000

# Use Entrypoint to handle permissions and user switching
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
