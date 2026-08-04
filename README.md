# 🚀 AI Predictive Maintenance Dashboard

![Next.js](https://img.shields.io/badge/Next.js-black?style=for-the-badge&logo=next.js&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

An advanced, real-time IoT monitoring system designed for industrial environments. This full-stack application simulates and monitors electric motor sensors (temperature, vibration, voltage, current) and utilizes predictive maintenance logic to warn operators of impending hardware failures before they occur.

## ✨ Key Features

- **🔴 Real-Time Telemetry:** Streams thousands of sensor data points per second using **WebSockets (Socket.io)**.
- **🧠 AI Predictive Logic:** Automatically analyzes thermal and vibration stress to predict bearing failures and trigger "CRITICAL" or "WARNING" alerts.
- **⚡ High-Performance Architecture:** Utilizes **Upstash Redis** as a Pub/Sub message broker and memory buffer to handle high-throughput IoT data streams without overloading the main database.
- **💾 Robust Storage:** Employs **PostgreSQL (Supabase)** via **Prisma ORM** for persistent, structured storage of historical sensor logs and machine alerts.
- **🎨 Premium UI/UX:** A stunning, responsive Dark Mode dashboard built with **Next.js**, **Tailwind CSS**, and **Recharts**.

## 🏗️ Architecture

The system is separated into two main microservices-like structures:

1. **Backend (NestJS)**
   - **IoT Simulator:** Generates mock industrial data for multiple motors every 2 seconds.
   - **Redis Pub/Sub:** Broadcasts data across channels instantly.
   - **AI Analyzer Service:** Listens to the Redis stream and flags anomalies.
   - **Database Sync:** Periodically batches data from the Redis buffer and flushes it to PostgreSQL for long-term analytics.

2. **Frontend (Next.js)**
   - Connects to the backend via WebSockets.
   - Subscribes to specific motor "rooms" dynamically to render live charts.
   - Displays real-time alerts.

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- PostgreSQL Database (e.g., Supabase)
- Redis Database (e.g., Upstash)

### 1. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory:

```env
# Supabase PostgreSQL connection
DATABASE_URL="postgresql://user:password@host:port/postgres"
# Upstash Redis connection
REDIS_URL="rediss://default:password@host:port"
```

Generate Prisma Client and start the server:

```bash
npx prisma generate
npm run start:dev
```

### 2. Frontend Setup

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
