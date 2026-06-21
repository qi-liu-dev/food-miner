FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8080

WORKDIR /app

COPY requirements.txt .

RUN python -m pip install \
    --no-cache-dir \
    --upgrade pip \
    && python -m pip install \
    --no-cache-dir \
    -r requirements.txt

COPY app ./app

RUN mkdir -p /tmp/food-miner

EXPOSE 8080

CMD [
  "sh",
  "-c",
  "python -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}"
]