import React from 'react';

// Función para formatear moneda
const formatCurrency = (value) => {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN'
  }).format(value);
};

// Funciones para manejar las grabaciones
const handleVerGrabacion = (id) => {
  alert(`Visualizando grabación con ID: ${id}`);
  // Aquí podría abrir un modal o redireccionar a una página de visualización
};

const handleDescargarGrabacion = (id) => {
  alert(`Descargando grabación con ID: ${id}`);
  // Aquí podría implementar la descarga del archivo
};

// Renderizado de tabla para viajes
export const renderTablaViajes = (datos, tableRef) => {
  return (
    <table className="data-table" ref={tableRef}>
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Origen</th>
          <th>Destino</th>
          <th>Estado</th>
          <th>Conductor</th>
          <th>Cliente</th>
          <th>Precio</th>
          <th>Distancia</th>
          <th>Duración</th>
          <th>Calificación</th>
        </tr>
      </thead>
      <tbody>
        {datos.map((viaje) => (
          <tr key={viaje.id} className={`estado-${viaje.estado}`}>
            <td>{viaje.fecha}</td>
            <td title={viaje.origen}>
              {viaje.origen.length > 15 ? viaje.origen.substring(0, 15) + '...' : viaje.origen}
            </td>
            <td title={viaje.destino}>
              {viaje.destino.length > 15 ? viaje.destino.substring(0, 15) + '...' : viaje.destino}
            </td>
            <td>
              <span className={`estado-badge ${viaje.estado}`}>
                {viaje.estado}
              </span>
            </td>
            <td title={viaje.conductor_id}>{viaje.conductor}</td>
            <td title={viaje.cliente_id}>{viaje.cliente}</td>
            <td>{formatCurrency(viaje.precio)}</td>
            <td>{viaje.distancia.toFixed(1)} km</td>
            <td>{viaje.duracion} min</td>
            <td className="calificacion">
              {Array(5).fill().map((_, i) => (
                <span key={i} className={i < viaje.calificacion ? "star filled" : "star"}>★</span>
              ))}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// Renderizado de tabla para conductores
export const renderTablaConductores = (datos, tableRef) => {
  return (
    <table className="data-table" ref={tableRef}>
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Email</th>
          <th>Teléfono</th>
          <th>Licencia</th>
          <th>Fecha Registro</th>
          <th>Estado</th>
          <th>Viajes</th>
          <th>Calificación</th>
          <th>Vehículo</th>
          <th>Placa</th>
        </tr>
      </thead>
      <tbody>
        {datos.map((conductor) => (
          <tr key={conductor.id} className={conductor.estado === 'activo' ? 'conductor-activo' : 'conductor-inactivo'}>
            <td>{conductor.nombre}</td>
            <td>{conductor.email}</td>
            <td>{conductor.telefono}</td>
            <td>{conductor.licencia}</td>
            <td>{conductor.fechaRegistro}</td>
            <td>
              <span className={`estado-badge ${conductor.estado}`}>
                {conductor.estado}
              </span>
            </td>
            <td>{conductor.viajesRealizados}</td>
            <td className="calificacion">
              {conductor.calificacionPromedio.toFixed(1)}
              {Array(5).fill().map((_, i) => (
                <span key={i} className={i < Math.round(conductor.calificacionPromedio) ? "star filled" : "star"}>★</span>
              ))}
            </td>
            <td>{conductor.modelo_vehiculo}</td>
            <td>{conductor.placa_vehiculo}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// Renderizado de tabla para solicitudes
export const renderTablaSolicitudes = (datos, tableRef) => {
  return (
    <table className="data-table" ref={tableRef}>
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Email</th>
          <th>Teléfono</th>
          <th>Licencia</th>
          <th>Fecha Solicitud</th>
          <th>Estado</th>
          <th>Docs. Completos</th>
          <th>Vehículo</th>
          <th>Placa</th>
        </tr>
      </thead>
      <tbody>
        {datos.map((solicitud) => (
          <tr key={solicitud.id} className={`solicitud-${solicitud.estado}`}>
            <td>{solicitud.nombre}</td>
            <td>{solicitud.email}</td>
            <td>{solicitud.telefono}</td>
            <td>{solicitud.licencia}</td>
            <td>{solicitud.fechaSolicitud}</td>
            <td>
              <span className={`estado-badge ${solicitud.estado}`}>
                {solicitud.estado}
              </span>
            </td>
            <td>
              <span className={solicitud.documentosCompletos ? 'true' : 'false'}>
                {solicitud.documentosCompletos ? 'Sí' : 'No'}
              </span>
            </td>
            <td>{solicitud.modelo_vehiculo}</td>
            <td>{solicitud.placa_vehiculo}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// Renderizado de tabla para administradores
export const renderTablaAdmins = (datos, tableRef) => {
  return (
    <table className="data-table" ref={tableRef}>
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Email</th>
          <th>Rol</th>
          <th>Fecha Registro</th>
          <th>Último Acceso</th>
          <th>Estado</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {datos.map((admin) => (
          <tr key={admin.id} className={admin.active ? 'admin-activo' : 'admin-inactivo'}>
            <td>{admin.nombre}</td>
            <td>{admin.email}</td>
            <td>{admin.rol}</td>
            <td>{admin.fechaRegistro}</td>
            <td>{admin.ultimoAcceso}</td>
            <td>
              <span className={`estado-badge ${admin.active ? 'activo' : 'inactivo'}`}>
                {admin.active ? 'Activo' : 'Inactivo'}
              </span>
            </td>
            <td>{admin.accionesRealizadas}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// Renderizado de tabla para grabaciones
export const renderTablaGrabaciones = (datos, tableRef) => {
  return (
    <table className="data-table" ref={tableRef}>
      <thead>
        <tr>
          <th>ID Viaje</th>
          <th>ID Conductor</th>
          <th>Fecha</th>
          <th>Duración</th>
          <th>Tamaño</th>
          <th>Estado</th>
          <th>Visualizaciones</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {datos.map((grabacion) => (
          <tr key={grabacion.id} className={`grabacion-${grabacion.estado}`}>
            <td>{grabacion.viajeId}</td>
            <td>{grabacion.conductorId}</td>
            <td>{grabacion.fecha}</td>
            <td>{grabacion.duracion}</td>
            <td>{grabacion.tamaño}</td>
            <td>
              <span className={`estado-badge ${grabacion.estado}`}>
                {grabacion.estado}
              </span>
            </td>
            <td>{grabacion.visualizaciones}</td>
            <td className="acciones">
              <button 
                className="btn-ver" 
                title="Ver grabación" 
                onClick={() => handleVerGrabacion(grabacion.id)}
              >
                <i className="fa fa-play-circle"></i>
              </button>
              <button 
                className="btn-descargar" 
                title="Descargar grabación" 
                onClick={() => handleDescargarGrabacion(grabacion.id)}
              >
                <i className="fa fa-download"></i>
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// Renderizado de tabla para logs
export const renderTablaLogs = (datos, tableRef) => {
  return (
    <table className="data-table" ref={tableRef}>
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Usuario</th>
          <th>Acción</th>
          <th>Módulo</th>
          <th>Detalles</th>
          <th>Resultado</th>
        </tr>
      </thead>
      <tbody>
        {datos.map((log) => (
          <tr key={log.id} className={`log-${log.resultado}`}>
            <td>{log.fecha}</td>
            <td>{log.usuario}</td>
            <td>{log.accion}</td>
            <td>{log.modulo}</td>
            <td title={log.detalles}>
              {log.detalles.length > 30 ? log.detalles.substring(0, 30) + '...' : log.detalles}
            </td>
            <td>
              <span className={`estado-badge ${log.resultado}`}>
                {log.resultado}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};