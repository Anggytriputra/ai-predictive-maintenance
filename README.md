# ⚡ AI Predictive Maintenance Platform

> Real-time Industrial IoT (IIoT) monitoring platform with **physics-based motor degradation simulation**, **OPC-UA industrial protocol integration**, and **ML-powered anomaly detection** for high-voltage and medium-voltage electric motors.

![Dashboard Screenshot](./screenshot.png)

---

## 🌟 Key Features

### 🏭 Dual Ingestion Modes (Simulator vs OPC-UA Live)
Switch seamlessly between simulation testing and real factory PLC integration via `.env`:

| Mode | Badge Indicator | Description |
|---|:---:|---|
| **SIMULATOR** *(Default)* | `🟣 SIMULATOR` | Built-in Python physics engine generating realistic thermal, vibration, and 3-phase electrical degradation. |
| **OPC-UA LIVE** | `🟢 OPC-UA LIVE` | Real-time subscription to industrial PLCs / SCADA systems (Siemens S7, Allen-Bradley, Beckhoff, or demo server) via `opc.tcp://`. |

> **Navbar Badge**: The top navigation bar dynamically reflects the active data source so operators always know whether telemetry is simulated or live from factory hardware.

### 🔬 Realistic Motor Physics Engine
Unlike simple random-number generators, the simulation models true industrial dynamics:
- **Thermal Behavior**: Temperature follows Newton's Law of Cooling, rising under mechanical stress and decaying exponentially when powered off.
- **Bearing Wear (ISO 10816)**: Vibration severity adheres to ISO 10816 standards, following the classic bathtub failure curve.
- **3-Phase Electrical Degradation**: Progressive current imbalance ($1\% \to 20\%$) and neutral current leakage ($I_N$) as ground-fault indicators.
- **Startup Inrush Transient**: $6\times - 8\times$ rated current spike for ~10 seconds on startup with realistic line voltage sag.
- **Degradation Lifecycle**:
  $$\text{HEALTHY (15m)} \to \text{DEGRADING (10m)} \to \text{WARNING (5m)} \to \text{CRITICAL (2m)} \to \text{FAILURE (1m)} \to \text{Auto-Reset}$$

### 🤖 AI/ML Anomaly Detection Pipeline
- **Unsupervised IsolationForest**: Detects complex multivariate anomalies across 5 engineered features:
  - Temperature (°C)
  - Vibration (mm/s)
  - Current Imbalance (%)
  - Voltage Imbalance (%)
  - Neutral Current (A)
- **Hybrid Inference**: ML confidence scoring when model is trained; deterministic ISO thresholds during cold-start warmup.
- **Continuous Auto-Retraining**: Re-fits every 2 minutes with sliding-window historical operational data.

### 📊 Real-Time Operations Dashboard
- Live streaming charts (Recharts) with sliding telemetry window.
- 3-Phase analytics grid ($I_R, I_S, I_T$ and $V_R, V_S, V_T$).
- Real-time bearing health gauge & status badges.
- Visual anomaly banners with severity ratings (`LOW`, `WARNING`, `CRITICAL`).

### 🎛️ Interactive SCADA P&ID View
- ISA-compliant process diagram built with **React Flow** (`@xyflow/react`).
- Live animated flow indicators, responsive motor/pump/valve states.
- Remote Start/Stop HMI controls.

---

## 🏗️ System Architecture

```text
+-----------------------------------------------------------------------------------------+
|                                Docker Compose Environment                               |
|                                                                                         |
|  +------------------------+             +--------------------------------------------+  |
|  |  Mosquitto MQTT        |             |  Backend (FastAPI + Python 3.12)           |  |
|  |  Broker :1883 / :9001  |<----------->|  - Data Ingestion Router                   |  |
|  +------------------------+             |    * Physics Simulator                     |  |
|                                         |    * OPC-UA Client (asyncua)               |  |
|  +------------------------+             |  - IsolationForest ML Engine               |  |
|  |  TimescaleDB           |<----------->|  - APScheduler & Batch Sync Service        |  |
|  |  PostgreSQL :5432      |             |  - Socket.io WebSocket Gateway             |  |
|  +------------------------+             +--------------------------------------------+  |
|                                                                |                        |
|  +------------------------+                                    | WebSocket              |
|  |  OPC-UA Demo Server    |<-----------------------------------+ (Port 4000)            |
|  |  Virtual PLC :4840     |                                    v                        |
|  +------------------------+                     +------------------------------------+  |
|                                                 |  Frontend (Next.js 16 + React)     |  |
|                                                 |  - Real-Time Analytics Dashboard   |  |
|                                                 |  - Interactive SCADA P&ID View     |  |
|                                                 |  - Data Source Badge (Port 4001)   |  |
|                                                 +------------------------------------+  |
+-----------------------------------------------------------------------------------------+
```

