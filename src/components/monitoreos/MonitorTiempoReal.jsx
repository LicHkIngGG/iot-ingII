// src/components/MonitoreoControl/components/MonitorTiempoReal/MonitorTiempoReal.jsx
import React, { useState, useCallback, useMemo } from 'react';
import './MonitorTiempoReal.css';

const MonitorTiempoReal = ({ 
  postesSeleccionados = [], 
  datosEnVivo = {},
  actualizacionAutomatica = true 
}) => {
  // ===== ESTADOS SIMPLES =====
  const [estadoGrafico, setEstadoGrafico] = useState('intensidad');
  const [modoVisualizacion, setModoVisualizacion] = useState('lista');

  // ===== FUNCIONES AUXILIARES =====
  const formatearHora = useCallback((timestamp) => {
    return new Date(timestamp).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }, []);

  const obtenerColorEstado = useCallback((estado) => {
    if (!estado?.online) return '#dc3545';
    if (!estado?.encendido) return '#6c757d';
    return '#28a745';
  }, []);

  const obtenerColorConsumo = useCallback((consumo) => {
    if (consumo === 0) return '#6c757d';
    if (consumo < 3) return '#28a745';
    if (consumo < 6) return '#ffc107';
    return '#dc3545';
  }, []);

  // ===== ESTADÍSTICAS CALCULADAS =====
  const estadisticasEnVivo = useMemo(() => {
    const postesData = postesSeleccionados
      .map(id => ({ id, datos: datosEnVivo[id] }))
      .filter(item => item.datos);

    const stats = {
      total: postesData.length,
      online: 0,
      encendidos: 0,
      intensidadPromedio: 0,
      consumoTotal: 0,
      corrienteTotal: 0,
      movimientoDetectado: 0,
      luxPromedio: 0
    };

    postesData.forEach(({ datos }) => {
      if (datos.estado?.online) stats.online++;
      if (datos.estado?.encendido) stats.encendidos++;
      if (datos.sensores?.pir?.movimiento) stats.movimientoDetectado++;
      
      stats.intensidadPromedio += datos.calculados?.intensidadLED || 0;
      stats.consumoTotal += datos.calculados?.potenciaActual || 0;
      stats.corrienteTotal += datos.sensores?.acs712?.corriente || 0;
      stats.luxPromedio += datos.sensores?.ldr?.luxCalculado || 0;
    });

    if (stats.total > 0) {
      stats.intensidadPromedio = Math.round(stats.intensidadPromedio / stats.total);
      stats.luxPromedio = Math.round(stats.luxPromedio / stats.total);
    }

    return stats;
  }, [postesSeleccionados, datosEnVivo]);

  // ===== DATOS DE POSTES =====
  const postesConDatos = useMemo(() => {
    return postesSeleccionados
      .map(id => ({
        id,
        nombre: datosEnVivo[id]?.nombre || `Poste ${id.split('_')[1] || id}`,
        datos: datosEnVivo[id]
      }))
      .filter(item => item.datos);
  }, [postesSeleccionados, datosEnVivo]);

  // ===== COMPONENTES DE RENDERIZADO =====
  const renderVistaLista = () => (
    <div className="vista-lista">
      {/* Stats resumen */}
      <div className="stats-tiempo-real">
        <div className="stat-card">
          <div className="stat-icon">🌐</div>
          <div className="stat-info">
            <div className="stat-valor">{estadisticasEnVivo.online}/{estadisticasEnVivo.total}</div>
            <div className="stat-label">Online</div>
          </div>
          <div className="stat-porcentaje">
            {estadisticasEnVivo.total > 0 ? Math.round((estadisticasEnVivo.online / estadisticasEnVivo.total) * 100) : 0}%
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">💡</div>
          <div className="stat-info">
            <div className="stat-valor">{estadisticasEnVivo.encendidos}</div>
            <div className="stat-label">Encendidos</div>
          </div>
          <div className="stat-porcentaje">
            {estadisticasEnVivo.total > 0 ? Math.round((estadisticasEnVivo.encendidos / estadisticasEnVivo.total) * 100) : 0}%
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">⚡</div>
          <div className="stat-info">
            <div className="stat-valor">{estadisticasEnVivo.consumoTotal.toFixed(1)}W</div>
            <div className="stat-label">Consumo Total</div>
          </div>
          <div className="stat-extra">
            {estadisticasEnVivo.corrienteTotal.toFixed(2)}A
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-info">
            <div className="stat-valor">{Math.round((estadisticasEnVivo.intensidadPromedio/255)*100)}%</div>
            <div className="stat-label">Intensidad Prom.</div>
          </div>
          <div className="stat-extra">
            {estadisticasEnVivo.intensidadPromedio}/255
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">👁️</div>
          <div className="stat-info">
            <div className="stat-valor">{estadisticasEnVivo.movimientoDetectado}</div>
            <div className="stat-label">Movimiento</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">☀️</div>
          <div className="stat-info">
            <div className="stat-valor">{estadisticasEnVivo.luxPromedio}</div>
            <div className="stat-label">Lux Promedio</div>
          </div>
        </div>
      </div>

      {/* Lista de postes */}
      <div className="postes-tiempo-real">
        {postesConDatos.map(({ id, nombre, datos }) => (
          <div key={id} className={`poste-tiempo-real ${datos.estado?.online ? 'online' : 'offline'}`}>
            <div className="poste-header-tiempo-real">
              <div className="poste-nombre-tr" title={nombre}>
                {nombre}
              </div>
              <div className="poste-estados">
                <span className={`estado-conexion ${datos.estado?.online ? 'online' : 'offline'}`}>
                  {datos.estado?.online ? '🟢' : '🔴'}
                </span>
                <span className={`estado-led ${datos.estado?.encendido ? 'encendido' : 'apagado'}`}>
                  {datos.estado?.encendido ? '💡' : '⚫'}
                </span>
                {datos.sensores?.pir?.movimiento && (
                  <span className="estado-movimiento">👁️</span>
                )}
                {datos.estado?.automatico && (
                  <span className="estado-automatico">🤖</span>
                )}
              </div>
            </div>

            <div className="poste-datos-tiempo-real">
              <div className="dato-tr intensidad">
                <span className="dato-label">Intensidad LED:</span>
                <span className="dato-valor">
                  {datos.calculados?.intensidadLED || 0}/255 
                  ({Math.round(((datos.calculados?.intensidadLED || 0)/255)*100)}%)
                </span>
                <div className="dato-barra">
                  <div 
                    className="barra-fill"
                    style={{ 
                      width: `${((datos.calculados?.intensidadLED || 0)/255)*100}%`,
                      backgroundColor: datos.estado?.encendido ? '#ffc107' : '#6c757d'
                    }}
                  ></div>
                </div>
              </div>

              <div className="dato-tr consumo">
                <span className="dato-label">Potencia:</span>
                <span 
                  className="dato-valor"
                  style={{ color: obtenerColorConsumo(datos.calculados?.potenciaActual || 0) }}
                >
                  {(datos.calculados?.potenciaActual || 0).toFixed(1)}W
                </span>
              </div>

              <div className="dato-tr corriente">
                <span className="dato-label">Corriente:</span>
                <span className="dato-valor">
                  {(datos.sensores?.acs712?.corriente || 0).toFixed(2)}A
                </span>
              </div>

              <div className="dato-tr voltaje">
                <span className="dato-label">Voltaje:</span>
                <span className="dato-valor">
                  {(datos.calculados?.voltaje || 0).toFixed(0)}V
                </span>
              </div>

              <div className="dato-tr luminosidad">
                <span className="dato-label">Luminosidad:</span>
                <span className="dato-valor">
                  {(datos.sensores?.ldr?.luxCalculado || 0).toFixed(1)} lux
                </span>
              </div>

              <div className="dato-tr pir">
                <span className="dato-label">PIR hoy:</span>
                <span className="dato-valor">
                  {datos.sensores?.pir?.contadorHoy || 0} detecciones
                </span>
              </div>

              <div className="dato-tr red">
                <span className="dato-label">Red:</span>
                <span className="dato-valor" title={`MAC: ${datos.red?.mac} | RSSI: ${datos.red?.rssi}dBm`}>
                  {datos.red?.ip || 'N/A'}:{datos.red?.puerto || 80}
                </span>
              </div>
            </div>

            <div className="poste-ultima-actualizacion">
              <span className="tiempo-actualizacion">
                🕐 {datos.metadatos?.ultimaActualizacion ? 
                     formatearHora(datos.metadatos.ultimaActualizacion) : 
                     'Sin datos'
                   }
              </span>
              <span className="version-firmware" title={`Firmware v${datos.metadatos?.firmware}`}>
                v{datos.metadatos?.firmware || '4.0'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderVistaGrid = () => (
    <div className="vista-grid">
      <div className="grid-postes">
        {postesConDatos.map(({ id, nombre, datos }) => (
          <div key={id} className={`poste-grid-item ${datos.estado?.online ? 'online' : 'offline'}`}>
            <div className="grid-item-header">
              <span className="grid-item-nombre" title={nombre}>
                {nombre}
              </span>
              <div className="grid-item-estados">
                <span className={`grid-item-estado ${datos.estado?.online ? 'online' : 'offline'}`}>
                  {datos.estado?.online ? '🟢' : '🔴'}
                </span>
                {datos.sensores?.pir?.movimiento && (
                  <span className="grid-movimiento">👁️</span>
                )}
              </div>
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
                    stroke={obtenerColorEstado(datos.estado)}
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={`${2 * Math.PI * 35}`}
                    strokeDashoffset={`${2 * Math.PI * 35 * (1 - (datos.calculados?.intensidadLED || 0) / 255)}`}
                    transform="rotate(-90 40 40)"
                    style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                  />
                </svg>
                <div className="intensidad-texto">
                  <span className="intensidad-numero">
                    {Math.round(((datos.calculados?.intensidadLED || 0)/255)*100)}
                  </span>
                  <span className="intensidad-porcentaje">%</span>
                </div>
              </div>
            </div>
            
            <div className="grid-item-info">
              <div className="info-fila">
                <span className="info-consumo">
                  ⚡ {(datos.calculados?.potenciaActual || 0).toFixed(1)}W
                </span>
              </div>
              <div className="info-fila">
                <span className="info-ip" title={`Puerto: ${datos.red?.puerto || 80}`}>
                  🌐 {datos.red?.ip || 'N/A'}
                </span>
              </div>
              <div className="info-fila">
                <span className="info-lux">
                  ☀️ {(datos.sensores?.ldr?.luxCalculado || 0).toFixed(0)} lux
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderVistaGrafico = () => (
    <div className="vista-grafico">
      <div className="grafico-controles">
        <button
          className={`btn-grafico ${estadoGrafico === 'intensidad' ? 'activo' : ''}`}
          onClick={() => setEstadoGrafico('intensidad')}
        >
          💡 Intensidad LED
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
        <button
          className={`btn-grafico ${estadoGrafico === 'corriente' ? 'activo' : ''}`}
          onClick={() => setEstadoGrafico('corriente')}
        >
          🔌 Corriente
        </button>
      </div>

      <div className="grafico-contenido">
        {postesConDatos.map(({ id, nombre, datos }) => {
          let valor = 0;
          let unidad = '';
          let maxValor = 100;

          switch (estadoGrafico) {
            case 'intensidad':
              valor = datos.calculados?.intensidadLED || 0;
              unidad = '/255';
              maxValor = 255;
              break;
            case 'consumo':
              valor = datos.calculados?.potenciaActual || 0;
              unidad = 'W';
              maxValor = 10;
              break;
            case 'sensores':
              valor = datos.sensores?.ldr?.luxCalculado || 0;
              unidad = ' lux';
              maxValor = 1000;
              break;
            case 'corriente':
              valor = datos.sensores?.acs712?.corriente || 0;
              unidad = 'A';
              maxValor = 5;
              break;
          }

          const porcentaje = (valor / maxValor) * 100;

          return (
            <div key={id} className="barra-grafico">
              <div className="barra-label">
                <span className="barra-nombre" title={nombre}>
                  {nombre}
                </span>
                <span className="barra-valor">
                  {estadoGrafico === 'consumo' || estadoGrafico === 'corriente' 
                    ? valor.toFixed(2) 
                    : Math.round(valor)
                  }{unidad}
                </span>
              </div>
              <div className="barra-contenedor">
                <div 
                  className="barra-progreso"
                  style={{ 
                    width: `${Math.min(porcentaje, 100)}%`,
                    backgroundColor: obtenerColorEstado(datos.estado)
                  }}
                >
                  <div className="barra-brillo"></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ===== RENDER PRINCIPAL =====
  if (postesSeleccionados.length === 0) {
    return (
      <div className="monitor-tiempo-real">
        <div className="sin-seleccion">
          <div className="sin-seleccion-icono">📡</div>
          <h3>Monitor en Tiempo Real</h3>
          <p>Selecciona dispositivos para comenzar el monitoreo</p>
          <div className="instrucciones">
            <p>👈 Usa el selector de dispositivos para elegir qué postes monitorear</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="monitor-tiempo-real">
      <div className="monitor-header">
        <div className="header-titulo">
          <h3>📡 Monitor en Tiempo Real</h3>
          <p>
            {postesConDatos.length} dispositivos monitoreados • Datos en vivo
          </p>
        </div>
        
        <div className="monitor-controles">
          <div className="modo-vista">
            <button
              className={`btn-vista ${modoVisualizacion === 'lista' ? 'activo' : ''}`}
              onClick={() => setModoVisualizacion('lista')}
              title="Vista de lista detallada"
            >
              📋 Lista
            </button>
            <button
              className={`btn-vista ${modoVisualizacion === 'grid' ? 'activo' : ''}`}
              onClick={() => setModoVisualizacion('grid')}
              title="Vista de grid compacta"
            >
              ⚏ Grid
            </button>
            <button
              className={`btn-vista ${modoVisualizacion === 'grafico' ? 'activo' : ''}`}
              onClick={() => setModoVisualizacion('grafico')}
              title="Vista de gráficos"
            >
              📈 Gráfico
            </button>
          </div>
          
          <div className="estado-actualizacion">
            <span className={`indicador-actualizacion ${actualizacionAutomatica ? 'activo' : 'pausado'}`}>
              {actualizacionAutomatica ? '🟢 En vivo' : '⏸️ Pausado'}
            </span>
            <span className="tiempo-ultima-actualizacion">
              {formatearHora(new Date().toISOString())}
            </span>
          </div>
        </div>
      </div>

      <div className="monitor-contenido">
        {modoVisualizacion === 'lista' && renderVistaLista()}
        {modoVisualizacion === 'grid' && renderVistaGrid()}
        {modoVisualizacion === 'grafico' && renderVistaGrafico()}
      </div>

      {/* Footer informativo */}
      <div className="monitor-footer">
        <div className="footer-stats">
          <span className="footer-stat">
            🔥 Datos: En tiempo real
          </span>
          <span className="footer-stat">
            📊 Dispositivos: {postesConDatos.length}
          </span>
          <span className="footer-stat">
            💾 Estado: Activo
          </span>
          <span className="footer-stat">
            🕐 Actualizado: {formatearHora(new Date().toISOString())}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MonitorTiempoReal;