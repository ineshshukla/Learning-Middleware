# SME Service Dockerfile
# Using PyTorch base image to match torch==2.8.0 in requirements.txt
FROM pytorch/pytorch:2.8.0-cuda12.8-cudnn9-runtime

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
# PyTorch is already installed in base image, other dependencies will be added
COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --no-cache-dir --break-system-packages -r requirements.txt

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p outputs data

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the application
CMD ["python", "-m", "uvicorn", "apiserver:app", "--host", "0.0.0.0", "--port", "8000"]
