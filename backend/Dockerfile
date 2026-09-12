# Gunakan image Python 3.12 versi ringan
FROM python:3.12-slim

WORKDIR /app

# Install dependencies sistem
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Salin requirements file terlebih dahulu (layer ini di-cache oleh Docker)
# Layer ini hanya rebuild ulang jika requirements.txt berubah
COPY requirements.txt .

# Install Python packages menggunakan mirror PyPI Indonesia (Cendana/Badan Siber)
# Jauh lebih cepat daripada download langsung dari files.pythonhosted.org
RUN pip install \
    --index-url https://pypi.org/simple/ \
    --extra-index-url https://pypi.python.org/simple/ \
    --timeout 300 \
    --retries 5 \
    -r requirements.txt

# Salin seluruh kode backend
COPY . .

EXPOSE 3000

CMD ["python", "run.py"]
