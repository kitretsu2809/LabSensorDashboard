#!/bin/bash

# Start Mosquitto
echo "Starting Mosquitto MQTT broker..."
docker compose up -d

# Start backend
echo "Starting Backend Server..."
cd backend
node server.js &
BACKEND_PID=$!
cd ..

# Start simulator
echo "Starting Python Sensor Simulator..."
cd simulator
# Create venv to avoid PEP 668 externally-managed-environment errors
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
./venv/bin/pip install -r requirements.txt
./venv/bin/python sensor_simulator.py &
SIMULATOR_PID=$!
cd ..

# Start frontend
echo "Starting Frontend React Dashboard..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo "All services started! Dashboard available at http://localhost:5173"
echo "Press Ctrl+C to stop all services."

# Wait for Ctrl+C
trap "kill $BACKEND_PID $SIMULATOR_PID $FRONTEND_PID; docker compose down; exit" SIGINT SIGTERM
wait
