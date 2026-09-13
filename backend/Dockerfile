# Multi-stage Python 3.12 slim base image
FROM python:3.12-slim

WORKDIR /app

# Install system runtime dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency requirements first to leverage Docker layer caching
COPY requirements.txt .

# Install Python packages with timeout and retry resilience
RUN pip install \
    --index-url https://pypi.org/simple/ \
    --extra-index-url https://pypi.python.org/simple/ \
    --timeout 300 \
    --retries 5 \
    -r requirements.txt

# Copy application source code
COPY . .

EXPOSE 3000

CMD ["python", "run.py"]
