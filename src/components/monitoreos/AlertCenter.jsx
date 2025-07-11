import React, { useState, useEffect, useMemo } from 'react';
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
  Info,
  Activity,
  Lightbulb,
  Shield,
  Filter,
  Bell,
  BellOff
} from 'lucide-react';
import './AlertCenter.css';

const AlertCenter = ({ alertas, onAlertaClick, userRole, postes = [] }) => {
  const [filter, setFilter] = useState('all'); // all, unread, critical, high, medium, low, auto
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [autoAlertas, setAutoAlertas] = useState([]);

  // Generar alertas automáticas basadas en estado de postes y sensores
  useEffect(() => {
    const generateAutoAlerts = () => {
      const newAutoAlerts = [];
      const now = new Date();

      postes.forEach(poste => {
        // Verificar conectividad
        if (!poste.estado?.online) {
          newAutoAlerts.push({
            id: `auto_offline_${poste.id}`,
            tipo: 'comunicacion',
            severidad: 'critical',
            mensaje: `Dispositivo ${poste.nombre} desconectado`,
            posteId: poste.id,
            ubicacion: poste.ubicacion,
            detalles: 'El dispositivo ESP32 no responde a las comunicaciones WebSocket',
            timestamp: now,
            leida: false,
            automatica: true,
            icono: WifiOff
          });
        }

        // Verificar sensores
        if (poste.sensores) {
          // Sensor LDR
          if (poste.sensores.ldr && !poste.sensores.ldr.funcionando) {
            newAutoAlerts.push({
              id: `auto_ldr_${poste.id}`,
              tipo: 'sensor',
              severidad: 'high',
              mensaje: `Sensor LDR no responde en ${poste.nombre}`,
              posteId: poste.id,
              ubicacion: poste.ubicacion,
              detalles: `Valor raw: ${poste.sensores.ldr.valorRaw || 'N/A'}, Lux calculado: ${poste.sensores.ldr.luxCalculado || 'N/A'}`,
              timestamp: now,
              leida: false,
              automatica: true,
              icono: Eye
            });
          }

          // Sensor PIR
          if (poste.sensores.pir && !poste.sensores.pir.funcionando) {
            newAutoAlerts.push({
              id: `auto_pir_${poste.id}`,
              tipo: 'sensor',
              severidad: 'medium',
              mensaje: `Detector de movimiento falla en ${poste.nombre}`,
              posteId: poste.id,
              ubicacion: poste.ubicacion,
              detalles: `Última detección: ${poste.sensores.pir.ultimaDeteccion || 'Nunca'}`,
              timestamp: now,
              leida: false,
              automatica: true,
              icono: Activity
            });
          }

          // Sensor ACS712
          if (poste.sensores.acs712 && !poste.sensores.acs712.funcionando) {
            newAutoAlerts.push({
              id: `auto_acs_${poste.id}`,
              tipo: 'sensor',
              severidad: 'high',
              mensaje: `Sensor de corriente falla en ${poste.nombre}`,
              posteId: poste.id,
              ubicacion: poste.ubicacion,
              detalles: `Corriente actual: ${poste.sensores.acs712.corriente || 0}A`,
              timestamp: now,
              leida: false,
              automatica: true,
              icono: Zap
            });
          }
        }

        // Verificar consumo anormal
        if (poste.calculados) {
          const consumoEsperado = 60 * 0.22; // 60W por ~22 horas
          const consumoActual = poste.calculados.consumoHoy || 0;
          
          if (consumoActual > consumoEsperado * 1.3) {
            newAutoAlerts.push({
              id: `auto_consumo_alto_${poste.id}`,
              tipo: 'consumo',
              severidad: 'high',
              mensaje: `Consumo anormalmente alto en ${poste.nombre}`,
              posteId: poste.id,
              ubicacion: poste.ubicacion,
              detalles: `Consumo: ${consumoActual.toFixed(2)}kWh, Esperado: ${consumoEsperado.toFixed(2)}kWh`,
              timestamp: now,
              leida: false,
              automatica: true,
              icono: Gauge
            });
          } else if (consumoActual < consumoEsperado * 0.1 && poste.estado?.encendido) {
            newAutoAlerts.push({
              id: `auto_consumo_bajo_${poste.id}`,
              tipo: 'consumo',
              severidad: 'medium',
              mensaje: `Consumo anormalmente bajo en ${poste.nombre}`,
              posteId: poste.id,
              ubicacion: poste.ubicacion,
              detalles: `Consumo: ${consumoActual.toFixed(2)}kWh, dispositivo reportado como encendido`,
              timestamp: now,
              leida: false,
              automatica: true,
              icono: Lightbulb
            });
          }

          // Verificar eficiencia baja
          if (poste.calculados.eficienciaHoy < 70) {
            newAutoAlerts.push({
              id: `auto_eficiencia_${poste.id}`,
              tipo: 'rendimiento',
              severidad: 'medium',
              mensaje: `Eficiencia baja en ${poste.nombre}`,
              posteId: poste.id,
              ubicacion: poste.ubicacion,
              detalles: `Eficiencia actual: ${poste.calculados.eficienciaHoy}%, umbral mínimo: 70%`,
              timestamp: now,
              leida: false,
              automatica: true,
              icono: Gauge
            });
          }
        }

        // Verificar tiempo sin actualizarse (dispositivo zombie)
        if (poste.estado?.ultimaActualizacion) {
          const lastUpdate = poste.estado.ultimaActualizacion.toDate ? 
            poste.estado.ultimaActualizacion.toDate() : 
            new Date(poste.estado.ultimaActualizacion);
          const timeDiff = (now - lastUpdate) / 1000 / 60; // minutos

          if (timeDiff > 10 && poste.estado?.online) { // Más de 10 minutos sin actualizar
            newAutoAlerts.push({
              id: `auto_stale_${poste.id}`,
              tipo: 'comunicacion',
              severidad: 'medium',
              mensaje: `${poste.nombre} sin datos actualizados`,
              posteId: poste.id,
              ubicacion: poste.ubicacion,
              detalles: `Última actualización hace ${Math.round(timeDiff)} minutos`,
              timestamp: now,
              leida: false,
              automatica: true,
              icono: Clock
            });
          }
        }
      });

      setAutoAlertas(newAutoAlerts);
    };

    generateAutoAlerts();
    
    // Actualizar alertas automáticas cada 60 segundos
    const interval = setInterval(generateAutoAlerts, 60000);
    
    return () => clearInterval(interval);
  }, [postes]);

  // Combinar alertas manuales y automáticas
  const allAlertas = useMemo(() => {
    const combined = [...alertas, ...autoAlertas];
    return combined.sort((a, b) => {
      const timeA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
      const timeB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
      return timeB - timeA;
    });
  }, [alertas, autoAlertas]);

  // Reproducir sonido para alertas críticas
  useEffect(() => {
    if (soundEnabled) {
      const criticalAlerts = allAlertas.filter(a => 
        a.severidad === 'critical' && !a.leida && 
        a.timestamp && (new Date() - (a.timestamp.toDate ? a.timestamp.toDate() : new Date(a.timestamp))) < 5000
      );
      
      if (criticalAlerts.length > 0) {
        // Crear sonido de alerta
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.2);
      }
    }
  }, [allAlertas, soundEnabled]);

  const getAlertIcon = (tipo, customIcon) => {
    if (customIcon) return customIcon;
    
    switch (tipo) {
      case 'consumo':
        return Zap;
      case 'comunicacion':
        return WifiOff;
      case 'voltaje':
        return Gauge;
      case 'sensor':
        return AlertTriangle;
      case 'rendimiento':
        return Activity;
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

  const filteredAlertas = allAlertas.filter(alerta => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !alerta.leida;
    if (filter === 'auto') return alerta.automatica;
    return alerta.severidad === filter;
  });

  const handleAlertClick = (alerta) => {
    if (userRole === 'administrador' && !alerta.leida) {
      if (alerta.automatica) {
        // Para alertas automáticas, marcar como leída localmente
        setAutoAlertas(prev => prev.map(a => 
          a.id === alerta.id ? { ...a, leida: true } : a
        ));
      } else {
        // Para alertas de Firebase, usar el callback
        onAlertaClick(alerta.id);
      }
    }
  };

  const alertCounts = {
    total: allAlertas.length,
    unread: allAlertas.filter(a => !a.leida).length,
    critical: allAlertas.filter(a => a.severidad === 'critical').length,
    high: allAlertas.filter(a => a.severidad === 'high').length,
    medium: allAlertas.filter(a => a.severidad === 'medium').length,
    auto: allAlertas.filter(a => a.automatica).length
  };

  return (
    <div className="alert-center">
      {/* Controles superiores */}
      <div className="alert-controls">
        <div className="sound-control">
          <button 
            className={`sound-btn ${soundEnabled ? 'active' : ''}`}
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'Desactivar sonidos' : 'Activar sonidos'}
          >
            {soundEnabled ? <Bell className="sound-icon" /> : <BellOff className="sound-icon" />}
          </button>
        </div>
        
        <div className="alert-summary-mini">
          <span className="summary-critical">{alertCounts.critical}</span>
          <span className="summary-unread">{alertCounts.unread} sin leer</span>
        </div>
      </div>

      {/* Filtros */}
      <div className="alert-filters">
        <button 
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          <Filter className="filter-icon" />
          Todas ({alertCounts.total})
        </button>
        <button 
          className={`filter-btn ${filter === 'unread' ? 'active' : ''}`}
          onClick={() => setFilter('unread')}
        >
          <Eye className="filter-icon" />
          No leídas ({alertCounts.unread})
        </button>
        <button 
          className={`filter-btn ${filter === 'auto' ? 'active' : ''}`}
          onClick={() => setFilter('auto')}
        >
          <Shield className="filter-icon" />
          Automáticas ({alertCounts.auto})
        </button>
        <button 
          className={`filter-btn critical ${filter === 'critical' ? 'active' : ''}`}
          onClick={() => setFilter('critical')}
        >
          <XCircle className="filter-icon" />
          Críticas ({alertCounts.critical})
        </button>
        <button 
          className={`filter-btn high ${filter === 'high' ? 'active' : ''}`}
          onClick={() => setFilter('high')}
        >
          <AlertTriangle className="filter-icon" />
          Altas ({alertCounts.high})
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
            <p className="no-alerts-subtitle">Sistema funcionando correctamente</p>
          </div>
        ) : (
          filteredAlertas.map((alerta) => {
            const AlertIcon = getAlertIcon(alerta.tipo, alerta.icono);
            const SeverityIcon = getSeverityIcon(alerta.severidad);
            
            return (
              <div 
                key={alerta.id}
                className={`alert-item ${getSeverityColor(alerta.severidad)} ${!alerta.leida ? 'unread' : 'read'} ${alerta.automatica ? 'automatic' : 'manual'}`}
                onClick={() => handleAlertClick(alerta)}
              >
                <div className="alert-icon-container">
                  <AlertIcon className="alert-type-icon" />
                  <SeverityIcon className="alert-severity-icon" />
                  {alerta.automatica && (
                    <Shield className="alert-auto-badge" title="Alerta automática del sistema" />
                  )}
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
                    <div className="alert-location">
                      <span className="location-label">Dispositivo:</span> 
                      <span className="location-value">{alerta.posteId}</span>
                    </div>
                  )}

                  {alerta.ubicacion && (
                    <div className="alert-location">
                      <span className="location-label">Ubicación:</span> 
                      <span className="location-value">{alerta.ubicacion}</span>
                    </div>
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
                    {alerta.automatica && (
                      <span className="auto-badge">AUTO</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      
      {/* Resumen detallado */}
      <div className="alerts-summary">
        <div className="summary-title">Resumen del Sistema</div>
        <div className="summary-grid">
          <div className="summary-item critical">
            <XCircle className="summary-icon" />
            <div className="summary-content">
              <span className="summary-count">{alertCounts.critical}</span>
              <span className="summary-label">Críticas</span>
            </div>
          </div>
          <div className="summary-item high">
            <AlertTriangle className="summary-icon" />
            <div className="summary-content">
              <span className="summary-count">{alertCounts.high}</span>
              <span className="summary-label">Altas</span>
            </div>
          </div>
          <div className="summary-item medium">
            <AlertCircle className="summary-icon" />
            <div className="summary-content">
              <span className="summary-count">{alertCounts.medium}</span>
              <span className="summary-label">Medias</span>
            </div>
          </div>
          <div className="summary-item auto">
            <Shield className="summary-icon" />
            <div className="summary-content">
              <span className="summary-count">{alertCounts.auto}</span>
              <span className="summary-label">Automáticas</span>
            </div>
          </div>
        </div>
        
        <div className="system-health">
          <div className="health-indicator">
            <span className="health-label">Estado del Sistema:</span>
            <span className={`health-status ${alertCounts.critical === 0 ? 'healthy' : 'warning'}`}>
              {alertCounts.critical === 0 ? 'Saludable' : 'Requiere Atención'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlertCenter;