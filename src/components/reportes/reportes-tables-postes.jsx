// src/components/MonitoreoControl/components/ReportesPostes/reportes-tables-postes.js
import React from 'react';

// Funciones para manejar acciones específicas
const handleVerDetalles = (id) => {
  console.log(`Ver detalles de poste: ${id}`);
  // Aquí podría abrir un modal o redireccionar a una página de detalles
};

const handleControlRemoto = (id) => {
  console.log(`Control remoto de poste: ${id}`);
  // Aquí podría abrir el panel de control
};

const handleVerHistorial = (id) => {
  console.log(`Ver historial de: ${id}`);
  // Aquí podría mostrar el historial del elemento
};

const handleResolverAlerta = (id) => {
  console.log(`Resolver alerta: ${id}`);
  // Aquí podría marcar la alerta como resuelta
};

// Renderizado de tabla para postes
export const renderTablaPostes = (datos, tableRef) => {
  return (
    <table className="data-table" ref={tableRef}>
      <thead>
        <tr>
          <th>ID</th>
          <th>Nombre</th>
          <th>Zona</th>
          <th>Estado</th>
          <th>Encendido</th>
          <th>Intensidad</th>
          <th>Modo</th>
          <th>Consumo (W)</th>
          <th>Eficiencia (%)</th>
          <th>IP</th>
          <th>Versión</th>
          <th>Última Act.</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {datos.map((poste) => (
          <tr key={poste.id} className={`poste-${poste.estado.toLowerCase()}`}>
            <td className="poste-id">{poste.id}</td>
            <td className="poste-nombre">
              <strong>{poste.nombre}</strong>
              <br />
              <small>{poste.ubicacion}</small>
            </td>
            <td className="poste-zona">
              <span className="zona-badge">{poste.zona}</span>
            </td>
            <td>
              <span className={`estado-badge ${poste.estado.toLowerCase()}`}>
                {poste.estado === 'Online' ? '🟢' : '🔴'} {poste.estado}
              </span>
            </td>
            <td>
              <span className={`encendido-badge ${poste.encendido === 'Sí' ? 'si' : 'no'}`}>
                {poste.encendido === 'Sí' ? '💡' : '⚫'} {poste.encendido}
              </span>
            </td>
            <td className="intensidad">
              <div className="intensidad-info">
                {poste.intensidad}
                <div className="intensidad-bar">
                  <div 
                    className="intensidad-fill"
                    style={{
                      width: `${parseInt(poste.intensidad.match(/\((\d+)%\)/)?.[1] || '0')}%`
                    }}
                  ></div>
                </div>
              </div>
            </td>
            <td>
              <span className={`modo-badge ${poste.modoAutomatico.toLowerCase()}`}>
                {poste.modoAutomatico === 'Automático' ? '🤖' : '👤'} {poste.modoAutomatico}
              </span>
            </td>
            <td className="consumo">
              <span className={`consumo-valor ${parseFloat(poste.consumoActual) > 6 ? 'alto' : parseFloat(poste.consumoActual) < 2 ? 'bajo' : 'normal'}`}>
                ⚡ {poste.consumoActual}W
              </span>
            </td>
            <td className="eficiencia">
              <span className={`eficiencia-valor ${parseFloat(poste.eficiencia) > 85 ? 'alta' : parseFloat(poste.eficiencia) < 70 ? 'baja' : 'media'}`}>
                📊 {poste.eficiencia}%
              </span>
            </td>
            <td className="ip-info">
              <code>{poste.ip}</code>
            </td>
            <td className="version-info">
              <small>
                HW: {poste.version}<br />
                FW: {poste.firmware}
              </small>
            </td>
            <td className="ultima-actualizacion">
              <small>{poste.ultimaActualizacion}</small>
            </td>
            <td className="acciones">
              <button 
                className="btn-accion btn-ver" 
                title="Ver detalles" 
                onClick={() => handleVerDetalles(poste.id)}
              >
                <i className="fa fa-eye"></i>
              </button>
              <button 
                className="btn-accion btn-control" 
                title="Control remoto" 
                onClick={() => handleControlRemoto(poste.id)}
                disabled={poste.estado === 'Offline'}
              >
                <i className="fa fa-gamepad"></i>
              </button>
              <button 
                className="btn-accion btn-historial" 
                title="Ver historial" 
                onClick={() => handleVerHistorial(poste.id)}
              >
                <i className="fa fa-history"></i>
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// Renderizado de tabla para eventos
export const renderTablaEventos = (datos, tableRef) => {
  return (
    <table className="data-table" ref={tableRef}>
      <thead>
        <tr>
          <th>Fecha/Hora</th>
          <th>Poste</th>
          <th>Zona</th>
          <th>Tipo</th>
          <th>Categoría</th>
          <th>Descripción</th>
          <th>Prioridad</th>
          <th>Usuario</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {datos.map((evento) => (
          <tr key={evento.id} className={`evento-${evento.prioridad}`}>
            <td className="evento-fecha">
              <div className="fecha-info">
                <strong>{evento.fecha.split(' ')[0]}</strong>
                <br />
                <small>{evento.fecha.split(' ')[1]}</small>
              </div>
            </td>
            <td className="evento-poste">
              <strong>{evento.posteNombre}</strong>
              <br />
              <small>{evento.posteId}</small>
            </td>
            <td className="evento-zona">
              <span className="zona-badge">{evento.zona}</span>
            </td>
            <td className="evento-tipo">
              <span className={`tipo-badge ${evento.categoria}`}>
                {evento.categoria === 'control' && '🎮'}
                {evento.categoria === 'conexion' && '🌐'}
                {evento.categoria === 'sensores' && '🔬'}
                {evento.categoria === 'configuracion' && '⚙️'}
                {evento.categoria === 'alerta' && '⚠️'}
                {evento.tipo}
              </span>
            </td>
            <td className="evento-categoria">
              <span className={`categoria-badge ${evento.categoria}`}>
                {evento.categoria}
              </span>
            </td>
            <td className="evento-descripcion">
              {evento.descripcion.length > 50 
                ? evento.descripcion.substring(0, 50) + '...' 
                : evento.descripcion}
            </td>
            <td className="evento-prioridad">
              <span className={`prioridad-badge ${evento.prioridad}`}>
                {evento.prioridad === 'critica' && '🔴'}
                {evento.prioridad === 'alta' && '🟠'}
                {evento.prioridad === 'media' && '🔵'}
                {evento.prioridad === 'baja' && '🟢'}
                {evento.prioridad}
              </span>
            </td>
            <td className="evento-usuario">
              <small>{evento.usuario}</small>
            </td>
            <td className="acciones">
              <button 
                className="btn-accion btn-ver" 
                title="Ver detalles del evento" 
                onClick={() => handleVerDetalles(evento.id)}
              >
                <i className="fa fa-info-circle"></i>
              </button>
              <button 
                className="btn-accion btn-historial" 
                title="Ver historial del poste" 
                onClick={() => handleVerHistorial(evento.posteId)}
              >
                <i className="fa fa-history"></i>
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// Renderizado de tabla para estadísticas
export const renderTablaEstadisticas = (datos, tableRef) => {
  return (
    <table className="data-table" ref={tableRef}>
      <thead>
        <tr>
          <th>Zona</th>
          <th>Total Postes</th>
          <th>Online</th>
          <th>% Online</th>
          <th>Encendidos</th>
          <th>% Encendidos</th>
          <th>Consumo Total (W)</th>
          <th>Consumo Prom. (W)</th>
          <th>Eficiencia (%)</th>
          <th>Detecciones PIR</th>
          <th>Fecha</th>
        </tr>
      </thead>
      <tbody>
        {datos.map((stat) => (
          <tr key={stat.id} className="estadistica-row">
            <td className="zona-nombre">
              <strong>{stat.zona}</strong>
            </td>
            <td className="total-postes">
              <span className="numero-grande">{stat.totalPostes}</span>
            </td>
            <td className="postes-online">
              <span className="numero-verde">{stat.postesOnline}</span>
            </td>
            <td className="porcentaje-online">
              <div className="porcentaje-container">
                <span className={`porcentaje-valor ${stat.porcentajeOnline > 80 ? 'alta' : stat.porcentajeOnline > 60 ? 'media' : 'baja'}`}>
                  {stat.porcentajeOnline}%
                </span>
                <div className="porcentaje-bar">
                  <div 
                    className="porcentaje-fill"
                    style={{ width: `${stat.porcentajeOnline}%` }}
                  ></div>
                </div>
              </div>
            </td>
            <td className="postes-encendidos">
              <span className="numero-amarillo">{stat.postesEncendidos}</span>
            </td>
            <td className="porcentaje-encendidos">
              <div className="porcentaje-container">
                <span className={`porcentaje-valor ${stat.porcentajeEncendidos > 50 ? 'alta' : 'baja'}`}>
                  {stat.porcentajeEncendidos}%
                </span>
                <div className="porcentaje-bar">
                  <div 
                    className="porcentaje-fill amarillo"
                    style={{ width: `${stat.porcentajeEncendidos}%` }}
                  ></div>
                </div>
              </div>
            </td>
            <td className="consumo-total">
              <span className="consumo-valor">{stat.consumoTotal}W</span>
            </td>
            <td className="consumo-promedio">
              <span className="consumo-promedio-valor">{stat.consumoPromedio}W</span>
            </td>
            <td className="eficiencia">
              <span className={`eficiencia-valor ${parseFloat(stat.eficienciaPromedio) > 85 ? 'alta' : parseFloat(stat.eficienciaPromedio) < 70 ? 'baja' : 'media'}`}>
                {stat.eficienciaPromedio}%
              </span>
            </td>
            <td className="detecciones-pir">
              <span className="detecciones-valor">{stat.deteccionesPIR}</span>
            </td>
            <td className="fecha-estadistica">
              <small>{stat.fecha}</small>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// Renderizado de tabla para consumos
export const renderTablaConsumos = (datos, tableRef) => {
  return (
    <table className="data-table" ref={tableRef}>
      <thead>
        <tr>
          <th>Poste</th>
          <th>Zona</th>
          <th>Consumo Actual (W)</th>
          <th>Consumo Hoy (kWh)</th>
          <th>Costo Hoy ($)</th>
          <th>Eficiencia (%)</th>
          <th>Tiempo Encendido</th>
          <th>Ahorro Energético</th>
          <th>Estado</th>
          <th>Fecha</th>
        </tr>
      </thead>
      <tbody>
        {datos.map((consumo) => (
          <tr key={consumo.id} className="consumo-row">
            <td className="consumo-poste">
              <strong>{consumo.posteNombre}</strong>
              <br />
              <small>{consumo.posteId}</small>
            </td>
            <td className="consumo-zona">
              <span className="zona-badge">{consumo.zona}</span>
            </td>
            <td className="consumo-actual">
              <span className={`consumo-valor ${parseFloat(consumo.consumoActual) > 6 ? 'alto' : parseFloat(consumo.consumoActual) < 2 ? 'bajo' : 'normal'}`}>
                ⚡ {consumo.consumoActual}W
              </span>
            </td>
            <td className="consumo-hoy">
              <span className="consumo-hoy-valor">{consumo.consumoHoy} kWh</span>
            </td>
            <td className="costo-hoy">
              <span className="costo-valor">💰 ${consumo.costoHoy}</span>
            </td>
            <td className="eficiencia">
              <div className="eficiencia-container">
                <span className={`eficiencia-valor ${parseFloat(consumo.eficiencia) > 85 ? 'alta' : parseFloat(consumo.eficiencia) < 70 ? 'baja' : 'media'}`}>
                  {consumo.eficiencia}%
                </span>
                <div className="eficiencia-bar">
                  <div 
                    className="eficiencia-fill"
                    style={{ width: `${consumo.eficiencia}%` }}
                  ></div>
                </div>
              </div>
            </td>
            <td className="tiempo-encendido">
              <span className="tiempo-valor">⏰ {consumo.tiempoEncendido}</span>
            </td>
            <td className="ahorro-energetico">
              <span className="ahorro-valor">🌱 {consumo.ahorroEnergetico}W</span>
            </td>
            <td className="estado-consumo">
              <span className={`estado-badge ${parseFloat(consumo.consumoActual) > 0 ? 'activo' : 'inactivo'}`}>
                {parseFloat(consumo.consumoActual) > 0 ? '🔋 Activo' : '💤 Inactivo'}
              </span>
            </td>
            <td className="fecha-consumo">
              <small>{consumo.fecha}</small>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// Renderizado de tabla para sensores
export const renderTablaSensores = (datos, tableRef) => {
  return (
    <table className="data-table" ref={tableRef}>
      <thead>
        <tr>
          <th>Poste</th>
          <th>Zona</th>
          <th>LDR Valor</th>
          <th>LDR Lux</th>
          <th>LDR Estado</th>
          <th>PIR Detecciones</th>
          <th>PIR Movimiento</th>
          <th>PIR Estado</th>
          <th>Corriente (A)</th>
          <th>Voltaje (V)</th>
          <th>ACS712 Estado</th>
          <th>Fecha</th>
        </tr>
      </thead>
      <tbody>
        {datos.map((sensor) => (
          <tr key={sensor.id} className="sensor-row">
            <td className="sensor-poste">
              <strong>{sensor.posteNombre}</strong>
              <br />
              <small>{sensor.posteId}</small>
            </td>
            <td className="sensor-zona">
              <span className="zona-badge">{sensor.zona}</span>
            </td>
            <td className="ldr-valor">
              <span className="sensor-valor">{sensor.ldrValor}</span>
            </td>
            <td className="ldr-lux">
              <span className={`lux-valor ${parseFloat(sensor.ldrLux) < 50 ? 'oscuro' : parseFloat(sensor.ldrLux) > 500 ? 'claro' : 'medio'}`}>
                ☀️ {sensor.ldrLux} lux
              </span>
            </td>
            <td className="ldr-estado">
              <span className={`sensor-estado ${sensor.ldrEstado.toLowerCase()}`}>
                {sensor.ldrEstado === 'Funcionando' ? '✅' : '❌'} {sensor.ldrEstado}
              </span>
            </td>
            <td className="pir-detecciones">
              <span className={`detecciones-valor ${parseInt(sensor.pirDetecciones) > 20 ? 'alta' : parseInt(sensor.pirDetecciones) > 10 ? 'media' : 'baja'}`}>
                👁️ {sensor.pirDetecciones}
              </span>
            </td>
            <td className="pir-movimiento">
              <span className={`movimiento-estado ${sensor.pirMovimiento === 'Sí' ? 'detectado' : 'no-detectado'}`}>
                {sensor.pirMovimiento === 'Sí' ? '🚶' : '🕳️'} {sensor.pirMovimiento}
              </span>
            </td>
            <td className="pir-estado">
              <span className={`sensor-estado ${sensor.pirEstado.toLowerCase()}`}>
                {sensor.pirEstado === 'Funcionando' ? '✅' : '❌'} {sensor.pirEstado}
              </span>
            </td>
            <td className="corriente">
              <span className={`corriente-valor ${parseFloat(sensor.corriente) > 0.5 ? 'alta' : 'normal'}`}>
                ⚡ {sensor.corriente}A
              </span>
            </td>
            <td className="voltaje">
              <span className={`voltaje-valor ${parseFloat(sensor.voltaje) < 200 || parseFloat(sensor.voltaje) > 240 ? 'anormal' : 'normal'}`}>
                🔌 {sensor.voltaje}V
              </span>
            </td>
            <td className="acs712-estado">
              <span className={`sensor-estado ${sensor.acs712Estado.toLowerCase()}`}>
                {sensor.acs712Estado === 'Funcionando' ? '✅' : '❌'} {sensor.acs712Estado}
              </span>
            </td>
            <td className="fecha-sensor">
              <small>{sensor.fecha}</small>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// Renderizado de tabla para alertas
export const renderTablaAlertas = (datos, tableRef) => {
  return (
    <table className="data-table" ref={tableRef}>
      <thead>
        <tr>
          <th>Fecha/Hora</th>
          <th>Poste</th>
          <th>Zona</th>
          <th>Tipo de Alerta</th>
          <th>Descripción</th>
          <th>Prioridad</th>
          <th>Estado</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {datos.map((alerta) => (
          <tr key={alerta.id} className={`alerta-${alerta.prioridad}`}>
            <td className="alerta-fecha">
              <div className="fecha-info">
                <strong>{alerta.fecha.split(' ')[0]}</strong>
                <br />
                <small>{alerta.fecha.split(' ')[1]}</small>
              </div>
            </td>
            <td className="alerta-poste">
              <strong>{alerta.posteNombre}</strong>
              <br />
              <small>{alerta.posteId}</small>
            </td>
            <td className="alerta-zona">
              <span className="zona-badge">{alerta.zona}</span>
            </td>
            <td className="alerta-tipo">
              <span className={`tipo-alerta-badge ${alerta.tipo.toLowerCase().replace(/\s+/g, '-')}`}>
                {alerta.tipo === 'Desconexión' && '🔌'}
                {alerta.tipo === 'Consumo Elevado' && '⚡'}
                {alerta.tipo === 'Sensor PIR' && '👁️'}
                {alerta.tipo === 'Eficiencia Baja' && '📉'}
                {alerta.tipo === 'Sensor LDR' && '☀️'}
                {alerta.tipo}
              </span>
            </td>
            <td className="alerta-descripcion">
              <div className="descripcion-contenido">
                {alerta.descripcion.length > 60 
                  ? (
                    <details>
                      <summary>{alerta.descripcion.substring(0, 60)}...</summary>
                      <p>{alerta.descripcion}</p>
                    </details>
                  )
                  : alerta.descripcion}
              </div>
            </td>
            <td className="alerta-prioridad">
              <span className={`prioridad-badge ${alerta.prioridad}`}>
                {alerta.prioridad === 'critica' && '🔴'}
                {alerta.prioridad === 'alta' && '🟠'}
                {alerta.prioridad === 'media' && '🔵'}
                {alerta.prioridad === 'baja' && '🟢'}
                <div className="prioridad-texto">{alerta.prioridad.toUpperCase()}</div>
              </span>
            </td>
            <td className="alerta-estado">
              <span className={`estado-alerta-badge ${alerta.estado}`}>
                {alerta.estado === 'activa' ? '🚨 Activa' : '✅ Resuelta'}
              </span>
            </td>
            <td className="acciones">
              <button 
                className="btn-accion btn-resolver" 
                title="Resolver alerta" 
                onClick={() => handleResolverAlerta(alerta.id)}
                disabled={alerta.estado === 'resuelta'}
              >
                <i className="fa fa-check"></i>
              </button>
              <button 
                className="btn-accion btn-ver" 
                title="Ver detalles de la alerta" 
                onClick={() => handleVerDetalles(alerta.id)}
              >
                <i className="fa fa-info-circle"></i>
              </button>
              <button 
                className="btn-accion btn-ir-poste" 
                title="Ir al poste" 
                onClick={() => handleControlRemoto(alerta.posteId)}
              >
                <i className="fa fa-external-link"></i>
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// Función auxiliar para renderizar tabla genérica
export const renderTablaGenerica = (datos, columnas, tableRef, className = '') => {
  return (
    <table className={`data-table ${className}`} ref={tableRef}>
      <thead>
        <tr>
          {columnas.map((columna, index) => (
            <th key={index}>{columna.titulo}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {datos.map((fila, indexFila) => (
          <tr key={indexFila}>
            {columnas.map((columna, indexColumna) => (
              <td key={indexColumna} className={columna.className || ''}>
                {columna.render ? columna.render(fila[columna.campo], fila) : fila[columna.campo]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};