import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  Cpu,
  Wifi,
  WifiOff,
  Zap,
  Eye,
  Gauge,
  Clock,
  AlertTriangle,
  CheckCircle,
  Signal,
  ThermometerSun,
  HardDrive,
  BarChart3,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Pause,
  Play
} from 'lucide-react';

const MonitoreoTiempoReal = ({ configuraciones, connectionStatus, wsRef }) => {
  const [realtimeData, setRealtimeData] = useState({});
  const [monitoring, setMonitoring] = useState(true);
  const [updateInterval, setUpdateInterval] = useState(2000); // 2 segundos
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [chartData, setChartData] = useState([]);

  // Simular datos en tiempo real
  useEffect(() => {
    if (!monitoring) return;

    const interval = setInterval(() => {
      const newData = {};
      
      configuraciones.forEach(config => {
        const status = connectionStatus[config.posteId] || { online: false };
        
        if (status.online) {
          // Simular datos de sensores en tiempo real
          const ldrValue = Math.floor(Math.random() * 1023);
          const pirActive = Math.random() > 0.8; // 20% probabilidad de movimiento
          const current = Math.random() * 3; // 0-3A
          const voltage = 220 + (Math.random() - 0.5) * 20; // 210-230V
          const power = voltage * current;
          
          newData[config.posteId] = {
            timestamp: new Date(),
            sensors: {
              ldr: {
                raw: ldrValue,
                lux: Math.floor(ldrValue * 0.5), // Conversión aproximada
                functioning: Math.random() > 0.05 // 95% funcionando
              },
              pir: {
                active: pirActive,
                detections: Math.floor(Math.random() * 100),
                functioning: Math.random() > 0.05
              },
              acs712: {
                current: current,
                voltage: voltage,
                power: power,
                functioning: Math.random() > 0.05
              }
            },
            system: {
              uptime: status.uptime || Math.floor(Math.random() * 86400),
              freeMemory: Math.floor(Math.random() * 50000) + 200000, // 200-250KB
              cpuUsage: Math.floor(Math.random() * 30) + 10, // 10-40%
              temperature: Math.floor(Math.random() * 20) + 35, // 35-55°C
              signalStrength: Math.floor(Math.random() * 40) - 70, // -70 a -30 dBm
              lastHeartbeat: new Date()
            },
            network: {
              ip: config.red?.ip || 'N/A',
              bytesReceived: Math.floor(Math.random() * 1024),
              bytesSent: Math.floor(Math.random() * 512),
              packetsLost: Math.floor(Math.random() * 5),
              reconnections: Math.floor(Math.random() * 3)
            }
          };
        }
      });
      
      setRealtimeData(newData);
      
      // Actualizar datos del gráfico
      setChartData(prev => {
        const newChartData = [...prev];
        const now = new Date();
        
        // Agregar nuevo punto de datos
        newChartData.push({
          timestamp: now.toLocaleTimeString(),
          ...Object.entries(newData).reduce((acc, [deviceId, data]) => {
            acc[`${deviceId}_power`] = data.sensors.acs712.power;
            acc[`${deviceId}_lux`] = data.sensors.ldr.lux;
            return acc;
          }, {})
        });
        
        // Mantener solo los últimos 20 puntos
        return newChartData.slice(-20);
      });
      
    }, updateInterval);

    return () => clearInterval(interval);
  }, [configuraciones, connectionStatus, monitoring, updateInterval]);

  // Enviar comando a dispositivo
  const sendCommand = (deviceId, command, params = {}) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'device_command',
        deviceId,
        command,
        params,
        timestamp: new Date().toISOString()
      }));
    }
  };

  // Estadísticas generales
  const overallStats = useMemo(() => {
    const devices = Object.keys(realtimeData);
    const totalPower = devices.reduce((sum, deviceId) => 
      sum + (realtimeData[deviceId]?.sensors.acs712.power || 0), 0);
    const avgTemperature = devices.length > 0 ? 
      devices.reduce((sum, deviceId) => 
        sum + (realtimeData[deviceId]?.system.temperature || 0), 0) / devices.length : 0;
    const totalDetections = devices.reduce((sum, deviceId) => 
      sum + (realtimeData[deviceId]?.sensors.pir.detections || 0), 0);

    return {
      activeDevices: devices.length,
      totalPower: totalPower.toFixed(2),
      avgTemperature: avgTemperature.toFixed(1),
      totalDetections,
      systemHealth: devices.length > 0 ? 
        Math.floor(devices.filter(id => {
          const data = realtimeData[id];
          return data?.sensors.ldr.functioning && 
                 data?.sensors.pir.functioning && 
                 data?.sensors.acs712.functioning;
        }).length / devices.length * 100) : 0
    };
  }, [realtimeData]);

  const DeviceMonitor = ({ deviceId, data, config }) => {
    if (!data) return null;

    const getSignalStrength = (dbm) => {
      if (dbm > -50) return { level: 'excellent', bars: 4 };
      if (dbm > -60) return { level: 'good', bars: 3 };
      if (dbm > -70) return { level: 'fair', bars: 2 };
      return { level: 'poor', bars: 1 };
    };

    const signal = getSignalStrength(data.system.signalStrength);

    return (
      <div className={`device-monitor ${selectedDevice === deviceId ? 'selected' : ''}`}>
        <div className="monitor-header">
          <div className="device-info">
            <h3 className="device-name">{config.nombrePoste || deviceId}</h3>
            <span className="device-location">{config.ubicacion}</span>
          </div>
          
          <div className="device-status">
            <div className="status-indicator online">
              <CheckCircle className="status-icon" />
              <span>Online</span>
            </div>
            <div className={`signal-indicator ${signal.level}`}>
              <Signal className="signal-icon" />
              <span>{data.system.signalStrength} dBm</span>
            </div>
          </div>
        </div>

        <div className="sensors-grid">
          {/* Sensor LDR */}
          <div className={`sensor-widget ldr ${data.sensors.ldr.functioning ? 'working' : 'error'}`}>
            <div className="widget-header">
              <Eye className="widget-icon" />
              <span className="widget-title">LDR</span>
              <span className={`widget-status ${data.sensors.ldr.functioning ? 'ok' : 'error'}`}>
                {data.sensors.ldr.functioning ? '●' : '⚠'}
              </span>
            </div>
            <div className="widget-value">
              <span className="primary-value">{data.sensors.ldr.lux}</span>
              <span className="value-unit">lux</span>
            </div>
            <div className="widget-secondary">
              Raw: {data.sensors.ldr.raw}
            </div>
          </div>

          {/* Sensor PIR */}
          <div className={`sensor-widget pir ${data.sensors.pir.functioning ? 'working' : 'error'}`}>
            <div className="widget-header">
              <Activity className="widget-icon" />
              <span className="widget-title">PIR</span>
              <span className={`widget-status ${data.sensors.pir.functioning ? 'ok' : 'error'}`}>
                {data.sensors.pir.functioning ? '●' : '⚠'}
              </span>
            </div>
            <div className="widget-value">
              <span className={`primary-value ${data.sensors.pir.active ? 'active' : ''}`}>
                {data.sensors.pir.active ? 'ACTIVO' : 'INACTIVO'}
              </span>
            </div>
            <div className="widget-secondary">
              Detecciones: {data.sensors.pir.detections}
            </div>
          </div>

          {/* Sensor ACS712 */}
          <div className={`sensor-widget acs712 ${data.sensors.acs712.functioning ? 'working' : 'error'}`}>
            <div className="widget-header">
              <Zap className="widget-icon" />
              <span className="widget-title">ACS712</span>
              <span className={`widget-status ${data.sensors.acs712.functioning ? 'ok' : 'error'}`}>
                {data.sensors.acs712.functioning ? '●' : '⚠'}
              </span>
            </div>
            <div className="widget-value">
              <span className="primary-value">{data.sensors.acs712.power.toFixed(1)}</span>
              <span className="value-unit">W</span>
            </div>
            <div className="widget-secondary">
              {data.sensors.acs712.current.toFixed(2)}A | {data.sensors.acs712.voltage.toFixed(0)}V
            </div>
          </div>
        </div>

        <div className="system-info">
          <div className="system-metric">
            <Cpu className="metric-icon" />
            <span className="metric-label">CPU:</span>
            <span className="metric-value">{data.system.cpuUsage}%</span>
          </div>
          
          <div className="system-metric">
            <HardDrive className="metric-icon" />
            <span className="metric-label">RAM:</span>
            <span className="metric-value">{(data.system.freeMemory / 1024).toFixed(0)}KB</span>
          </div>
          
          <div className="system-metric">
            <ThermometerSun className="metric-icon" />
            <span className="metric-label">Temp:</span>
            <span className={`metric-value ${data.system.temperature > 50 ? 'warning' : ''}`}>
              {data.system.temperature}°C
            </span>
          </div>
          
          <div className="system-metric">
            <Clock className="metric-icon" />
            <span className="metric-label">Uptime:</span>
            <span className="metric-value">
              {Math.floor(data.system.uptime / 3600)}h {Math.floor((data.system.uptime % 3600) / 60)}m
            </span>
          </div>
        </div>

        <div className="device-actions">
          <button 
            className="action-btn restart"
            onClick={() => sendCommand(deviceId, 'restart')}
            title="Reiniciar dispositivo"
          >
            <RefreshCw className="action-icon" />
          </button>
          
          <button 
            className="action-btn config"
            onClick={() => sendCommand(deviceId, 'get_config')}
            title="Obtener configuración"
          >
            <Cpu className="action-icon" />
          </button>
          
          <button 
            className={`action-btn select ${selectedDevice === deviceId ? 'active' : ''}`}
            onClick={() => setSelectedDevice(selectedDevice === deviceId ? null : deviceId)}
            title="Ver detalles"
          >
            <BarChart3 className="action-icon" />
          </button>
        </div>

        <div className="last-update">
          Actualizado: {data.timestamp.toLocaleTimeString()}
        </div>
      </div>
    );
  };

  return (
    <div className="monitoreo-tiempo-real">
      {/* Header con controles */}
      <div className="monitoreo-header">
        <div className="header-info">
          <Activity className="header-icon" />
          <div className="header-details">
            <h2>Monitoreo en Tiempo Real</h2>
            <p>Supervisión continua de sensores ESP32 y estado del sistema</p>
          </div>
        </div>

        <div className="header-controls">
          <div className="monitoring-controls">
            <button 
              className={`control-btn ${monitoring ? 'active' : ''}`}
              onClick={() => setMonitoring(!monitoring)}
            >
              {monitoring ? <Pause className="control-icon" /> : <Play className="control-icon" />}
              {monitoring ? 'Pausar' : 'Reanudar'}
            </button>

            <select 
              value={updateInterval}
              onChange={(e) => setUpdateInterval(parseInt(e.target.value))}
              className="interval-select"
            >
              <option value={1000}>1 segundo</option>
              <option value={2000}>2 segundos</option>
              <option value={5000}>5 segundos</option>
              <option value={10000}>10 segundos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Estadísticas generales */}
      <div className="stats-overview">
        <div className="stat-card">
          <Activity className="stat-icon" />
          <div className="stat-content">
            <h3>{overallStats.activeDevices}</h3>
            <p>Dispositivos Activos</p>
          </div>
        </div>
        
        <div className="stat-card">
          <Zap className="stat-icon" />
          <div className="stat-content">
            <h3>{overallStats.totalPower}W</h3>
            <p>Consumo Total</p>
          </div>
        </div>
        
        <div className="stat-card">
          <ThermometerSun className="stat-icon" />
          <div className="stat-content">
            <h3>{overallStats.avgTemperature}°C</h3>
            <p>Temperatura Promedio</p>
          </div>
        </div>
        
        <div className="stat-card">
          <Eye className="stat-icon" />
          <div className="stat-content">
            <h3>{overallStats.totalDetections}</h3>
            <p>Detecciones PIR</p>
          </div>
        </div>
        
        <div className="stat-card">
          <CheckCircle className="stat-icon" />
          <div className="stat-content">
            <h3>{overallStats.systemHealth}%</h3>
            <p>Salud del Sistema</p>
          </div>
        </div>
      </div>

      {/* Indicador de monitoreo */}
      <div className="monitoring-status">
        <div className={`status-indicator ${monitoring ? 'active' : 'paused'}`}>
          <div className="status-dot"></div>
          <span className="status-text">
            {monitoring ? 'Monitoreando en tiempo real' : 'Monitoreo pausado'}
          </span>
          <span className="update-interval">
            Actualización cada {updateInterval / 1000}s
          </span>
        </div>
      </div>

      {/* Grid de dispositivos */}
      <div className="devices-monitor-grid">
        {configuraciones.map(config => {
          const deviceData = realtimeData[config.posteId];
          const isOnline = connectionStatus[config.posteId]?.online;
          
          if (!isOnline) {
            return (
              <div key={config.posteId} className="device-monitor offline">
                <div className="monitor-header">
                  <div className="device-info">
                    <h3 className="device-name">{config.nombrePoste || config.posteId}</h3>
                    <span className="device-location">{config.ubicacion}</span>
                  </div>
                  <div className="device-status">
                    <div className="status-indicator offline">
                      <WifiOff className="status-icon" />
                      <span>Offline</span>
                    </div>
                  </div>
                </div>
                <div className="offline-message">
                  <AlertTriangle className="offline-icon" />
                  <p>Dispositivo no disponible</p>
                  <p className="offline-subtitle">Verificar conectividad</p>
                </div>
              </div>
            );
          }

          return (
            <DeviceMonitor
              key={config.posteId}
              deviceId={config.posteId}
              data={deviceData}
              config={config}
            />
          );
        })}
      </div>

      {/* Vista detallada del dispositivo seleccionado */}
      {selectedDevice && realtimeData[selectedDevice] && (
        <div className="device-detail-view">
          <div className="detail-header">
            <h3>Vista Detallada - {configuraciones.find(c => c.posteId === selectedDevice)?.nombrePoste}</h3>
            <button 
              className="close-detail"
              onClick={() => setSelectedDevice(null)}
            >
              ×
            </button>
          </div>

          <div className="detail-content">
            <div className="detail-charts">
              {/* Aquí irían gráficos más detallados del dispositivo seleccionado */}
              <div className="chart-placeholder">
                <BarChart3 className="chart-icon" />
                <p>Gráficos detallados disponibles</p>
                <p className="chart-subtitle">Histórico de sensores y métricas del sistema</p>
              </div>
            </div>

            <div className="detail-metrics">
              <h4>Métricas Avanzadas</h4>
              <div className="advanced-metrics">
                {Object.entries(realtimeData[selectedDevice].network).map(([key, value]) => (
                  <div key={key} className="metric-item">
                    <span className="metric-name">{key}:</span>
                    <span className="metric-value">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Estado de conexión */}
      {!monitoring && (
        <div className="monitoring-overlay">
          <div className="overlay-content">
            <Pause className="overlay-icon" />
            <h3>Monitoreo Pausado</h3>
            <p>Los datos no se están actualizando</p>
            <button 
              className="resume-btn"
              onClick={() => setMonitoring(true)}
            >
              <Play className="btn-icon" />
              Reanudar Monitoreo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonitoreoTiempoReal;