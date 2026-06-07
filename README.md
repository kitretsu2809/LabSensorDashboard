# IoT Lab Sensor Real-Time Dashboard

A modern, full-stack IoT dashboard for real-time monitoring of laboratory sensor arrays. It features live data streaming, persistent historical storage, configurable anomaly alerts, and a premium glassmorphism UI.

## Features
- **Real-Time Data**: Live streaming of Temperature, Pressure, and Light Intensity via MQTT over WebSockets with 1-second latency.
- **24-Hour Telemetry History**: Persistent storage using SQLite and visual trend analysis via Recharts.
- **Configurable Alerts**: Set upper limits for sensors; receive instant browser notifications if thresholds are exceeded.
- **Data Export**: Export up to 10,000 historical records as a CSV for offline analysis.
- **Premium Aesthetics**: Built with Vite, React, and Vanilla CSS utilizing a dark mode glassmorphism design.

## Preview

### Dashboard Interface
![Dashboard Live View](./Preview/Screenshot%20From%202026-06-07%2022-17-10.png)

### Telemetry Chart & Alerts
![Chart View](./Preview/Screenshot%20From%202026-06-07%2022-17-29.png)

### Working Prototype
[Watch the prototype in action](./Preview/Screencast%20From%202026-06-07%2022-15-32.webm)

## Architecture
1. **MQTT Broker (Mosquitto)**: Runs in Docker. Handles standard MQTT (`1883`) and WebSockets (`9001`).
2. **Hardware Simulator**: Python script (`simulator/sensor_simulator.py`) using `paho-mqtt` to simulate physical sensors.
3. **Backend Service**: Node.js/Express server that subscribes to the broker and logs all telemetry to `sensors.db` (SQLite).
4. **Frontend Dashboard**: React application that connects directly to Mosquitto via WebSockets for live data and to the Backend for historical data.

## Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js (v16+)
- Python 3

### Installation & Run
Start the entire stack using the provided shell script:
```bash
./start.sh
```
This will automatically:
1. Spin up the Mosquitto broker container.
2. Launch the Node.js backend on port 3001.
3. Create a Python virtual environment and run the sensor simulator.
4. Launch the React dashboard on port 5173.

Access the dashboard at [http://localhost:5173](http://localhost:5173).

## Tech Stack
- **Frontend**: React, Vite, Recharts, Lucide React
- **Backend**: Node.js, Express, SQLite3, MQTT.js, json2csv
- **IoT & Infrastructure**: Python (paho-mqtt), Eclipse Mosquitto, Docker
