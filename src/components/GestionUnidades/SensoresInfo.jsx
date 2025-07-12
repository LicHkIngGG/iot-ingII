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
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSensor, setSelectedSensor] = useState('all');

  // Procesar datos de sensores
  const sensorsData = useMemo(() => {
    const data = [];
    
    configuraciones.forEach(config => {
      const deviceStatus = connectionStatus[config.posteId] || { online: false };
      
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
      if (selectedSensor !== 'all' && sensor.sensorType !== selectedSensor) return false;
      if (filter === 'enabled' && !sensor.enabled) return false;
      if (filter === 'disabled' && sensor.enabled) return false;
      if (filter === 'online' && !sensor.deviceOnline) return false;
      if (filter === 'offline' && sensor.deviceOnline) return false;
      
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
      <div 
        style={{
          background: 'white',
          borderRadius: '12px',
          padding: '20px',
          border: `2px solid ${
            sensor.enabled && sensor.deviceOnline ? '#10b981' :
            sensor.enabled && !sensor.deviceOnline ? '#f59e0b' :
            '#9ca3af'
          }`,
          transition: 'all 0.3s ease',
          position: 'relative',
          overflow: 'hidden',
          background: sensor.enabled && sensor.deviceOnline ? 
            'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' :
            sensor.enabled && !sensor.deviceOnline ?
            'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)' :
            'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
          opacity: sensor.enabled ? 1 : 0.8
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = 'translateY(-2px)';
          e.target.style.boxShadow = '0 8px 30px rgba(0, 0, 0, 0.12)';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'translateY(0)';
          e.target.style.boxShadow = 'none';
        }}
      >
        {/* Barra superior de estado */}
        <div 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: sensor.enabled && sensor.deviceOnline ? 
              'linear-gradient(90deg, #10b981, #059669)' :
              sensor.enabled && !sensor.deviceOnline ?
              'linear-gradient(90deg, #f59e0b, #d97706)' :
              'linear-gradient(90deg, #9ca3af, #6b7280)',
            borderRadius: '12px 12px 0 0'
          }}
        />

        {/* Header del sensor */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '15px',
          paddingBottom: '12px',
          borderBottom: '1px solid rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <SensorIcon 
              style={{
                width: '24px',
                height: '24px',
                marginTop: '2px',
                color: sensor.sensorType === 'ldr' ? '#f59e0b' :
                       sensor.sensorType === 'pir' ? '#10b981' :
                       sensor.sensorType === 'acs712' ? '#3b82f6' : '#64748b'
              }}
            />
            <div style={{ flex: 1 }}>
              <h3 style={{
                margin: '0 0 4px 0',
                fontSize: '1.1rem',
                fontWeight: '600',
                color: '#1e293b'
              }}>
                {getSensorName(sensor.sensorType)}
              </h3>
              <p style={{
                margin: 0,
                fontSize: '13px',
                color: '#64748b',
                fontWeight: '500'
              }}>
                {sensor.deviceName}
              </p>
            </div>
          </div>
          
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '6px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: '600',
              background: sensor.enabled ? 
                'rgba(16, 185, 129, 0.1)' : 'rgba(156, 163, 175, 0.1)',
              color: sensor.enabled ? '#10b981' : '#6b7280'
            }}>
              {sensor.enabled ? (
                <CheckCircle style={{ width: '12px', height: '12px' }} />
              ) : (
                <XCircle style={{ width: '12px', height: '12px' }} />
              )}
              <span>{sensor.enabled ? 'Habilitado' : 'Deshabilitado'}</span>
            </div>
            
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '10px',
              fontWeight: '500'
            }}>
              <div style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: sensor.deviceOnline ? '#10b981' : '#ef4444',
                boxShadow: sensor.deviceOnline ? '0 0 4px rgba(16, 185, 129, 0.5)' : 'none'
              }} />
              <span style={{ color: '#64748b' }}>
                {sensor.deviceOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        </div>

        {/* Descripción */}
        <div style={{ marginBottom: '12px' }}>
          <p style={{
            margin: 0,
            fontSize: '13px',
            color: '#64748b',
            lineHeight: '1.4'
          }}>
            {getSensorDescription(sensor.sensorType)}
          </p>
        </div>

        {/* Ubicación */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '15px',
          padding: '8px 12px',
          background: 'rgba(248, 250, 252, 0.7)',
          borderRadius: '6px',
          fontSize: '12px'
        }}>
          <span style={{ color: '#64748b', fontWeight: '500' }}>Ubicación:</span>
          <span style={{ color: '#1e293b', fontWeight: '600' }}>{sensor.deviceLocation}</span>
        </div>

        {/* Especificaciones */}
        <div style={{ marginBottom: '12px' }}>
          <h4 style={{
            margin: '0 0 8px 0',
            fontSize: '13px',
            fontWeight: '600',
            color: '#374151'
          }}>
            Configuración:
          </h4>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {specs.map((spec, index) => (
              <li 
                key={index}
                style={{
                  padding: '3px 0',
                  fontSize: '11px',
                  color: '#64748b',
                  display: 'flex',
                  justifyContent: 'space-between',
                  borderBottom: index < specs.length - 1 ? '1px solid rgba(0, 0, 0, 0.05)' : 'none'
                }}
              >
                {spec}
              </li>
            ))}
          </ul>
        </div>

        {/* Footer con última actualización */}
        {sensor.lastUpdate && (
          <div style={{
            textAlign: 'center',
            paddingTop: '10px',
            borderTop: '1px solid rgba(0, 0, 0, 0.05)'
          }}>
            <span style={{
              fontSize: '10px',
              color: '#94a3b8',
              fontStyle: 'italic'
            }}>
              Última actualización: {sensor.lastUpdate.toLocaleString()}
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '30px',
      padding: '30px',
      minHeight: '100vh'
    }}>
      {/* Header con estadísticas generales */}
      <div style={{ marginBottom: '25px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px'
        }}>
          {[
            { 
              key: 'total', 
              value: sensorStats.total, 
              label: 'Total Sensores', 
              icon: Settings, 
              color: '#667eea' 
            },
            { 
              key: 'enabled', 
              value: sensorStats.enabled, 
              label: 'Habilitados', 
              icon: CheckCircle, 
              color: '#10b981' 
            },
            { 
              key: 'online', 
              value: sensorStats.online, 
              label: 'Online', 
              icon: Activity, 
              color: '#3b82f6' 
            },
            { 
              key: 'offline', 
              value: sensorStats.offline, 
              label: 'Offline', 
              icon: AlertTriangle, 
              color: '#f59e0b' 
            }
          ].map(stat => {
            const IconComponent = stat.icon;
            return (
              <div 
                key={stat.key}
                style={{
                  background: 'white',
                  padding: '20px',
                  borderRadius: '12px',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '15px',
                  transition: 'all 0.3s ease',
                  border: '1px solid #f1f5f9'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 30px rgba(0, 0, 0, 0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.08)';
                }}
              >
                <div style={{
                  padding: '12px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: `linear-gradient(135deg, ${stat.color} 0%, ${stat.color}dd 100%)`
                }}>
                  <IconComponent style={{ width: '20px', height: '20px', color: 'white' }} />
                </div>
                <div>
                  <h3 style={{
                    fontSize: '1.8rem',
                    fontWeight: '700',
                    margin: '0',
                    color: '#1e293b'
                  }}>
                    {stat.value}
                  </h3>
                  <p style={{
                    margin: '5px 0 0 0',
                    color: '#64748b',
                    fontSize: '13px',
                    fontWeight: '500'
                  }}>
                    {stat.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tipos de sensores disponibles */}
      <div style={{
        background: 'white',
        padding: '25px',
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        border: '1px solid #f1f5f9'
      }}>
        <h3 style={{
          fontSize: '1.3rem',
          fontWeight: '700',
          color: '#1e293b',
          margin: '0 0 20px 0'
        }}>
          Tipos de Sensores Disponibles
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '20px'
        }}>
          {Object.entries(sensorStats.byType).map(([type, stats]) => {
            const SensorIcon = getSensorIcon(type);
            const efficiency = stats.total > 0 ? (stats.online / stats.total * 100).toFixed(1) : 0;
            
            return (
              <div 
                key={type}
                style={{
                  background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                  padding: '20px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = '0 8px 30px rgba(0, 0, 0, 0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '3px',
                  background: 'linear-gradient(90deg, #3b82f6, #1d4ed8)',
                  borderRadius: '12px 12px 0 0'
                }} />

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '12px'
                }}>
                  <SensorIcon style={{
                    width: '24px',
                    height: '24px',
                    color: type === 'ldr' ? '#f59e0b' :
                           type === 'pir' ? '#10b981' :
                           type === 'acs712' ? '#3b82f6' : '#64748b'
                  }} />
                  <h4 style={{
                    margin: 0,
                    fontSize: '1.1rem',
                    fontWeight: '600',
                    color: '#1e293b'
                  }}>
                    {getSensorName(type)}
                  </h4>
                </div>
                
                <div style={{ marginBottom: '15px' }}>
                  <p style={{
                    margin: 0,
                    fontSize: '13px',
                    color: '#64748b',
                    lineHeight: '1.4'
                  }}>
                    {getSensorDescription(type)}
                  </p>
                </div>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '8px',
                  marginBottom: '12px'
                }}>
                  {[
                    { label: 'Total', value: stats.total },
                    { label: 'Habilitados', value: stats.enabled },
                    { label: 'Online', value: stats.online },
                    { 
                      label: 'Eficiencia', 
                      value: `${efficiency}%`,
                      color: efficiency > 80 ? '#10b981' : efficiency > 60 ? '#f59e0b' : '#ef4444'
                    }
                  ].map((stat, index) => (
                    <div key={index} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '12px',
                      padding: '4px 0'
                    }}>
                      <span style={{ color: '#64748b', fontWeight: '500' }}>{stat.label}:</span>
                      <span style={{
                        color: stat.color || '#1e293b',
                        fontWeight: '600'
                      }}>
                        {stat.value}
                      </span>
                    </div>
                  ))}
                </div>
                
                <div style={{ marginTop: '10px' }}>
                  <div style={{
                    width: '100%',
                    height: '6px',
                    background: '#e5e7eb',
                    borderRadius: '3px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%',
                      background: 'linear-gradient(90deg, #10b981, #059669)',
                      borderRadius: '3px',
                      width: `${efficiency}%`,
                      transition: 'width 0.8s ease'
                    }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Controles de filtro */}
      <div style={{
        background: 'white',
        padding: '20px',
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        border: '1px solid #f1f5f9'
      }}>
        <div style={{ marginBottom: '20px' }}>
          <div style={{ position: 'relative', maxWidth: '500px' }}>
            <Search style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '18px',
              height: '18px',
              color: '#9ca3af',
              zIndex: 2
            }} />
            <input
              type="text"
              placeholder="Buscar sensores por dispositivo o ubicación..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 12px 12px 45px',
                border: '1px solid #d1d5db',
                borderRadius: '10px',
                fontSize: '14px',
                background: 'white',
                transition: 'all 0.3s ease'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#3b82f6';
                e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#d1d5db';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '20px',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label style={{
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              whiteSpace: 'nowrap'
            }}>
              Tipo de Sensor:
            </label>
            <select
              value={selectedSensor}
              onChange={(e) => setSelectedSensor(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '13px',
                background: 'white',
                cursor: 'pointer',
                minWidth: '160px'
              }}
            >
              <option value="all">Todos los sensores</option>
              <option value="ldr">Solo LDR</option>
              <option value="pir">Solo PIR</option>
              <option value="acs712">Solo ACS712</option>
            </select>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap'
          }}>
            <Filter style={{ width: '18px', height: '18px', color: '#6b7280' }} />
            {[
              { key: 'all', label: 'Todos', count: sensorsData.length, color: '#3b82f6' },
              { key: 'enabled', label: 'Habilitados', count: sensorStats.enabled, color: '#10b981' },
              { key: 'disabled', label: 'Deshabilitados', count: sensorStats.disabled, color: '#6b7280' },
              { key: 'online', label: 'Online', count: sensorStats.online, color: '#3b82f6' },
              { key: 'offline', label: 'Offline', count: sensorStats.offline, color: '#f59e0b' }
            ].map(({ key, label, count, color }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  background: filter === key ? 
                    `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)` : 
                    '#f9fafb',
                  border: filter === key ? 'none' : '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '500',
                  color: filter === key ? 'white' : '#374151',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  whiteSpace: 'nowrap',
                  boxShadow: filter === key ? `0 4px 15px ${color}44` : 'none'
                }}
                onMouseEnter={(e) => {
                  if (filter !== key) {
                    e.target.style.background = '#f3f4f6';
                    e.target.style.borderColor = '#d1d5db';
                    e.target.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (filter !== key) {
                    e.target.style.background = '#f9fafb';
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.transform = 'translateY(0)';
                  }
                }}
              >
                {label}
                <span style={{
                  background: filter === key ? 'rgba(255, 255, 255, 0.25)' : '#e5e7eb',
                  color: filter === key ? 'white' : '#6b7280',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: '600',
                  minWidth: '18px',
                  textAlign: 'center'
                }}>
                  {count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Lista de sensores */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        border: '1px solid #f1f5f9',
        overflow: 'hidden'
      }}>
        {filteredSensors.length === 0 ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px 20px',
            textAlign: 'center'
          }}>
            <div style={{ maxWidth: '400px' }}>
              <Settings style={{
                width: '64px',
                height: '64px',
                color: '#cbd5e1',
                margin: '0 auto 20px auto'
              }} />
              <h3 style={{
                margin: '0 0 8px 0',
                fontSize: '1.3rem',
                fontWeight: '600',
                color: '#374151'
              }}>
                {searchTerm || filter !== 'all' || selectedSensor !== 'all'
                  ? 'No se encontraron sensores'
                  : 'No hay sensores configurados'
                }
              </h3>
              <p style={{
                margin: 0,
                color: '#6b7280',
                fontSize: '14px',
                lineHeight: '1.4'
              }}>
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
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
            gap: '20px',
            padding: '20px'
          }}>
            {filteredSensors.map((sensor) => (
              <SensorCard key={sensor.id} sensor={sensor} />
            ))}
          </div>
        )}
      </div>

      {/* Capacidades de sensores */}
      <div style={{
        background: 'white',
        padding: '25px',
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        border: '1px solid #f1f5f9'
      }}>
        <h3 style={{
          fontSize: '1.3rem',
          fontWeight: '700',
          color: '#1e293b',
          margin: '0 0 20px 0'
        }}>
          Capacidades de los Sensores
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
          gap: '20px'
        }}>
          {[
            {
              type: 'ldr',
              icon: Eye,
              title: 'Sensor LDR',
              color: '#f59e0b',
              funcionalities: [
                'Detección de luminosidad ambiental',
                'Control automático de encendido/apagado',
                'Calibración personalizable',
                'Filtro de ruido configurable'
              ],
              specs: [
                'Rango: 0-1023 (valor digital)',
                'Voltaje: 3.3V - 5V',
                'Precisión: ±5%',
                'Tiempo respuesta: <1s'
              ]
            },
            {
              type: 'pir',
              icon: Activity,
              title: 'Sensor PIR',
              color: '#10b981',
              funcionalities: [
                'Detección de movimiento infrarrojo',
                'Activación automática por presencia',
                'Sensibilidad ajustable',
                'Contador de detecciones'
              ],
              specs: [
                'Rango: 3-7 metros',
                'Ángulo: 120°',
                'Voltaje: 5V - 12V',
                'Tiempo activación: 5-300s'
              ]
            },
            {
              type: 'acs712',
              icon: Zap,
              title: 'Sensor ACS712',
              color: '#3b82f6',
              funcionalities: [
                'Medición de corriente AC/DC',
                'Cálculo de consumo energético',
                'Detección de sobrecarga',
                'Filtro promedio configurable'
              ],
              specs: [
                'Modelos: 5A, 20A, 30A',
                'Precisión: ±1.5%',
                'Aislamiento: 2.1kV RMS',
                'Tiempo respuesta: 5μs'
              ]
            }
          ].map((capability) => {
            const IconComponent = capability.icon;
            return (
              <div 
                key={capability.type}
                style={{
                  background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                  padding: '20px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  borderLeft: `4px solid ${capability.color}`,
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '15px'
                }}>
                  <IconComponent style={{
                    width: '24px',
                    height: '24px',
                    color: capability.color
                  }} />
                  <h4 style={{
                    margin: 0,
                    fontSize: '1.1rem',
                    fontWeight: '600',
                    color: '#1e293b'
                  }}>
                    {capability.title}
                  </h4>
                </div>
                
                <div>
                  <h5 style={{
                    margin: '0 0 8px 0',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151'
                  }}>
                    Funcionalidades:
                  </h5>
                  <ul style={{ margin: '0 0 15px 0', paddingLeft: '15px' }}>
                    {capability.funcionalities.map((func, index) => (
                      <li key={index} style={{
                        marginBottom: '4px',
                        fontSize: '12px',
                        color: '#64748b',
                        lineHeight: '1.4'
                      }}>
                        {func}
                      </li>
                    ))}
                  </ul>
                  
                  <h5 style={{
                    margin: '0 0 8px 0',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151'
                  }}>
                    Especificaciones:
                  </h5>
                  <ul style={{ margin: 0, paddingLeft: '15px' }}>
                    {capability.specs.map((spec, index) => (
                      <li key={index} style={{
                        marginBottom: '4px',
                        fontSize: '12px',
                        color: '#64748b',
                        lineHeight: '1.4'
                      }}>
                        {spec}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Distribución de sensores */}
      <div style={{
        background: 'white',
        padding: '25px',
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        border: '1px solid #f1f5f9'
      }}>
        <h3 style={{
          fontSize: '1.3rem',
          fontWeight: '700',
          color: '#1e293b',
          margin: '0 0 20px 0'
        }}>
          Distribución de Sensores
        </h3>
        <div style={{
          background: '#f8fafc',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '20px',
            fontSize: '14px',
            fontWeight: '600',
            color: '#374151'
          }}>
            <BarChart3 style={{ width: '20px', height: '20px', color: '#6366f1' }} />
            <span>Estado de Sensores por Tipo</span>
          </div>
          
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '15px'
          }}>
            {Object.entries(sensorStats.byType).map(([type, stats]) => {
              const SensorIcon = getSensorIcon(type);
              const enabledPercentage = stats.total > 0 ? (stats.enabled / stats.total * 100) : 0;
              const onlinePercentage = stats.enabled > 0 ? (stats.online / stats.enabled * 100) : 0;
              
              return (
                <div key={type} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '15px',
                  padding: '12px',
                  background: 'white',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    minWidth: '140px'
                  }}>
                    <SensorIcon style={{
                      width: '18px',
                      height: '18px',
                      color: type === 'ldr' ? '#f59e0b' :
                             type === 'pir' ? '#10b981' :
                             type === 'acs712' ? '#3b82f6' : '#64748b'
                    }} />
                    <span style={{
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#374151'
                    }}>
                      {getSensorName(type)}
                    </span>
                  </div>
                  
                  <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}>
                      <span style={{
                        fontSize: '11px',
                        color: '#64748b',
                        minWidth: '70px',
                        fontWeight: '500'
                      }}>
                        Habilitados
                      </span>
                      <div style={{
                        flex: 1,
                        height: '8px',
                        background: '#e5e7eb',
                        borderRadius: '4px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          height: '100%',
                          background: 'linear-gradient(90deg, #10b981, #059669)',
                          borderRadius: '4px',
                          width: `${enabledPercentage}%`,
                          transition: 'width 0.8s ease'
                        }} />
                      </div>
                      <span style={{
                        fontSize: '11px',
                        color: '#374151',
                        fontWeight: '600',
                        minWidth: '40px',
                        textAlign: 'right',
                        fontFamily: 'Courier New, monospace'
                      }}>
                        {stats.enabled}/{stats.total}
                      </span>
                    </div>
                    
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}>
                      <span style={{
                        fontSize: '11px',
                        color: '#64748b',
                        minWidth: '70px',
                        fontWeight: '500'
                      }}>
                        Online
                      </span>
                      <div style={{
                        flex: 1,
                        height: '8px',
                        background: '#e5e7eb',
                        borderRadius: '4px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          height: '100%',
                          background: 'linear-gradient(90deg, #3b82f6, #1d4ed8)',
                          borderRadius: '4px',
                          width: `${onlinePercentage}%`,
                          transition: 'width 0.8s ease'
                        }} />
                      </div>
                      <span style={{
                        fontSize: '11px',
                        color: '#374151',
                        fontWeight: '600',
                        minWidth: '40px',
                        textAlign: 'right',
                        fontFamily: 'Courier New, monospace'
                      }}>
                        {stats.online}/{stats.enabled}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Información técnica */}
      <div style={{
        background: 'white',
        padding: '25px',
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        border: '1px solid #f1f5f9'
      }}>
        <h3 style={{
          fontSize: '1.3rem',
          fontWeight: '700',
          color: '#1e293b',
          margin: '0 0 20px 0'
        }}>
          Información Técnica
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px'
        }}>
          {[
            {
              icon: Cpu,
              title: 'Integración ESP32',
              description: 'Los sensores se conectan directamente a los pines GPIO del ESP32, permitiendo lecturas analógicas y digitales en tiempo real.'
            },
            {
              icon: Settings,
              title: 'Configuración Remota',
              description: 'Todos los parámetros de los sensores pueden configurarse remotamente a través de la interfaz web sin necesidad de reprogramar el dispositivo.'
            },
            {
              icon: BarChart3,
              title: 'Monitoreo Continuo',
              description: 'Los sensores envían datos continuamente al sistema central, permitiendo monitoreo en tiempo real y generación de alertas automáticas.'
            },
            {
              icon: CheckCircle,
              title: 'Auto-diagnóstico',
              description: 'El sistema detecta automáticamente fallas en los sensores y genera alertas para mantenimiento preventivo.'
            }
          ].map((info, index) => {
            const IconComponent = info.icon;
            return (
              <div 
                key={index}
                style={{
                  background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                  padding: '20px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  textAlign: 'center',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '2px',
                  background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                  borderRadius: '12px 12px 0 0'
                }} />
                
                <IconComponent style={{
                  width: '32px',
                  height: '32px',
                  color: '#6366f1',
                  margin: '0 auto 12px auto'
                }} />
                
                <h4 style={{
                  margin: '0 0 10px 0',
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  color: '#1e293b'
                }}>
                  {info.title}
                </h4>
                
                <p style={{
                  margin: 0,
                  fontSize: '13px',
                  color: '#64748b',
                  lineHeight: '1.5',
                  textAlign: 'left'
                }}>
                  {info.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SensoresInfo;