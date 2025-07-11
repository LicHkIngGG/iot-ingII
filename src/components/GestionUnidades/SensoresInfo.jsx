import React, { useState, useMemo } from 'react';
import {
 Eye,
 Activity,
 Zap,
 CheckCircle,
 XCircle,
 AlertTriangle,
 Info,
 Settings,
 BarChart3,
 Filter,
 Search,
 Cpu
} from 'lucide-react';

const SensoresInfo = ({ configuraciones, connectionStatus }) => {
 const [filter, setFilter] = useState('all'); // all, enabled, disabled, online, offline
 const [searchTerm, setSearchTerm] = useState('');
 const [selectedSensor, setSelectedSensor] = useState('all'); // all, ldr, pir, acs712

 // Procesar datos de sensores
 const sensorsData = useMemo(() => {
   const data = [];
   
   configuraciones.forEach(config => {
     const deviceStatus = connectionStatus[config.posteId] || { online: false };
     
     // Procesar cada tipo de sensor
     Object.entries(config.sensores || {}).forEach(([sensorType, sensorConfig]) => {
       data.push({
         id: `${config.posteId}_${sensorType}`,
         deviceId: config.posteId,
         deviceName: config.nombrePoste || `Dispositivo ${config.posteId}`,
         deviceLocation: config.ubicacion || 'Ubicación no especificada',
         sensorType,
         sensorConfig,
         deviceOnline: deviceStatus.online,
         enabled: sensorConfig.habilitado || false,
         lastUpdate: deviceStatus.lastSeen
       });
     });
   });
   
   return data;
 }, [configuraciones, connectionStatus]);

 // Filtrar datos
 const filteredSensors = useMemo(() => {
   let filtered = sensorsData.filter(sensor => {
     // Filtro por tipo de sensor
     if (selectedSensor !== 'all' && sensor.sensorType !== selectedSensor) return false;
     
     // Filtro por estado
     if (filter === 'enabled' && !sensor.enabled) return false;
     if (filter === 'disabled' && sensor.enabled) return false;
     if (filter === 'online' && !sensor.deviceOnline) return false;
     if (filter === 'offline' && sensor.deviceOnline) return false;
     
     // Filtro por búsqueda
     if (searchTerm) {
       const searchLower = searchTerm.toLowerCase();
       return (
         sensor.deviceName.toLowerCase().includes(searchLower) ||
         sensor.deviceLocation.toLowerCase().includes(searchLower) ||
         sensor.deviceId.toLowerCase().includes(searchLower)
       );
     }
     
     return true;
   });
   
   return filtered;
 }, [sensorsData, filter, searchTerm, selectedSensor]);

 // Estadísticas de sensores
 const sensorStats = useMemo(() => {
   const stats = {
     total: sensorsData.length,
     enabled: sensorsData.filter(s => s.enabled).length,
     disabled: sensorsData.filter(s => !s.enabled).length,
     online: sensorsData.filter(s => s.deviceOnline && s.enabled).length,
     offline: sensorsData.filter(s => !s.deviceOnline && s.enabled).length,
     byType: {}
   };
   
   // Estadísticas por tipo
   ['ldr', 'pir', 'acs712'].forEach(type => {
     const typeSensors = sensorsData.filter(s => s.sensorType === type);
     stats.byType[type] = {
       total: typeSensors.length,
       enabled: typeSensors.filter(s => s.enabled).length,
       online: typeSensors.filter(s => s.deviceOnline && s.enabled).length
     };
   });
   
   return stats;
 }, [sensorsData]);

 const getSensorIcon = (type) => {
   switch (type) {
     case 'ldr': return Eye;
     case 'pir': return Activity;
     case 'acs712': return Zap;
     default: return Settings;
   }
 };

 const getSensorName = (type) => {
   switch (type) {
     case 'ldr': return 'Sensor LDR';
     case 'pir': return 'Sensor PIR';
     case 'acs712': return 'Sensor ACS712';
     default: return 'Sensor';
   }
 };

 const getSensorDescription = (type) => {
   switch (type) {
     case 'ldr': return 'Sensor de luminosidad para detección de luz ambiental';
     case 'pir': return 'Sensor de movimiento para detección de presencia';
     case 'acs712': return 'Sensor de corriente para medición de consumo energético';
     default: return 'Sensor IoT';
   }
 };

 const getSensorSpecs = (type, config) => {
   switch (type) {
     case 'ldr':
       return [
         `Umbral encendido: ${config.umbralEncendido || 100} lux`,
         `Umbral apagado: ${config.umbralApagado || 300} lux`,
         `Calibración: ${config.factorCalibracion || 1.0}`,
         `Filtro ruido: ${config.filtroRuido || 5}`
       ];
     case 'pir':
       return [
         `Sensibilidad: ${config.sensibilidad || 'media'}`,
         `Tiempo activación: ${config.tiempoActivacion || 30}s`,
         `Rango detección: ${config.rangoDeteccion || 5}m`,
         `Retardo lectura: ${config.retardoLectura || 2}s`
       ];
     case 'acs712':
       return [
         `Modelo: ACS712-${config.modelo || '20A'}`,
         `Voltaje referencia: ${config.voltajeReferencia || 2.5}V`,
         `Sensibilidad: ${config.sensibilidad || 100}mV/A`,
         `Alerta máxima: ${config.alertaMaxima || 20}A`
       ];
     default:
       return ['Configuración no disponible'];
   }
 };

 const SensorCard = ({ sensor }) => {
   const SensorIcon = getSensorIcon(sensor.sensorType);
   const specs = getSensorSpecs(sensor.sensorType, sensor.sensorConfig);
   
   return (
     <div className={`sensor-card ${sensor.enabled ? 'enabled' : 'disabled'} ${sensor.deviceOnline ? 'online' : 'offline'}`}>
       <div className="sensor-header">
         <div className="sensor-title">
           <SensorIcon className={`sensor-icon ${sensor.sensorType}`} />
           <div className="sensor-info">
             <h3 className="sensor-name">{getSensorName(sensor.sensorType)}</h3>
             <p className="sensor-device">{sensor.deviceName}</p>
           </div>
         </div>
         
         <div className="sensor-status">
           <div className={`status-indicator ${sensor.enabled ? 'enabled' : 'disabled'}`}>
             {sensor.enabled ? (
               <CheckCircle className="status-icon" />
             ) : (
               <XCircle className="status-icon" />
             )}
             <span className="status-text">
               {sensor.enabled ? 'Habilitado' : 'Deshabilitado'}
             </span>
           </div>
           
           <div className={`connection-indicator ${sensor.deviceOnline ? 'online' : 'offline'}`}>
             <div className={`connection-dot ${sensor.deviceOnline ? 'online' : 'offline'}`}></div>
             <span className="connection-text">
               {sensor.deviceOnline ? 'Online' : 'Offline'}
             </span>
           </div>
         </div>
       </div>

       <div className="sensor-description">
         <p>{getSensorDescription(sensor.sensorType)}</p>
       </div>

       <div className="sensor-location">
         <span className="location-label">Ubicación:</span>
         <span className="location-value">{sensor.deviceLocation}</span>
       </div>

       <div className="sensor-specs">
         <h4 className="specs-title">Configuración:</h4>
         <ul className="specs-list">
           {specs.map((spec, index) => (
             <li key={index} className="spec-item">{spec}</li>
           ))}
         </ul>
       </div>

       {sensor.lastUpdate && (
         <div className="sensor-footer">
           <span className="last-update">
             Última actualización: {sensor.lastUpdate.toLocaleString()}
           </span>
         </div>
       )}
     </div>
   );
 };

 return (
   <div className="sensores-info">
     {/* Header con estadísticas generales */}
     <div className="sensores-header">
       <div className="header-stats">
         <div className="stat-card total">
           <div className="stat-icon">
             <Settings className="icon" />
           </div>
           <div className="stat-content">
             <h3>{sensorStats.total}</h3>
             <p>Total Sensores</p>
           </div>
         </div>
         
         <div className="stat-card enabled">
           <div className="stat-icon">
             <CheckCircle className="icon" />
           </div>
           <div className="stat-content">
             <h3>{sensorStats.enabled}</h3>
             <p>Habilitados</p>
           </div>
         </div>
         
         <div className="stat-card online">
           <div className="stat-icon">
             <Activity className="icon" />
           </div>
           <div className="stat-content">
             <h3>{sensorStats.online}</h3>
             <p>Online</p>
           </div>
         </div>
         
         <div className="stat-card offline">
           <div className="stat-icon">
             <AlertTriangle className="icon" />
           </div>
           <div className="stat-content">
             <h3>{sensorStats.offline}</h3>
             <p>Offline</p>
           </div>
         </div>
       </div>
     </div>

     {/* Información de tipos de sensores */}
     <div className="sensor-types-overview">
       <h3 className="section-title">Tipos de Sensores Disponibles</h3>
       <div className="sensor-types-grid">
         {Object.entries(sensorStats.byType).map(([type, stats]) => {
           const SensorIcon = getSensorIcon(type);
           const efficiency = stats.total > 0 ? (stats.online / stats.total * 100).toFixed(1) : 0;
           
           return (
             <div key={type} className="sensor-type-card">
               <div className="type-header">
                 <SensorIcon className={`type-icon ${type}`} />
                 <h4 className="type-name">{getSensorName(type)}</h4>
               </div>
               
               <div className="type-description">
                 <p>{getSensorDescription(type)}</p>
               </div>
               
               <div className="type-stats">
                 <div className="type-stat">
                   <span className="stat-label">Total:</span>
                   <span className="stat-value">{stats.total}</span>
                 </div>
                 <div className="type-stat">
                   <span className="stat-label">Habilitados:</span>
                   <span className="stat-value">{stats.enabled}</span>
                 </div>
                 <div className="type-stat">
                   <span className="stat-label">Online:</span>
                   <span className="stat-value">{stats.online}</span>
                 </div>
                 <div className="type-stat">
                   <span className="stat-label">Eficiencia:</span>
                   <span className={`stat-value ${efficiency > 80 ? 'good' : efficiency > 60 ? 'medium' : 'poor'}`}>
                     {efficiency}%
                   </span>
                 </div>
               </div>
               
               <div className="type-progress">
                 <div className="progress-bar">
                   <div 
                     className="progress-fill"
                     style={{ width: `${efficiency}%` }}
                   ></div>
                 </div>
               </div>
             </div>
           );
         })}
       </div>
     </div>

     {/* Controles de filtro */}
     <div className="sensores-controls">
       <div className="search-section">
         <div className="search-box">
           <Search className="search-icon" />
           <input
             type="text"
             placeholder="Buscar sensores por dispositivo o ubicación..."
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             className="search-input"
           />
         </div>
       </div>

       <div className="filter-section">
         <div className="filter-group">
           <label className="filter-label">Tipo de Sensor:</label>
           <select
             value={selectedSensor}
             onChange={(e) => setSelectedSensor(e.target.value)}
             className="filter-select"
           >
             <option value="all">Todos los sensores</option>
             <option value="ldr">Solo LDR</option>
             <option value="pir">Solo PIR</option>
             <option value="acs712">Solo ACS712</option>
           </select>
         </div>

         <div className="filter-buttons">
           <Filter className="filter-icon" />
           {[
             { key: 'all', label: 'Todos', count: sensorsData.length },
             { key: 'enabled', label: 'Habilitados', count: sensorStats.enabled },
             { key: 'disabled', label: 'Deshabilitados', count: sensorStats.disabled },
             { key: 'online', label: 'Online', count: sensorStats.online },
             { key: 'offline', label: 'Offline', count: sensorStats.offline }
           ].map(({ key, label, count }) => (
             <button
               key={key}
               className={`filter-btn ${filter === key ? 'active' : ''} ${key}`}
               onClick={() => setFilter(key)}
             >
               {label}
               <span className="filter-count">{count}</span>
             </button>
           ))}
         </div>
       </div>
     </div>

     {/* Lista de sensores */}
     <div className="sensores-list">
       {filteredSensors.length === 0 ? (
         <div className="no-sensors">
           <div className="no-sensors-content">
             <Settings className="no-sensors-icon" />
             <h3 className="no-sensors-title">
               {searchTerm || filter !== 'all' || selectedSensor !== 'all'
                 ? 'No se encontraron sensores'
                 : 'No hay sensores configurados'
               }
             </h3>
             <p className="no-sensors-subtitle">
               {searchTerm
                 ? `No hay resultados para "${searchTerm}"`
                 : filter !== 'all'
                 ? `No hay sensores con estado "${filter}"`
                 : selectedSensor !== 'all'
                 ? `No hay sensores de tipo "${getSensorName(selectedSensor)}"`
                 : 'Configure dispositivos para ver los sensores disponibles'
               }
             </p>
           </div>
         </div>
       ) : (
         <div className="sensors-grid">
           {filteredSensors.map((sensor) => (
             <SensorCard key={sensor.id} sensor={sensor} />
           ))}
         </div>
       )}
     </div>

     {/* Resumen de capacidades */}
     <div className="sensor-capabilities">
       <h3 className="section-title">Capacidades de los Sensores</h3>
       <div className="capabilities-grid">
         <div className="capability-card ldr">
           <div className="capability-header">
             <Eye className="capability-icon" />
             <h4>Sensor LDR</h4>
           </div>
           <div className="capability-content">
             <h5>Funcionalidades:</h5>
             <ul>
               <li>Detección de luminosidad ambiental</li>
               <li>Control automático de encendido/apagado</li>
               <li>Calibración personalizable</li>
               <li>Filtro de ruido configurable</li>
             </ul>
             <h5>Especificaciones:</h5>
             <ul>
               <li>Rango: 0-1023 (valor digital)</li>
               <li>Voltaje: 3.3V - 5V</li>
               <li>Precisión: ±5%</li>
               <li>Tiempo respuesta: &lt;1s</li>
             </ul>
           </div>
         </div>

         <div className="capability-card pir">
           <div className="capability-header">
             <Activity className="capability-icon" />
             <h4>Sensor PIR</h4>
           </div>
           <div className="capability-content">
             <h5>Funcionalidades:</h5>
             <ul>
               <li>Detección de movimiento infrarrojo</li>
               <li>Activación automática por presencia</li>
               <li>Sensibilidad ajustable</li>
               <li>Contador de detecciones</li>
             </ul>
             <h5>Especificaciones:</h5>
             <ul>
               <li>Rango: 3-7 metros</li>
               <li>Ángulo: 120°</li>
               <li>Voltaje: 5V - 12V</li>
               <li>Tiempo activación: 5-300s</li>
             </ul>
           </div>
         </div>

         <div className="capability-card acs712">
           <div className="capability-header">
             <Zap className="capability-icon" />
             <h4>Sensor ACS712</h4>
           </div>
           <div className="capability-content">
             <h5>Funcionalidades:</h5>
             <ul>
               <li>Medición de corriente AC/DC</li>
               <li>Cálculo de consumo energético</li>
               <li>Detección de sobrecarga</li>
               <li>Filtro promedio configurable</li>
             </ul>
             <h5>Especificaciones:</h5>
             <ul>
               <li>Modelos: 5A, 20A, 30A</li>
               <li>Precisión: ±1.5%</li>
               <li>Aislamiento: 2.1kV RMS</li>
               <li>Tiempo respuesta: 5μs</li>
             </ul>
           </div>
         </div>
       </div>
     </div>

     {/* Gráfico de distribución */}
     <div className="sensor-distribution">
       <h3 className="section-title">Distribución de Sensores</h3>
       <div className="distribution-chart">
         <div className="chart-header">
           <BarChart3 className="chart-icon" />
           <span>Estado de Sensores por Tipo</span>
         </div>
         
         <div className="chart-content">
           {Object.entries(sensorStats.byType).map(([type, stats]) => {
             const SensorIcon = getSensorIcon(type);
             const enabledPercentage = stats.total > 0 ? (stats.enabled / stats.total * 100) : 0;
             const onlinePercentage = stats.enabled > 0 ? (stats.online / stats.enabled * 100) : 0;
             
             return (
               <div key={type} className="chart-row">
                 <div className="chart-label">
                   <SensorIcon className={`chart-sensor-icon ${type}`} />
                   <span className="sensor-type-name">{getSensorName(type)}</span>
                 </div>
                 
                 <div className="chart-bars">
                   <div className="chart-bar-group">
                     <span className="bar-label">Habilitados</span>
                     <div className="chart-bar">
                       <div 
                         className="bar-fill enabled"
                         style={{ width: `${enabledPercentage}%` }}
                       ></div>
                     </div>
                     <span className="bar-value">{stats.enabled}/{stats.total}</span>
                   </div>
                   
                   <div className="chart-bar-group">
                     <span className="bar-label">Online</span>
                     <div className="chart-bar">
                       <div 
                         className="bar-fill online"
                         style={{ width: `${onlinePercentage}%` }}
                       ></div>
                     </div>
                     <span className="bar-value">{stats.online}/{stats.enabled}</span>
                   </div>
                 </div>
               </div>
             );
           })}
         </div>
       </div>
     </div>

     {/* Información técnica */}
     <div className="technical-info">
       <h3 className="section-title">Información Técnica</h3>
       <div className="info-grid">
         <div className="info-card">
           <Cpu className="info-icon" />
           <h4>Integración ESP32</h4>
           <p>Los sensores se conectan directamente a los pines GPIO del ESP32, permitiendo lecturas analógicas y digitales en tiempo real.</p>
         </div>
         
         <div className="info-card">
           <Settings className="info-icon" />
           <h4>Configuración Remota</h4>
           <p>Todos los parámetros de los sensores pueden configurarse remotamente a través de la interfaz web sin necesidad de reprogramar el dispositivo.</p>
         </div>
         
         <div className="info-card">
           <BarChart3 className="info-icon" />
           <h4>Monitoreo Continuo</h4>
           <p>Los sensores envían datos continuamente al sistema central, permitiendo monitoreo en tiempo real y generación de alertas automáticas.</p>
         </div>
         
         <div className="info-card">
           <CheckCircle className="info-icon" />
           <h4>Auto-diagnóstico</h4>
           <p>El sistema detecta automáticamente fallas en los sensores y genera alertas para mantenimiento preventivo.</p>
         </div>
       </div>
     </div>
   </div>
 );
};

export default SensoresInfo;