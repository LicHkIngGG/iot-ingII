// components/Monitoreo/AlertCenter.jsx
import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Zap, 
  WifiOff, 
  Gauge, 
  Clock, 
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info
} from 'lucide-react';
import './AlertCenter.css';

const AlertCenter = ({ alertas, onAlertaClick, userRole }) => {
  const [filter, setFilter] = useState('all'); // all, unread, critical, high, medium, low

  const getAlertIcon = (tipo) => {
    switch (tipo) {
      case 'consumo':
        return Zap;
      case 'comunicacion':
        return WifiOff;
      case 'voltaje':
        return Gauge;
      default:
        return AlertTriangle;
    }
  };

  const getSeverityIcon = (severidad) => {
    switch (severidad) {
      case 'critical':
        return XCircle;
      case 'high':
        return AlertTriangle;
      case 'medium':
        return AlertCircle;
      case 'low':
        return Info;
      default:
        return AlertTriangle;
    }
  };

  const getSeverityColor = (severidad) => {
    switch (severidad) {
      case 'critical':
        return 'critical';
      case 'high':
        return 'high';
      case 'medium':
        return 'medium';
      case 'low':
        return 'low';
      default:
        return 'medium';
    }
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Hace un momento';
    
    const now = new Date();
    const alertTime = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diffMs = now - alertTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    return `Hace ${diffDays}d`;
  };

  const filteredAlertas = alertas.filter(alerta => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !alerta.leida;
    return alerta.severidad === filter;
  });

  const handleAlertClick = (alerta) => {
    if (userRole === 'administrador' && !alerta.leida) {
      onAlertaClick(alerta.id);
    }
  };

  return (
    <div className="alert-center">
      {/* Filtros */}
      <div className="alert-filters">
        <button 
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          Todas ({alertas.length})
        </button>
        <button 
          className={`filter-btn ${filter === 'unread' ? 'active' : ''}`}
          onClick={() => setFilter('unread')}
        >
          No leídas ({alertas.filter(a => !a.leida).length})
        </button>
        <button 
          className={`filter-btn ${filter === 'critical' ? 'active' : ''}`}
          onClick={() => setFilter('critical')}
        >
          Críticas
        </button>
      </div>

      {/* Lista de alertas */}
      <div className="alerts-list">
        {filteredAlertas.length === 0 ? (
          <div className="no-alerts">
            <CheckCircle className="no-alerts-icon" />
            <p className="no-alerts-text">
              {filter === 'all' ? 'No hay alertas' : `No hay alertas ${filter === 'unread' ? 'sin leer' : filter}`}
            </p>
          </div>
        ) : (
          filteredAlertas.map((alerta) => {
            const AlertIcon = getAlertIcon(alerta.tipo);
            const SeverityIcon = getSeverityIcon(alerta.severidad);
            
            return (
              <div 
                key={alerta.id}
                className={`alert-item ${getSeverityColor(alerta.severidad)} ${!alerta.leida ? 'unread' : 'read'}`}
                onClick={() => handleAlertClick(alerta)}
              >
                <div className="alert-icon-container">
                  <AlertIcon className="alert-type-icon" />
                  <SeverityIcon className="alert-severity-icon" />
                </div>
                
                <div className="alert-content">
                  <div className="alert-header">
                    <h4 className="alert-title">{alerta.mensaje}</h4>
                    <div className="alert-meta">
                      <span className="alert-time">{formatTimeAgo(alerta.timestamp)}</span>
                      {!alerta.leida && (
                        <div className="unread-indicator">
                          {userRole === 'administrador' ? <Eye className="read-icon" /> : <EyeOff className="read-icon" />}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {alerta.posteId && (
                    <p className="alert-location">
                      <span className="location-label">Ubicación:</span> {alerta.posteId}
                    </p>
                  )}
                  
                  {alerta.detalles && (
                    <p className="alert-details">{alerta.detalles}</p>
                  )}
                  
                  <div className="alert-footer">
                    <span className={`severity-badge ${getSeverityColor(alerta.severidad)}`}>
                      {alerta.severidad.toUpperCase()}
                    </span>
                    <span className="alert-type-badge">
                      {alerta.tipo.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      
      {/* Resumen */}
      <div className="alerts-summary">
        <div className="summary-item critical">
          <span className="summary-count">{alertas.filter(a => a.severidad === 'critical').length}</span>
          <span className="summary-label">Críticas</span>
        </div>
        <div className="summary-item high">
          <span className="summary-count">{alertas.filter(a => a.severidad === 'high').length}</span>
          <span className="summary-label">Altas</span>
        </div>
        <div className="summary-item medium">
          <span className="summary-count">{alertas.filter(a => a.severidad === 'medium').length}</span>
          <span className="summary-label">Medias</span>
        </div>
      </div>
    </div>
  );
};

export default AlertCenter;