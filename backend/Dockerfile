FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY backend/pyproject.toml /app/
COPY backend/app /app/app
RUN pip install --no-cache-dir .
COPY backend/alembic.ini /app/
COPY backend/alembic /app/alembic
COPY config /config
ENV CONFIG_DIR=/config
EXPOSE 8000
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
