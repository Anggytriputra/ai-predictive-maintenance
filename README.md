# 🏭 AI Predictive Maintenance Dashboard

> Real-time IoT monitoring platform with **physics-based motor degradation simulation** and **ML-powered anomaly detection** for industrial electric motors (High Voltage & Medium Voltage).

![Dashboard Screenshot](./screenshot.png)

---

## ⚡ Key Features

### 🔬 Realistic Motor Physics Simulation
Unlike simple random-data simulators, this system models real industrial motor behavior:

- **Thermal Model** — Temperature follows Newton's Law of Cooling: rises under load toward phase-dependent targets, decays exponentially when stopped
- **Bearing Degradation** — Vibration follows ISO 10816 severity standards with progressive wear patterns (bathtub curve)
- **3-Phase Electrical** — Current imbalance grows with degradation (1%→20%), load-dependent current draw, neutral current as ground fault indicator
- **Startup Inrush Transient** — 6-8x rated current spike for 10 seconds on motor start, with realistic voltage sag
- **Degradation Lifecycle** — Each motor independently progresses through 5 phases:

```
HEALTHY (15min) → DEGRADING (10min) → WARNING (5min) → CRITICAL (2min) → FAILURE (1min) → auto-reset
```

### 🤖 AI/ML Anomaly Detection
- **IsolationForest** unsupervised model trained on real-time sensor data
- **5 engineered features**: temperature, vibration, current imbalance, voltage imbalance, neutral current
- **Dual-mode detection**: ML prediction when trained, threshold fallback during cold start
- **Auto-retraining** every 2 minutes with accumulated data
- **Confidence scoring** with risk classification: `LOW` → `WARNING` → `CRITICAL`

### 📊 Real-Time Dashboard
- Live sensor charts with 20-point sliding window (Recharts)
- 3-phase electrical analytics grid (Current R/S/T, Voltage R/S/T)
- Bearing health percentage gauge
- Degradation phase badge per motor
- Anomaly alert banners with AI confidence scores

### 🏗️ Interactive SCADA P&ID View
- ISA-standard process diagram built with React Flow
- Live motor, pump, valve, and reactor nodes with real-time sensor overlay
- Animated flow lines that stop when motors are shut down
- Motor start/stop control (simulates SCADA HMI operator interface)

### 🔧 Industrial IoT Architecture
- **MQTT (Mosquitto)** — IoT-standard messaging protocol for sensor data pub/sub
- **TimescaleDB** — PostgreSQL with time-series hypertable for efficient historical storage
- **Socket.io** — Real-time WebSocket bridge from backend to frontend
- **Batch Sync** — Periodic buffer flush from MQTT stream to database (decoupled writes)

---

## 🏛️ Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                    Docker Compose Environment                        │
│                                                                      │
│  ┌──────────────────┐     ┌──────────────────────────────────────┐  │
│  │  Mosquitto MQTT   │     │  Backend (FastAPI + Python)          │  │
│  │  Broker :1883     │◄───►│                                      │  │
│  └──────────────────┘     │  ┌─────────────┐ ┌────────────────┐  │  │
│                            │  │ IoT Physics  │ │ ML Engine      │  │  │
│  ┌──────────────────┐     │  │ Simulator    │ │ IsolationForest│  │  │
│  │  TimescaleDB      │◄───│  └─────────────┘ └────────────────┘  │  │
│  │  :5432            │     │                                      │  │
│  └──────────────────┘     │  ┌─────────────────────────────────┐ │  │
│                            │  │ Socket.io Gateway               │ │  │
│                            │  └──────────────┬──────────────────┘ │  │
│                            └─────────────────┼───────────────────┘  │
│                                              │ WebSocket             │
│                            ┌─────────────────▼──────────────────┐   │
│                            │  Frontend (Next.js)                 │   │
│                            │  Dashboard  |  SCADA P&ID View      │   │
│                            └─────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 🔩 Motor Simulation Details

### Degradation Phases & Sensor Behavior

| Phase | Duration | Temperature | Vibration (ISO 10816) | Current Imbalance | Bearing Health |
|-------|----------|-------------|----------------------|-------------------|----------------|
| **HEALTHY** | ~15 min | 68–72°C | 0.8–1.5 mm/s (Good) | 1% (normal) | 100–87% |
| **DEGRADING** | ~10 min | 73–78°C | 1.5–3.2 mm/s (Acceptable) | 3% (subtle) | 87–57% |
| **WARNING** | ~5 min | 80–86°C | 3.2–6.5 mm/s (Alert) | 6% (noticeable) | 57–12% |
| **CRITICAL** | ~2 min | 88–95°C | 6.5–11.0 mm/s (Danger) | 12% (serious) | 12–2% |
| **FAILURE** | ~1 min | 98–105°C | 11.0–18.0 mm/s (Failure) | 20% (severe) | <2% |

### Startup Inrush Transient
When a motor is started from stopped state:
- **Current** spikes to 6-8x rated (e.g., 50A → 375A) for ~10 seconds
- **Voltage** sags by ~8% during inrush (grid loading effect)
- After 10 seconds, settles to steady-state values

### Sensor Data Output Format
```json
{
  "motorId": "Motor-HV-01",
  "timestamp": "2026-09-11T15:30:00Z",
  "running": true,
  "temperature": 78.34,
  "vibration": 2.87,
  "bearingHealth": 72.5,
  "phase": "DEGRADING",
  "currentR": 53.21,
  "currentS": 51.89,
  "currentT": 52.45,
  "currentN": 2.13,
  "voltageR": 11023.45,
  "voltageS": 11067.12,
  "voltageT": 11045.78
}
```

---

## 🛠️ Technology Stack

**Backend:**
- `FastAPI 0.115` — REST API + ASGI server
- `python-socketio 5.12` — Real-time WebSocket to frontend
- `paho-mqtt 2.1` — MQTT client for sensor data publish/subscribe
- `scikit-learn 1.6` + `pandas` + `numpy` — IsolationForest ML pipeline
- `SQLAlchemy 2.0` + `psycopg2` — ORM for TimescaleDB
- `APScheduler 3.11` — Task scheduler (simulator, DB sync, ML retrain)

**Frontend:**
- `Next.js 16.2` (webpack mode, standalone build)
- `React Flow (@xyflow/react)` — Interactive SCADA P&ID diagram
- `Recharts` — Real-time sensor charts
- `Tailwind CSS v4` — Dark mode premium UI
- `socket.io-client` — WebSocket connection to backend
- `Lucide React` — Icon library

**Infrastructure:**
- `Docker Compose` — Multi-service orchestration
- `TimescaleDB` — PostgreSQL + time-series extension (port `5433`)
- `Eclipse Mosquitto` — MQTT broker (port `1883`, WebSocket `9001`)
- `AWS EC2` — Production server
- `GitHub Actions` — CI/CD pipeline

---

## 📂 Project Structure

```
ai-predictive-maintenance/
├── .github/
│   └── workflows/
│       ├── frontend-ci.yml      # CI: lint + build + Docker build test
│       ├── backend-ci.yml       # CI: Python lint & test
│       └── deploy-cd.yml        # CD: auto-deploy to AWS EC2
│
├── backend/
│   ├── app/
│   │   ├── controllers/         # REST API endpoints (FastAPI Router)
│   │   ├── core/config.py       # Configuration from environment variables
│   │   ├── gateways/            # WebSocket gateway (Socket.io)
│   │   ├── models/              # SQLAlchemy models + DB initialization
│   │   └── services/
│   │       ├── simulator_service.py  # Physics-based motor degradation engine
│   │       ├── ml_service.py         # IsolationForest anomaly detection
│   │       ├── mqtt_service.py       # MQTT client (publish/subscribe)
│   │       ├── sync_service.py       # Batch database sync
│   │       └── motor_state_service.py # Motor ON/OFF state manager
│   ├── Dockerfile
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── dashboard/       # Dashboard page & components
│   │   │   └── scada/           # SCADA page & custom React Flow nodes
│   │   └── components/          # Shared components (Navbar, MotorSymbol)
│   ├── Dockerfile
│   └── next.config.ts
│
├── mosquitto/
│   └── mosquitto.conf           # MQTT broker configuration
│
├── docker-compose.yml           # Production compose (all services)
├── docker-compose.override.yml  # Local dev override
└── .env.example                 # Environment variables template
```

---

## 🚀 Getting Started (Local Development)

### Prerequisites

- **Node.js** v20+
- **Python** v3.12+
- **Docker Desktop**

### 1. Clone & Configure Environment

```bash
git clone https://github.com/Anggytriputra/ai-predictive-maintenance.git
cd ai-predictive-maintenance

# Create .env from template
cp .env.example .env
```

Edit `.env` if needed (defaults are ready for local development):
```env
DATABASE_URL=postgresql://admin:adminpassword@timescaledb:5432/predictive_maintenance
MQTT_BROKER_HOST=mosquitto
MQTT_BROKER_PORT=1883
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
```

### 2. Run All Services (Docker)

```bash
# Start all: TimescaleDB, Mosquitto, Backend, Frontend
docker compose up -d

# View logs
docker compose logs -f
```

| Service | URL |
|---------|-----|
| Frontend Dashboard | http://localhost:4001 |
| Backend API | http://localhost:4000 |
| API Docs (Swagger) | http://localhost:4000/docs |
| TimescaleDB | `localhost:5433` |
| MQTT Broker | `localhost:1883` |

### 3. Run Without Docker (Manual Development)

**Backend:**
```bash
cd backend
python -m venv venv

.\venv\Scripts\activate   # Windows
source venv/bin/activate  # Mac/Linux

pip install -r requirements.txt
python run.py
# → Running at http://localhost:3000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
# → Running at http://localhost:3001
```

---

## 🧠 How the AI/ML Pipeline Works

```
1. Physics Simulator generates realistic sensor data every 2 seconds
   ↓
2. Data published via MQTT to topic: plant/{motorId}/sensor_data
   ↓
3. Backend receives MQTT message → extracts 5 ML features:
   [temperature, vibration, current_imbalance, voltage_imbalance, neutral_current]
   ↓
4. IsolationForest predicts: NORMAL (1) or ANOMALY (-1) with confidence score
   ↓
5. If anomaly → publish alert via MQTT + WebSocket → frontend shows alert banner
   ↓
6. Model auto-retrains every 2 minutes with accumulated data
   ↓
7. Data buffered and batch-synced to TimescaleDB every 10 seconds
```

---

## 🚢 Deployment (AWS EC2)

### How CI/CD Works

```
Push to main branch
       │
       ├──→ Frontend CI    → npm build + Docker build test
       ├──→ Backend CI     → Python lint & test
       └──→ Deploy CD      → SSH to AWS → git pull → docker compose up --build
```

### GitHub Secrets Setup

Go to your GitHub repository → **Settings → Secrets and variables → Actions**, and add:

| Secret | Value |
|--------|-------|
| `AWS_HOST` | EC2 Public IP (e.g. `13.251.127.127`) |
| `AWS_USERNAME` | `ubuntu` |
| `AWS_SSH_KEY` | Contents of your `.pem` key file |
| `NEXT_PUBLIC_SOCKET_URL` | `http://<AWS_IP>:4000` |
| `EMAIL_USERNAME` | Email for failed deploy notifications |
| `EMAIL_PASSWORD` | Gmail App Password |

### Manual Deploy to Server

```bash
# SSH into server
ssh -i "anggy-saputra-key.pem" ubuntu@<AWS_IP>

# Pull latest code and rebuild
cd ai-predictive-maintenance
git pull origin main
sudo docker compose up -d --build
```

---

## 📌 Ports & Services

| Port | Service | Description |
|------|---------|-------------|
| `4001` | Frontend (Next.js) | Dashboard & SCADA View |
| `4000` | Backend (FastAPI) | REST API + Socket.io |
| `5433` | TimescaleDB | PostgreSQL time-series DB |
| `1883` | Mosquitto MQTT | IoT messaging |
| `9001` | Mosquitto WebSocket | MQTT over WebSocket |

---

## 👨‍💻 Author

**Anggy Tri Anugrah Saputra**  
[GitHub](https://github.com/Anggytriputra) · [Email](mailto:anggytriasaputra@gmail.com)
