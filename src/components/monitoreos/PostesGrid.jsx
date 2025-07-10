// components/Monitoreo/PostesGrid.jsx
import React, { useState } from 'react';
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
  List
} from 'lucide-react';
import './PostesGrid.css';

const PostesGrid = ({ postes, userRole }) => {
  const [viewMode, setViewMode] = useState('grid'); // grid, list
  const [filter, setFilter] = useState('all'); // all, online, offline, warning
  const [selectedPoste, setSelectedPoste] = useState(null);

  const getStatusIcon = (estado) => {
    switch (estado) {
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

  const getStatusColor = (estado) => {
    switch (estado) {
      case 'online':
        return 'green';
      case 'offline':
        return 'red';
      case 'warning':
        return 'yellow';
      default:
        return 'gray';
    }
  };

  const getIntensityColor = (intensidad) => {
    if (intensidad === 0) return 'gray';
    if (intensidad <= 25) return 'red';
    if (intensidad <= 50) return 'yellow';
    if (intensidad <= 75) return 'orange';
    return 'green';
  };

  const filteredPostes = postes.filter(poste => {
    if (filter === 'all') return true;
    return poste.estado === filter;
  });

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

  const PosteCard = ({ poste }) => {
    const StatusIcon = getStatusIcon(poste.estado);
    const statusColor = getStatusColor(poste.estado);
    const intensityColor = getIntensityColor(poste.intensidad);

    return (
      <div 
        className={`poste-card ${statusColor}`}
        onClick={() => setSelectedPoste(poste)}
      >
        <div className="poste-header">
          <div className="poste-info">
            <h3 className="poste-name">{poste.nombre}</h3>
            <div className="poste-status">
              <StatusIcon className={`status-icon ${statusColor}`} />
              <span className={`status-text ${statusColor}`}>
                {poste.estado.toUpperCase()}
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

        <div className="poste-metrics">
          <div className="metric">
            <div className="metric-header">
              <Lightbulb className={`metric-icon ${poste.encendido ? 'on' : 'off'}`} />
              <span className="metric-label">Intensidad</span>
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
              <span className="metric-label">Consumo</span>
            </div>
            <div className="metric-value">
              <span className="metric-number">{poste.consumoActual || 0}</span>
              <span className="metric-unit">kWh</span>
            </div>
          </div>

          <div className="metric">
            <div className="metric-header">
              <Gauge className="metric-icon" />
              <span className="metric-label">Voltaje</span>
            </div>
            <div className="metric-value">
              <span className="metric-number">{poste.voltaje || 0}</span>
              <span className="metric-unit">V</span>
            </div>
          </div>
        </div>

        <div className="poste-footer">
          <div className="last-seen">
            <Clock className="time-icon" />
            <span className="time-text">
              {formatLastSeen(poste.fechaUltimaActualizacion)}
            </span>
          </div>
          <div className="connection-status">
            {poste.estado === 'online' ? (
              <Wifi className="wifi-icon online" />
            ) : (
              <WifiOff className="wifi-icon offline" />
            )}
          </div>
        </div>
      </div>
    );
  };

  const PosteListItem = ({ poste }) => {
    const StatusIcon = getStatusIcon(poste.estado);
    const statusColor = getStatusColor(poste.estado);

    return (
      <div 
        className={`poste-list-item ${statusColor}`}
        onClick={() => setSelectedPoste(poste)}
      >
        <div className="list-item-content">
          <div className="list-item-main">
            <div className="list-item-header">
              <StatusIcon className={`status-icon ${statusColor}`} />
              <h3 className="list-item-name">{poste.nombre}</h3>
              <span className={`status-badge ${statusColor}`}>
                {poste.estado.toUpperCase()}
              </span>
            </div>
            <p className="list-item-location">{poste.ubicacion}</p>
          </div>

          <div className="list-item-metrics">
            <div className="list-metric">
              <span className="list-metric-label">Intensidad:</span>
              <span className={`list-metric-value ${getIntensityColor(poste.intensidad)}`}>
                {poste.intensidad}%
              </span>
            </div>
            <div className="list-metric">
              <span className="list-metric-label">Consumo:</span>
              <span className="list-metric-value">{poste.consumoActual || 0} kWh</span>
            </div>
            <div className="list-metric">
              <span className="list-metric-label">Voltaje:</span>
              <span className="list-metric-value">{poste.voltaje || 0}V</span>
            </div>
          </div>

          <div className="list-item-actions">
            <span className="last-seen-text">
              {formatLastSeen(poste.fechaUltimaActualizacion)}
            </span>
            {userRole === 'administrador' && (
              <button className="list-action-btn">
                <Eye className="action-icon" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="postes-grid-container">
      {/* Controles */}
      <div className="postes-controls">
        <div className="filters-section">
          <div className="filter-group">
            <Filter className="filter-icon" />
            <div className="filter-buttons">
              {[
                { key: 'all', label: 'Todos', count: postes.length },
                { key: 'online', label: 'Online', count: postes.filter(p => p.estado === 'online').length },
                { key: 'offline', label: 'Offline', count: postes.filter(p => p.estado === 'offline').length },
                { key: 'warning', label: 'Alerta', count: postes.filter(p => p.estado === 'warning').length }
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

      {/* Resumen */}
      <div className="postes-summary">
        <div className="summary-item">
          <span className="summary-count online">{postes.filter(p => p.estado === 'online').length}</span>
          <span className="summary-label">Online</span>
        </div>
        <div className="summary-item">
          <span className="summary-count offline">{postes.filter(p => p.estado === 'offline').length}</span>
          <span className="summary-label">Offline</span>
        </div>
        <div className="summary-item">
          <span className="summary-count warning">{postes.filter(p => p.estado === 'warning').length}</span>
          <span className="summary-label">Alertas</span>
        </div>
        <div className="summary-item">
          <span className="summary-count total">{postes.length}</span>
          <span className="summary-label">Total</span>
        </div>
      </div>

      {/* Grid/List de postes */}
      <div className={`postes-content ${viewMode}`}>
        {filteredPostes.length === 0 ? (
          <div className="no-postes">
            <Lightbulb className="no-postes-icon" />
            <p className="no-postes-text">
              No hay postes {filter === 'all' ? '' : `en estado ${filter}`}
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

      {/* Modal de detalles del poste */}
      {selectedPoste && (
        <div className="poste-modal-overlay" onClick={() => setSelectedPoste(null)}>
          <div className="poste-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{selectedPoste.nombre}</h2>
              <button 
                className="modal-close"
                onClick={() => setSelectedPoste(null)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-content">
              <div className="modal-section">
                <h3 className="section-title">Información General</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Estado:</span>
                    <span className={`info-value ${getStatusColor(selectedPoste.estado)}`}>
                      {selectedPoste.estado.toUpperCase()}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Ubicación:</span>
                    <span className="info-value">{selectedPoste.ubicacion}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Tipo LED:</span>
                    <span className="info-value">{selectedPoste.tipoLED || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Zona:</span>
                    <span className="info-value">{selectedPoste.zona || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="modal-section">
                <h3 className="section-title">Métricas Actuales</h3>
                <div className="metrics-grid">
                  <div className="metric-card">
                    <Lightbulb className={`metric-icon ${selectedPoste.encendido ? 'on' : 'off'}`} />
                    <div className="metric-info">
                      <span className="metric-value">{selectedPoste.intensidad}%</span>
                      <span className="metric-label">Intensidad</span>
                    </div>
                  </div>
                  <div className="metric-card">
                    <Zap className="metric-icon" />
                    <div className="metric-info">
                      <span className="metric-value">{selectedPoste.consumoActual || 0}</span>
                      <span className="metric-label">Consumo (kWh)</span>
                    </div>
                  </div>
                  <div className="metric-card">
                    <Gauge className="metric-icon" />
                    <div className="metric-info">
                      <span className="metric-value">{selectedPoste.voltaje || 0}</span>
                      <span className="metric-label">Voltaje (V)</span>
                    </div>
                  </div>
                  <div className="metric-card">
                    <Activity className="metric-icon" />
                    <div className="metric-info">
                      <span className="metric-value">{selectedPoste.corriente || 0}</span>
                      <span className="metric-label">Corriente (A)</span>
                    </div>
                  </div>
                </div>
              </div>

              {selectedPoste.coordenadas && (
                <div className="modal-section">
                  <h3 className="section-title">Coordenadas</h3>
                  <div className="coordinates">
                    <span className="coord-label">Latitud:</span>
                    <span className="coord-value">{selectedPoste.coordenadas.lat}</span>
                    <span className="coord-label">Longitud:</span>
                    <span className="coord-value">{selectedPoste.coordenadas.lng}</span>
                  </div>
                </div>
              )}

              <div className="modal-section">
                <h3 className="section-title">Última Actividad</h3>
                <div className="activity-info">
                  <Clock className="activity-icon" />
                  <span className="activity-text">
                    Última actualización: {formatLastSeen(selectedPoste.fechaUltimaActualizacion)}
                  </span>
                </div>
              </div>
            </div>

            {userRole === 'administrador' && (
              <div className="modal-actions">
                <button className="action-button primary">
                  <Power className="button-icon" />
                  Control Manual
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