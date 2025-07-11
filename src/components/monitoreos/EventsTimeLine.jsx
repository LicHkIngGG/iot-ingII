import React, { useState, useEffect, useMemo } from 'react';
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
  Filter,
  Eye,
  WifiOff,
  Lightbulb,
  Gauge,
  RefreshCw,
  Shield,
  Database,
  Cpu,
  Signal
} from 'lucide-react';
import './EventsTimeline.css';

const EventsTimeline = ({ eventos, postes = [] }) => {
  const [filter, setFilter] = useState('all'); // all, auto, config, error, sistema, control, sensor
  const [showAll, setShowAll] = useState(false);
  const [autoEventos, setAutoEventos] = useState([]);

  // Generar eventos automáticos basados en el estado de los postes
  useEffect(() => {
    const generateAutoEvents = () => {
      const newAutoEvents = [];
      const now = new Date();

      postes.forEach(poste => {
        // Evento de cambio de estado de conexión
        if (poste.estado?.online !== undefined) {
          const lastConnectionEvent = autoEventos.find(e => 
            e.posteId === poste.id && e.tipo === 'conexion'
          );
          
          if (!lastConnectionEvent || 
              (lastConnectionEvent.online !== poste.estado.online)) {
            newAutoEvents.push({
              id: `auto_conn_${poste.id}_${now.getTime()}`,
              tipo: 'conexion',
              evento: poste.estado.online ? 'Dispositivo conectado' : 'Dispositivo desconectado',
              posteId: poste.id,
              nombrePoste: poste.nombre,
              detalles: poste.estado.online ? 
                `ESP32 estableció conexión WebSocket en ${poste.red?.ip || 'IP desconocida'}` :
                'Pérdida de conexión WebSocket detectada',
              timestamp: now,
              usuario: 'sistema',
              online: poste.estado.online,
              automatico: true,
              icon: poste.estado.online ? Wifi : WifiOff,
              severity: poste.estado.online ? 'info' : 'warning'
            });
          }
        }

        // Eventos de sensores
        if (poste.sensores) {
          // Evento de detección de movimiento
          if (poste.sensores.pir?.movimiento && poste.sensores.pir?.ultimaDeteccion) {
            const lastDetection = new Date(poste.sensores.pir.ultimaDeteccion);
            const timeDiff = (now - lastDetection) / 1000; // segundos
            
            if (timeDiff < 60) { // Evento reciente (último minuto)
              newAutoEvents.push({
                id: `auto_pir_${poste.id}_${lastDetection.getTime()}`,
                tipo: 'sensor',
                evento: 'Movimiento detectado',
                posteId: poste.id,
                nombrePoste: poste.nombre,
                detalles: `Sensor PIR activado. Conteo diario: ${poste.sensores.pir.contadorHoy || 0}`,
                timestamp: lastDetection,
                usuario: 'sistema',
                automatico: true,
                icon: Activity,
                severity: 'info',
                sensorType: 'PIR'
              });
            }
          }

          // Eventos de cambio de luminosidad significativo
          const luxActual = poste.sensores.ldr?.luxCalculado || 0;
          const umbralEncendido = poste.configuracion?.ldr?.umbralEncendido || 100;
          const umbralApagado = poste.configuracion?.ldr?.umbralApagado || 300;

          if (luxActual <= umbralEncendido && poste.estado?.encendido) {
            newAutoEvents.push({
              id: `auto_ldr_on_${poste.id}_${now.getTime()}`,
              tipo: 'auto',
              evento: 'Encendido automático por luminosidad',
              posteId: poste.id,
              nombrePoste: poste.nombre,
              detalles: `LDR detectó ${luxActual} lux (umbral: ${umbralEncendido} lux)`,
              timestamp: now,
              usuario: 'sistema',
              automatico: true,
              icon: Lightbulb,
              severity: 'success',
              valor: `${luxActual} lux`
            });
          } else if (luxActual >= umbralApagado && !poste.estado?.encendido) {
            newAutoEvents.push({
              id: `auto_ldr_off_${poste.id}_${now.getTime()}`,
              tipo: 'auto',
              evento: 'Apagado automático por luminosidad',
              posteId: poste.id,
              nombrePoste: poste.nombre,
              detalles: `LDR detectó ${luxActual} lux (umbral: ${umbralApagado} lux)`,
              timestamp: now,
              usuario: 'sistema',
              automatico: true,
              icon: Lightbulb,
              severity: 'info',
              valor: `${luxActual} lux`
            });
          }

          // Eventos de fallas de sensores
          Object.entries(poste.sensores).forEach(([sensorName, sensorData]) => {
            if (sensorData && !sensorData.funcionando) {
              newAutoEvents.push({
                id: `auto_sensor_fail_${poste.id}_${sensorName}_${now.getTime()}`,
                tipo: 'error',
                evento: `Falla en sensor ${sensorName.toUpperCase()}`,
                posteId: poste.id,
                nombrePoste: poste.nombre,
                detalles: `El sensor ${sensorName.toUpperCase()} no está respondiendo correctamente`,
                timestamp: now,
                usuario: 'sistema',
                automatico: true,
                icon: AlertTriangle,
                severity: 'error',
                sensorType: sensorName.toUpperCase()
              });
            }
          });
        }

        // Eventos de consumo energético
        if (poste.calculados) {
          const consumoEsperado = 60 * 0.22; // 60W por ~22 horas
          const consumoActual = poste.calculados.consumoHoy || 0;
          
          if (consumoActual > consumoEsperado * 1.5) {
            newAutoEvents.push({
              id: `auto_high_consumption_${poste.id}_${now.getTime()}`,
              tipo: 'sistema',
              evento: 'Consumo energético elevado',
              posteId: poste.id,
              nombrePoste: poste.nombre,
              detalles: `Consumo: ${consumoActual.toFixed(2)}kWh (esperado: ${consumoEsperado.toFixed(2)}kWh)`,
              timestamp: now,
              usuario: 'sistema',
              automatico: true,
              icon: Gauge,
              severity: 'warning',
              valor: `${consumoActual.toFixed(2)} kWh`
            });
          }

          // Evento de eficiencia baja
          if (poste.calculados.eficienciaHoy < 70) {
            newAutoEvents.push({
              id: `auto_low_efficiency_${poste.id}_${now.getTime()}`,
              tipo: 'sistema',
              evento: 'Eficiencia del sistema baja',
              posteId: poste.id,
              nombrePoste: poste.nombre,
              detalles: `Eficiencia actual: ${poste.calculados.eficienciaHoy}% (mínimo recomendado: 70%)`,
              timestamp: now,
              usuario: 'sistema',
              automatico: true,
              icon: Activity,
              severity: 'warning',
              valor: `${poste.calculados.eficienciaHoy}%`
            });
          }
        }

        // Eventos de configuración automática
        if (poste.metadatos?.ultimaConfiguracion) {
          const lastConfig = poste.metadatos.ultimaConfiguracion.toDate ? 
            poste.metadatos.ultimaConfiguracion.toDate() : 
            new Date(poste.metadatos.ultimaConfiguracion);
          const configTimeDiff = (now - lastConfig) / 1000 / 60; // minutos
          
          if (configTimeDiff < 5) { // Configuración reciente
            newAutoEvents.push({
              id: `auto_config_${poste.id}_${lastConfig.getTime()}`,
              tipo: 'config',
              evento: 'Configuración actualizada',
              posteId: poste.id,
              nombrePoste: poste.nombre,
              detalles: `Configuración remota aplicada desde WebApp`,
              timestamp: lastConfig,
              usuario: poste.metadatos.configuradoPor || 'sistema',
              automatico: true,
              icon: Settings,
              severity: 'success'
            });
          }
        }

        // Eventos de uptime y reinicio
        if (poste.estado?.uptime !== undefined && poste.estado.uptime < 300) { // Menos de 5 minutos
          newAutoEvents.push({
            id: `auto_restart_${poste.id}_${now.getTime()}`,
            tipo: 'sistema',
            evento: 'Dispositivo reiniciado',
            posteId: poste.id,
            nombrePoste: poste.nombre,
            detalles: `ESP32 reiniciado. Uptime actual: ${Math.floor(poste.estado.uptime / 60)}m ${poste.estado.uptime % 60}s`,
            timestamp: now,
            usuario: 'sistema',
            automatico: true,
            icon: RefreshCw,
            severity: 'info',
            valor: `${Math.floor(poste.estado.uptime / 60)}m`
          });
        }
      });

      // Actualizar eventos automáticos (mantener solo los últimos 50)
      setAutoEventos(prev => {
        const combined = [...prev, ...newAutoEvents];
        const uniqueEvents = combined.filter((event, index, self) => 
          index === self.findIndex(e => e.id === event.id)
        );
        return uniqueEvents.slice(-50);
      });
    };

    if (postes.length > 0) {
      generateAutoEvents();
      
      // Generar eventos automáticos cada 30 segundos
      const interval = setInterval(generateAutoEvents, 30000);
      return () => clearInterval(interval);
    }
  }, [postes, autoEventos]);

  // Combinar eventos manuales y automáticos
  const allEventos = useMemo(() => {
    const combined = [...eventos, ...autoEventos];
    return combined.sort((a, b) => {
      const timeA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
      const timeB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
      return timeB - timeA;
    });
  }, [eventos, autoEventos]);

  const getEventIcon = (tipo, customIcon) => {
    if (customIcon) return customIcon;
    
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
      case 'sensor':
        return Eye;
      case 'conexion':
        return Wifi;
      default:
        return Clock;
    }
  };

  const getEventColor = (tipo, severity) => {
    if (severity) {
      switch (severity) {
        case 'error':
          return 'red';
        case 'warning':
          return 'orange';
        case 'success':
          return 'green';
        case 'info':
          return 'blue';
        default:
          return 'gray';
      }
    }
    
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
      case 'sensor':
        return 'teal';
      case 'conexion':
        return 'cyan';
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

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    return `${diffDays}d`;
  };

  const filteredEventos = allEventos.filter(evento => {
    if (filter === 'all') return true;
    return evento.tipo === filter;
  });

  const displayedEventos = showAll ? filteredEventos : filteredEventos.slice(0, 8);

  const getEventTypeLabel = (tipo) => {
    const labels = {
      auto: 'Automático',
      config: 'Configuración',
      error: 'Error',
      sistema: 'Sistema',
      control: 'Control',
      usuario: 'Usuario',
      sensor: 'Sensor',
      conexion: 'Conexión'
    };
    return labels[tipo] || tipo;
  };

  // Estadísticas de eventos
  const eventStats = useMemo(() => {
    const last24h = allEventos.filter(e => {
      const eventTime = e.timestamp?.toDate ? e.timestamp.toDate() : new Date(e.timestamp);
      return (new Date() - eventTime) < 24 * 60 * 60 * 1000;
    });

    return {
      total: allEventos.length,
      last24h: last24h.length,
      errors: allEventos.filter(e => e.tipo === 'error' || e.severity === 'error').length,
      automatic: allEventos.filter(e => e.automatico).length,
      sensors: allEventos.filter(e => e.tipo === 'sensor').length,
      connections: allEventos.filter(e => e.tipo === 'conexion').length
    };
  }, [allEventos]);

  return (
    <div className="events-timeline">
      {/* Estadísticas rápidas */}
      <div className="events-stats">
        <div className="stat-item">
          <Database className="stat-icon" />
          <div className="stat-content">
            <span className="stat-number">{eventStats.last24h}</span>
            <span className="stat-label">Últimas 24h</span>
          </div>
        </div>
        <div className="stat-item error">
          <AlertTriangle className="stat-icon" />
          <div className="stat-content">
            <span className="stat-number">{eventStats.errors}</span>
            <span className="stat-label">Errores</span>
          </div>
        </div>
        <div className="stat-item auto">
          <Shield className="stat-icon" />
          <div className="stat-content">
            <span className="stat-number">{eventStats.automatic}</span>
            <span className="stat-label">Automáticos</span>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="events-filters">
        <div className="filter-header">
          <Filter className="filter-icon" />
          <span className="filter-label">Filtrar eventos</span>
        </div>
        <div className="filter-buttons">
          {['all', 'auto', 'sensor', 'conexion', 'config', 'error', 'sistema'].map((filterType) => (
            <button
              key={filterType}
              className={`filter-btn ${filter === filterType ? 'active' : ''} ${filterType}`}
              onClick={() => setFilter(filterType)}
            >
              {filterType === 'all' ? 'Todos' : getEventTypeLabel(filterType)}
              <span className="filter-count">
                {filterType === 'all' 
                  ? allEventos.length 
                  : allEventos.filter(e => e.tipo === filterType).length
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
            <p className="no-events-subtitle">El sistema está funcionando sin eventos registrados</p>
          </div>
        ) : (
          <div className="timeline">
            {displayedEventos.map((evento, index) => {
              const EventIcon = getEventIcon(evento.tipo, evento.icon);
              const color = getEventColor(evento.tipo, evento.severity);
              
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
                        {evento.automatico && (
                          <span className="auto-badge">
                            <Shield className="auto-icon" />
                            AUTO
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {(evento.posteId || evento.nombrePoste) && (
                      <div className="event-device">
                        <Cpu className="device-icon" />
                        <span className="device-label">Dispositivo:</span>
                        <span className="device-value">
                          {evento.nombrePoste || evento.posteId}
                        </span>
                      </div>
                    )}
                    
                    {evento.detalles && (
                      <p className="event-details">{evento.detalles}</p>
                    )}

                    {evento.valor && (
                      <div className="event-value">
                        <span className="value-label">Valor:</span>
                        <span className="value-data">{evento.valor}</span>
                      </div>
                    )}

                    {evento.sensorType && (
                      <div className="event-sensor">
                        <Activity className="sensor-icon" />
                        <span className="sensor-label">Sensor:</span>
                        <span className="sensor-value">{evento.sensorType}</span>
                      </div>
                    )}
                    
                    {evento.usuario && evento.usuario !== 'sistema' && (
                      <div className="event-user">
                        <User className="user-icon" />
                        <span className="user-name">{evento.usuario}</span>
                      </div>
                    )}

                    <div className="event-timestamp">
                      <Clock className="timestamp-icon" />
                      <span className="timestamp-text">
                        {evento.timestamp ? 
                          (evento.timestamp.toDate ? 
                            evento.timestamp.toDate().toLocaleString() :
                            new Date(evento.timestamp).toLocaleString()) : 
                          'Fecha desconocida'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Botón para mostrar más */}
        {filteredEventos.length > 8 && (
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
                  Mostrar más ({filteredEventos.length - 8} eventos adicionales)
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Resumen detallado */}
      <div className="events-summary">
        <div className="summary-title">Resumen del Sistema IoT</div>
        <div className="summary-stats">
          <div className="summary-stat auto">
            <Zap className="summary-icon" />
            <div className="summary-content">
              <span className="stat-count">{allEventos.filter(e => e.tipo === 'auto').length}</span>
              <span className="stat-label">Automáticos</span>
            </div>
          </div>
          <div className="summary-stat sensor">
            <Activity className="summary-icon" />
            <div className="summary-content">
              <span className="stat-count">{eventStats.sensors}</span>
              <span className="stat-label">Sensores</span>
            </div>
          </div>
          <div className="summary-stat connection">
            <Signal className="summary-icon" />
            <div className="summary-content">
              <span className="stat-count">{eventStats.connections}</span>
              <span className="stat-label">Conexiones</span>
            </div>
          </div>
          <div className="summary-stat error">
            <AlertTriangle className="summary-icon" />
            <div className="summary-content">
              <span className="stat-count">{eventStats.errors}</span>
              <span className="stat-label">Errores</span>
            </div>
          </div>
        </div>
        
        <div className="system-health-summary">
          <div className="health-indicator">
            <span className="health-label">Estado del Sistema IoT:</span>
            <span className={`health-status ${eventStats.errors === 0 ? 'healthy' : 'warning'}`}>
              {eventStats.errors === 0 ? 'Funcionando Correctamente' : 'Requiere Atención'}
            </span>
          </div>
          <div className="activity-level">
            <span className="activity-label">Nivel de Actividad:</span>
            <span className={`activity-status ${eventStats.last24h > 10 ? 'high' : eventStats.last24h > 5 ? 'medium' : 'low'}`}>
              {eventStats.last24h > 10 ? 'Alto' : eventStats.last24h > 5 ? 'Medio' : 'Bajo'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventsTimeline;