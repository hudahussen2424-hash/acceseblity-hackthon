FROM python:3.12-slim

WORKDIR /app

COPY api/requirements.txt api/requirements.txt
RUN pip install --no-cache-dir -r api/requirements.txt

COPY api api
COPY demo demo
COPY module module

CMD ["python", "-m", "api.telegram_bot"]
