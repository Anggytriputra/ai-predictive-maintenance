# Gunakan image Python 3.12 versi ringan
FROM python:3.12-slim

# Set direktori kerja di dalam container
WORKDIR /app

# Install dependencies sistem yang mungkin dibutuhkan
RUN apt-get update && apt-get install -y gcc libpq-dev && rm -rf /var/lib/apt/lists/*

# Salin requirements file dan install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Salin seluruh kode backend
COPY . .

# Expose port untuk FastAPI
EXPOSE 3000

# Jalankan server
CMD ["python", "run.py"]
