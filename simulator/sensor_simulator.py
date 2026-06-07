import time
import json
import random
import paho.mqtt.client as mqtt

BROKER = "localhost"
PORT = 1883
TOPIC_BASE = "lab/sensors"

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("Connected to MQTT Broker!")
    else:
        print("Failed to connect, return code %d\n", rc)

client = mqtt.Client(client_id="sensor_simulator")
client.on_connect = on_connect

print(f"Connecting to broker {BROKER}:{PORT}...")
try:
    client.connect(BROKER, PORT, 60)
except Exception as e:
    print(f"Could not connect to broker: {e}")
    print("Continuing to simulate without broker (or broker not up yet).")

client.loop_start()

# Initial sensor values
temp = 22.0
pressure = 1013.25
light = 500.0

try:
    while True:
        # Simulate slight variations
        temp += random.uniform(-0.5, 0.5)
        pressure += random.uniform(-1.0, 1.0)
        light += random.uniform(-10.0, 10.0)

        # Keep values in reasonable ranges
        temp = max(15.0, min(temp, 40.0))
        pressure = max(950.0, min(pressure, 1050.0))
        light = max(0.0, min(light, 2000.0))

        # Payload format
        payloads = {
            f"{TOPIC_BASE}/temperature": {"value": round(temp, 2), "unit": "C"},
            f"{TOPIC_BASE}/pressure": {"value": round(pressure, 2), "unit": "hPa"},
            f"{TOPIC_BASE}/light": {"value": round(light, 2), "unit": "lux"}
        }

        for topic, payload in payloads.items():
            client.publish(topic, json.dumps(payload))
            print(f"Published {payload} to {topic}")

        time.sleep(1)
except KeyboardInterrupt:
    print("Simulator stopped.")
    client.loop_stop()
    client.disconnect()
