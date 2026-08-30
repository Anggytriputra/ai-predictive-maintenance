# 🚀 AI Predictive Maintenance Dashboard

![Next.js](https://img.shields.io/badge/Next.js-black?style=for-the-badge&logo=next.js&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![TimescaleDB](https://img.shields.io/badge/TimescaleDB-FDB515?style=for-the-badge&logo=timescaledb&logoColor=black)
![Mosquitto](https://img.shields.io/badge/Mosquitto-3C5280?style=for-the-badge&logo=eclipse-mosquitto&logoColor=white)
![Scikit-Learn](https://img.shields.io/badge/Scikit_Learn-F7931E?style=for-the-badge&logo=scikit-learn&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

An advanced, real-time IoT monitoring system designed for industrial environments in Indonesia. This full-stack application simulates and monitors electric motor sensors (temperature, vibration, voltage, current) and utilizes unsupervised Machine Learning to predict hardware failures before they occur.

## ✨ Key Features

- **🔴 Real-Time Telemetry:** Streams thousands of sensor data points per second using **WebSockets (Socket.io)**.
- **🧠 AI Predictive Logic:** Uses **IsolationForest (scikit-learn)** for unsupervised anomaly detection. Automatically trains on normal operating conditions and flags thermal/vibration stress as "CRITICAL" or "WARNING" alerts.
- **⚡ Industrial IoT Messaging:** Employs **Eclipse Mosquitto (MQTT)** as the high-throughput message broker, replacing standard HTTP/Redis overheads for authentic industrial standards.
- **💾 Time-Series Storage:** Utilizes **TimescaleDB** (PostgreSQL extension) via **SQLAlchemy** to efficiently store, compress, and query massive amounts of historical sensor logs and alerts.
- **🎨 Premium UI/UX:** A stunning, responsive Dark Mode dashboard built with **Next.js**, **Tailwind CSS**, and **Recharts**.

## 🏗️ Architecture

The system is separated into three main layers:

1. **Infrastructure (Docker Compose)**
   - **TimescaleDB:** Relational database optimized for time-series data.
   - **Mosquitto MQTT Broker:** The central nervous system for IoT messaging.

2. **Backend (Python / FastAPI)**
   - **IoT Simulator (`iot_simulator.py`):** Generates mock industrial data for multiple motors every 2 seconds.
   - **MQTT Client (`mqtt_client.py`):** Subscribes to sensor topics and publishes AI alerts.
   - **AI Analyzer (`ml_analyzer.py`):** Analyzes incoming data in real-time using IsolationForest.
   - **Database Sync (`db_sync.py`):** Periodically batches data from memory and flushes it to TimescaleDB.
   - **FastAPI + Socket.io (`main.py`):** Serves REST APIs and bridges sync MQTT messages to async WebSocket clients.

3. **Frontend (Next.js)**
   - Connects to the backend via WebSockets.
   - Subscribes to specific motor "rooms" dynamically to render live charts.
   - Displays real-time alerts.

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- Python (v3.10+)
- Docker Desktop (Required for TimescaleDB and Mosquitto)

### 1. Infrastructure Setup (Docker)

```bash
docker compose up -d
```
This will start TimescaleDB on port `5433` (to avoid native Windows conflicts) and Mosquitto on port `1883`.

### 2. Backend Setup (FastAPI)

Navigate to the backend directory and create a virtual environment:

```bash
cd backend
python -m venv venv

# Activate (Windows)
.\venv\Scripts\activate
# Activate (Mac/Linux)
source venv/bin/activate
```

Install dependencies:
```bash
pip install -r requirements.txt
```

*(Ensure your `.env` file is configured properly as per `.env.example`)*

Start the backend server:
```bash
python main.py
```
*The server will start on http://localhost:3000. API Docs are available at http://localhost:3000/docs*

### 3. Frontend Setup (Next.js)

Open a new terminal and navigate to the frontend:

```bash
cd frontend
npm install
```

Start the frontend development server:

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser to see the dashboard in action!

## 📸 Screenshots

![AI Predictive Maintenance Dashboard](./screenshot.png)

## 👨‍💻 Author

Built by Anggy.
