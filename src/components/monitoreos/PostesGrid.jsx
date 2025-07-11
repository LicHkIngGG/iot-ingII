import React, { useState, useMemo } from 'react';
import { 
  MapPin, 
  Lightbulb, 
  Zap, 
  Wifi,
  WifiOff,
  Gauge,
  Power,
  Eye,
  MoreVertical,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
  Grid,
  List,
  Settings,
  RefreshCw,
  Cpu,
  Thermometer,
  Signal,
  Battery,
  HardDrive
} from 'lucide-react';
import './PostesGrid.css';

const PostesGrid = ({ postes, userRole, onPosteControl }) => {
  const [viewMode, setViewMode] = useState('grid'); // grid, list
  const [filter, setFilter] = useState('all'); // all, online, offline, warning, error
  const [selectedPoste, setSelectedPoste] = useState(null);
  const [sortBy, setSortBy] = useState('nombre'); // nombre, estado, consumo, eficiencia

  // Procesar y clasificar postes
  const processedPostes = useMemo(() => {
    return postes.map(poste => {
      // Determinar estado general del dispositivo
      let status = 'offline';
      let statusColor = 'red';
      
      if (poste.estado?.online) {
        // Verificar si hay problemas con sensores
        const sensoresFallando = [];
        if (poste.sensores) {
          if (poste.sensores.ldr && !poste.sensores.ldr.funcionando) sensoresFallando.push('LDR');
          if (poste.sensores.pir && !poste.sensores.pir.funcionando) sensoresFallando.push('PIR');
          if (poste.sensores.acs712 && !poste.sensores.acs712.funcionando) sensoresFallando.push('ACS712');
        }

        // Verificar consumo anormal
        const consumoEsperado = 60 * 0.22; // 60W por ~22 horas
        const consumoActual = poste.calculados?.consumoHoy || 0;
        const consumoAnormal = consumoActual > consumoEsperado * 1.3 || 
                              (consumoActual < consumoEsperado * 0.1 && poste.estado?.encendido);

        if (sensoresFallando.length > 0 || consumoAnormal) {
          status = 'warning';
          statusColor = 'yellow';
        } else {
          status = 'online';
          statusColor = 'green';
        }
      }

      // Calcular eficiencia del dispositivo
      const eficiencia = poste.calculados?.eficienciaHoy || 0;

      // Calcular tiempo sin actualizar
      const lastUpdate = poste.estado?.ultimaActualizacion ? 
        (poste.estado.ultimaActualizacion.toDate ? 
          poste.estado.ultimaActualizacion.toDate() : 
          new Date(poste.estado.ultimaActualizacion)) : null;
      
      const minutesSinceUpdate = lastUpdate ? 
        Math.floor((new Date() - lastUpdate) / 60000) : 999;

      // Determinar intensidad actual del LED
      const intensidad = poste.estado?.encendido ? 
        (poste.calculados?.potenciaActual ? 
          Math.round((poste.calculados.potenciaActual / 60) * 100) : 100) : 0;

      return {
        ...poste,
        status,
        statusColor,
        eficiencia,
        minutesSinceUpdate,
        intensidad,
        sensoresFuncionando: poste.sensores ? 
          Object.values(poste.sensores).filter(s => s.funcionando).length : 0,
        totalSensores: poste.sensores ? Object.keys(poste.sensores).length : 0
      };
    });
  }, [postes]);

  // Filtrar postes
  const filteredPostes = useMemo(() => {
    let filtered = processedPostes.filter(poste => {
      if (filter === 'all') return true;
      return poste.status === filter;
    });

    // Ordenar postes
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'estado':
          return a.status.localeCompare(b.status);
        case 'consumo':
          return (b.calculados?.consumoHoy || 0) - (a.calculados?.consumoHoy || 0);
        case 'eficiencia':
          return b.eficiencia - a.eficiencia;
        default:
          return a.nombre.localeCompare(b.nombre);
      }
    });

    return filtered;
  }, [processedPostes, filter, sortBy]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'online':
        return CheckCircle;
      case 'offline':
        return WifiOff;
      case 'warning':
        return AlertTriangle;
      default:
        return Activity;
    }
  };

  const getIntensityColor = (intensidad) => {
    if (intensidad === 0) return 'gray';
    if (intensidad <= 25) return 'red';
    if (intensidad <= 50) return 'yellow';
    if (intensidad <= 75) return 'orange';
    return 'green';
  };

  const formatLastSeen = (fecha) => {
    if (!fecha) return 'Nunca';
    const now = new Date();
    const lastSeen = fecha.toDate ? fecha.toDate() : new Date(fecha);
    const diffMs = now - lastSeen;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    return lastSeen.toLocaleDateString();
  };

  const formatUptime = (uptime) => {
    if (!uptime) return 'N/A';
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h ${minutes}m`;
  };

  const PosteCard = ({ poste }) => {
    const StatusIcon = getStatusIcon(poste.status);
    const intensityColor = getIntensityColor(poste.intensidad);

    return (
      <div 
        className={`poste-card ${poste.statusColor}`}
        onClick={() => setSelectedPoste(poste)}
      >
        <div className="poste-header">
          <div className="poste-info">
            <h3 className="poste-name">{poste.nombre}</h3>
            <div className="poste-status">
              <StatusIcon className={`status-icon ${poste.statusColor}`} />
              <span className={`status-text ${poste.statusColor}`}>
                {poste.status.toUpperCase()}
              </span>
            </div>
          </div>
          <div className="poste-actions">
            {userRole === 'administrador' && (
              <button className="action-btn">
                <MoreVertical className="action-icon" />
              </button>
            )}
          </div>
        </div>

        <div className="poste-location">
          <MapPin className="location-icon" />
          <span className="location-text">{poste.ubicacion}</span>
        </div>

        {/* Estado de sensores */}
        <div className="sensors-status">
          <div className="sensor-indicator">
            <Eye className={`sensor-icon ${poste.sensores?.ldr?.funcionando ? 'working' : 'error'}`} />
            <span className="sensor-label">LDR</span>
            <span className="sensor-value">
              {poste.sensores?.ldr?.luxCalculado || 0} lux
            </span>
          </div>
          <div className="sensor-indicator">
            <Activity className={`sensor-icon ${poste.sensores?.pir?.funcionando ? 'working' : 'error'}`} />
            <span className="sensor-label">PIR</span>
            <span className="sensor-value">
              {poste.sensores?.pir?.contadorHoy || 0} det
            </span>
          </div>
          <div className="sensor-indicator">
            <Zap className={`sensor-icon ${poste.sensores?.acs712?.funcionando ? 'working' : 'error'}`} />
            <span className="sensor-label">ACS712</span>
            <span className="sensor-value">
              {poste.sensores?.acs712?.corriente?.toFixed(2) || 0} A
            </span>
          </div>
        </div>

        {/* Métricas principales */}
        <div className="poste-metrics">
          <div className="metric">
            <div className="metric-header">
              <Lightbulb className={`metric-icon ${poste.estado?.encendido ? 'on' : 'off'}`} />
              <span className="metric-label">LED</span>
            </div>
            <div className="metric-value">
              <span className={`metric-number ${intensityColor}`}>{poste.intensidad}%</span>
              <div className="intensity-bar">
                <div 
                  className={`intensity-fill ${intensityColor}`}
                  style={{ width: `${poste.intensidad}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="metric">
            <div className="metric-header">
              <Zap className="metric-icon" />
              <span className="metric-label">Potencia</span>
            </div>
            <div className="metric-value">
              <span className="metric-number">{poste.calculados?.potenciaActual?.toFixed(1) || 0}</span>
              <span className="metric-unit">W</span>
            </div>
          </div>

          <div className="metric">
            <div className="metric-header">
              <Gauge className="metric-icon" />
              <span className="metric-label">Eficiencia</span>
            </div>
            <div className="metric-value">
              <span className="metric-number">{poste.eficiencia?.toFixed(1) || 0}</span>
              <span className="metric-unit">%</span>
            </div>
          </div>
        </div>

        {/* Footer con conexión */}
        <div className="poste-footer">
          <div className="connection-info">
            <div className="connection-status">
              {poste.estado?.online ? (
                <Wifi className="wifi-icon online" />
              ) : (
                <WifiOff className="wifi-icon offline" />
              )}
              <span className="ip-address">{poste.red?.ip || 'N/A'}</span>
            </div>
            <div className="uptime">
              <Clock className="time-icon" />
              <span className="uptime-text">
                {formatUptime(poste.estado?.uptime)}
              </span>
            </div>
          </div>
          
          <div className="last-seen">
            <span className="last-seen-text">
              {formatLastSeen(poste.estado?.ultimaActualizacion)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const PosteListItem = ({ poste }) => {
    const StatusIcon = getStatusIcon(poste.status);

    return (
      <div 
        className={`poste-list-item ${poste.statusColor}`}
        onClick={() => setSelectedPoste(poste)}
      >
        <div className="list-item-content">
          <div className="list-item-main">
            <div className="list-item-header">
              <StatusIcon className={`status-icon ${poste.statusColor}`} />
              <h3 className="list-item-name">{poste.nombre}</h3>
              <span className={`status-badge ${poste.statusColor}`}>
                {poste.status.toUpperCase()}
              </span>
            </div>
            <p className="list-item-location">{poste.ubicacion}</p>
            <div className="list-item-tech">
              <span className="tech-info">{poste.hardware?.modelo || 'ESP32'}</span>
              <span className="tech-info">{poste.red?.ip || 'Sin IP'}</span>
              <span className="tech-info">{poste.hardware?.tipoLED || '60W'}</span>
            </div>
          </div>

          <div className="list-item-sensors">
            <div className="sensor-mini">
              <Eye className={`sensor-mini-icon ${poste.sensores?.ldr?.funcionando ? 'ok' : 'error'}`} />
              <span>{poste.sensores?.ldr?.luxCalculado || 0}</span>
            </div>
            <div className="sensor-mini">
              <Activity className={`sensor-mini-icon ${poste.sensores?.pir?.funcionando ? 'ok' : 'error'}`} />
              <span>{poste.sensores?.pir?.contadorHoy || 0}</span>
            </div>
            <div className="sensor-mini">
              <Zap className={`sensor-mini-icon ${poste.sensores?.acs712?.funcionando ? 'ok' : 'error'}`} />
              <span>{poste.sensores?.acs712?.corriente?.toFixed(1) || 0}A</span>
            </div>
          </div>

          <div className="list-item-metrics">
            <div className="list-metric">
              <span className="list-metric-label">LED:</span>
              <span className={`list-metric-value ${getIntensityColor(poste.intensidad)}`}>
                {poste.intensidad}%
              </span>
            </div>
            <div className="list-metric">
              <span className="list-metric-label">Potencia:</span>
              <span className="list-metric-value">{poste.calculados?.potenciaActual?.toFixed(1) || 0}W</span>
            </div>
            <div className="list-metric">
              <span className="list-metric-label">Eficiencia:</span>
              <span className="list-metric-value">{poste.eficiencia?.toFixed(1) || 0}%</span>
            </div>
          </div>

          <div className="list-item-actions">
            <div className="uptime-info">
              <span className="uptime-label">Uptime:</span>
              <span className="uptime-value">{formatUptime(poste.estado?.uptime)}</span>
            </div>
            <span className="last-seen-text">
              {formatLastSeen(poste.estado?.ultimaActualizacion)}
            </span>
            {userRole === 'administrador' && (
              <button className="list-action-btn">
                <Settings className="action-icon" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Calcular estadísticas
  const stats = useMemo(() => {
    return {
      total: processedPostes.length,
      online: processedPostes.filter(p => p.status === 'online').length,
      offline: processedPostes.filter(p => p.status === 'offline').length,
      warning: processedPostes.filter(p => p.status === 'warning').length,
      encendidos: processedPostes.filter(p => p.estado?.encendido).length
    };
  }, [processedPostes]);

  return (
    <div className="postes-grid-container">
      {/* Controles superiores */}
      <div className="postes-controls">
        <div className="filters-section">
          <div className="filter-group">
            <Filter className="filter-icon" />
            <div className="filter-buttons">
              {[
                { key: 'all', label: 'Todos', count: stats.total },
                { key: 'online', label: 'Online', count: stats.online },
                { key: 'offline', label: 'Offline', count: stats.offline },
                { key: 'warning', label: 'Alerta', count: stats.warning }
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

        <div className="sort-controls">
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="nombre">Ordenar por Nombre</option>
            <option value="estado">Ordenar por Estado</option>
            <option value="consumo">Ordenar por Consumo</option>
            <option value="eficiencia">Ordenar por Eficiencia</option>
          </select>
        </div>

        <div className="view-controls">
          <button
            className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            title="Vista en cuadrícula"
          >
            <Grid className="view-icon" />
          </button>
          <button
            className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            title="Vista en lista"
          >
            <List className="view-icon" />
          </button>
        </div>
      </div>

      {/* Resumen estadísticas */}
      <div className="postes-summary">
        <div className="summary-item online">
          <CheckCircle className="summary-icon" />
          <div className="summary-content">
            <span className="summary-count">{stats.online}</span>
            <span className="summary-label">Online</span>
          </div>
        </div>
        <div className="summary-item offline">
          <WifiOff className="summary-icon" />
          <div className="summary-content">
            <span className="summary-count">{stats.offline}</span>
            <span className="summary-label">Offline</span>
          </div>
        </div>
        <div className="summary-item warning">
          <AlertTriangle className="summary-icon" />
          <div className="summary-content">
            <span className="summary-count">{stats.warning}</span>
            <span className="summary-label">Alertas</span>
          </div>
        </div>
        <div className="summary-item active">
          <Lightbulb className="summary-icon" />
          <div className="summary-content">
            <span className="summary-count">{stats.encendidos}</span>
            <span className="summary-label">Encendidos</span>
          </div>
        </div>
      </div>

      {/* Grid/List de postes */}
      <div className={`postes-content ${viewMode}`}>
        {filteredPostes.length === 0 ? (
          <div className="no-postes">
            <Lightbulb className="no-postes-icon" />
            <p className="no-postes-text">
              No hay dispositivos {filter === 'all' ? '' : `en estado ${filter}`}
            </p>
            <p className="no-postes-subtitle">
              Verificar conectividad de red y configuración ESP32
            </p>
          </div>
        ) : (
          <>
            {viewMode === 'grid' ? (
              <div className="postes-grid">
                {filteredPostes.map((poste) => (
                  <PosteCard key={poste.id} poste={poste} />
                ))}
              </div>
            ) : (
              <div className="postes-list">
                {filteredPostes.map((poste) => (
                  <PosteListItem key={poste.id} poste={poste} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de detalles detallado */}
      {selectedPoste && (
        <div className="poste-modal-overlay" onClick={() => setSelectedPoste(null)}>
          <div className="poste-modal detailed" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-section">
                <h2 className="modal-title">{selectedPoste.nombre}</h2>
                <span className={`status-badge large ${selectedPoste.statusColor}`}>
                  {selectedPoste.status.toUpperCase()}
                </span>
              </div>
              <button 
                className="modal-close"
                onClick={() => setSelectedPoste(null)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-content">
              {/* Información del hardware */}
              <div className="modal-section">
                <h3 className="section-title">
                  <Cpu className="section-icon" />
                  Hardware ESP32
                </h3>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Modelo:</span>
                    <span className="info-value">{selectedPoste.hardware?.modelo || 'ESP32-WROOM-32'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Firmware:</span>
                    <span className="info-value">{selectedPoste.hardware?.versionFirmware || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">LED:</span>
                    <span className="info-value">{selectedPoste.hardware?.tipoLED || '60W'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Uptime:</span>
                    <span className="info-value">{formatUptime(selectedPoste.estado?.uptime)}</span>
                  </div>
                </div>
              </div>

              {/* Red y conectividad */}
              <div className="modal-section">
                <h3 className="section-title">
                  <Signal className="section-icon" />
                  Red y Conectividad
                </h3>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">IP:</span>
                    <span className="info-value">{selectedPoste.red?.ip || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Puerto:</span>
                    <span className="info-value">{selectedPoste.red?.puerto || 8080}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">MAC:</span>
                    <span className="info-value">{selectedPoste.red?.mac || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Reconexiones:</span>
                    <span className="info-value">{selectedPoste.estado?.reconexiones || 0}</span>
                  </div>
                </div>
              </div>

              {/* Estado de sensores detallado */}
              <div className="modal-section">
                <h3 className="section-title">
                  <Activity className="section-icon" />
                  Sensores IoT
                </h3>
                <div className="sensors-detailed">
                  {/* Sensor LDR */}
                  <div className="sensor-card">
                    <div className="sensor-header">
                      <Eye className={`sensor-icon ${selectedPoste.sensores?.ldr?.funcionando ? 'working' : 'error'}`} />
                      <h4 className="sensor-name">LDR (Luminosidad)</h4>
                      <span className={`sensor-status ${selectedPoste.sensores?.ldr?.funcionando ? 'ok' : 'error'}`}>
                        {selectedPoste.sensores?.ldr?.funcionando ? 'OK' : 'ERROR'}
                      </span>
                    </div>
                    <div className="sensor-metrics">
                      <div className="sensor-metric">
                        <span className="metric-label">Valor Raw:</span>
                        <span className="metric-value">{selectedPoste.sensores?.ldr?.valorRaw || 'N/A'}</span>
                      </div>
                      <div className="sensor-metric">
                        <span className="metric-label">Lux Calculado:</span>
                        <span className="metric-value">{selectedPoste.sensores?.ldr?.luxCalculado || 0} lux</span>
                      </div>
                    </div>
                  </div>

                  {/* Sensor PIR */}
                  <div className="sensor-card">
                    <div className="sensor-header">
                      <Activity className={`sensor-icon ${selectedPoste.sensores?.pir?.funcionando ? 'working' : 'error'}`} />
                      <h4 className="sensor-name">PIR (Movimiento)</h4>
                      <span className={`sensor-status ${selectedPoste.sensores?.pir?.funcionando ? 'ok' : 'error'}`}>
                        {selectedPoste.sensores?.pir?.funcionando ? 'OK' : 'ERROR'}
                      </span>
                    </div>
                    <div className="sensor-metrics">
                      <div className="sensor-metric">
                        <span className="metric-label">Detecciones Hoy:</span>
                        <span className="metric-value">{selectedPoste.sensores?.pir?.contadorHoy || 0}</span>
                      </div>
                      <div className="sensor-metric">
                        <span className="metric-label">Total Histórico:</span>
                        <span className="metric-value">{selectedPoste.sensores?.pir?.contadorTotal || 0}</span>
                      </div>
                    </div>
                  </div>

                  {/* Sensor ACS712 */}
                  <div className="sensor-card">
                    <div className="sensor-header">
                      <Zap className={`sensor-icon ${selectedPoste.sensores?.acs712?.funcionando ? 'working' : 'error'}`} />
                      <h4 className="sensor-name">ACS712 (Corriente)</h4>
                      <span className={`sensor-status ${selectedPoste.sensores?.acs712?.funcionando ? 'ok' : 'error'}`}>
                        {selectedPoste.sensores?.acs712?.funcionando ? 'OK' : 'ERROR'}
                      </span>
                    </div>
                    <div className="sensor-metrics">
                      <div className="sensor-metric">
                        <span className="metric-label">Corriente:</span>
                        <span className="metric-value">{selectedPoste.sensores?.acs712?.corriente?.toFixed(2) || 0} A</span>
                      </div>
                      <div className="sensor-metric">
                        <span className="metric-label">Valor Raw:</span>
                        <span className="metric-value">{selectedPoste.sensores?.acs712?.valorRaw || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Métricas calculadas */}
              <div className="modal-section">
                <h3 className="section-title">
                  <Gauge className="section-icon" />
                  Métricas y Rendimiento
                </h3>
                <div className="metrics-grid">
                  <div className="metric-card">
                    <Lightbulb className={`metric-icon ${selectedPoste.estado?.encendido ? 'on' : 'off'}`} />
                    <div className="metric-info">
                      <span className="metric-value">{selectedPoste.intensidad}%</span>
                      <span className="metric-label">Intensidad LED</span>
                    </div>
                  </div>
                  <div className="metric-card">
                    <Zap className="metric-icon" />
                    <div className="metric-info">
                      <span className="metric-value">{selectedPoste.calculados?.potenciaActual?.toFixed(1) || 0}</span>
                      <span className="metric-label">Potencia (W)</span>
                    </div>
                  </div>
                  <div className="metric-card">
                    <Battery className="metric-icon" />
                    <div className="metric-info">
                      <span className="metric-value">{selectedPoste.calculados?.consumoHoy?.toFixed(2) || 0}</span>
                      <span className="metric-label">Consumo Hoy (kWh)</span>
                    </div>
                  </div>
                  <div className="metric-card">
                    <Activity className="metric-icon" />
                    <div className="metric-info">
                      <span className="metric-value">{selectedPoste.eficiencia?.toFixed(1) || 0}</span>
                      <span className="metric-label">Eficiencia (%)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ubicación */}
              <div className="modal-section">
                <h3 className="section-title">
                  <MapPin className="section-icon" />
                  Ubicación y Zona
                </h3>
                <div className="location-info">
                  <div className="info-item">
                    <span className="info-label">Dirección:</span>
                    <span className="info-value">{selectedPoste.ubicacion}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Zona:</span>
                    <span className="info-value">{selectedPoste.zona || 'N/A'}</span>
                  </div>
                  {selectedPoste.coordenadas && (
                    <>
                      <div className="info-item">
                        <span className="info-label">Latitud:</span>
                        <span className="info-value">{selectedPoste.coordenadas.lat}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Longitud:</span>
                        <span className="info-value">{selectedPoste.coordenadas.lng}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Configuración actual */}
              <div className="modal-section">
                <h3 className="section-title">
                  <Settings className="section-icon" />
                  Configuración Actual
                </h3>
                <div className="config-grid">
                  <div className="config-group">
                    <h4 className="config-group-title">Automatización</h4>
                    <div className="config-items">
                      <div className="config-item">
                        <span className="config-label">Modo:</span>
                        <span className={`config-value ${selectedPoste.automatizacion?.habilitada ? 'enabled' : 'disabled'}`}>
                          {selectedPoste.automatizacion?.modo || 'Manual'}
                        </span>
                      </div>
                      <div className="config-item">
                        <span className="config-label">LDR Automático:</span>
                        <span className={`config-value ${selectedPoste.automatizacion?.reglas?.ldrAutomatico ? 'enabled' : 'disabled'}`}>
                          {selectedPoste.automatizacion?.reglas?.ldrAutomatico ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                      <div className="config-item">
                        <span className="config-label">PIR Automático:</span>
                        <span className={`config-value ${selectedPoste.automatizacion?.reglas?.pirAutomatico ? 'enabled' : 'disabled'}`}>
                          {selectedPoste.automatizacion?.reglas?.pirAutomatico ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="config-group">
                    <h4 className="config-group-title">Sensores</h4>
                    <div className="config-items">
                      <div className="config-item">
                        <span className="config-label">Umbral LDR:</span>
                        <span className="config-value">
                          {selectedPoste.configuracion?.ldr?.umbralEncendido || 100} lux
                        </span>
                      </div>
                      <div className="config-item">
                        <span className="config-label">Sensibilidad PIR:</span>
                        <span className="config-value">
                          {selectedPoste.configuracion?.pir?.sensibilidad || 'Media'}
                        </span>
                      </div>
                      <div className="config-item">
                        <span className="config-label">Modelo ACS712:</span>
                        <span className="config-value">
                          {selectedPoste.configuracion?.acs712?.modelo || '20A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Última actividad */}
              <div className="modal-section">
                <h3 className="section-title">
                  <Clock className="section-icon" />
                  Última Actividad
                </h3>
                <div className="activity-timeline">
                  <div className="activity-item">
                    <Clock className="activity-icon" />
                    <div className="activity-content">
                      <span className="activity-text">
                        Última actualización: {formatLastSeen(selectedPoste.estado?.ultimaActualizacion)}
                      </span>
                      <span className="activity-time">
                        {selectedPoste.estado?.ultimaActualizacion ? 
                          (selectedPoste.estado.ultimaActualizacion.toDate ? 
                            selectedPoste.estado.ultimaActualizacion.toDate().toLocaleString() :
                            new Date(selectedPoste.estado.ultimaActualizacion).toLocaleString()) : 
                          'Nunca'}
                      </span>
                    </div>
                  </div>
                  
                  {selectedPoste.control?.ultimoComando && (
                    <div className="activity-item">
                      <Power className="activity-icon" />
                      <div className="activity-content">
                        <span className="activity-text">
                          Último comando: {selectedPoste.control.ultimoComando.accion}
                        </span>
                        <span className="activity-time">
                          {selectedPoste.control.ultimoComando.timestamp ? 
                            new Date(selectedPoste.control.ultimoComando.timestamp).toLocaleString() : 
                            'N/A'}
                        </span>
                      </div>
                    </div>
                  )}

                  {selectedPoste.sensores?.pir?.ultimaDeteccion && (
                    <div className="activity-item">
                      <Activity className="activity-icon" />
                      <div className="activity-content">
                        <span className="activity-text">
                          Última detección de movimiento
                        </span>
                        <span className="activity-time">
                          {new Date(selectedPoste.sensores.pir.ultimaDeteccion).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Acciones del modal */}
            {userRole === 'administrador' && (
              <div className="modal-actions">
                <button 
                  className="action-button primary"
                  onClick={() => {
                    // Implementar control manual
                    if (onPosteControl) {
                      onPosteControl(selectedPoste.id, 'toggle');
                    }
                  }}
                >
                  <Power className="button-icon" />
                  {selectedPoste.estado?.encendido ? 'Apagar' : 'Encender'}
                </button>
                <button 
                  className="action-button secondary"
                  onClick={() => {
                    // Implementar reconfiguración
                    if (onPosteControl) {
                      onPosteControl(selectedPoste.id, 'restart');
                    }
                  }}
                >
                  <RefreshCw className="button-icon" />
                  Reiniciar
                </button>
                <button className="action-button secondary">
                  <Settings className="button-icon" />
                  Configurar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PostesGrid;