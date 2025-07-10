// components/Monitoreo/EventsTimeline.jsx
import React, { useState } from 'react';
import { 
  Clock, 
  Zap, 
  Settings, 
  AlertTriangle, 
  Power, 
  Wifi,
  User,
  Activity,
  ChevronDown,
  ChevronUp,
  Filter
} from 'lucide-react';
import './EventsTimeline.css';

const EventsTimeline = ({ eventos }) => {
  const [filter, setFilter] = useState('all'); // all, auto, config, error, sistema, control
  const [showAll, setShowAll] = useState(false);

  const getEventIcon = (tipo) => {
    switch (tipo) {
      case 'auto':
        return Zap;
      case 'config':
        return Settings;
      case 'error':
        return AlertTriangle;
      case 'sistema':
        return Activity;
      case 'control':
        return Power;
      case 'usuario':
        return User;
      default:
        return Clock;
    }
  };

  const getEventColor = (tipo) => {
    switch (tipo) {
      case 'auto':
        return 'blue';
      case 'config':
        return 'purple';
      case 'error':
        return 'red';
      case 'sistema':
        return 'green';
      case 'control':
        return 'orange';
      case 'usuario':
        return 'indigo';
      default:
        return 'gray';
    }
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Hace un momento';
    
    const now = new Date();
    const eventTime = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diffMs = now - eventTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    return `Hace ${diffDays}d`;
  };

  const filteredEventos = eventos.filter(evento => {
    if (filter === 'all') return true;
    return evento.tipo === filter;
  });

  const displayedEventos = showAll ? filteredEventos : filteredEventos.slice(0, 5);

  const getEventTypeLabel = (tipo) => {
    const labels = {
      auto: 'Automático',
      config: 'Configuración',
      error: 'Error',
      sistema: 'Sistema',
      control: 'Control',
      usuario: 'Usuario'
    };
    return labels[tipo] || tipo;
  };

  return (
    <div className="events-timeline">
      {/* Filtros */}
      <div className="events-filters">
        <div className="filter-header">
          <Filter className="filter-icon" />
          <span className="filter-label">Filtrar eventos</span>
        </div>
        <div className="filter-buttons">
          {['all', 'auto', 'config', 'error', 'sistema', 'control'].map((filterType) => (
            <button
              key={filterType}
              className={`filter-btn ${filter === filterType ? 'active' : ''} ${filterType}`}
              onClick={() => setFilter(filterType)}
            >
              {filterType === 'all' ? 'Todos' : getEventTypeLabel(filterType)}
              <span className="filter-count">
                {filterType === 'all' 
                  ? eventos.length 
                  : eventos.filter(e => e.tipo === filterType).length
                }
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="timeline-container">
        {displayedEventos.length === 0 ? (
          <div className="no-events">
            <Clock className="no-events-icon" />
            <p className="no-events-text">
              No hay eventos {filter === 'all' ? '' : `de tipo ${getEventTypeLabel(filter)}`}
            </p>
          </div>
        ) : (
          <div className="timeline">
            {displayedEventos.map((evento, index) => {
              const EventIcon = getEventIcon(evento.tipo);
              const color = getEventColor(evento.tipo);
              
              return (
                <div key={evento.id || index} className={`timeline-item ${color}`}>
                  <div className="timeline-marker">
                    <div className={`timeline-icon ${color}`}>
                      <EventIcon className="icon" />
                    </div>
                    {index < displayedEventos.length - 1 && (
                      <div className="timeline-line"></div>
                    )}
                  </div>
                  
                  <div className="timeline-content">
                    <div className="event-header">
                      <h4 className="event-title">{evento.evento}</h4>
                      <div className="event-meta">
                        <span className="event-time">
                          {formatTimeAgo(evento.timestamp)}
                        </span>
                        <span className={`event-type-badge ${color}`}>
                          {getEventTypeLabel(evento.tipo)}
                        </span>
                      </div>
                    </div>
                    
                    {evento.posteId && (
                      <p className="event-location">
                        <span className="location-label">Dispositivo:</span> {evento.posteId}
                      </p>
                    )}
                    
                    {evento.detalles && (
                      <p className="event-details">{evento.detalles}</p>
                    )}
                    
                    {evento.usuario && (
                      <div className="event-user">
                        <User className="user-icon" />
                        <span className="user-name">{evento.usuario}</span>
                      </div>
                    )}
                    
                    {evento.valor && (
                      <div className="event-value">
                        <span className="value-label">Valor:</span>
                        <span className="value-data">{evento.valor}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Botón para mostrar más */}
        {filteredEventos.length > 5 && (
          <div className="show-more-container">
            <button
              className="show-more-btn"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? (
                <>
                  <ChevronUp className="chevron-icon" />
                  Mostrar menos
                </>
              ) : (
                <>
                  <ChevronDown className="chevron-icon" />
                  Mostrar más ({filteredEventos.length - 5} eventos adicionales)
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Resumen de eventos */}
      <div className="events-summary">
        <div className="summary-title">Resumen últimas 24h</div>
        <div className="summary-stats">
          <div className="summary-stat auto">
            <span className="stat-count">{eventos.filter(e => e.tipo === 'auto').length}</span>
            <span className="stat-label">Automáticos</span>
          </div>
          <div className="summary-stat error">
            <span className="stat-count">{eventos.filter(e => e.tipo === 'error').length}</span>
            <span className="stat-label">Errores</span>
          </div>
          <div className="summary-stat config">
            <span className="stat-count">{eventos.filter(e => e.tipo === 'config').length}</span>
            <span className="stat-label">Configuración</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventsTimeline;