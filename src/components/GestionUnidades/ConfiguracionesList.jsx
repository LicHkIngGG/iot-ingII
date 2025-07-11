import React, { useState, useMemo } from 'react';
import {
  Settings,
  Edit3,
  Trash2,
  Play,
  RefreshCw,
  Wifi,
  WifiOff,
  CheckCircle,
  AlertTriangle,
  Clock,
  Cpu,
  Eye,
  Activity,
  Zap,
  Filter,
  Grid,
  List,
  Search
} from 'lucide-react';

const ConfiguracionesList = ({ 
  configuraciones, 
  postes, 
  connectionStatus, 
  onEditar, 
  onEliminar, 
  onAplicar, 
  onReiniciar, 
  userRole 
}) => {
  const [viewMode, setViewMode] = useState('grid'); // grid, list
  const [filter, setFilter] = useState('all'); // all, active, inactive, online, offline
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('nombre'); // nombre, estado, ubicacion, fechaCreacion

  // Obtener información del poste
  const getPosteInfo = (posteId) => {
    const poste = postes.find(p => p.id === posteId);
    return poste || { 
      nombre: `Dispositivo ${posteId}`, 
      ubicacion: 'Ubicación no especificada' 
    };
  };

  // Procesar configuraciones con información adicional
  const processedConfigs = useMemo(() => {
    return configuraciones.map(config => {
      const posteInfo = getPosteInfo(config.posteId);
      const deviceStatus = connectionStatus[config.posteId] || { online: false };
      
      // Determinar estado general
      let overallStatus = 'inactive';
      let statusColor = 'gray';
      
      if (config.estado === 'activo') {
        if (deviceStatus.online) {
          overallStatus = 'online';
          statusColor = 'green';
        } else {
          overallStatus = 'offline';
          statusColor = 'red';
        }
      }

      // Contar sensores activos
      const sensoresActivos = Object.values(config.sensores || {})
        .filter(sensor => sensor.habilitado).length;

      return {
        ...config,
        posteInfo,
        deviceStatus,
        overallStatus,
        statusColor,
        sensoresActivos,
        totalSensores: Object.keys(config.sensores || {}).length
      };
    });
  }, [configuraciones, postes, connectionStatus]);

  // Filtrar y ordenar configuraciones
  const filteredConfigs = useMemo(() => {
    let filtered = processedConfigs.filter(config => {
      // Filtro por estado
      if (filter === 'active' && config.estado !== 'activo') return false;
      if (filter === 'inactive' && config.estado === 'activo') return false;
      if (filter === 'online' && !config.deviceStatus.online) return false;
      if (filter === 'offline' && config.deviceStatus.online) return false;

      // Filtro por búsqueda
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          config.posteInfo.nombre.toLowerCase().includes(searchLower) ||
          config.posteInfo.ubicacion.toLowerCase().includes(searchLower) ||
          config.red?.ip?.includes(searchTerm)
        );
      }

      return true;
    });

    // Ordenar
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'estado':
          return a.overallStatus.localeCompare(b.overallStatus);
        case 'ubicacion':
          return a.posteInfo.ubicacion.localeCompare(b.posteInfo.ubicacion);
        case 'fechaCreacion':
          const dateA = a.fechaCreacion?.toDate?.() || new Date(a.fechaCreacion || 0);
          const dateB = b.fechaCreacion?.toDate?.() || new Date(b.fechaCreacion || 0);
          return dateB - dateA;
        default:
          return a.posteInfo.nombre.localeCompare(b.posteInfo.nombre);
      }
    });

    return filtered;
  }, [processedConfigs, filter, searchTerm, sortBy]);

  const formatLastUpdate = (fecha) => {
    if (!fecha) return 'Nunca';
    const date = fecha.toDate ? fecha.toDate() : new Date(fecha);
    return date.toLocaleString();
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

  const ConfigCard = ({ config }) => (
    <div className={`config-card ${config.statusColor}`}>
      <div className="config-header">
        <div className="config-info">
          <h3 className="config-name">{config.posteInfo.nombre}</h3>
          <div className="config-status">
            {config.deviceStatus.online ? (
              <Wifi className={`status-icon ${config.statusColor}`} />
            ) : (
              <WifiOff className={`status-icon ${config.statusColor}`} />
            )}
            <span className={`status-text ${config.statusColor}`}>
              {config.overallStatus.toUpperCase()}
            </span>
          </div>
        </div>
        
        <div className="config-actions">
          {userRole === 'administrador' && (
            <>
              <button 
                className="action-btn edit"
                onClick={() => onEditar(config)}
                title="Editar configuración"
              >
                <Edit3 className="action-icon" />
              </button>
              <button 
                className="action-btn apply"
                onClick={() => onAplicar(config)}
                title="Aplicar configuración"
                disabled={!config.deviceStatus.online}
              >
                <Play className="action-icon" />
              </button>
              <button 
                className="action-btn restart"
                onClick={() => onReiniciar(config)}
                title="Reiniciar dispositivo"
                disabled={!config.deviceStatus.online}
              >
                <RefreshCw className="action-icon" />
              </button>
              <button 
                className="action-btn delete"
                onClick={() => onEliminar(config)}
                title="Eliminar configuración"
              >
                <Trash2 className="action-icon" />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="config-details">
        <div className="detail-item">
          <span className="detail-label">Ubicación:</span>
          <span className="detail-value">{config.posteInfo.ubicacion}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">IP:</span>
          <span className="detail-value">{config.red?.ip || 'No asignada'}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">Modelo:</span>
          <span className="detail-value">{config.hardware?.modelo || 'ESP32'}</span>
        </div>
      </div>

      <div className="sensors-overview">
        <h4 className="sensors-title">Sensores Configurados</h4>
        <div className="sensors-grid">
          <div className={`sensor-indicator ${config.sensores?.ldr?.habilitado ? 'active' : 'inactive'}`}>
            <Eye className="sensor-icon" />
            <span className="sensor-label">LDR</span>
            {config.sensores?.ldr?.habilitado && (
              <span className="sensor-value">
                {config.sensores.ldr.umbralEncendido} lux
              </span>
            )}
          </div>
          
          <div className={`sensor-indicator ${config.sensores?.pir?.habilitado ? 'active' : 'inactive'}`}>
            <Activity className="sensor-icon" />
            <span className="sensor-label">PIR</span>
            {config.sensores?.pir?.habilitado && (
              <span className="sensor-value">
                {config.sensores.pir.sensibilidad}
              </span>
            )}
          </div>
          
          <div className={`sensor-indicator ${config.sensores?.acs712?.habilitado ? 'active' : 'inactive'}`}>
            <Zap className="sensor-icon" />
            <span className="sensor-label">ACS712</span>
            {config.sensores?.acs712?.habilitado && (
              <span className="sensor-value">
                {config.sensores.acs712.modelo}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="automation-status">
        <div className="automation-item">
          <span className="automation-label">Automatización:</span>
          <span className={`automation-value ${config.automatizacion?.habilitada ? 'enabled' : 'disabled'}`}>
            {config.automatizacion?.habilitada ? 'Activa' : 'Inactiva'}
          </span>
        </div>
        <div className="automation-item">
          <span className="automation-label">Modo:</span>
          <span className="automation-value">
            {config.automatizacion?.modo || 'Manual'}
          </span>
        </div>
      </div>

      <div className="config-footer">
        <div className="device-info">
          {config.deviceStatus.online && (
            <>
              <div className="info-item">
                <Clock className="info-icon" />
                <span className="info-text">
                  Uptime: {formatUptime(config.deviceStatus.uptime)}
                </span>
              </div>
              <div className="info-item">
                <Cpu className="info-icon" />
                <span className="info-text">
                  Versión: {config.deviceStatus.version || config.hardware?.versionFirmware || 'N/A'}
                </span>
              </div>
            </>
          )}
        </div>
        
        <div className="last-update">
          <span className="update-text">
            Actualizado: {formatLastUpdate(config.ultimaActualizacion)}
          </span>
        </div>
      </div>
    </div>
  );

  const ConfigListItem = ({ config }) => (
    <div className={`config-list-item ${config.statusColor}`}>
      <div className="list-item-main">
        <div className="list-item-header">
          {config.deviceStatus.online ? (
            <Wifi className={`status-icon ${config.statusColor}`} />
          ) : (
            <WifiOff className={`status-icon ${config.statusColor}`} />
          )}
          <h3 className="list-item-name">{config.posteInfo.nombre}</h3>
          <span className={`status-badge ${config.statusColor}`}>
            {config.overallStatus.toUpperCase()}
          </span>
        </div>
        
        <div className="list-item-details">
          <span className="detail-item">
            <strong>Ubicación:</strong> {config.posteInfo.ubicacion}
          </span>
          <span className="detail-item">
            <strong>IP:</strong> {config.red?.ip || 'No asignada'}
          </span>
          <span className="detail-item">
            <strong>Sensores:</strong> {config.sensoresActivos}/{config.totalSensores} activos
          </span>
        </div>
      </div>

      <div className="list-item-sensors">
        <div className={`sensor-mini ${config.sensores?.ldr?.habilitado ? 'ok' : 'disabled'}`}>
          <Eye className="sensor-mini-icon" />
          <span>LDR</span>
        </div>
        <div className={`sensor-mini ${config.sensores?.pir?.habilitado ? 'ok' : 'disabled'}`}>
          <Activity className="sensor-mini-icon" />
          <span>PIR</span>
        </div>
        <div className={`sensor-mini ${config.sensores?.acs712?.habilitado ? 'ok' : 'disabled'}`}>
          <Zap className="sensor-mini-icon" />
          <span>ACS712</span>
        </div>
      </div>

      <div className="list-item-automation">
        <span className="automation-status">
          {config.automatizacion?.habilitada ? 'Auto' : 'Manual'}
        </span>
        {config.deviceStatus.online && (
          <span className="uptime-status">
            {formatUptime(config.deviceStatus.uptime)}
          </span>
        )}
      </div>

      <div className="list-item-actions">
        {userRole === 'administrador' && (
          <>
            <button 
              className="list-action-btn edit"
              onClick={() => onEditar(config)}
              title="Editar"
            >
              <Edit3 className="action-icon" />
            </button>
            <button 
              className="list-action-btn apply"
              onClick={() => onAplicar(config)}
              title="Aplicar"
              disabled={!config.deviceStatus.online}
            >
              <Play className="action-icon" />
            </button>
            <button 
              className="list-action-btn restart"
              onClick={() => onReiniciar(config)}
              title="Reiniciar"
              disabled={!config.deviceStatus.online}
            >
              <RefreshCw className="action-icon" />
            </button>
            <button 
              className="list-action-btn delete"
              onClick={() => onEliminar(config)}
              title="Eliminar"
            >
              <Trash2 className="action-icon" />
            </button>
          </>
        )}
      </div>
    </div>
  );

  // Estadísticas de filtros
  const filterStats = {
    all: processedConfigs.length,
    active: processedConfigs.filter(c => c.estado === 'activo').length,
    inactive: processedConfigs.filter(c => c.estado !== 'activo').length,
    online: processedConfigs.filter(c => c.deviceStatus.online).length,
    offline: processedConfigs.filter(c => !c.deviceStatus.online).length
  };

  return (
    <div className="configuraciones-list">
      {/* Controles superiores */}
      <div className="list-controls">
        <div className="search-section">
          <div className="search-box">
            <Search className="search-icon" />
            <input
              type="text"
              placeholder="Buscar por nombre, ubicación o IP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        <div className="filter-section">
          <Filter className="filter-icon" />
          <div className="filter-buttons">
            {[
              { key: 'all', label: 'Todos', count: filterStats.all },
              { key: 'active', label: 'Activos', count: filterStats.active },
              { key: 'online', label: 'Online', count: filterStats.online },
              { key: 'offline', label: 'Offline', count: filterStats.offline }
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

        <div className="sort-section">
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="nombre">Ordenar por Nombre</option>
            <option value="estado">Ordenar por Estado</option>
            <option value="ubicacion">Ordenar por Ubicación</option>
            <option value="fechaCreacion">Ordenar por Fecha</option>
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

      {/* Resumen de estadísticas */}
      <div className="configs-summary">
        <div className="summary-item total">
          <Settings className="summary-icon" />
          <div className="summary-content">
            <span className="summary-count">{filterStats.all}</span>
            <span className="summary-label">Total Configuraciones</span>
          </div>
        </div>
        
        <div className="summary-item active">
          <CheckCircle className="summary-icon" />
          <div className="summary-content">
            <span className="summary-count">{filterStats.active}</span>
            <span className="summary-label">Configuraciones Activas</span>
          </div>
        </div>
        
        <div className="summary-item online">
          <Wifi className="summary-icon" />
          <div className="summary-content">
            <span className="summary-count">{filterStats.online}</span>
            <span className="summary-label">Dispositivos Online</span>
          </div>
        </div>
        
        <div className="summary-item offline">
          <AlertTriangle className="summary-icon" />
          <div className="summary-content">
            <span className="summary-count">{filterStats.offline}</span>
            <span className="summary-label">Dispositivos Offline</span>
          </div>
        </div>
      </div>

      {/* Lista/Grid de configuraciones */}
      <div className="configs-container">
        {filteredConfigs.length === 0 ? (
          <div className="no-configs">
            <Settings className="no-configs-icon" />
            <h3 className="no-configs-title">
              {searchTerm || filter !== 'all' 
                ? 'No se encontraron configuraciones' 
                : 'No hay configuraciones'
              }
            </h3>
            <p className="no-configs-subtitle">
              {searchTerm 
                ? `No hay resultados para "${searchTerm}"` 
                : filter !== 'all'
                ? `No hay configuraciones con estado "${filter}"`
                : 'Crea la primera configuración para empezar'
              }
            </p>
          </div>
        ) : (
          <div className={`configs-content ${viewMode}`}>
            {viewMode === 'grid' ? (
              <div className="configs-grid">
                {filteredConfigs.map((config) => (
                  <ConfigCard key={config.id} config={config} />
                ))}
              </div>
            ) : (
              <div className="configs-list">
                {filteredConfigs.map((config) => (
                  <ConfigListItem key={config.id} config={config} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Información de acciones rápidas */}
      {userRole === 'administrador' && filteredConfigs.length > 0 && (
        <div className="quick-actions-info">
          <h4 className="info-title">Acciones Rápidas:</h4>
          <div className="actions-grid">
            <div className="action-info">
              <Edit3 className="action-info-icon" />
              <span>Editar: Modificar configuración del dispositivo</span>
            </div>
            <div className="action-info">
              <Play className="action-info-icon" />
              <span>Aplicar: Enviar configuración al dispositivo ESP32</span>
            </div>
            <div className="action-info">
              <RefreshCw className="action-info-icon" />
              <span>Reiniciar: Reiniciar dispositivo remotamente</span>
            </div>
            <div className="action-info">
              <Trash2 className="action-info-icon" />
              <span>Eliminar: Remover configuración del sistema</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfiguracionesList;