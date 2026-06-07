const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const mqtt = require('mqtt');
const { Parser } = require('json2csv');

const app = express();
const PORT = 3001;

app.use(cors());

// Initialize SQLite
const db = new sqlite3.Database('./sensors.db', (err) => {
    if (err) {
        console.error('Database connection error:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        // Create table
        db.run(`CREATE TABLE IF NOT EXISTS sensor_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            sensor_type TEXT,
            value REAL,
            unit TEXT
        )`);
    }
});

// Connect to MQTT
const client = mqtt.connect('mqtt://localhost:1883');

client.on('connect', () => {
    console.log('Connected to MQTT broker (Backend)');
    client.subscribe('lab/sensors/#', (err) => {
        if (!err) {
            console.log('Subscribed to lab/sensors/#');
        }
    });
});

client.on('message', (topic, message) => {
    // topic example: lab/sensors/temperature
    const sensorType = topic.split('/').pop();
    try {
        const data = JSON.parse(message.toString());
        
        // Insert into SQLite
        db.run(`INSERT INTO sensor_data (sensor_type, value, unit) VALUES (?, ?, ?)`, 
            [sensorType, data.value, data.unit], 
            function(err) {
                if (err) {
                    console.error('Error inserting data:', err.message);
                }
            }
        );
    } catch (e) {
        console.error('Failed to parse MQTT message:', e);
    }
});

// API endpoint: Get historical data (last 24 hours)
app.get('/api/history', (req, res) => {
    const query = `
        SELECT timestamp, sensor_type, value 
        FROM sensor_data 
        WHERE timestamp >= datetime('now', '-24 hours')
        ORDER BY timestamp ASC
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// API endpoint: Export CSV
app.get('/api/export', (req, res) => {
    const query = `
        SELECT timestamp, sensor_type, value, unit 
        FROM sensor_data 
        ORDER BY timestamp DESC 
        LIMIT 10000
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            res.status(500).send('Error retrieving data');
            return;
        }
        try {
            const parser = new Parser();
            const csv = parser.parse(rows);
            res.header('Content-Type', 'text/csv');
            res.attachment('sensor_data.csv');
            return res.send(csv);
        } catch (err) {
            res.status(500).send('Error generating CSV');
        }
    });
});

app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
