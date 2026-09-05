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

**A production-grade, real-time IoT monitoring system with Machine Learning-based anomaly detection.**  
Built with a full-stack architecture and automatically deployed to AWS EC2 via GitHub Actions CI/CD.

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-13.251.127.127:4001-4ade80?style=for-the-badge)](http://13.251.127.127:4001)

</div>

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| 🔴 **Real-Time Telemetry** | Streams thousands of sensor data points per second via **WebSocket (Socket.io)** |
| 🧠 **AI Anomaly Detection** | **IsolationForest (scikit-learn)** — unsupervised real-time anomaly detection |
| ⚡ **Industrial IoT Messaging** | **Eclipse Mosquitto MQTT** as the industry-standard message broker |
| 💾 **Time-Series Database** | **TimescaleDB** (PostgreSQL extension) for efficient storage and querying of historical sensor data |
| 📊 **Real-Time Dashboard** | Live charts with **Recharts**, premium dark mode UI |
| 🗺️ **SCADA View** | Interactive industrial P&ID process flow diagram built with **React Flow** |
| 🚀 **Automated CI/CD** | Auto-deploy to **AWS EC2** via **GitHub Actions** on every push to `main` |

---

## 🏗️ System Architecture

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

### Technology Stack

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

## 📁 Project Structure

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
│   │   └── services/            # Business logic (MQTT, ML, simulator, sync)
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
├── docker-compose.override.yml  # Local dev override (gitignored)
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

## ☁️ Deployment (AWS EC2)

### How CI/CD Works

```
Push to main branch
       │
       ├──► Frontend CI    → npm build + Docker build test
       ├──► Backend CI     → Python lint & test
       └──► Deploy CD      → SSH to AWS → git pull → docker compose up --build
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

## 🧠 How the AI/ML Works

1. **Data Collection** — IoT Simulator generates sensor data every 2 seconds for 3 motors: `Motor-HV-01`, `Motor-HV-02`, `Motor-MV-01`
2. **Anomaly Detection** — `IsolationForest` is trained unsupervised on normal operating conditions
3. **Risk Classification** — Each new reading is classified as `LOW`, `WARNING`, or `CRITICAL`
4. **Real-Time Alerts** — Alerts are sent via MQTT and WebSocket to the frontend instantly
5. **Auto Retraining** — Model retrains every 2 minutes with the latest accumulated data

---

## 📡 Ports & Services

| Port | Service | Description |
|------|---------|-------------|
| `4001` | Frontend (Next.js) | Dashboard & SCADA View |
| `4000` | Backend (FastAPI) | REST API + Socket.io |
| `5433` | TimescaleDB | PostgreSQL time-series DB |
| `1883` | Mosquitto MQTT | IoT messaging |
| `9001` | Mosquitto WebSocket | MQTT over WebSocket |

---

## 👨‍💻 Author

**Anggy Tri Asaputra**  
[GitHub](https://github.com/Anggytriputra) · [Email](mailto:anggytriasaputra@gmail.com)
