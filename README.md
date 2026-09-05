# 🏭 AI Predictive Maintenance System

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js_16-black?style=for-the-badge&logo=next.js&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python_3.12-3776AB?style=for-the-badge&logo=python&logoColor=white)
![TimescaleDB](https://img.shields.io/badge/TimescaleDB-FDB515?style=for-the-badge&logo=timescaledb&logoColor=black)
![Mosquitto](https://img.shields.io/badge/Mosquitto_MQTT-3C5280?style=for-the-badge&logo=eclipsemosquitto&logoColor=white)
![Scikit-Learn](https://img.shields.io/badge/Scikit_Learn-F7931E?style=for-the-badge&logo=scikit-learn&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![AWS](https://img.shields.io/badge/AWS_EC2-FF9900?style=for-the-badge&logo=amazon-aws&logoColor=white)

**Sistem monitoring IoT industri secara real-time dengan deteksi anomali berbasis Machine Learning.**  
Dibangun dengan arsitektur production-grade dan di-deploy otomatis ke AWS EC2 via GitHub Actions CI/CD.

</div>

---

## ✨ Fitur Utama

| Fitur | Deskripsi |
|-------|-----------|
| 🔴 **Real-Time Telemetry** | Stream data sensor ribuan titik per detik via **WebSocket (Socket.io)** |
| 🧠 **AI Anomaly Detection** | **IsolationForest (scikit-learn)** — deteksi otomatis anomali tanpa label (unsupervised) |
| ⚡ **Industrial IoT Messaging** | **Eclipse Mosquitto MQTT** sebagai message broker standar industri |
| 💾 **Time-Series Database** | **TimescaleDB** (PostgreSQL extension) untuk penyimpanan dan query data sensor historis |
| 📊 **Dashboard Real-Time** | Grafik live dengan **Recharts**, dark mode premium UI |
| 🗺️ **SCADA View** | Diagram alur proses industri interaktif berbasis **React Flow** |
| 🚀 **CI/CD Otomatis** | Deploy ke **AWS EC2** otomatis via **GitHub Actions** setiap push ke `main` |

---

## 🏗️ Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────────────┐
│                         AWS EC2 Server                          │
│                                                                 │
│  ┌──────────────┐    MQTT     ┌──────────────────────────────┐  │
│  │  Mosquitto   │◄───────────►│        Backend (FastAPI)     │  │
│  │  :1883       │             │  ┌─────────────────────────┐ │  │
│  └──────────────┘             │  │  IoT Simulator          │ │  │
│                               │  │  ML Analyzer (IF)       │ │  │
│  ┌──────────────┐  SQLAlchemy │  │  DB Sync (batch)        │ │  │
│  │  TimescaleDB │◄────────────│  │  Socket.io Gateway      │ │  │
│  │  :5432       │             │  └─────────────────────────┘ │  │
│  └──────────────┘             └──────────────┬───────────────┘  │
│                                              │ WebSocket         │
│                               ┌──────────────▼───────────────┐  │
│                               │      Frontend (Next.js)      │  │
│                               │  Dashboard  |  SCADA View   │  │
│                               └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Stack Teknologi

**Backend:**
- `FastAPI 0.115` — REST API + ASGI server
- `python-socketio 5.12` — WebSocket real-time ke frontend
- `paho-mqtt 2.1` — MQTT client untuk publish/subscribe sensor data
- `scikit-learn 1.6` + `pandas` + `numpy` — IsolationForest ML pipeline
- `SQLAlchemy 2.0` + `psycopg2` — ORM ke TimescaleDB
- `APScheduler 3.11` — task scheduler (simulator, DB sync, ML retrain)

**Frontend:**
- `Next.js 16.2` (webpack mode, standalone build)
- `React Flow (@xyflow/react)` — SCADA P&ID diagram interaktif
- `Recharts` — grafik sensor real-time
- `Tailwind CSS v4` — dark mode UI
- `socket.io-client` — koneksi WebSocket ke backend
- `Lucide React` — icon set

**Infrastructure:**
- `Docker Compose` — orkestrasi semua service
- `TimescaleDB` — PostgreSQL + time-series extension (port `5433`)
- `Eclipse Mosquitto` — MQTT broker (port `1883`, WebSocket `9001`)
- `AWS EC2` — production server
- `GitHub Actions` — CI/CD pipeline

---

## 📁 Struktur Project

```
ai-predictive-maintenance/
├── .github/
│   └── workflows/
│       ├── frontend-ci.yml      # CI: lint + build + Docker build test
│       ├── backend-ci.yml       # CI: Python lint & test
│       └── deploy-cd.yml        # CD: auto-deploy ke AWS EC2
│
├── backend/
│   ├── app/
│   │   ├── controllers/         # REST API endpoints (FastAPI Router)
│   │   ├── core/config.py       # Konfigurasi dari environment variables
│   │   ├── gateways/            # WebSocket gateway (Socket.io)
│   │   ├── models/              # SQLAlchemy models + DB init
│   │   └── services/            # Business logic (MQTT, ML, simulator, sync)
│   ├── Dockerfile
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── dashboard/       # Halaman Dashboard + komponen
│   │   │   └── scada/           # Halaman SCADA + custom nodes React Flow
│   │   └── components/          # Komponen shared (Navbar, MotorSymbol)
│   ├── Dockerfile
│   └── next.config.ts
│
├── mosquitto/
│   └── mosquitto.conf           # Konfigurasi MQTT broker
│
├── docker-compose.yml           # Production compose (semua service)
├── docker-compose.override.yml  # Local dev override (gitignored)
└── .env.example                 # Template environment variables
```

---

## 🚀 Menjalankan Secara Lokal

### Prasyarat

- **Node.js** v20+
- **Python** v3.12+
- **Docker Desktop**

### 1. Clone & Konfigurasi Environment

```bash
git clone https://github.com/Anggytriputra/ai-predictive-maintenance.git
cd ai-predictive-maintenance

# Buat file .env dari template
cp .env.example .env
```

Edit `.env` jika perlu (default sudah siap untuk local):
```env
DATABASE_URL=postgresql://admin:adminpassword@timescaledb:5432/predictive_maintenance
MQTT_BROKER_HOST=mosquitto
MQTT_BROKER_PORT=1883
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
```

### 2. Jalankan Semua Service (Docker)

```bash
# Jalankan semua: TimescaleDB, Mosquitto, Backend, Frontend
docker compose up -d

# Lihat log
docker compose logs -f
```

| Service | URL |
|---------|-----|
| Frontend Dashboard | http://localhost:4001 |
| Backend API | http://localhost:4000 |
| API Docs (Swagger) | http://localhost:4000/docs |
| TimescaleDB | `localhost:5433` |
| MQTT Broker | `localhost:1883` |

### 3. Menjalankan Tanpa Docker (Development)

**Backend:**
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate   # Windows
source venv/bin/activate  # Mac/Linux

pip install -r requirements.txt
python run.py
# → Berjalan di http://localhost:3000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
# → Berjalan di http://localhost:3001
```

---

## ☁️ Deployment (AWS EC2)

### Cara Kerja CI/CD

```
Push ke branch main
       │
       ├──► Frontend CI    → npm build + Docker build test
       ├──► Backend CI     → Python lint & test
       └──► Deploy CD      → SSH ke AWS → git pull → docker compose up --build
```

### Setup GitHub Secrets

Di repository GitHub → **Settings → Secrets and variables → Actions**, tambahkan:

| Secret | Nilai |
|--------|-------|
| `AWS_HOST` | IP Public EC2 (contoh: `13.251.127.127`) |
| `AWS_USERNAME` | `ubuntu` |
| `AWS_SSH_KEY` | Isi file `.pem` key EC2 |
| `NEXT_PUBLIC_SOCKET_URL` | `http://<IP_AWS>:4000` |
| `EMAIL_USERNAME` | Email untuk notifikasi gagal deploy |
| `EMAIL_PASSWORD` | App password Gmail |

### Deploy Manual ke Server

```bash
# SSH ke server
ssh -i "anggy-saputra-key.pem" ubuntu@<IP_AWS>

# Build & jalankan ulang semua service
cd ai-predictive-maintenance
git pull origin main
sudo docker compose up -d --build
```

---

## 🧠 Cara Kerja AI / ML

1. **Pengumpulan Data** — IoT Simulator menghasilkan data sensor setiap 2 detik untuk 3 motor: `Motor-HV-01`, `Motor-HV-02`, `Motor-MV-01`
2. **Deteksi Anomali** — `IsolationForest` dilatih secara unsupervised pada data normal
3. **Klasifikasi Risk** — Setiap data baru diklasifikasikan sebagai `LOW`, `WARNING`, atau `CRITICAL`
4. **Alert Real-Time** — Alert dikirim via MQTT dan WebSocket ke frontend secara instan
5. **Retraining Otomatis** — Model dilatih ulang setiap 2 menit dengan data terbaru

---

## 📡 Ports & Services

| Port | Service | Keterangan |
|------|---------|------------|
| `4001` | Frontend (Next.js) | Dashboard & SCADA |
| `4000` | Backend (FastAPI) | REST API + Socket.io |
| `5433` | TimescaleDB | PostgreSQL time-series |
| `1883` | Mosquitto MQTT | IoT messaging |
| `9001` | Mosquitto WebSocket | MQTT over WS |

---

## 👨‍💻 Author

**Anggy Tri Asaputra**  
[GitHub](https://github.com/Anggytriputra) · [Email](mailto:anggytriasaputra@gmail.com)