---

## ⚙️ Data Source Configuration

You can configure the active data pipeline in `.env`:

```env
# Choose data source: "simulator" or "opcua"
DATA_SOURCE=simulator

# OPC-UA Server endpoint (default connects to bundled docker demo server)
OPCUA_SERVER_URL=opc.tcp://opcua-server:4840/freeopcua/server/
```

To switch to OPC-UA mode:
```bash
# 1. Ubah DATA_SOURCE=opcua di .env
# 2. Restart backend
docker compose restart backend
```

---

## 📈 Degradation Phases & ISO 10816 Thresholds

| Phase | Duration | Temp (°C) | Vibration (ISO 10816) | Current Imbalance | Bearing Health |
|---|---|---|---|---|---|
| **HEALTHY** | ~15 min | 68 – 72 °C | 0.8 – 1.5 mm/s *(Good)* | 1% *(Normal)* | 100% – 87% |
| **DEGRADING** | ~10 min | 73 – 78 °C | 1.5 – 3.2 mm/s *(Acceptable)* | 3% *(Subtle)* | 87% – 57% |
| **WARNING** | ~5 min | 80 – 86 °C | 3.2 – 6.5 mm/s *(Alert)* | 6% *(Noticeable)* | 57% – 12% |
| **CRITICAL** | ~2 min | 88 – 95 °C | 6.5 – 11.0 mm/s *(Danger)* | 12% *(Serious)* | 12% – 2% |
| **FAILURE** | ~1 min | 98 – 105 °C | 11.0 – 18.0 mm/s *(Failure)* | 20% *(Severe)* | < 2% |

---

## 🛠️ Technology Stack

- **Backend**: FastAPI, `asyncua` (OPC-UA), `python-socketio`, `paho-mqtt`, `scikit-learn`, `pandas`, `numpy`, `SQLAlchemy`, `APScheduler`.
- **Frontend**: Next.js (App Router), React Flow (`@xyflow/react`), Recharts, Tailwind CSS, Lucide React, Socket.io Client.
- **Storage & Ingestion**: TimescaleDB (PostgreSQL 15 Time-Series), Eclipse Mosquitto (MQTT).
- **Industrial Protocols**: OPC-UA (IEC 62541), MQTT 3.1.1/5.0, WebSockets.
- **DevOps**: Docker Compose, GitHub Actions CI/CD, AWS EC2.

---

## 🚀 Quick Start (Local Docker)

### 1. Clone & Prepare Environment
```bash
git clone https://github.com/Anggytriputra/ai-predictive-maintenance.git
cd ai-predictive-maintenance

cp .env.example .env
```

### 2. Start All Services
```bash
docker compose up -d --build
```

### 3. Service Endpoints

| Service | Address | Description |
|---|---|---|
| **Frontend** | [http://localhost:4001](http://localhost:4001) | Next.js Dashboard & SCADA UI |
| **Backend API** | [http://localhost:4000](http://localhost:4000) | REST API & WebSockets |
| **Swagger Docs** | [http://localhost:4000/docs](http://localhost:4000/docs) | Interactive API documentation |
| **OPC-UA Server** | `opc.tcp://localhost:4840` | Industrial OPC-UA Server |
| **TimescaleDB** | `localhost:5433` | Time-series database |
| **Mosquitto MQTT** | `localhost:1883` | IoT message broker |

---

## 🚢 Production Deployment (AWS EC2)

The project includes automated CI/CD via GitHub Actions (`.github/workflows/`):
- **CI**: Runs linting, build checks, and container image tests on PR/push.
- **CD**: Auto-deploys to AWS EC2 over SSH when merged to `main`.

### Manual Server Update
```bash
ssh -i "your-key.pem" ubuntu@<AWS_IP>
cd ai-predictive-maintenance
git pull origin main
sudo docker compose up -d --build
```

---

## 👨‍💻 Author

**Anggy Tri Anugrah Saputra**  
- GitHub: [@Anggytriputra](https://github.com/Anggytriputra)  
- Email: [anggytriasaputra@gmail.com](mailto:anggytriasaputra@gmail.com)
