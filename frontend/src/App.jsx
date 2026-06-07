import { useState, useEffect, useCallback, useMemo } from 'react';
import mqtt from 'mqtt';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Bell, BellOff, Settings } from 'lucide-react';
import './index.css';

export default function App() {
  const [liveData, setLiveData] = useState({
    temperature: { value: 0, unit: 'C' },
    pressure: { value: 0, unit: 'hPa' },
    light: { value: 0, unit: 'lux' }
  });
  
  const [history, setHistory] = useState([]);
  const [thresholds, setThresholds] = useState({
    temperature: 30.0,
    pressure: 1020.0,
    light: 1500.0
  });
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [connected, setConnected] = useState(false);

  // Initialize notifications
  useEffect(() => {
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        setNotificationsEnabled(true);
      }
    }
  }, []);

  const toggleNotifications = () => {
    if (!("Notification" in window)) {
      alert("This browser does not support desktop notification");
      return;
    }
    if (Notification.permission === "granted") {
      setNotificationsEnabled(false);
      // We can't actually revoke permission programmatically, but we can stop sending them
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          setNotificationsEnabled(true);
        }
      });
    }
  };

  const triggerAlert = useCallback((sensor, value, threshold) => {
    if (notificationsEnabled && Notification.permission === "granted") {
      new Notification(`Sensor Alert: ${sensor}`, {
        body: `${sensor} exceeded threshold! Value: ${value}, Limit: ${threshold}`,
        icon: '/vite.svg'
      });
    }
  }, [notificationsEnabled]);

  // Fetch History
  useEffect(() => {
    fetch('http://localhost:3001/api/history')
      .then(res => res.json())
      .then(data => {
        // Format data for Recharts
        // Data comes as { timestamp, sensor_type, value }
        // We need an array of objects like { time, temperature, pressure, light }
        const formattedData = {};
        data.forEach(row => {
          const time = new Date(row.timestamp).toLocaleTimeString();
          if (!formattedData[time]) {
            formattedData[time] = { time };
          }
          formattedData[time][row.sensor_type] = row.value;
        });
        setHistory(Object.values(formattedData).slice(-100)); // Keep last 100 points for chart performance
      })
      .catch(err => console.error("Failed to fetch history:", err));
  }, []);

  // MQTT Live Connection
  useEffect(() => {
    const client = mqtt.connect('ws://localhost:9001');

    client.on('connect', () => {
      setConnected(true);
      client.subscribe('lab/sensors/#');
    });

    client.on('message', (topic, message) => {
      const sensorType = topic.split('/').pop();
      try {
        const payload = JSON.parse(message.toString());
        
        setLiveData(prev => ({
          ...prev,
          [sensorType]: payload
        }));

        setHistory(prev => {
          const time = new Date().toLocaleTimeString();
          const lastPoint = prev.length > 0 ? prev[prev.length - 1] : { time };
          
          let newPoint = { ...lastPoint, time };
          if (newPoint.time === time) {
            newPoint[sensorType] = payload.value;
            return [...prev.slice(0, prev.length - 1), newPoint].slice(-100);
          } else {
            newPoint = { time, [sensorType]: payload.value };
            return [...prev, newPoint].slice(-100);
          }
        });

        // Check thresholds
        if (payload.value > thresholds[sensorType]) {
          triggerAlert(sensorType, payload.value, thresholds[sensorType]);
        }

      } catch (e) {
        console.error(e);
      }
    });

    return () => client.end();
  }, [thresholds, triggerAlert]);

  const handleThresholdChange = (sensor, value) => {
    setThresholds(prev => ({ ...prev, [sensor]: Number(value) }));
  };

  const exportCSV = () => {
    window.open('http://localhost:3001/api/export', '_blank');
  };

  return (
    <div className="dashboard-container animate-fade-in">
      <header>
        <div>
          <h1>Lab Sensor Array</h1>
          <div className="live-indicator">
            {connected ? (
              <><div className="pulse"></div> Live Connection</>
            ) : (
              <><div className="pulse" style={{backgroundColor: 'var(--accent-red)', animation: 'none'}}></div> Disconnected</>
            )}
          </div>
        </div>
        <div className="controls">
          <button className="btn btn-primary" onClick={exportCSV}>Export CSV</button>
          <button className="btn" onClick={toggleNotifications} title="Toggle Alerts">
            {notificationsEnabled ? <Bell size={18} /> : <BellOff size={18} />}
          </button>
        </div>
      </header>

      <div className="live-grid">
        {Object.entries(liveData).map(([sensor, data]) => (
          <div key={sensor} className={`sensor-card ${sensor}`}>
            <div className="sensor-header">
              <span>{sensor}</span>
              {data.value > thresholds[sensor] && (
                <span style={{ color: 'var(--accent-red)', fontSize: '0.75rem', fontWeight: 'bold' }}>ALERT</span>
              )}
            </div>
            <div className="sensor-value">
              {data.value.toFixed(2)} <span className="sensor-unit">{data.unit}</span>
            </div>
            <div className="alert-settings">
              <Settings size={14} color="var(--text-secondary)" />
              <input 
                type="number" 
                value={thresholds[sensor]} 
                onChange={(e) => handleThresholdChange(sensor, e.target.value)}
                title="Alert Threshold"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="chart-section">
        <h2>Live Telemetry & 24h History</h2>
        <div style={{ width: '100%', height: 400 }}>
          <ResponsiveContainer>
            <LineChart data={history} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="time" stroke="var(--text-secondary)" tick={{fontSize: 12}} />
              <YAxis yAxisId="left" stroke="var(--accent-blue)" />
              <YAxis yAxisId="right" orientation="right" stroke="var(--accent-red)" />
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--panel-border)', borderRadius: '8px' }}
                itemStyle={{ color: 'var(--text-primary)' }}
              />
              <Line yAxisId="left" type="monotone" dataKey="temperature" stroke="var(--accent-blue)" dot={false} strokeWidth={2} isAnimationActive={false} />
              <Line yAxisId="right" type="monotone" dataKey="pressure" stroke="var(--accent-red)" dot={false} strokeWidth={2} isAnimationActive={false} />
              <Line yAxisId="left" type="monotone" dataKey="light" stroke="var(--accent-green)" dot={false} strokeWidth={2} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
