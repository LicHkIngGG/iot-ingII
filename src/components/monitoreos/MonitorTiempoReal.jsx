// src/components/MonitoreoControl/components/MonitorTiempoReal/MonitorTiempoReal.jsx
import React, { useState, useEffect } from 'react';
import './MonitorTiempoReal.css';

const MonitorTiempoReal = ({ postes, datosEnVivo, actualizacionAutomatica }) => {
  const [estadoGrafico, setEstadoGrafico] = useState('intensidad'); // intensidad, consumo, sensores
  const [historialDatos, setHistorialDatos] = useState({});
  const [modoVisualizacion, setModoVisualizacion] = useState('lista'); // lista, grid, mapa

  useEffect(() => {
    if (actualizacionAutomatica) {
      actualizarHistorial();
    }
  }, [datosEnVivo, actualizacionAutomatica]);

  const actualizarHistorial = () => {
    const timestamp = new Date().toISOString();
    
    setHistorialDatos(prev => {
      const nuevoHistorial = { ...prev };
      
      postes.forEach(poste => {
        const datos = datosEnVivo[poste.id];
        if (datos) {
          if (!nuevoHistorial[poste.id]) {
            nuevoHistorial[poste.id] = [];
          }
          
          nuevoHistorial[poste.id].push({
            timestamp,
            intensidad: datos.calculados?.intensidadLED || 0,
            consumo: datos.calculados?.potenciaActual || 0,
            corriente: datos.sensores?.acs712?.corriente || 0,
            lux: datos.sensores?.ldr?.luxCalculado || 0,
            movimiento: datos.sensores?.pir?.movimiento || false,
            online: datos.estado?.online || false
          });
          
          // Mantener solo los últimos 50 puntos
          if (nuevoHistorial[poste.id].length > 50) {
            nuevoHistorial[poste.id] = nuevoHistorial[poste.id].slice(-50);
          }
        }
      });
      
      return nuevoHistorial;
    });
  };

  const obtenerEstadisticasEnVivo = () => {
    const stats = {
      total: postes.length,
      online: 0,
      encendidos: 0,
      intensidadPromedio: 0,
      consumoTotal: 0,
      corrienteTotal: 0,
      movimientoDetectado: 0,
      luxPromedio: 0
    };

    postes.forEach(poste => {
      const datos = datosEnVivo[poste.id];
      if (datos) {
        if (datos.estado?.online) stats.online++;
        if (datos.estado?.encendido) stats.encendidos++;
        
        stats.intensidadPromedio += datos.calculados?.intensidadLED || 0;
        stats.consumoTotal += datos.calculados?.potenciaActual || 0;
        stats.corrienteTotal += datos.sensores?.acs712?.corriente || 0;
        stats.luxPromedio += datos.sensores?.ldr?.luxCalculado || 0;
        
        if (datos.sensores?.pir?.movimiento) stats.movimientoDetectado++;
      }
    });

    if (stats.total > 0) {
      stats.intensidadPromedio = Math.round(stats.intensidadPromedio / stats.total);
      stats.luxPromedio = Math.round(stats.luxPromedio / stats.total);
    }

    return stats;
  };

  const formatearHora = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const obtenerColorEstado = (estado) => {
    if (!estado.online) return '#dc3545'; // Rojo - Offline
    if (!estado.encendido) return '#6c757d'; // Gris - Apagado
    return '#28a745'; // Verde - Encendido
  };

  const renderVistaLista = () => {
    const stats = obtenerEstadisticasEnVivo();
    
    return (
      <div className="vista-lista">
        <div className="stats-tiempo-real">
          <div className="stat-card">
            <div className="stat-icon">🌐</div>
            <div className="stat-info">
              <div className="stat-valor">{stats.online}/{stats.total}</div>
              <div className="stat-label">Online</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">💡</div>
            <div className="stat-info">
              <div className="stat-valor">{stats.encendidos}</div>
              <div className="stat-label">Encendidos</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">⚡</div>
            <div className="stat-info">
              <div className="stat-valor">{stats.consumoTotal.toFixed(1)}W</div>
              <div className="stat-label">Consumo</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-info">
              <div className="stat-valor">{Math.round((stats.intensidadPromedio/255)*100)}%</div>
              <div className="stat-label">Intensidad</div>
            </div>
          </div>
        </div>

        <div className="postes-tiempo-real">
          {postes.map(poste => {
            const datos = datosEnVivo[poste.id] || {};
            const estado = datos.estado || {};
            const calculados = datos.calculados || {};
            const sensores = datos.sensores || {};
            const ultimaActualizacion = datos.metadatos?.ultimaActualizacion;

            return (
              <div key={poste.id} className={`poste-tiempo-real ${estado.online ? 'online' : 'offline'}`}>
                <div className="poste-header-tiempo-real">
                  <div className="poste-nombre-tr">{poste.nombre}</div>
                  <div className="poste-estados">
                    <span className={`estado-conexion ${estado.online ? 'online' : 'offline'}`}>
                      {estado.online ? '🟢' : '🔴'}
                    </span>
                    <span className={`estado-led ${estado.encendido ? 'encendido' : 'apagado'}`}>
                      {estado.encendido ? '💡' : '⚫'}
                    </span>
                    {sensores.pir?.movimiento && (
                      <span className="estado-movimiento">👁️</span>
                    )}
                  </div>
                </div>

                <div className="poste-datos-tiempo-real">
                  <div className="dato-tr">
                    <span className="dato-label">Intensidad:</span>
                    <span className="dato-valor">
                      {calculados.intensidadLED || 0}/255 
                      ({Math.round(((calculados.intensidadLED || 0)/255)*100)}%)
                    </span>
                    <div className="dato-barra">
                      <div 
                        className="barra-fill"
                        style={{ width: `${((calculados.intensidadLED || 0)/255)*100}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="dato-tr">
                    <span className="dato-label">Consumo:</span>
                    <span className="dato-valor">{(calculados.potenciaActual || 0).toFixed(1)}W</span>
                  </div>

                  <div className="dato-tr">
                    <span className="dato-label">Corriente:</span>
                    <span className="dato-valor">{(sensores.acs712?.corriente || 0).toFixed(2)}A</span>
                  </div>

                  <div className="dato-tr">
                    <span className="dato-label">Luminosidad:</span>
                    <span className="dato-valor">{(sensores.ldr?.luxCalculado || 0).toFixed(1)} lux</span>
                  </div>

                  <div className="dato-tr">
                    <span className="dato-label">PIR:</span>
                    <span className="dato-valor">
                      {sensores.pir?.contadorHoy || 0} detecciones hoy
                    </span>
                  </div>
                </div>

                <div className="poste-ultima-actualizacion">
                  <span className="tiempo-actualizacion">
                    🕐 {ultimaActualizacion ? formatearHora(ultimaActualizacion) : 'Sin datos'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderVistaGrid = () => {
    return (
      <div className="vista-grid">
        <div className="grid-postes">
          {postes.map(poste => {
            const datos = datosEnVivo[poste.id] || {};
            const estado = datos.estado || {};
            const calculados = datos.calculados || {};
            
            return (
              <div key={poste.id} className={`poste-grid-item ${estado.online ? 'online' : 'offline'}`}>
                <div className="grid-item-header">
                  <span className="grid-item-nombre">{poste.nombre}</span>
                  <span className={`grid-item-estado ${estado.online ? 'online' : 'offline'}`}>
                    {estado.online ? '🟢' : '🔴'}
                  </span>
                </div>
                
                <div className="grid-item-intensidad">
                  <div className="intensidad-circular">
                    <svg className="progreso-circular" width="80" height="80">
                      <circle
                        cx="40"
                        cy="40"
                        r="35"
                        stroke="#e9ecef"
                        strokeWidth="8"
                        fill="transparent"
                      />
                      <circle
                        cx="40"
                        cy="40"
                        r="35"
                        stroke={obtenerColorEstado(estado)}
                        strokeWidth="8"
                        fill="transparent"
                        strokeDasharray={`${2 * Math.PI * 35}`}
                        strokeDashoffset={`${2 * Math.PI * 35 * (1 - (calculados.intensidadLED || 0) / 255)}`}
                        transform="rotate(-90 40 40)"
                      />
                    </svg>
                    <div className="intensidad-texto">
                      <span className="intensidad-numero">{Math.round(((calculados.intensidadLED || 0)/255)*100)}</span>
                      <span className="intensidad-porcentaje">%</span>
                    </div>
                  </div>
                </div>
                
                <div className="grid-item-info">
                  <span className="info-consumo">⚡ {(calculados.potenciaActual || 0).toFixed(1)}W</span>
                  <span className="info-ip">🌐 {datos.red?.ip || 'N/A'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderGraficoHistorial = () => {
    const maxPuntos = 20;
    const datos = Object.entries(historialDatos);
    
    if (datos.length === 0) {
      return (
        <div className="sin-datos-grafico">
          <span>📊 Iniciando recolección de datos...</span>
        </div>
      );
    }

    return (
      <div className="grafico-historial">
        <div className="grafico-controles">
          <button
            className={`btn-grafico ${estadoGrafico === 'intensidad' ? 'activo' : ''}`}
            onClick={() => setEstadoGrafico('intensidad')}
          >
            💡 Intensidad
          </button>
          <button
            className={`btn-grafico ${estadoGrafico === 'consumo' ? 'activo' : ''}`}
            onClick={() => setEstadoGrafico('consumo')}
          >
            ⚡ Consumo
          </button>
          <button
            className={`btn-grafico ${estadoGrafico === 'sensores' ? 'activo' : ''}`}
            onClick={() => setEstadoGrafico('sensores')}
          >
            🔬 Sensores
          </button>
        </div>

        <div className="grafico-contenido">
          {datos.map(([posteId, historial]) => {
            const poste = postes.find(p => p.id === posteId);
            if (!poste) return null;

            const historialReciente = historial.slice(-maxPuntos);
            const maxValor = Math.max(...historialReciente.map(punto => {
              switch (estadoGrafico) {
                case 'intensidad': return punto.intensidad;
                case 'consumo': return punto.consumo;
                case 'sensores': return punto.lux;
                default: return 0;
              }
            })) || 255;

            return (
              <div key={posteId} className="linea-grafico">
                <div className="grafico-label">
                  <span className="label-poste">{poste.nombre}</span>
                  <span className="label-valor">
                    {estadoGrafico === 'intensidad' && `${historialReciente[historialReciente.length - 1]?.intensidad || 0}/255`}
                    {estadoGrafico === 'consumo' && `${(historialReciente[historialReciente.length - 1]?.consumo || 0).toFixed(1)}W`}
                    {estadoGrafico === 'sensores' && `${(historialReciente[historialReciente.length - 1]?.lux || 0).toFixed(1)} lux`}
                  </span>
                </div>
                
                <div className="grafico-linea">
                  <svg width="100%" height="40">
                    <polyline
                      points={historialReciente.map((punto, index) => {
                        const x = (index / (maxPuntos - 1)) * 100;
                        let valor = 0;
                        switch (estadoGrafico) {
                          case 'intensidad': valor = punto.intensidad; break;
                          case 'consumo': valor = punto.consumo; break;
                          case 'sensores': valor = punto.lux; break;
                        }
                        const y = 35 - ((valor / maxValor) * 30);
                        return `${x}%,${y}`;
                      }).join(' ')}
                      fill="none"
                      stroke="#007bff"
                      strokeWidth="2"
                    />
                    {historialReciente.map((punto, index) => {
                      const x = (index / (maxPuntos - 1)) * 100;
                      let valor = 0;
                      switch (estadoGrafico) {
                        case 'intensidad': valor = punto.intensidad; break;
                        case 'consumo': valor = punto.consumo; break;
                        case 'sensores': valor = punto.lux; break;
                      }
                      const y = 35 - ((valor / maxValor) * 30);
                      return (
                        <circle
                          key={index}
                          cx={`${x}%`}
                          cy={y}
                          r="2"
                          fill="#007bff"
                        />
                      );
                    })}
                  </svg>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="monitor-tiempo-real">
      <div className="monitor-header">
        <h3>📡 Monitor en Tiempo Real</h3>
        <div className="monitor-controles">
          <div className="modo-vista">
            <button
              className={`btn-vista ${modoVisualizacion === 'lista' ? 'activo' : ''}`}
              onClick={() => setModoVisualizacion('lista')}
            >
              📋 Lista
            </button>
            <button
              className={`btn-vista ${modoVisualizacion === 'grid' ? 'activo' : ''}`}
              onClick={() => setModoVisualizacion('grid')}
            >
              ⚏ Grid
            </button>
            <button
              className={`btn-vista ${modoVisualizacion === 'grafico' ? 'activo' : ''}`}
              onClick={() => setModoVisualizacion('grafico')}
            >
              📈 Gráfico
            </button>
          </div>
          
          <div className="estado-actualizacion">
            <span className={`indicador-actualizacion ${actualizacionAutomatica ? 'activo' : 'pausado'}`}>
              {actualizacionAutomatica ? '🟢 En vivo' : '⏸️ Pausado'}
            </span>
          </div>
        </div>
      </div>

      <div className="monitor-contenido">
        {modoVisualizacion === 'lista' && renderVistaLista()}
        {modoVisualizacion === 'grid' && renderVistaGrid()}
        {modoVisualizacion === 'grafico' && renderGraficoHistorial()}
      </div>
    </div>
  );
};

export default MonitorTiempoReal;