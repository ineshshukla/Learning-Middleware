FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /tmp/requirements.txt
RUN pip install -r /tmp/requirements.txt

COPY . /app/sme

RUN mkdir -p /app/sme/data /app/output /app/logs

EXPOSE 8002

CMD ["uvicorn", "sme.main:app", "--host", "0.0.0.0", "--port", "8002"]
