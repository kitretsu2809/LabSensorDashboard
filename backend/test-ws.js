const mqtt = require('mqtt');
const client = mqtt.connect('ws://localhost:9001');
client.on('connect', () => {
    console.log('Connected to WS!');
    client.end();
});
client.on('error', (e) => console.log('Error:', e));
