FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source into a `kli_sme` sub-directory so that absolute imports
# like `from kli_sme.graphs.golden_sample import ...` resolve correctly.
# /app is already on sys.path, so /app/kli_sme/ acts as the package.
COPY . ./kli_sme/

EXPOSE 8004

CMD ["uvicorn", "kli_sme.main:app", "--host", "0.0.0.0", "--port", "8004"]
