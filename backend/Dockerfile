FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (for building some python packages if needed)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source
COPY . .

# Create a non-root user
RUN addgroup --system appgroup && adduser --system --group appuser

# Create directories and set permissions
RUN mkdir -p /app/data /app/images && chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose port (internal only)
EXPOSE 8000

# Run
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
