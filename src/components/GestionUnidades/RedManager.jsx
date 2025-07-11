import React, { useState, useEffect } from 'react';
import {
 Wifi,
 WifiOff,
 RefreshCw,
 Search,
 Globe,
 Router,
 Signal,
 Clock,
 CheckCircle,
 XCircle,
 AlertTriangle,
 Settings,
 Monitor,
 Activity,
 Zap,
 Info,
 Shield,
 Database,
 Network,
 Server,
 Eye,
 Download,
 Upload
} from 'lucide-react';

const RedManager = ({ configuraciones, connectionStatus, networkScan, onEscanear, wsRef }) => {
 const [selectedRange, setSelectedRange] = useState('192.168.1.1-254');
 const [manualIP, setManualIP] = useState('');
 const [pingResults, setPingResults] = useState({});
 const [networkInfo, setNetworkInfo] = useState({
   gateway: '192.168.1.1',
   subnet: '255.255.255.0',
   dns: '8.8.8.8',
   dhcpRange: '192.168.1.100-200'
 });
 const [activeTab, setActiveTab] = useState('topology'); // topology, scan, config, diagnostics
 const [networkTraffic, setNetworkTraffic] = useState({
   bytesIn: 0,
   bytesOut: 0,
   packetsIn: 0,
   packetsOut: 0
 });
 const [portScanResults, setPortScanResults] = useState({});

 // Simular tráfico de red
 useEffect(() => {
   const interval = setInterval(() => {
     setNetworkTraffic(prev => ({
       bytesIn: prev.bytesIn + Math.floor(Math.random() * 1024),
       bytesOut: prev.bytesOut + Math.floor(Math.random() * 512),
       packetsIn: prev.packetsIn + Math.floor(Math.random() * 10),
       packetsOut: prev.packetsOut + Math.floor(Math.random() * 8)
     }));
   }, 2000);

   return () => clearInterval(interval);
 }, []);

 // Efectuar ping a IP específica
 const pingDevice = async (ip) => {
   if (wsRef.current?.readyState === WebSocket.OPEN) {
     wsRef.current.send(JSON.stringify({
       type: 'ping_device',
       ip: ip
     }));
     
     setPingResults(prev => ({
       ...prev,
       [ip]: { status: 'pinging', timestamp: new Date() }
     }));
     
     // Simular respuesta después de 2 segundos
     setTimeout(() => {
       const success = Math.random() > 0.3; // 70% éxito
       setPingResults(prev => ({
         ...prev,
         [ip]: {
           status: success ? 'success' : 'failed',
           timestamp: new Date(),
           responseTime: success ? Math.floor(Math.random() * 50) + 1 : null
         }
       }));
     }, 2000);
   }
 };

 // Escaneo de puertos
 const scanPorts = async (ip) => {
   const commonPorts = [22, 23, 80, 443, 8080, 8081, 9001];
   setPortScanResults(prev => ({
     ...prev,
     [ip]: { scanning: true, ports: {} }
   }));

   // Simular escaneo de puertos
   for (let port of commonPorts) {
     setTimeout(() => {
       const isOpen = Math.random() > 0.7; // 30% probabilidad de puerto abierto
       setPortScanResults(prev => ({
         ...prev,
         [ip]: {
           ...prev[ip],
           ports: {
             ...prev[ip]?.ports,
             [port]: isOpen ? 'open' : 'closed'
           }
         }
       }));
     }, port * 100); // Delay progresivo
   }

   setTimeout(() => {
     setPortScanResults(prev => ({
       ...prev,
       [ip]: {
         ...prev[ip],
         scanning: false
       }
     }));
   }, commonPorts.length * 100 + 500);
 };

 // Generar topología de red
 const networkTopology = () => {
   const devices = [];
   
   // Agregar dispositivos configurados
   configuraciones.forEach(config => {
     const status = connectionStatus[config.posteId] || { online: false };
     devices.push({
       id: config.posteId,
       name: config.nombrePoste || `Dispositivo ${config.posteId}`,
       ip: config.red?.ip || 'Sin IP',
       type: 'esp32',
       status: status.online ? 'online' : 'offline',
       lastSeen: status.lastSeen,
       uptime: status.uptime,
       location: config.ubicacion,
       port: config.red?.puerto || 8080,
       mac: config.red?.mac
     });
   });

   // Agregar dispositivos de escaneo
   if (networkScan.devices) {
     networkScan.devices.forEach(device => {
       if (!devices.find(d => d.ip === device.ip)) {
         devices.push({
           id: `unknown_${device.ip}`,
           name: 'Dispositivo Desconocido',
           ip: device.ip,
           type: 'unknown',
           status: device.status === 'responding' ? 'detected' : 'timeout',
           mac: device.mac
         });
       }
     });
   }

   return devices;
 };

 const devices = networkTopology();

 // Estadísticas de red
 const networkStats = {
   totalDevices: devices.length,
   onlineDevices: devices.filter(d => d.status === 'online').length,
   offlineDevices: devices.filter(d => d.status === 'offline').length,
   unknownDevices: devices.filter(d => d.type === 'unknown').length,
   configuredDevices: configuraciones.length,
   avgResponseTime: Object.values(pingResults)
     .filter(p => p.status === 'success' && p.responseTime)
     .reduce((sum, p, _, arr) => sum + p.responseTime / arr.length, 0) || 0
 };

 const formatBytes = (bytes) => {
   if (bytes === 0) return '0 B';
   const k = 1024;
   const sizes = ['B', 'KB', 'MB', 'GB'];
   const i = Math.floor(Math.log(bytes) / Math.log(k));
   return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
 };

 const DeviceNode = ({ device }) => {
   const getDeviceIcon = () => {
     switch (device.type) {
       case 'esp32':
         return Activity;
       case 'unknown':
         return Monitor;
       default:
         return Settings;
     }
   };

   const getStatusColor = () => {
     switch (device.status) {
       case 'online':
         return 'green';
       case 'offline':
         return 'red';
       case 'detected':
         return 'blue';
       case 'timeout':
         return 'gray';
       default:
         return 'gray';
     }
   };

   const DeviceIcon = getDeviceIcon();
   const statusColor = getStatusColor();
   const pingResult = pingResults[device.ip];
   const portScan = portScanResults[device.ip];

   return (
     <div className={`device-node ${statusColor}`}>
       <div className="device-header">
         <DeviceIcon className={`device-icon ${statusColor}`} />
         <div className="device-info">
           <h4 className="device-name">{device.name}</h4>
           <span className="device-ip">{device.ip}</span>
           {device.port && (
             <span className="device-port">:{device.port}</span>
           )}
         </div>
         <div className={`status-indicator ${statusColor}`}>
           {device.status === 'online' && <CheckCircle className="status-icon" />}
           {device.status === 'offline' && <XCircle className="status-icon" />}
           {device.status === 'detected' && <AlertTriangle className="status-icon" />}
           {device.status === 'timeout' && <WifiOff className="status-icon" />}
         </div>
       </div>

       <div className="device-details">
         {device.location && (
           <div className="device-detail">
             <span className="detail-label">Ubicación:</span>
             <span className="detail-value">{device.location}</span>
           </div>
         )}
         
         {device.mac && (
           <div className="device-detail">
             <span className="detail-label">MAC:</span>
             <span className="detail-value">{device.mac}</span>
           </div>
         )}
         
         {device.uptime && (
           <div className="device-detail">
             <span className="detail-label">Uptime:</span>
             <span className="detail-value">
               {Math.floor(device.uptime / 3600)}h {Math.floor((device.uptime % 3600) / 60)}m
             </span>
           </div>
         )}
         
         {device.lastSeen && (
           <div className="device-detail">
             <span className="detail-label">Última conexión:</span>
             <span className="detail-value">
               {device.lastSeen.toLocaleString()}
             </span>
           </div>
         )}
       </div>

       <div className="device-actions">
         <button
           className={`action-btn ping ${pingResult?.status || ''}`}
           onClick={() => pingDevice(device.ip)}
           disabled={pingResult?.status === 'pinging'}
         >
           <Zap className="action-icon" />
           {pingResult?.status === 'pinging' ? 'Ping...' : 'Ping'}
         </button>

         <button
           className={`action-btn port-scan ${portScan?.scanning ? 'scanning' : ''}`}
           onClick={() => scanPorts(device.ip)}
           disabled={portScan?.scanning}
         >
           <Shield className="action-icon" />
           {portScan?.scanning ? 'Escaneando...' : 'Puertos'}
         </button>
         
         {pingResult && pingResult.status !== 'pinging' && (
           <div className={`ping-result ${pingResult.status}`}>
             {pingResult.status === 'success' ? (
               <span className="ping-success">
                 ✓ {pingResult.responseTime}ms
               </span>
             ) : (
               <span className="ping-failed">✗ Sin respuesta</span>
             )}
           </div>
         )}
       </div>

       {/* Mostrar puertos escaneados */}
       {portScan && Object.keys(portScan.ports || {}).length > 0 && (
         <div className="port-scan-results">
           <h5 className="ports-title">Puertos:</h5>
           <div className="ports-grid">
             {Object.entries(portScan.ports).map(([port, status]) => (
               <span key={port} className={`port-badge ${status}`}>
                 {port}: {status}
               </span>
             ))}
           </div>
         </div>
       )}
     </div>
   );
 };

 const NetworkTopology = () => (
   <div className="network-topology">
     <div className="topology-header">
       <div className="topology-info">
         <Router className="topology-icon" />
         <div className="network-details">
           <h3>Red Local IoT - Sistema de Alumbrado</h3>
           <p>Gateway: {networkInfo.gateway}</p>
           <p>Subred: {networkInfo.subnet}</p>
           <p>DNS: {networkInfo.dns}</p>
         </div>
       </div>
       
       <div className="topology-stats">
         <div className="stat-item online">
           <CheckCircle className="stat-icon" />
           <div className="stat-content">
             <span className="stat-value">{networkStats.onlineDevices}</span>
             <span className="stat-label">Online</span>
           </div>
         </div>
         <div className="stat-item offline">
           <XCircle className="stat-icon" />
           <div className="stat-content">
             <span className="stat-value">{networkStats.offlineDevices}</span>
             <span className="stat-label">Offline</span>
           </div>
         </div>
         <div className="stat-item unknown">
           <Monitor className="stat-icon" />
           <div className="stat-content">
             <span className="stat-value">{networkStats.unknownDevices}</span>
             <span className="stat-label">Desconocidos</span>
           </div>
         </div>
         <div className="stat-item response">
           <Signal className="stat-icon" />
           <div className="stat-content">
             <span className="stat-value">{networkStats.avgResponseTime.toFixed(1)}ms</span>
             <span className="stat-label">Ping Promedio</span>
           </div>
         </div>
       </div>
     </div>

     {/* Tráfico de red en tiempo real */}
     <div className="network-traffic">
       <h4 className="traffic-title">
         <Activity className="traffic-icon" />
         Tráfico de Red en Tiempo Real
       </h4>
       <div className="traffic-stats">
         <div className="traffic-item">
           <Download className="traffic-icon-small" />
           <span className="traffic-label">Descarga:</span>
           <span className="traffic-value">{formatBytes(networkTraffic.bytesIn)}</span>
           <span className="traffic-packets">({networkTraffic.packetsIn} paquetes)</span>
         </div>
         <div className="traffic-item">
           <Upload className="traffic-icon-small" />
           <span className="traffic-label">Subida:</span>
           <span className="traffic-value">{formatBytes(networkTraffic.bytesOut)}</span>
           <span className="traffic-packets">({networkTraffic.packetsOut} paquetes)</span>
         </div>
       </div>
     </div>

     <div className="devices-topology">
       <div className="gateway-section">
         <div className="gateway-node">
           <Router className="gateway-icon" />
           <div className="gateway-info">
             <h4>Gateway/Router Principal</h4>
             <span>{networkInfo.gateway}</span>
             <div className="gateway-status online">
               <CheckCircle className="gateway-status-icon" />
               <span>Operativo</span>
             </div>
           </div>
         </div>

         <div className="network-switch">
           <Network className="switch-icon" />
           <div className="switch-info">
             <h5>Switch de Red</h5>
             <span>Distribución IoT</span>
           </div>
         </div>
       </div>

       <div className="network-connections">
         <div className="devices-grid">
           {devices.map((device, index) => (
             <div key={device.id} className="device-connection">
               <div className="connection-line"></div>
               <DeviceNode device={device} />
             </div>
           ))}
         </div>
       </div>
     </div>
   </div>
 );

 const NetworkScanner = () => (
   <div className="network-scanner">
     <div className="scanner-header">
       <h3 className="scanner-title">
         <Search className="scanner-title-icon" />
         Escáner de Red IoT
       </h3>
       <p className="scanner-description">
         Detecta automáticamente dispositivos ESP32 y otros equipos en la red local
       </p>
     </div>

     <div className="scanner-controls">
       <div className="scan-options">
         <div className="form-group">
           <label className="form-label">Rango de Escaneo:</label>
           <select
             value={selectedRange}
             onChange={(e) => setSelectedRange(e.target.value)}
             className="form-select"
           >
             <option value="192.168.1.1-254">192.168.1.1-254 (Toda la subred)</option>
             <option value="192.168.1.100-200">192.168.1.100-200 (Rango DHCP)</option>
             <option value="192.168.1.1-50">192.168.1.1-50 (Equipos de red)</option>
             <option value="192.168.1.200-254">192.168.1.200-254 (Dispositivos IoT)</option>
             <option value="custom">Personalizado</option>
           </select>
         </div>

         {selectedRange === 'custom' && (
           <div className="form-group">
             <label className="form-label">IP o Rango Personalizado:</label>
             <input
               type="text"
               value={manualIP}
               onChange={(e) => setManualIP(e.target.value)}
               placeholder="192.168.1.100 o 192.168.1.100-110"
               className="form-input"
             />
           </div>
         )}

         <div className="scan-info">
           <Info className="scan-info-icon" />
           <div className="scan-info-text">
             <p><strong>Tipos de escaneo:</strong></p>
             <ul>
               <li>Ping sweep para detectar dispositivos activos</li>
               <li>Detección de puertos comunes (22, 80, 8080, etc.)</li>
               <li>Identificación de dispositivos ESP32</li>
               <li>Análisis de direcciones MAC</li>
             </ul>
           </div>
         </div>
       </div>

       <div className="scan-actions">
         <button
           className={`scan-btn primary ${networkScan.scanning ? 'scanning' : ''}`}
           onClick={onEscanear}
           disabled={networkScan.scanning}
         >
           <Search className={`scan-icon ${networkScan.scanning ? 'spinning' : ''}`} />
           {networkScan.scanning ? 'Escaneando Red...' : 'Iniciar Escaneo Completo'}
         </button>

         <button
           className="scan-btn secondary"
           onClick={() => {
             // Escaneo rápido de dispositivos conocidos
             configuraciones.forEach(config => {
               if (config.red?.ip) {
                 pingDevice(config.red.ip);
               }
             });
           }}
         >
           <Zap className="scan-icon" />
           Ping Dispositivos Conocidos
         </button>
       </div>
     </div>

     <div className="scan-progress">
       {networkScan.scanning && (
         <div className="progress-container">
           <div className="progress-bar">
             <div className="progress-fill scanning"></div>
           </div>
           <span className="progress-text">
             Escaneando {selectedRange}... Detectando dispositivos ESP32 y equipos de red
           </span>
         </div>
       )}
     </div>

     <div className="scan-results">
       <div className="results-header">
         <h4 className="results-title">
           Resultados del Escaneo 
           {networkScan.devices && networkScan.devices.length > 0 && (
             <span className="results-count">({networkScan.devices.length} dispositivos encontrados)</span>
           )}
         </h4>
         
         {networkScan.devices && networkScan.devices.length > 0 && (
           <div className="results-summary">
             <span className="summary-item responding">
               {networkScan.devices.filter(d => d.status === 'responding').length} respondiendo
             </span>
             <span className="summary-item timeout">
               {networkScan.devices.filter(d => d.status === 'timeout').length} sin respuesta
             </span>
           </div>
         )}
       </div>

       {(!networkScan.devices || networkScan.devices.length === 0) && !networkScan.scanning ? (
         <div className="no-results">
           <Search className="no-results-icon" />
           <h5>No se han encontrado dispositivos</h5>
           <p className="no-results-subtitle">
             Ejecuta un escaneo para detectar dispositivos ESP32 y otros equipos en la red
           </p>
           <div className="scan-tips">
             <h6>Consejos para el escaneo:</h6>
             <ul>
               <li>Asegúrate de que los dispositivos ESP32 estén encendidos</li>
               <li>Verifica que estén en la misma red (192.168.1.x)</li>
               <li>Algunos dispositivos pueden tener firewall activado</li>
             </ul>
           </div>
         </div>
       ) : (
         <div className="results-grid">
           {networkScan.devices && networkScan.devices.map((device, index) => (
             <div key={index} className={`result-card ${device.status}`}>
               <div className="result-header">
                 <Monitor className="result-icon" />
                 <div className="result-info">
                   <h5 className="result-ip">{device.ip}</h5>
                   <span className={`result-status ${device.status}`}>
                     {device.status === 'responding' ? 'Respondiendo' : 'Sin respuesta'}
                   </span>
                 </div>
                 <div className={`result-indicator ${device.status}`}>
                   {device.status === 'responding' ? (
                     <CheckCircle className="result-status-icon" />
                   ) : (
                     <XCircle className="result-status-icon" />
                   )}
                 </div>
               </div>

               {device.mac && (
                 <div className="result-detail">
                   <span className="detail-label">MAC:</span>
                   <span className="detail-value">{device.mac}</span>
                 </div>
               )}

               {device.hostname && (
                 <div className="result-detail">
                   <span className="detail-label">Hostname:</span>
                   <span className="detail-value">{device.hostname}</span>
                 </div>
               )}

               <div className="result-actions">
                 <button
                   className="action-btn test"
                   onClick={() => pingDevice(device.ip)}
                 >
                   <Zap className="action-icon" />
                   Test Ping
                 </button>
                 
                 <button
                   className="action-btn scan"
                   onClick={() => scanPorts(device.ip)}
                 >
                   <Shield className="action-icon" />
                   Escanear Puertos
                 </button>
               </div>
             </div>
           ))}
         </div>
       )}
     </div>
   </div>
 );

 const NetworkConfig = () => (
   <div className="network-config">
     <div className="config-header">
       <h3 className="config-title">
         <Settings className="config-title-icon" />
         Configuración de Red
       </h3>
       <p className="config-description">
         Parámetros de red para el sistema de alumbrado público IoT
       </p>
     </div>

     <div className="config-sections">
       <div className="config-section">
         <h4 className="section-title">
           <Globe className="section-icon" />
           Configuración TCP/IP
         </h4>
         
         <div className="form-grid">
           <div className="form-group">
             <label className="form-label">Gateway Principal:</label>
             <input
               type="text"
               value={networkInfo.gateway}
               onChange={(e) => setNetworkInfo(prev => ({ ...prev, gateway: e.target.value }))}
               className="form-input"
               placeholder="192.168.1.1"
             />
           </div>

           <div className="form-group">
             <label className="form-label">Máscara de Subred:</label>
             <input
               type="text"
               value={networkInfo.subnet}
               onChange={(e) => setNetworkInfo(prev => ({ ...prev, subnet: e.target.value }))}
               className="form-input"
               placeholder="255.255.255.0"
             />
           </div>

           <div className="form-group">
             <label className="form-label">DNS Primario:</label>
             <input
               type="text"
               value={networkInfo.dns}
               onChange={(e) => setNetworkInfo(prev => ({ ...prev, dns: e.target.value }))}
               className="form-input"
               placeholder="8.8.8.8"
             />
           </div>

           <div className="form-group">
             <label className="form-label">Rango DHCP IoT:</label>
             <input
               type="text"
               value={networkInfo.dhcpRange}
               onChange={(e) => setNetworkInfo(prev => ({ ...prev, dhcpRange: e.target.value }))}
               className="form-input"
               placeholder="192.168.1.100-200"
             />
           </div>
         </div>
       </div>

       <div className="config-section">
         <h4 className="section-title">
           <Server className="section-icon" />
           WebSocket Server
         </h4>
         
         <div className="websocket-info">
           <div className="ws-status">
             <div className={`ws-indicator ${wsRef.current?.readyState === WebSocket.OPEN ? 'connected' : 'disconnected'}`}>
               {wsRef.current?.readyState === WebSocket.OPEN ? (
                 <CheckCircle className="ws-status-icon" />
               ) : (
                 <XCircle className="ws-status-icon" />
               )}
               <span className="ws-status-text">
                 {wsRef.current?.readyState === WebSocket.OPEN ? 'Conectado' : 'Desconectado'}
               </span>
             </div>
             
             <div className="ws-details">
               <span className="ws-detail">
                 Protocolo: WebSocket (ws://)
               </span>
               <span className="ws-detail">
                 Puerto: 8080
               </span>
               <span className="ws-detail">
                 Dispositivos conectados: {networkStats.onlineDevices}
               </span>
             </div>
           </div>

           <div className="ws-config">
             <div className="form-group">
               <label className="form-label">Servidor WebSocket:</label>
               <input
                 type="text"
                 value="ws://192.168.1.100:8080/ws"
                 className="form-input"
                 disabled
               />
             </div>
             
             <div className="form-group">
               <label className="form-label">Timeout (ms):</label>
               <input
                 type="number"
                 value="5000"
                 className="form-input"
                 disabled
               />
             </div>
           </div>
         </div>
       </div>

       <div className="config-section">
         <h4 className="section-title">
           <Database className="section-icon" />
           Estadísticas de Red
         </h4>
         
         <div className="network-stats-grid">
           <div className="stat-card">
             <Activity className="stat-icon" />
             <div className="stat-content">
               <h5>Dispositivos Activos</h5>
               <span className="stat-value">{networkStats.onlineDevices}/{networkStats.totalDevices}</span>
             </div>
           </div>
           
           <div className="stat-card">
             <Signal className="stat-icon" />
             <div className="stat-content">
               <h5>Latencia Promedio</h5>
               <span className="stat-value">{networkStats.avgResponseTime.toFixed(1)}ms</span>
             </div>
           </div>
           
           <div className="stat-card">
             <Download className="stat-icon" />
             <div className="stat-content">
               <h5>Tráfico Recibido</h5>
               <span className="stat-value">{formatBytes(networkTraffic.bytesIn)}</span>
             </div>
           </div>
           
           <div className="stat-card">
             <Upload className="stat-icon" />
             <div className="stat-content">
               <h5>Tráfico Enviado</h5>
               <span className="stat-value">{formatBytes(networkTraffic.bytesOut)}</span>
             </div>
           </div>
         </div>
       </div>
     </div>
   </div>
 );

 const NetworkDiagnostics = () => (
   <div className="network-diagnostics">
     <div className="diagnostics-header">
       <h3 className="diagnostics-title">
         <Activity className="diagnostics-title-icon" />
         Diagnósticos de Red
       </h3>
       <p className="diagnostics-description">
         Herramientas de diagnóstico y resolución de problemas de conectividad
       </p>
     </div>

     <div className="diagnostics-tools">
       <div className="diagnostic-section">
         <h4 className="section-title">Pruebas de Conectividad</h4>
         <div className="tools-grid">
           <div className="tool-card">
             <h5>Test de Ping Masivo</h5>
             <p>Prueba la conectividad de todos los dispositivos configurados</p>
             <button 
               className="tool-btn"
               onClick={() => {
                 configuraciones.forEach(config => {
                   if (config.red?.ip) pingDevice(config.red.ip);
                 });
               }}
             >
               <Zap className="tool-icon" />
               Ejecutar Ping Masivo
             </button>
           </div>

           <div className="tool-card">
             <h5>Escaneo de Puertos</h5>
             <p>Verifica puertos abiertos en dispositivos específicos</p>
             <button 
               className="tool-btn"
               onClick={() => {
                 devices.forEach(device => {
                   if (device.status === 'online') scanPorts(device.ip);
                 });
               }}
             >
               <Shield className="tool-icon" />
               Escanear Puertos Activos
             </button>
           </div>

           <div className="tool-card">
             <h5>Test de Gateway</h5>
             <p>Verifica la conectividad con el gateway principal</p>
             <button 
               className="tool-btn"
               onClick={() => pingDevice(networkInfo.gateway)}
             >
               <Router className="tool-icon" />
               Test Gateway
             </button>
           </div>
         </div>
       </div>

       <div className="diagnostic-section">
         <h4 className="section-title">Resultados de Diagnóstico</h4>
         <div className="diagnostics-results">
           <div className="results-summary">
             <div className="summary-item success">
               <CheckCircle className="summary-icon" />
               <span className="summary-label">Conexiones Exitosas:</span>
               <span className="summary-value">
                 {Object.values(pingResults).filter(p => p.status === 'success').length}
               </span>
             </div>
             
             <div className="summary-item failed">
               <XCircle className="summary-icon" />
               <span className="summary-label">Conexiones Fallidas:</span>
               <span className="summary-value">
                 {Object.values(pingResults).filter(p => p.status === 'failed').length}
               </span>
             </div>
             
             <div className="summary-item average">
               <Signal className="summary-icon" />
               <span className="summary-label">Latencia Promedio:</span>
               <span className="summary-value">{networkStats.avgResponseTime.toFixed(1)}ms</span>
             </div>
           </div>

           <div className="diagnostic-details">
             {Object.entries(pingResults).length > 0 && (
               <div className="ping-results-table">
                 <h5>Resultados de Ping:</h5>
                 <div className="table-container">
                   <table className="results-table">
                     <thead>
                       <tr>
                         <th>IP</th>
                         <th>Estado</th>
                         <th>Tiempo de Respuesta</th>
                         <th>Timestamp</th>
                       </tr>
                     </thead>
                     <tbody>
                       {Object.entries(pingResults).map(([ip, result]) => (
                         <tr key={ip} className={result.status}>
                           <td>{ip}</td>
                           <td>
                             <span className={`status-badge ${result.status}`}>
                               {result.status === 'success' ? 'Éxito' : 
                                result.status === 'failed' ? 'Fallo' : 'Ejecutando...'}
                             </span>
                           </td>
                           <td>
                             {result.responseTime ? `${result.responseTime}ms` : 'N/A'}
                           </td>
                           <td>{result.timestamp?.toLocaleTimeString()}</td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               </div>
             )}
           </div>
         </div>
       </div>

       <div className="diagnostic-section">
         <h4 className="section-title">Recomendaciones del Sistema</h4>
         <div className="recommendations">
           {networkStats.onlineDevices < networkStats.configuredDevices && (
             <div className="recommendation warning">
               <AlertTriangle className="rec-icon" />
               <div className="rec-content">
                 <h5>Dispositivos Offline Detectados</h5>
                 <p>
                   {networkStats.configuredDevices - networkStats.onlineDevices} dispositivos no responden. 
                   Verifica la alimentación y conectividad de red.
                 </p>
               </div>
             </div>
           )}

           {networkStats.avgResponseTime > 100 && (
             <div className="recommendation warning">
               <Signal className="rec-icon" />
               <div className="rec-content">
                 <h5>Latencia Alta Detectada</h5>
                 <p>
                   La latencia promedio es de {networkStats.avgResponseTime.toFixed(1)}ms. 
                   Considera optimizar la red o verificar congestión.
                 </p>
               </div>
             </div>
           )}

           {networkStats.unknownDevices > 0 && (
             <div className="recommendation info">
               <Info className="rec-icon" />
               <div className="rec-content">
                 <h5>Dispositivos No Identificados</h5>
                 <p>
                   Se detectaron {networkStats.unknownDevices} dispositivos no configurados. 
                   Revisa si son dispositivos ESP32 que requieren configuración.
                 </p>
               </div>
             </div>
           )}

           {networkStats.onlineDevices === networkStats.configuredDevices && networkStats.avgResponseTime < 50 && (
             <div className="recommendation success">
               <CheckCircle className="rec-icon" />
               <div className="rec-content">
                 <h5>Red Funcionando Óptimamente</h5>
                 <p>
                   Todos los dispositivos están online con excelente latencia. 
                   El sistema de red está funcionando correctamente.
                 </p>
               </div>
             </div>
           )}
         </div>
       </div>
     </div>
   </div>
 );

 return (
   <div className="red-manager">
     {/* Header con estadísticas principales */}
     <div className="red-header">
       <div className="header-info">
         <Network className="header-icon" />
         <div className="header-details">
           <h2>Gestión de Red IoT</h2>
           <p>Monitoreo y configuración de conectividad para dispositivos ESP32</p>
         </div>
       </div>
       
       <div className="header-stats">
         <div className="header-stat">
           <span className="stat-value">{networkStats.onlineDevices}</span>
           <span className="stat-label">Dispositivos Online</span>
         </div>
         <div className="header-stat">
           <span className="stat-value">{networkStats.avgResponseTime.toFixed(0)}ms</span>
           <span className="stat-label">Latencia Promedio</span>
         </div>
         <div className="header-stat">
           <span className="stat-value">{formatBytes(networkTraffic.bytesIn + networkTraffic.bytesOut)}</span>
           <span className="stat-label">Tráfico Total</span>
         </div>
       </div>
     </div>

     {/* Navegación de tabs */}
     <div className="red-tabs">
       <button 
         className={`tab-btn ${activeTab === 'topology' ? 'active' : ''}`}
         onClick={() => setActiveTab('topology')}
       >
         <Router className="tab-icon" />
         Topología
       </button>
       <button 
         className={`tab-btn ${activeTab === 'scan' ? 'active' : ''}`}
         onClick={() => setActiveTab('scan')}
       >
         <Search className="tab-icon" />
         Escaneo
       </button>
       <button 
         className={`tab-btn ${activeTab === 'config' ? 'active' : ''}`}
         onClick={() => setActiveTab('config')}
       >
         <Settings className="tab-icon" />
         Configuración
       </button>
       <button 
         className={`tab-btn ${activeTab === 'diagnostics' ? 'active' : ''}`}
         onClick={() => setActiveTab('diagnostics')}
       >
         <Activity className="tab-icon" />
         Diagnósticos
       </button>
     </div>

     {/* Contenido de tabs */}
     <div className="tab-content">
       {activeTab === 'topology' && <NetworkTopology />}
       {activeTab === 'scan' && <NetworkScanner />}
       {activeTab === 'config' && <NetworkConfig />}
       {activeTab === 'diagnostics' && <NetworkDiagnostics />}
     </div>
   </div>
 );
};

export default RedManager;