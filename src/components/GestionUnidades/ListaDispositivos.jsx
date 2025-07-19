// src/components/GestionUnidades/components/ListaDispositivos/ListaDispositivos.jsx
import React, { useState, useEffect } from 'react';
import { firebaseService } from '../../services/firebaseService';
import './ListaDispositivos.css';

const ListaDispositivos = ({ 
  dispositivos = [], 
  cargando = false, 
  onSeleccionar, 
  onActualizar 
}) => {
  // ===== ESTADOS PRINCIPALES =====
  const [vistaActual, setVistaActual] = useState('grid'); // grid, tabla
  const [ordenamiento, setOrdenamiento] = useState({ campo: 'nombre', direccion: 'asc' });
  const [filtro, setFiltro] = useState('todos'); // todos, activos, deshabilitados, online, offline
  const [busqueda, setBusqueda] = useState('');
  
  // ===== ESTADOS DE MODALES =====
  const [modalDetalles, setModalDetalles] = useState({ mostrar: false, dispositivo: null });
  const [modalDeshabilitar, setModalDeshabilitar] = useState({ 
    mostrar: false, 
    dispositivo: null, 
    razon: '', 
    error: '' 
  });
  
  // ===== ESTADOS DE ACCIONES =====
  const [accionEnProceso, setAccionEnProceso] = useState(null);

  // ===== FUNCIONES DE FILTRADO Y ORDENAMIENTO =====
  const obtenerValorCampo = (dispositivo, campo) => {
    switch (campo) {
      case 'nombre':
        return dispositivo.nombre || dispositivo.id || '';
      case 'ip':
        return dispositivo.red?.ip || dispositivo.ip || '';
      case 'estado':
        if (dispositivo.estado?.deshabilitado) return 'deshabilitado';
        return dispositivo.estado?.online ? 'online' : 'offline';
      case 'zona':
        return dispositivo.zona || '';
      case 'ultimaActualizacion':
        return dispositivo.estado?.ultimaActualizacion?.seconds || 0;
      case 'fechaCreacion':
        return dispositivo.fechaCreacion || 0;
      default:
        return '';
    }
  };

  const filtrarDispositivos = (dispositivos) => {
    let resultado = [...dispositivos];

    // Filtro por estado
    if (filtro !== 'todos') {
      resultado = resultado.filter(dispositivo => {
        switch (filtro) {
          case 'activos':
            return !dispositivo.estado?.deshabilitado;
          case 'deshabilitados':
            return dispositivo.estado?.deshabilitado;
          case 'online':
            return dispositivo.estado?.online && !dispositivo.estado?.deshabilitado;
          case 'offline':
            return !dispositivo.estado?.online && !dispositivo.estado?.deshabilitado;
          default:
            return true;
        }
      });
    }

    // Filtro por búsqueda
    if (busqueda.trim()) {
      const termino = busqueda.toLowerCase().trim();
      resultado = resultado.filter(dispositivo => 
        (dispositivo.nombre || '').toLowerCase().includes(termino) ||
        (dispositivo.id || '').toLowerCase().includes(termino) ||
        (dispositivo.ubicacion || '').toLowerCase().includes(termino) ||
        (dispositivo.zona || '').toLowerCase().includes(termino) ||
        (dispositivo.red?.ip || '').includes(termino)
      );
    }

    return resultado;
  };

  const ordenarDispositivos = (dispositivos) => {
    return [...dispositivos].sort((a, b) => {
      const valorA = obtenerValorCampo(a, ordenamiento.campo);
      const valorB = obtenerValorCampo(b, ordenamiento.campo);
      
      let comparacion = 0;
      if (valorA > valorB) comparacion = 1;
      if (valorA < valorB) comparacion = -1;
      
      return ordenamiento.direccion === 'asc' ? comparacion : -comparacion;
    });
  };

  // Procesar dispositivos
  const dispositivosProcesados = ordenarDispositivos(filtrarDispositivos(dispositivos));

  // ===== MANEJADORES DE EVENTOS =====
  const handleCambiarOrdenamiento = (campo) => {
    setOrdenamiento(prev => ({
      campo,
      direccion: prev.campo === campo && prev.direccion === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleVerDetalles = (dispositivo) => {
    setModalDetalles({ mostrar: true, dispositivo });
  };

  const handleConfigurar = (dispositivo) => {
    if (onSeleccionar) {
      onSeleccionar(dispositivo);
    }
  };

  // ===== FUNCIONES DE HABILITAR/DESHABILITAR =====
  const handleSolicitarDeshabilitar = (dispositivo) => {
    setModalDeshabilitar({
      mostrar: true,
      dispositivo,
      razon: '',
      error: ''
    });
  };

  const handleDeshabilitar = async () => {
    if (!modalDeshabilitar.dispositivo || !modalDeshabilitar.razon.trim()) {
      setModalDeshabilitar(prev => ({
        ...prev,
        error: 'Debes proporcionar una razón para deshabilitar el dispositivo'
      }));
      return;
    }

    try {
      setAccionEnProceso(modalDeshabilitar.dispositivo.id);
      
      const success = await firebaseService.disablePoste(
        modalDeshabilitar.dispositivo.id,
        modalDeshabilitar.razon.trim()
      );
      
      if (success) {
        setModalDeshabilitar({ mostrar: false, dispositivo: null, razon: '', error: '' });
        if (onActualizar) onActualizar();
      } else {
        setModalDeshabilitar(prev => ({
          ...prev,
          error: 'No se pudo deshabilitar el dispositivo'
        }));
      }
    } catch (error) {
      console.error('Error deshabilitando dispositivo:', error);
      setModalDeshabilitar(prev => ({
        ...prev,
        error: `Error: ${error.message}`
      }));
    } finally {
      setAccionEnProceso(null);
    }
  };

  const handleHabilitar = async (dispositivo) => {
    const confirmar = window.confirm(
      `¿Deseas habilitar el dispositivo "${dispositivo.nombre}"?\n\nEl dispositivo volverá a estar disponible para usar.`
    );

    if (!confirmar) return;

    try {
      setAccionEnProceso(dispositivo.id);
      
      const success = await firebaseService.enablePoste(
        dispositivo.id,
        'Rehabilitado por usuario'
      );
      
      if (success) {
        if (onActualizar) onActualizar();
      } else {
        alert('No se pudo habilitar el dispositivo');
      }
    } catch (error) {
      console.error('Error habilitando dispositivo:', error);
      alert('Error habilitando dispositivo: ' + error.message);
    } finally {
      setAccionEnProceso(null);
    }
  };

  const handleDuplicar = async (dispositivo) => {
    try {
      setAccionEnProceso(dispositivo.id);
      
      const timestamp = Date.now();
      const nuevoId = `${dispositivo.id}_copy_${timestamp}`;
      
      // Crear dispositivo base
      await firebaseService.createInitialPoste(nuevoId);
      
      // Preparar datos duplicados
      const datosDuplicado = {
        ...dispositivo,
        id: nuevoId,
        nombre: `${dispositivo.nombre} (Copia)`,
        red: {
          ...dispositivo.red,
          ip: generarNuevaIP(dispositivo.red?.ip || '192.168.1.101')
        },
        fechaCreacion: new Date().toISOString(),
        estado: {
          online: false,
          deshabilitado: false,
          ultimaActualizacion: null
        }
      };

      // Actualizar con datos duplicados
      await firebaseService.updateDoc(`postes/${nuevoId}`, datosDuplicado);
      
      if (onActualizar) onActualizar();
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
    if (ultimoOcteto > 200) ultimoOcteto = 101;
    return `${partes[0]}.${partes[1]}.${partes[2]}.${ultimoOcteto}`;
  };

  // ===== COMPONENTES DE RENDERIZADO =====
  const DispositivoCard = ({ dispositivo }) => {
    const estaDeshabilitado = dispositivo.estado?.deshabilitado;
    const estaOnline = dispositivo.estado?.online && !estaDeshabilitado;
    const estaProcesando = accionEnProceso === dispositivo.id;

    return (
      <div className={`dispositivo-card ${estaDeshabilitado ? 'deshabilitado' : ''}`}>
        {estaProcesando && (
          <div className="loading-overlay">
            <div className="loading-spinner">🔄</div>
          </div>
        )}

        <div className="card-header">
          <div className="dispositivo-info-header">
            <div className="dispositivo-icon">📱</div>
            <div className="dispositivo-titulo">
              <h4>{dispositivo.nombre || dispositivo.id}</h4>
              <span className="device-id">{dispositivo.id}</span>
            </div>
          </div>
          
          <div className="estado-badges">
            {estaDeshabilitado ? (
              <span className="estado-badge deshabilitado">🔒 Deshabilitado</span>
            ) : (
              <span className={`estado-badge ${estaOnline ? 'online' : 'offline'}`}>
                {estaOnline ? '🟢 Online' : '🔴 Offline'}
              </span>
            )}
          </div>
        </div>

        <div className="card-body">
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">IP:</span>
              <span className="info-valor ip-address">
                {dispositivo.red?.ip || 'No configurada'}
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

          {estaDeshabilitado && dispositivo.estado?.razonDeshabilitacion && (
            <div className="razon-deshabilitacion">
              <div className="razon-titulo">🔒 Motivo:</div>
              <div className="razon-texto">{dispositivo.estado.razonDeshabilitacion}</div>
            </div>
          )}

          <div className="sensores-info">
            <div className="sensores-titulo">Sensores:</div>
            <div className="sensores-lista">
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

          <div className="ultima-actualizacion">
            <span className="update-label">Última actualización:</span>
            <span className="update-valor">
              {dispositivo.estado?.ultimaActualizacion 
                ? new Date(dispositivo.estado.ultimaActualizacion.seconds * 1000).toLocaleString()
                : 'Nunca'
              }
            </span>
          </div>
        </div>

        <div className="card-actions">
          {estaDeshabilitado ? (
            <>
              <button 
                className="btn-action success"
                onClick={() => handleHabilitar(dispositivo)}
                disabled={estaProcesando}
              >
                🔓 Habilitar
              </button>
              <button 
                className="btn-action secondary"
                onClick={() => handleVerDetalles(dispositivo)}
                disabled={estaProcesando}
              >
                👁️ Detalles
              </button>
            </>
          ) : (
            <>
              <button 
                className="btn-action primary"
                onClick={() => handleConfigurar(dispositivo)}
                disabled={estaProcesando}
              >
                ⚙️ Configurar
              </button>
              <button 
                className="btn-action secondary"
                onClick={() => handleVerDetalles(dispositivo)}
                disabled={estaProcesando}
              >
                👁️ Detalles
              </button>
              <div className="dropdown-actions">
                <button className="btn-more" disabled={estaProcesando}>⋮</button>
                <div className="dropdown-menu">
                  <button onClick={() => handleDuplicar(dispositivo)}>
                    📋 Duplicar
                  </button>
                  <button 
                    onClick={() => handleSolicitarDeshabilitar(dispositivo)}
                    className="action-warning"
                  >
                    🔒 Deshabilitar
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  const DispositivoFila = ({ dispositivo }) => {
    const estaDeshabilitado = dispositivo.estado?.deshabilitado;
    const estaOnline = dispositivo.estado?.online && !estaDeshabilitado;
    const estaProcesando = accionEnProceso === dispositivo.id;

    return (
      <tr className={`dispositivo-fila ${estaDeshabilitado ? 'deshabilitado' : ''}`}>
        <td className="col-dispositivo">
          <div className="dispositivo-info-tabla">
            <div className="dispositivo-icon-small">📱</div>
            <div className="dispositivo-datos">
              <div className="nombre-principal">{dispositivo.nombre || dispositivo.id}</div>
              <div className="device-id-small">{dispositivo.id}</div>
            </div>
          </div>
        </td>
        
        <td className="col-ip">
          <span className="ip-address">{dispositivo.red?.ip || '-'}</span>
        </td>
        
        <td className="col-estado">
          {estaDeshabilitado ? (
            <span className="estado-badge-small deshabilitado">🔒 Deshabilitado</span>
          ) : (
            <span className={`estado-badge-small ${estaOnline ? 'online' : 'offline'}`}>
              {estaOnline ? '🟢 Online' : '🔴 Offline'}
            </span>
          )}
        </td>
        
        <td className="col-zona">{dispositivo.zona || '-'}</td>
        
        <td className="col-sensores">
          <div className="sensores-mini">
            <span className={`sensor-mini ${dispositivo.sensores?.ldr?.funcionando ? 'ok' : 'off'}`} title="LDR">💡</span>
            <span className={`sensor-mini ${dispositivo.sensores?.pir?.funcionando ? 'ok' : 'off'}`} title="PIR">👁️</span>
            <span className={`sensor-mini ${dispositivo.sensores?.acs712?.funcionando ? 'ok' : 'off'}`} title="ACS712">⚡</span>
          </div>
        </td>
        
        <td className="col-acciones">
          <div className="acciones-tabla">
            {estaDeshabilitado ? (
              <>
                <button 
                  className="btn-tabla success"
                  onClick={() => handleHabilitar(dispositivo)}
                  disabled={estaProcesando}
                  title="Habilitar"
                >
                  🔓
                </button>
                <button 
                  className="btn-tabla secondary"
                  onClick={() => handleVerDetalles(dispositivo)}
                  disabled={estaProcesando}
                  title="Ver detalles"
                >
                  👁️
                </button>
              </>
            ) : (
              <>
                <button 
                  className="btn-tabla primary"
                  onClick={() => handleConfigurar(dispositivo)}
                  disabled={estaProcesando}
                  title="Configurar"
                >
                  ⚙️
                </button>
                <button 
                  className="btn-tabla secondary"
                  onClick={() => handleVerDetalles(dispositivo)}
                  disabled={estaProcesando}
                  title="Ver detalles"
                >
                  👁️
                </button>
                <button 
                  className="btn-tabla warning"
                  onClick={() => handleSolicitarDeshabilitar(dispositivo)}
                  disabled={estaProcesando}
                  title="Deshabilitar"
                >
                  🔒
                </button>
              </>
            )}
          </div>
        </td>
      </tr>
    );
  };

  // ===== RENDER PRINCIPAL =====
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
        <div className="header-info">
          <h3>📱 Dispositivos ESP32</h3>
          <p>Total: {dispositivos.length} | Mostrando: {dispositivosProcesados.length}</p>
        </div>
        
        <div className="header-controles">
          <div className="filtros-busqueda">
            <input
              type="text"
              placeholder="Buscar dispositivos..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="input-busqueda"
            />
            
            <select
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="select-filtro"
            >
              <option value="todos">Todos</option>
              <option value="activos">Activos</option>
              <option value="deshabilitados">Deshabilitados</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
            </select>
          </div>
          
          <div className="vista-controles">
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
            <option value="estado-asc">Estado A-Z</option>
            <option value="zona-asc">Zona A-Z</option>
            <option value="ultimaActualizacion-desc">Más Recientes</option>
          </select>
        </div>
      </div>

      {/* Contenido principal */}
      {dispositivosProcesados.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            {busqueda || filtro !== 'todos' ? '🔍' : '📱'}
          </div>
          <h3>
            {busqueda || filtro !== 'todos' 
              ? 'No se encontraron dispositivos' 
              : 'No hay dispositivos configurados'
            }
          </h3>
          <p>
            {busqueda || filtro !== 'todos'
              ? 'Prueba con otros términos de búsqueda o filtros'
              : 'Comienza añadiendo tu primer dispositivo ESP32'
            }
          </p>
          {!busqueda && filtro === 'todos' && (
            <button className="btn-agregar-primero">
              ➕ Añadir Primer Dispositivo
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Vista Grid */}
          {vistaActual === 'grid' && (
            <div className="dispositivos-grid">
              {dispositivosProcesados.map(dispositivo => (
                <DispositivoCard key={dispositivo.id} dispositivo={dispositivo} />
              ))}
            </div>
          )}

          {/* Vista Tabla */}
          {vistaActual === 'tabla' && (
            <div className="tabla-container">
              <table className="dispositivos-tabla">
                <thead>
                  <tr>
                    <th 
                      className={`sortable ${ordenamiento.campo === 'nombre' ? 'active' : ''}`}
                      onClick={() => handleCambiarOrdenamiento('nombre')}
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
                      onClick={() => handleCambiarOrdenamiento('ip')}
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
                      onClick={() => handleCambiarOrdenamiento('estado')}
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
                      onClick={() => handleCambiarOrdenamiento('zona')}
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
                  {dispositivosProcesados.map(dispositivo => (
                    <DispositivoFila key={dispositivo.id} dispositivo={dispositivo} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Modal de Detalles */}
      {modalDetalles.mostrar && modalDetalles.dispositivo && (
        <div className="modal-overlay" onClick={() => setModalDetalles({ mostrar: false, dispositivo: null })}>
          <div className="modal-detalles" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📱 Detalles del Dispositivo</h3>
              <button 
                className="btn-cerrar-modal"
                onClick={() => setModalDetalles({ mostrar: false, dispositivo: null })}
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
                    <span className="detalle-valor">{modalDetalles.dispositivo.nombre}</span>
                  </div>
                  <div className="detalle-item">
                    <span className="detalle-label">ID:</span>
                    <span className="detalle-valor device-id">{modalDetalles.dispositivo.id}</span>
                  </div>
                  <div className="detalle-item">
                    <span className="detalle-label">Estado:</span>
                    <span className={`detalle-valor estado ${
                      modalDetalles.dispositivo.estado?.deshabilitado ? 'deshabilitado' : 
                      modalDetalles.dispositivo.estado?.online ? 'online' : 'offline'
                    }`}>
                      {modalDetalles.dispositivo.estado?.deshabilitado ? '🔒 Deshabilitado' :
                       modalDetalles.dispositivo.estado?.online ? '🟢 Online' : '🔴 Offline'}
                    </span>
                  </div>
                  <div className="detalle-item">
                    <span className="detalle-label">Zona:</span>
                    <span className="detalle-valor">{modalDetalles.dispositivo.zona || 'Sin asignar'}</span>
                  </div>
                  <div className="detalle-item">
                    <span className="detalle-label">Ubicación:</span>
                    <span className="detalle-valor">{modalDetalles.dispositivo.ubicacion || 'No especificada'}</span>
                  </div>
                  
                  {modalDetalles.dispositivo.estado?.deshabilitado && (
                    <div className="detalle-item">
                      <span className="detalle-label">Motivo deshabilitación:</span>
                      <span className="detalle-valor razon-texto">
                        {modalDetalles.dispositivo.estado?.razonDeshabilitacion || 'Sin especificar'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="detalle-seccion">
                  <h4>🌐 Configuración de Red</h4>
                  <div className="detalle-item">
                    <span className="detalle-label">IP:</span>
                    <span className="detalle-valor ip-address">
                      {modalDetalles.dispositivo.red?.ip || 'No configurada'}
                    </span>
                  </div>
                  <div className="detalle-item">
                    <span className="detalle-label">Puerto:</span>
                    <span className="detalle-valor">{modalDetalles.dispositivo.red?.puerto || 80}</span>
                  </div>
                  <div className="detalle-item">
                    <span className="detalle-label">Protocolo:</span>
                    <span className="detalle-valor">HTTP/1.1</span>
                  </div>
                </div>

                <div className="detalle-seccion">
                  <h4>🔬 Sensores Detectados</h4>
                  <div className="sensores-detalle">
                    <div className="sensor-detalle-item">
                      <span className="sensor-icon">💡</span>
                      <div className="sensor-info">
                        <div className="sensor-nombre">LDR (Luminosidad)</div>
                        <div className="sensor-estado">
                          {modalDetalles.dispositivo.sensores?.ldr?.funcionando ? '✅ Funcionando' : '❌ No detectado'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="sensor-detalle-item">
                      <span className="sensor-icon">👁️</span>
                      <div className="sensor-info">
                        <div className="sensor-nombre">PIR (Movimiento)</div>
                        <div className="sensor-estado">
                          {modalDetalles.dispositivo.sensores?.pir?.funcionando ? '✅ Funcionando' : '❌ No detectado'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="sensor-detalle-item">
                      <span className="sensor-icon">⚡</span>
                      <div className="sensor-info">
                        <div className="sensor-nombre">ACS712 (Corriente)</div>
                        <div className="sensor-estado">
                          {modalDetalles.dispositivo.sensores?.acs712?.funcionando ? '✅ Funcionando' : '❌ No detectado'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="detalle-seccion">
                  <h4>📊 Métricas de Rendimiento</h4>
                  <div className="detalle-item">
                    <span className="detalle-label">Uptime:</span>
                    <span className="detalle-valor">
                      {Math.floor((modalDetalles.dispositivo.estado?.uptime || 0) / 3600)}h {Math.floor(((modalDetalles.dispositivo.estado?.uptime || 0) % 3600) / 60)}m
                    </span>
                  </div>
                  <div className="detalle-item">
                    <span className="detalle-label">Consumo Hoy:</span>
                    <span className="detalle-valor">{modalDetalles.dispositivo.calculados?.consumoHoy?.toFixed(2) || '0'} kWh</span>
                  </div>
                  <div className="detalle-item">
                    <span className="detalle-label">Eficiencia:</span>
                    <span className="detalle-valor">{modalDetalles.dispositivo.calculados?.eficienciaHoy?.toFixed(1) || '0'}%</span>
                  </div>
                  <div className="detalle-item">
                    <span className="detalle-label">Última actualización:</span>
                    <span className="detalle-valor">
                      {modalDetalles.dispositivo.estado?.ultimaActualizacion 
                        ? new Date(modalDetalles.dispositivo.estado.ultimaActualizacion.seconds * 1000).toLocaleString()
                        : 'Nunca'
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn-modal secondary"
                onClick={() => setModalDetalles({ mostrar: false, dispositivo: null })}
              >
                Cerrar
              </button>
              
              {modalDetalles.dispositivo.estado?.deshabilitado ? (
                <button 
                  className="btn-modal success"
                  onClick={() => {
                    setModalDetalles({ mostrar: false, dispositivo: null });
                    handleHabilitar(modalDetalles.dispositivo);
                  }}
                >
                  🔓 Habilitar Dispositivo
                </button>
              ) : (
                <button 
                  className="btn-modal primary"
                  onClick={() => {
                    setModalDetalles({ mostrar: false, dispositivo: null });
                    handleConfigurar(modalDetalles.dispositivo);
                  }}
                >
                  ⚙️ Configurar Dispositivo
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Deshabilitar */}
      {modalDeshabilitar.mostrar && modalDeshabilitar.dispositivo && (
        <div className="modal-overlay" onClick={() => setModalDeshabilitar({ mostrar: false, dispositivo: null, razon: '', error: '' })}>
          <div className="modal-deshabilitar" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🔒 Deshabilitar Dispositivo</h3>
              <button 
                className="btn-cerrar-modal"
                onClick={() => setModalDeshabilitar({ mostrar: false, dispositivo: null, razon: '', error: '' })}
              >
                ✕
              </button>
            </div>
            
            <div className="modal-body">
              <div className="dispositivo-info-modal">
                <div className="dispositivo-header-modal">
                  <span className="dispositivo-icon-modal">📱</span>
                  <div>
                    <h4>{modalDeshabilitar.dispositivo.nombre || modalDeshabilitar.dispositivo.id}</h4>
                    <p>ID: {modalDeshabilitar.dispositivo.id}</p>
                  </div>
                </div>
              </div>
              
              <div className="advertencia-deshabilitar">
                <div className="advertencia-icon">⚠️</div>
                <div>
                  <strong>¿Estás seguro de deshabilitar este dispositivo?</strong>
                  <p>El dispositivo no aparecerá en las listas activas y no podrá ser controlado hasta que sea habilitado nuevamente.</p>
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="razon">Motivo de deshabilitación *</label>
                <textarea
                  id="razon"
                  value={modalDeshabilitar.razon}
                  onChange={(e) => setModalDeshabilitar(prev => ({ ...prev, razon: e.target.value, error: '' }))}
                  placeholder="Especifica el motivo por el cual se deshabilita este dispositivo..."
                  className="textarea-razon"
                  rows={3}
                  required
                />
              </div>
              
              {modalDeshabilitar.error && (
                <div className="error-message">
                  <span className="error-icon">❌</span>
                  <span>{modalDeshabilitar.error}</span>
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn-modal secondary"
                onClick={() => setModalDeshabilitar({ mostrar: false, dispositivo: null, razon: '', error: '' })}
                disabled={accionEnProceso === modalDeshabilitar.dispositivo?.id}
              >
                Cancelar
              </button>
              <button 
                className="btn-modal danger"
                onClick={handleDeshabilitar}
                disabled={accionEnProceso === modalDeshabilitar.dispositivo?.id || !modalDeshabilitar.razon.trim()}
              >
                {accionEnProceso === modalDeshabilitar.dispositivo?.id ? '🔄 Deshabilitando...' : '🔒 Deshabilitar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListaDispositivos;