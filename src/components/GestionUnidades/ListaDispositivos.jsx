// src/components/GestionUnidades/components/ListaDispositivos/ListaDispositivos.jsx
import React, { useState, useEffect } from 'react';
import { firebaseService } from '../../services/firebaseService';
import './ListaDispositivos.css';

const ListaDispositivos = ({ dispositivos, cargando, onSeleccionar, onActualizar }) => {
  const [vistaActual, setVistaActual] = useState('grid'); // grid, lista, tabla
  const [ordenamiento, setOrdenamiento] = useState({ campo: 'nombre', direccion: 'asc' });
  const [dispositivoSeleccionado, setDispositivoSeleccionado] = useState(null);
  const [mostrarDetalles, setMostrarDetalles] = useState(false);
  const [accionEnProceso, setAccionEnProceso] = useState(null);

  // Función auxiliar para obtener valor del campo (debe ir antes de usarse)
  const obtenerValorCampo = (dispositivo, campo) => {
    switch (campo) {
      case 'nombre':
        return dispositivo.nombre || dispositivo.id;
      case 'ip':
        return dispositivo.red?.ip || dispositivo.ip || '';
      case 'estado':
        return dispositivo.estado?.online ? 'online' : 'offline';
      case 'zona':
        return dispositivo.zona || '';
      case 'ultimaActualizacion':
        return dispositivo.estado?.ultimaActualizacion || 0;
      default:
        return '';
    }
  };

  // Ordenar dispositivos (ahora puede usar la función)
  const dispositivosOrdenados = [...dispositivos].sort((a, b) => {
    const valorA = obtenerValorCampo(a, ordenamiento.campo);
    const valorB = obtenerValorCampo(b, ordenamiento.campo);
    
    if (ordenamiento.direccion === 'asc') {
      return valorA > valorB ? 1 : -1;
    } else {
      return valorA < valorB ? 1 : -1;
    }
  });

  // Cambiar ordenamiento
  const handleOrdenamiento = (campo) => {
    setOrdenamiento(prev => ({
      campo,
      direccion: prev.campo === campo && prev.direccion === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Seleccionar dispositivo
  const handleSeleccionarDispositivo = (dispositivo) => {
    setDispositivoSeleccionado(dispositivo);
    setMostrarDetalles(true);
  };

  // Configurar dispositivo
  const handleConfigurar = (dispositivo) => {
    if (onSeleccionar) {
      onSeleccionar(dispositivo);
    }
  };

  // Eliminar dispositivo
  const handleEliminar = async (dispositivo) => {
    const confirmar = window.confirm(
      `¿Estás seguro de eliminar el dispositivo "${dispositivo.nombre}"?\n\n` +
      `Esta acción no se puede deshacer.`
    );

    if (!confirmar) return;

    try {
      setAccionEnProceso(dispositivo.id);
      
      // Eliminar de Firebase
      await firebaseService.deleteDoc(`postes/${dispositivo.id}`);
      
      // Actualizar lista
      if (onActualizar) {
        onActualizar();
      }

    } catch (error) {
      console.error('Error eliminando dispositivo:', error);
      alert('Error eliminando dispositivo: ' + error.message);
    } finally {
      setAccionEnProceso(null);
    }
  };

  // Duplicar dispositivo
  const handleDuplicar = async (dispositivo) => {
    try {
      setAccionEnProceso(dispositivo.id);
      
      const nuevoDispositivo = {
        ...dispositivo,
        id: `${dispositivo.id}_copia_${Date.now()}`,
        nombre: `${dispositivo.nombre} (Copia)`,
        red: {
          ...dispositivo.red,
          ip: generarNuevaIP(dispositivo.red?.ip || '192.168.1.101')
        },
        metadatos: {
          ...dispositivo.metadatos,
          fechaCreacion: new Date().toISOString(),
          creadoPor: 'duplicacion',
          configuradoPor: 'sistema'
        },
        estado: {
          ...dispositivo.estado,
          online: false,
          configurado: false
        }
      };

      // Crear en Firebase
      await firebaseService.createInitialPoste(nuevoDispositivo.id);
      
      // Actualizar con datos duplicados
      await firebaseService.updateDoc(`postes/${nuevoDispositivo.id}`, nuevoDispositivo);
      
      // Actualizar lista
      if (onActualizar) {
        onActualizar();
      }

    } catch (error) {
      console.error('Error duplicando dispositivo:', error);
      alert('Error duplicando dispositivo: ' + error.message);
    } finally {
      setAccionEnProceso(null);
    }
  };

  // Generar nueva IP para duplicado
  const generarNuevaIP = (ipOriginal) => {
    const partes = ipOriginal.split('.');
    let ultimoOcteto = parseInt(partes[3]) + 1;
    
    if (ultimoOcteto > 200) {
      ultimoOcteto = 101;
    }
    
    return `${partes[0]}.${partes[1]}.${partes[2]}.${ultimoOcteto}`;
  };

  // Renderizar card de dispositivo
  const renderDispositivoCard = (dispositivo) => (
    <div key={dispositivo.id} className="dispositivo-card">
      <div className="card-header">
        <div className="dispositivo-icon">
          📱
        </div>
        <div className="estado-badge-container">
          <span className={`estado-badge ${dispositivo.estado?.online ? 'online' : 'offline'}`}>
            {dispositivo.estado?.online ? '🟢 Online' : '🔴 Offline'}
          </span>
        </div>
      </div>

      <div className="card-body">
        <h4 className="dispositivo-nombre">
          {dispositivo.nombre || dispositivo.id}
        </h4>
        
        <div className="dispositivo-info">
          <div className="info-item">
            <span className="info-label">ID:</span>
            <span className="info-valor device-id">{dispositivo.id}</span>
          </div>
          
          <div className="info-item">
            <span className="info-label">IP:</span>
            <span className="info-valor ip-address">
              {dispositivo.red?.ip || dispositivo.ip || 'No configurada'}
            </span>
          </div>
          
          <div className="info-item">
            <span className="info-label">Zona:</span>
            <span className="info-valor">{dispositivo.zona || 'Sin asignar'}</span>
          </div>
          
          <div className="info-item">
            <span className="info-label">Ubicación:</span>
            <span className="info-valor">{dispositivo.ubicacion || 'No especificada'}</span>
          </div>
        </div>

        {/* Sensores detectados */}
        <div className="sensores-status">
          <div className="sensores-titulo">Sensores:</div>
          <div className="sensores-list">
            <span className={`sensor-badge ${dispositivo.sensores?.ldr?.funcionando ? 'activo' : 'inactivo'}`}>
              💡 LDR
            </span>
            <span className={`sensor-badge ${dispositivo.sensores?.pir?.funcionando ? 'activo' : 'inactivo'}`}>
              👁️ PIR
            </span>
            <span className={`sensor-badge ${dispositivo.sensores?.acs712?.funcionando ? 'activo' : 'inactivo'}`}>
              ⚡ ACS712
            </span>
          </div>
        </div>

        {/* Última actualización */}
        <div className="ultima-actualizacion">
          <span className="update-label">Última actualización:</span>
          <span className="update-time">
            {dispositivo.estado?.ultimaActualizacion 
              ? new Date(dispositivo.estado.ultimaActualizacion.seconds * 1000).toLocaleString()
              : 'Nunca'
            }
          </span>
        </div>
      </div>

      <div className="card-actions">
        <button 
          className="btn-action primary"
          onClick={() => handleConfigurar(dispositivo)}
          disabled={accionEnProceso === dispositivo.id}
        >
          ⚙️ Configurar
        </button>
        
        <button 
          className="btn-action secondary"
          onClick={() => handleSeleccionarDispositivo(dispositivo)}
          disabled={accionEnProceso === dispositivo.id}
        >
          👁️ Detalles
        </button>
        
        <div className="more-actions">
          <button className="btn-more">⋮</button>
          <div className="more-actions-menu">
            <button 
              onClick={() => handleDuplicar(dispositivo)}
              disabled={accionEnProceso === dispositivo.id}
            >
              📋 Duplicar
            </button>
            <button 
              onClick={() => handleEliminar(dispositivo)}
              disabled={accionEnProceso === dispositivo.id}
              className="action-danger"
            >
              🗑️ Eliminar
            </button>
          </div>
        </div>
      </div>

      {accionEnProceso === dispositivo.id && (
        <div className="loading-overlay">
          <div className="loading-spinner">🔄</div>
        </div>
      )}
    </div>
  );

  // Renderizar fila de tabla
  const renderDispositivoFila = (dispositivo) => (
    <tr key={dispositivo.id} className="dispositivo-fila">
      <td className="col-nombre">
        <div className="nombre-container">
          <span className="dispositivo-icon-small">📱</span>
          <div>
            <div className="nombre-principal">{dispositivo.nombre || dispositivo.id}</div>
            <div className="device-id-small">{dispositivo.id}</div>
          </div>
        </div>
      </td>
      
      <td className="col-ip">
        <span className="ip-address">{dispositivo.red?.ip || dispositivo.ip || '-'}</span>
      </td>
      
      <td className="col-estado">
        <span className={`estado-badge-small ${dispositivo.estado?.online ? 'online' : 'offline'}`}>
          {dispositivo.estado?.online ? '🟢 Online' : '🔴 Offline'}
        </span>
      </td>
      
      <td className="col-zona">
        {dispositivo.zona || '-'}
      </td>
      
      <td className="col-sensores">
        <div className="sensores-mini">
          <span className={`sensor-mini ${dispositivo.sensores?.ldr?.funcionando ? 'ok' : 'off'}`} title="LDR">💡</span>
          <span className={`sensor-mini ${dispositivo.sensores?.pir?.funcionando ? 'ok' : 'off'}`} title="PIR">👁️</span>
          <span className={`sensor-mini ${dispositivo.sensores?.acs712?.funcionando ? 'ok' : 'off'}`} title="ACS712">⚡</span>
        </div>
      </td>
      
      <td className="col-acciones">
        <div className="acciones-tabla">
          <button 
            className="btn-tabla primary"
            onClick={() => handleConfigurar(dispositivo)}
            title="Configurar"
            disabled={accionEnProceso === dispositivo.id}
          >
            ⚙️
          </button>
          <button 
            className="btn-tabla secondary"
            onClick={() => handleSeleccionarDispositivo(dispositivo)}
            title="Ver detalles"
            disabled={accionEnProceso === dispositivo.id}
          >
            👁️
          </button>
          <button 
            className="btn-tabla danger"
            onClick={() => handleEliminar(dispositivo)}
            title="Eliminar"
            disabled={accionEnProceso === dispositivo.id}
          >
            🗑️
          </button>
        </div>
      </td>
    </tr>
  );

  if (cargando) {
    return (
      <div className="lista-dispositivos">
        <div className="loading-container">
          <div className="loading-spinner-large">🔄</div>
          <p>Cargando dispositivos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="lista-dispositivos">
      {/* Header con controles */}
      <div className="lista-header">
        <div className="lista-info">
          <h4>📋 Dispositivos ({dispositivos.length})</h4>
          <p>Gestiona todos tus dispositivos ESP32</p>
        </div>
        
        <div className="lista-controles">
          <div className="vista-selector">
            <button 
              className={`btn-vista ${vistaActual === 'grid' ? 'activo' : ''}`}
              onClick={() => setVistaActual('grid')}
              title="Vista de tarjetas"
            >
              ⬜
            </button>
            <button 
              className={`btn-vista ${vistaActual === 'tabla' ? 'activo' : ''}`}
              onClick={() => setVistaActual('tabla')}
              title="Vista de tabla"
            >
              📊
            </button>
          </div>
          
          <div className="ordenamiento-selector">
            <select
              value={`${ordenamiento.campo}-${ordenamiento.direccion}`}
              onChange={(e) => {
                const [campo, direccion] = e.target.value.split('-');
                setOrdenamiento({ campo, direccion });
              }}
              className="select-ordenamiento"
            >
              <option value="nombre-asc">Nombre A-Z</option>
              <option value="nombre-desc">Nombre Z-A</option>
              <option value="ip-asc">IP Ascendente</option>
              <option value="ip-desc">IP Descendente</option>
              <option value="estado-asc">Estado Online Primero</option>
              <option value="estado-desc">Estado Offline Primero</option>
              <option value="zona-asc">Zona A-Z</option>
              <option value="ultimaActualizacion-desc">Más Recientes</option>
            </select>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      {dispositivos.length === 0 ? (
        <div className="no-dispositivos">
          <div className="no-dispositivos-icon">📱</div>
          <h3>No hay dispositivos configurados</h3>
          <p>Comienza añadiendo tu primer dispositivo ESP32</p>
          <button className="btn-agregar-primero" onClick={() => {}}>
            ➕ Añadir Primer Dispositivo
          </button>
        </div>
      ) : (
        <>
          {/* Vista Grid */}
          {vistaActual === 'grid' && (
            <div className="dispositivos-grid">
              {dispositivosOrdenados.map(renderDispositivoCard)}
            </div>
          )}

          {/* Vista Tabla */}
          {vistaActual === 'tabla' && (
            <div className="dispositivos-tabla-container">
              <table className="dispositivos-tabla">
                <thead>
                  <tr>
                    <th 
                      className={`sortable ${ordenamiento.campo === 'nombre' ? 'active' : ''}`}
                      onClick={() => handleOrdenamiento('nombre')}
                    >
                      Dispositivo
                      {ordenamiento.campo === 'nombre' && (
                        <span className="sort-indicator">
                          {ordenamiento.direccion === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </th>
                    <th 
                      className={`sortable ${ordenamiento.campo === 'ip' ? 'active' : ''}`}
                      onClick={() => handleOrdenamiento('ip')}
                    >
                      IP
                      {ordenamiento.campo === 'ip' && (
                        <span className="sort-indicator">
                          {ordenamiento.direccion === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </th>
                    <th 
                      className={`sortable ${ordenamiento.campo === 'estado' ? 'active' : ''}`}
                      onClick={() => handleOrdenamiento('estado')}
                    >
                      Estado
                      {ordenamiento.campo === 'estado' && (
                        <span className="sort-indicator">
                          {ordenamiento.direccion === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </th>
                    <th 
                      className={`sortable ${ordenamiento.campo === 'zona' ? 'active' : ''}`}
                      onClick={() => handleOrdenamiento('zona')}
                    >
                      Zona
                      {ordenamiento.campo === 'zona' && (
                        <span className="sort-indicator">
                          {ordenamiento.direccion === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </th>
                    <th>Sensores</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {dispositivosOrdenados.map(renderDispositivoFila)}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Modal de detalles */}
      {mostrarDetalles && dispositivoSeleccionado && (
        <div className="modal-overlay" onClick={() => setMostrarDetalles(false)}>
          <div className="modal-detalles" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📱 Detalles del Dispositivo</h3>
              <button 
                className="btn-cerrar-modal"
                onClick={() => setMostrarDetalles(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="modal-body">
              <div className="detalles-grid">
                <div className="detalle-seccion">
                  <h4>🏷️ Información General</h4>
                  <div className="detalle-item">
                    <span className="detalle-label">Nombre:</span>
                    <span className="detalle-valor">{dispositivoSeleccionado.nombre}</span>
                  </div>
                  <div className="detalle-item">
                    <span className="detalle-label">ID:</span>
                    <span className="detalle-valor device-id">{dispositivoSeleccionado.id}</span>
                  </div>
                  <div className="detalle-item">
                    <span className="detalle-label">Zona:</span>
                    <span className="detalle-valor">{dispositivoSeleccionado.zona || 'Sin asignar'}</span>
                  </div>
                  <div className="detalle-item">
                    <span className="detalle-label">Ubicación:</span>
                    <span className="detalle-valor">{dispositivoSeleccionado.ubicacion || 'No especificada'}</span>
                  </div>
                </div>

                <div className="detalle-seccion">
                  <h4>🌐 Configuración de Red</h4>
                  <div className="detalle-item">
                    <span className="detalle-label">IP:</span>
                    <span className="detalle-valor ip-address">
                      {dispositivoSeleccionado.red?.ip || 'No configurada'}
                    </span>
                  </div>
                  <div className="detalle-item">
                    <span className="detalle-label">Puerto:</span>
                    <span className="detalle-valor">{dispositivoSeleccionado.red?.puerto || 80}</span>
                  </div>
                  <div className="detalle-item">
                    <span className="detalle-label">Protocolo:</span>
                    <span className="detalle-valor">HTTP/1.1</span>
                  </div>
                  <div className="detalle-item">
                    <span className="detalle-label">MAC:</span>
                    <span className="detalle-valor">{dispositivoSeleccionado.red?.mac || 'No disponible'}</span>
                  </div>
                </div>

                <div className="detalle-seccion">
                  <h4>⚡ Estado Actual</h4>
                  <div className="detalle-item">
                    <span className="detalle-label">Conexión:</span>
                    <span className={`detalle-valor estado ${dispositivoSeleccionado.estado?.online ? 'online' : 'offline'}`}>
                      {dispositivoSeleccionado.estado?.online ? '🟢 Online' : '🔴 Offline'}
                    </span>
                  </div>
                  <div className="detalle-item">
                    <span className="detalle-label">Uptime:</span>
                    <span className="detalle-valor">
                      {Math.floor((dispositivoSeleccionado.estado?.uptime || 0) / 3600)}h {Math.floor(((dispositivoSeleccionado.estado?.uptime || 0) % 3600) / 60)}m
                    </span>
                  </div>
                  <div className="detalle-item">
                    <span className="detalle-label">Reconexiones:</span>
                    <span className="detalle-valor">{dispositivoSeleccionado.estado?.reconexiones || 0}</span>
                  </div>
                </div>

                <div className="detalle-seccion">
                  <h4>🔬 Sensores</h4>
                  <div className="sensores-detalle">
                    <div className="sensor-detalle-item">
                      <span className="sensor-icon">💡</span>
                      <div className="sensor-info">
                        <div className="sensor-nombre">LDR (Luminosidad)</div>
                        <div className="sensor-estado">
                          {dispositivoSeleccionado.sensores?.ldr?.funcionando ? '✅ Funcionando' : '❌ No detectado'}
                        </div>
                        {dispositivoSeleccionado.sensores?.ldr?.luxCalculado && (
                          <div className="sensor-valor">{dispositivoSeleccionado.sensores.ldr.luxCalculado} lux</div>
                        )}
                      </div>
                    </div>
                    
                    <div className="sensor-detalle-item">
                      <span className="sensor-icon">👁️</span>
                      <div className="sensor-info">
                        <div className="sensor-nombre">PIR (Movimiento)</div>
                        <div className="sensor-estado">
                          {dispositivoSeleccionado.sensores?.pir?.funcionando ? '✅ Funcionando' : '❌ No detectado'}
                        </div>
                        {dispositivoSeleccionado.sensores?.pir?.contadorHoy && (
                          <div className="sensor-valor">{dispositivoSeleccionado.sensores.pir.contadorHoy} detecciones hoy</div>
                        )}
                      </div>
                    </div>
                    
                    <div className="sensor-detalle-item">
                      <span className="sensor-icon">⚡</span>
                      <div className="sensor-info">
                        <div className="sensor-nombre">ACS712 (Corriente)</div>
                        <div className="sensor-estado">
                          {dispositivoSeleccionado.sensores?.acs712?.funcionando ? '✅ Funcionando' : '❌ No detectado'}
                        </div>
                        {dispositivoSeleccionado.sensores?.acs712?.corriente && (
                          <div className="sensor-valor">{dispositivoSeleccionado.sensores.acs712.corriente.toFixed(2)}A</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="detalle-seccion">
                  <h4>📊 Datos Calculados</h4>
                  <div className="detalle-item">
                    <span className="detalle-label">Consumo Hoy:</span>
                    <span className="detalle-valor">{dispositivoSeleccionado.calculados?.consumoHoy?.toFixed(2) || '0'} kWh</span>
                  </div>
                  <div className="detalle-item">
                    <span className="detalle-label">Costo Hoy:</span>
                    <span className="detalle-valor">{dispositivoSeleccionado.calculados?.costoHoy?.toFixed(2) || '0'} BOB</span>
                  </div>
                  <div className="detalle-item">
                    <span className="detalle-label">Tiempo Encendido:</span>
                    <span className="detalle-valor">{dispositivoSeleccionado.calculados?.tiempoEncendidoHoy || 0} min</span>
                  </div>
                  <div className="detalle-item">
                    <span className="detalle-label">Eficiencia:</span>
                    <span className="detalle-valor">{dispositivoSeleccionado.calculados?.eficienciaHoy?.toFixed(1) || '0'}%</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn-modal secondary"
                onClick={() => setMostrarDetalles(false)}
              >
                Cerrar
              </button>
              <button 
                className="btn-modal primary"
                onClick={() => {
                  setMostrarDetalles(false);
                  handleConfigurar(dispositivoSeleccionado);
                }}
              >
                ⚙️ Configurar Dispositivo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListaDispositivos;