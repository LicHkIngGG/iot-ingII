// src/components/MonitoreoControl/components/SelectorDispositivos/SelectorDispositivos.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import './SelectorDispositivos.css';

const SelectorDispositivos = ({ 
  postesSeleccionados = [], 
  onSeleccionChange, 
  filtroZona = null 
}) => {
  // ===== ESTADOS PRINCIPALES =====
  const [modoSeleccion, setModoSeleccion] = useState('multiple');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [ordenarPor, setOrdenarPor] = useState('nombre');
  const [mostrarDetalles, setMostrarDetalles] = useState(false);
  const [vistaCompacta, setVistaCompacta] = useState(false);
  const [postesDisponibles, setPostesDisponibles] = useState([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [error, setError] = useState(null);

  // ===== CARGAR DATOS DE FIREBASE EN TIEMPO REAL =====
  useEffect(() => {
    setCargandoDatos(true);
    setError(null);

    const unsubscribe = onSnapshot(
      collection(db, 'postes'),
      (snapshot) => {
        try {
          const postesArray = [];
          
          snapshot.forEach((doc) => {
            const data = doc.data();
            const posteId = doc.id;
            
            console.log('Procesando poste selector:', posteId, data);
            
            // Detectar estado online
            const isOnline = data.online === true || 
                            data.estado?.online === true || 
                            data.conectado === true ||
                            data.activo === true ||
                            (data.ultimaConexion && 
                             new Date() - new Date(data.ultimaConexion) < 300000);
            
            // Detectar estado encendido
            const isEncendido = data.encendido === true ||
                               data.estado?.encendido === true ||
                               data.ledEncendido === true ||
                               data.ledState === true ||
                               data.ledStatus === 'ON' ||
                               (data.intensidadLED && data.intensidadLED > 0) ||
                               (data.intensidad && data.intensidad > 0);
            
            // Detectar modo automático
            const isAutomatico = data.automatizacion?.habilitada === true || 
                                data.modoAutomatico === true || 
                                data.autoMode === true ||
                                data.automatico === true;
            
            const posteInfo = {
              id: posteId,
              nombre: data.nombre || `Poste ${posteId.split('_')[1] || posteId}`,
              ubicacion: data.ubicacion || 'Ubicación no especificada',
              zona: data.zona || 'Villa Adela Norte',
              
              // Estado en tiempo real
              estado: {
                online: isOnline,
                encendido: isEncendido,
                automatico: isAutomatico,
                activo: data.activo !== false,
                deshabilitado: data.deshabilitado === true
              },
              
              // Datos calculados
              calculados: {
                potenciaActual: Number(data.potenciaActual || data.consumoActual || data.potencia || 0),
                consumoHoy: Number(data.consumoHoy || data.consumo || 0),
                intensidadLED: Number(data.intensidadLED || data.intensidad || data.brillo || 0),
                eficiencia: Number(data.eficienciaHoy || data.eficiencia || 85),
                corriente: Number(data.corriente || 0),
                voltaje: Number(data.voltaje || 220)
              },
              
              // Sensores
              sensores: {
                ldr: {
                  funcionando: data.sensores?.ldr?.funcionando !== false,
                  valor: Number(data.sensores?.ldr?.valor || data.ldr || data.valorLDR || 500),
                  luxCalculado: Number(data.sensores?.ldr?.luxCalculado || data.luxCalculado || data.lux || 200)
                },
                pir: {
                  funcionando: data.sensores?.pir?.funcionando !== false,
                  detecciones: Number(data.sensores?.pir?.detecciones || data.pirDetecciones || data.movimiento || 0),
                  contadorHoy: Number(data.sensores?.pir?.contadorHoy || data.pirContadorHoy || data.deteccionesHoy || 0)
                },
                acs712: {
                  funcionando: data.sensores?.acs712?.funcionando !== false,
                  corriente: Number(data.sensores?.acs712?.corriente || data.corriente || data.amperaje || 0),
                  voltaje: Number(data.sensores?.acs712?.voltaje || data.voltaje || 220)
                }
              },
              
              // Red
              red: {
                ip: data.red?.ip || data.ip || '192.168.1.100',
                puerto: Number(data.red?.puerto || data.puerto || 80),
                mac: data.red?.mac || data.mac || '00:00:00:00:00:00',
                rssi: Number(data.red?.rssi || data.rssi || data.wifi || -50),
                protocolo: data.red?.protocolo || 'HTTP/1.1'
              },
              
              // Metadatos
              metadatos: {
                ultimaActualizacion: data.ultimaActualizacion || data.timestamp || new Date().toISOString(),
                ultimaConexion: data.ultimaConexion || new Date().toISOString(),
                version: data.hardware?.version || data.version || '4.0',
                firmware: data.hardware?.firmware || data.firmware || '4.0.1'
              },
              
              // Timestamp
              timestamp: data.timestamp || new Date().toISOString()
            };
            
            postesArray.push(posteInfo);
          });
          
          console.log('Postes cargados en selector:', postesArray.length);
          console.log('Estados detectados:', postesArray.map(p => ({
            id: p.id,
            online: p.estado.online,
            encendido: p.estado.encendido,
            intensidad: p.calculados.intensidadLED
          })));
          
          setPostesDisponibles(postesArray);
          setCargandoDatos(false);
          
        } catch (err) {
          console.error('Error procesando datos del selector:', err);
          setError('Error al procesar los datos');
          setCargandoDatos(false);
        }
      },
      (err) => {
        console.error('Error conectando a Firebase en selector:', err);
        setError('Error de conexión con Firebase');
        setCargandoDatos(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // ===== FUNCIONES DE FILTRADO Y ORDENAMIENTO =====
  const postesFiltrados = useMemo(() => {
    let resultado = [...postesDisponibles];

    // Filtro por zona (si se proporciona)
    if (filtroZona && filtroZona !== 'todas') {
      resultado = resultado.filter(poste => poste.zona === filtroZona);
    }

    // Filtro por búsqueda
    if (busqueda.trim()) {
      const termino = busqueda.toLowerCase().trim();
      resultado = resultado.filter(poste =>
        poste.nombre?.toLowerCase().includes(termino) ||
        poste.id?.toLowerCase().includes(termino) ||
        poste.ubicacion?.toLowerCase().includes(termino) ||
        poste.red?.ip?.includes(termino)
      );
    }

    // Filtro por estado
    if (filtroEstado !== 'todos') {
      resultado = resultado.filter(poste => {
        switch (filtroEstado) {
          case 'online':
            return poste.estado.online === true;
          case 'offline':
            return poste.estado.online !== true;
          case 'encendidos':
            return poste.estado.encendido === true;
          case 'apagados':
            return poste.estado.encendido !== true;
          default:
            return true;
        }
      });
    }

    // Ordenamiento
    resultado.sort((a, b) => {
      switch (ordenarPor) {
        case 'nombre':
          return a.nombre.localeCompare(b.nombre);
        case 'zona':
          return (a.zona || '').localeCompare(b.zona || '');
        case 'estado':
          const estadoA = a.estado.online ? 1 : 0;
          const estadoB = b.estado.online ? 1 : 0;
          return estadoB - estadoA;
        case 'consumo':
          return b.calculados.potenciaActual - a.calculados.potenciaActual;
        case 'intensidad':
          return b.calculados.intensidadLED - a.calculados.intensidadLED;
        default:
          return 0;
      }
    });

    return resultado;
  }, [postesDisponibles, filtroZona, busqueda, filtroEstado, ordenarPor]);

  // ===== ESTADÍSTICAS CALCULADAS =====
  const estadisticas = useMemo(() => {
    const postesSeleccionadosData = postesDisponibles.filter(p => 
      postesSeleccionados.includes(p.id)
    );

    const online = postesSeleccionadosData.filter(p => p.estado.online).length;
    const encendidos = postesSeleccionadosData.filter(p => p.estado.encendido).length;
    
    const consumoTotal = postesSeleccionadosData.reduce((total, poste) => 
      total + poste.calculados.potenciaActual, 0
    );

    const intensidadPromedio = postesSeleccionadosData.length > 0 
      ? postesSeleccionadosData.reduce((sum, poste) => 
          sum + poste.calculados.intensidadLED, 0
        ) / postesSeleccionadosData.length 
      : 0;

    const zonasSeleccionadas = [...new Set(
      postesSeleccionadosData.map(p => p.zona).filter(Boolean)
    )];

    return {
      total: postesSeleccionados.length,
      online,
      encendidos,
      consumoTotal,
      intensidadPromedio,
      zonasSeleccionadas
    };
  }, [postesSeleccionados, postesDisponibles]);

  // ===== MANEJADORES DE EVENTOS =====
  const handleSeleccionTodos = () => {
    const idsPostesFiltrados = postesFiltrados.map(p => p.id);
    const todosSeleccionados = idsPostesFiltrados.every(id => 
      postesSeleccionados.includes(id)
    );

    if (todosSeleccionados) {
      const nuevaSeleccion = postesSeleccionados.filter(id => 
        !idsPostesFiltrados.includes(id)
      );
      onSeleccionChange(nuevaSeleccion);
    } else {
      const nuevaSeleccion = [...new Set([...postesSeleccionados, ...idsPostesFiltrados])];
      onSeleccionChange(nuevaSeleccion);
    }
  };

  const handleSeleccionIndividual = (posteId) => {
    if (modoSeleccion === 'individual') {
      onSeleccionChange([posteId]);
    } else {
      const estaSeleccionado = postesSeleccionados.includes(posteId);
      
      if (estaSeleccionado) {
        onSeleccionChange(postesSeleccionados.filter(id => id !== posteId));
      } else {
        onSeleccionChange([...postesSeleccionados, posteId]);
      }
    }
  };

  const handleSeleccionPorZona = (zona) => {
    const postesZona = postesDisponibles
      .filter(p => p.zona === zona)
      .map(p => p.id);
    
    const todosSeleccionados = postesZona.every(id => 
      postesSeleccionados.includes(id)
    );

    if (todosSeleccionados) {
      const nuevaSeleccion = postesSeleccionados.filter(id => 
        !postesZona.includes(id)
      );
      onSeleccionChange(nuevaSeleccion);
    } else {
      const nuevaSeleccion = [...new Set([...postesSeleccionados, ...postesZona])];
      onSeleccionChange(nuevaSeleccion);
    }
  };

  const handleSeleccionPorEstado = (estado) => {
    const postesConEstado = postesDisponibles.filter(poste => {
      switch (estado) {
        case 'online':
          return poste.estado.online === true;
        case 'offline':
          return poste.estado.online !== true;
        case 'encendidos':
          return poste.estado.encendido === true;
        case 'apagados':
          return poste.estado.encendido !== true;
        default:
          return false;
      }
    }).map(p => p.id);

    const nuevaSeleccion = [...new Set([...postesSeleccionados, ...postesConEstado])];
    onSeleccionChange(nuevaSeleccion);
  };

  const limpiarSeleccion = () => {
    onSeleccionChange([]);
  };

  const zonas = [...new Set(postesDisponibles.map(p => p.zona).filter(Boolean))];

  // ===== COMPONENTES DE RENDERIZADO =====
  const DispositivoCard = ({ poste }) => {
    const estaSeleccionado = postesSeleccionados.includes(poste.id);
    const intensidadPorcentaje = Math.round((poste.calculados.intensidadLED / 255) * 100);

    return (
      <div
        className={`dispositivo-card ${estaSeleccionado ? 'seleccionado' : ''} ${poste.estado.online ? 'online' : 'offline'} ${vistaCompacta ? 'compacta' : ''}`}
        onClick={() => handleSeleccionIndividual(poste.id)}
      >
        <div className="card-header">
          <div className="checkbox-container">
            <input
              type={modoSeleccion === 'individual' ? 'radio' : 'checkbox'}
              checked={estaSeleccionado}
              onChange={() => {}}
              className="dispositivo-checkbox"
            />
            <div className={`estado-indicator ${poste.estado.online ? 'online' : 'offline'}`}></div>
          </div>

          <div className="dispositivo-info">
            <h4 className="dispositivo-nombre" title={poste.nombre}>
              {poste.nombre}
            </h4>
            <div className="dispositivo-meta">
              <span className="device-id" title={poste.id}>
                {poste.id.split('_')[1] || poste.id}
              </span>
              {poste.zona && <span className="zona-tag">📍 {poste.zona}</span>}
            </div>
          </div>

          <div className="estado-visual">
            <div className={`led-indicator ${poste.estado.encendido ? 'encendido' : 'apagado'}`}>
              <div className="led-light"></div>
            </div>
            <div className="intensidad-display">
              <span className="intensidad-valor">{intensidadPorcentaje}%</span>
            </div>
          </div>
        </div>

        <div className="card-body">
          <div className="ubicacion-info">
            <span className="ubicacion-label">📍</span>
            <span className="ubicacion-valor" title={poste.ubicacion}>
              {poste.ubicacion}
            </span>
          </div>

          <div className="barra-intensidad">
            <div className="barra-container">
              <div 
                className="barra-progreso"
                style={{ width: `${intensidadPorcentaje}%` }}
              >
                <div className="barra-brillo"></div>
              </div>
            </div>
            <span className="barra-etiqueta">Intensidad LED ({poste.calculados.intensidadLED}/255)</span>
          </div>

          <div className="metricas-rapidas">
            <div className="metrica">
              <span className="metrica-icono">⚡</span>
              <span className="metrica-valor">{poste.calculados.potenciaActual.toFixed(1)}W</span>
            </div>
            <div className="metrica">
              <span className="metrica-icono">🌐</span>
              <span className="metrica-valor" title={`Puerto: ${poste.red.puerto}`}>
                {poste.red.ip}
              </span>
            </div>
          </div>

          {mostrarDetalles && (
            <div className="detalles-expandidos">
              <div className="detalles-grid">
                <div className="detalle-item">
                  <span className="detalle-label">Última actualización:</span>
                  <span className="detalle-valor">
                    {new Date(poste.metadatos.ultimaActualizacion).toLocaleTimeString('es-ES', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </span>
                </div>
                
                <div className="detalle-item">
                  <span className="detalle-label">MAC Address:</span>
                  <span className="detalle-valor">{poste.red.mac}</span>
                </div>

                <div className="detalle-item">
                  <span className="detalle-label">Firmware:</span>
                  <span className="detalle-valor">v{poste.metadatos.firmware}</span>
                </div>

                <div className="detalle-item">
                  <span className="detalle-label">RSSI WiFi:</span>
                  <span className="detalle-valor">{poste.red.rssi} dBm</span>
                </div>

                <div className="detalle-item">
                  <span className="detalle-label">Voltaje:</span>
                  <span className="detalle-valor">{poste.calculados.voltaje}V</span>
                </div>

                <div className="detalle-item">
                  <span className="detalle-label">Corriente:</span>
                  <span className="detalle-valor">{poste.calculados.corriente.toFixed(2)}A</span>
                </div>
              </div>

              <div className="sensores-estado">
                <span className="sensores-titulo">Estado de sensores:</span>
                <div className="sensores-lista">
                  <div className="sensor-detalle">
                    <span className={`sensor-badge ldr ${poste.sensores.ldr.funcionando ? 'funcionando' : 'error'}`}>
                      💡 LDR
                    </span>
                    <span className="sensor-valor">
                      {poste.sensores.ldr.luxCalculado} lux
                    </span>
                  </div>
                  
                  <div className="sensor-detalle">
                    <span className={`sensor-badge pir ${poste.sensores.pir.funcionando ? 'funcionando' : 'error'}`}>
                      👁️ PIR
                    </span>
                    <span className="sensor-valor">
                      {poste.sensores.pir.contadorHoy} detecciones hoy
                    </span>
                  </div>
                  
                  <div className="sensor-detalle">
                    <span className={`sensor-badge acs ${poste.sensores.acs712.funcionando ? 'funcionando' : 'error'}`}>
                      ⚡ ACS712
                    </span>
                    <span className="sensor-valor">
                      {poste.sensores.acs712.corriente.toFixed(2)}A
                    </span>
                  </div>
                </div>
              </div>

              <div className="estado-dispositivo">
                <span className="estado-titulo">Estado del dispositivo:</span>
                <div className="estados-lista">
                  <span className={`estado-tag conexion ${poste.estado.online ? 'activo' : 'inactivo'}`}>
                    {poste.estado.online ? '🟢 Conectado' : '🔴 Desconectado'}
                  </span>
                  <span className={`estado-tag led ${poste.estado.encendido ? 'activo' : 'inactivo'}`}>
                    {poste.estado.encendido ? '💡 Encendido' : '⚫ Apagado'}
                  </span>
                  <span className={`estado-tag modo ${poste.estado.automatico ? 'activo' : 'inactivo'}`}>
                    {poste.estado.automatico ? '🤖 Automático' : '🎮 Manual'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ===== RENDER PRINCIPAL =====
  if (error) {
    return (
      <div className="selector-dispositivos">
        <div className="error-estado">
          <div className="error-icono">⚠️</div>
          <div className="error-mensaje">
            <h3>Error al cargar dispositivos</h3>
            <p>{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="btn-reintentar"
            >
              🔄 Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="selector-dispositivos">
      {/* Header con controles principales */}
      <div className="selector-header">
        <div className="header-titulo">
          <h3>🎯 Selector de Dispositivos</h3>
          <p>
            {cargandoDatos ? 'Cargando dispositivos...' : 
             `${postesDisponibles.length} dispositivos desde Firebase`
            }
          </p>
        </div>
        
        <div className="header-controles">
          <div className="modo-seleccion">
            <button
              className={`btn-modo ${modoSeleccion === 'multiple' ? 'activo' : ''}`}
              onClick={() => setModoSeleccion('multiple')}
            >
              <span className="btn-icon">☑️</span>
              Múltiple
            </button>
            <button
              className={`btn-modo ${modoSeleccion === 'individual' ? 'activo' : ''}`}
              onClick={() => setModoSeleccion('individual')}
            >
              <span className="btn-icon">🎯</span>
              Individual
            </button>
          </div>

          <div className="vista-controles">
            <button
              className={`btn-vista ${!vistaCompacta ? 'activo' : ''}`}
              onClick={() => setVistaCompacta(false)}
              title="Vista detallada"
            >
              📋
            </button>
            <button
              className={`btn-vista ${vistaCompacta ? 'activo' : ''}`}
              onClick={() => setVistaCompacta(true)}
              title="Vista compacta"
            >
              📄
            </button>
          </div>
        </div>
      </div>

      {/* Indicador de carga */}
      {cargandoDatos && (
        <div className="cargando-estado">
          <div className="cargando-spinner">🔄</div>
          <span>Conectando con Firebase...</span>
        </div>
      )}

      {/* Panel de estadísticas */}
      <div className="panel-estadisticas">
        <div className="estadistica">
          <div className="estadistica-numero">{estadisticas.total}</div>
          <div className="estadistica-label">Seleccionados</div>
        </div>
        <div className="estadistica">
          <div className="estadistica-numero">{estadisticas.online}</div>
          <div className="estadistica-label">Online</div>
        </div>
        <div className="estadistica">
          <div className="estadistica-numero">{estadisticas.encendidos}</div>
          <div className="estadistica-label">Encendidos</div>
        </div>
        <div className="estadistica">
          <div className="estadistica-numero">{estadisticas.consumoTotal.toFixed(1)}W</div>
          <div className="estadistica-label">Consumo total</div>
        </div>
        <div className="estadistica">
          <div className="estadistica-numero">{Math.round(estadisticas.intensidadPromedio)}</div>
          <div className="estadistica-label">Intensidad prom.</div>
        </div>
      </div>

      {/* Controles de filtrado */}
      <div className="controles-filtrado">
        <div className="busqueda-container">
          <input
            type="text"
            placeholder="🔍 Buscar por nombre, ID, IP o ubicación..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="input-busqueda"
          />
          {busqueda && (
            <button
              className="btn-limpiar-busqueda"
              onClick={() => setBusqueda('')}
              title="Limpiar búsqueda"
            >
              ✕
            </button>
          )}
        </div>

        <div className="filtros-container">
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="select-filtro"
          >
            <option value="todos">📊 Todos los estados</option>
            <option value="online">🟢 Solo online</option>
            <option value="offline">🔴 Solo offline</option>
            <option value="encendidos">💡 Solo encendidos</option>
            <option value="apagados">⚫ Solo apagados</option>
          </select>

          <select
            value={ordenarPor}
            onChange={(e) => setOrdenarPor(e.target.value)}
            className="select-filtro"
          >
            <option value="nombre">🔤 Por nombre</option>
            <option value="zona">📍 Por zona</option>
            <option value="estado">🌐 Por estado</option>
            <option value="consumo">⚡ Por consumo</option>
            <option value="intensidad">💡 Por intensidad</option>
          </select>
        </div>
      </div>

      {/* Acciones rápidas */}
      <div className="acciones-rapidas">
        <div className="acciones-grupo">
          <button
            className="btn-accion principal"
            onClick={handleSeleccionTodos}
            disabled={cargandoDatos}
          >
            {postesFiltrados.every(p => postesSeleccionados.includes(p.id)) ? 
              '❌ Deseleccionar filtrados' : 
              '✅ Seleccionar filtrados'
            }
          </button>
          
          <button
            className="btn-accion"
            onClick={limpiarSeleccion}
            disabled={postesSeleccionados.length === 0}
          >
            🗑️ Limpiar selección
          </button>
        </div>

        {zonas.length > 0 && (
          <div className="acciones-zona">
            <span className="acciones-label">Seleccionar por zona:</span>
            <div className="zona-botones">
              {zonas.map(zona => (
                <button
                  key={zona}
                  className="btn-zona"
                  onClick={() => handleSeleccionPorZona(zona)}
                  disabled={cargandoDatos}
                >
                  📍 {zona}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="acciones-estado">
          <span className="acciones-label">Seleccionar por estado:</span>
          <div className="estado-botones">
            <button
              className="btn-estado online"
              onClick={() => handleSeleccionPorEstado('online')}
              disabled={cargandoDatos}
            >
              🟢 Todos online
            </button>
            <button
              className="btn-estado encendidos"
              onClick={() => handleSeleccionPorEstado('encendidos')}
              disabled={cargandoDatos}
            >
              💡 Todos encendidos
            </button>
          </div>
        </div>
      </div>

      {/* Panel de lista */}
      <div className="panel-lista">
        <div className="lista-header">
          <div className="lista-info">
            <span className="lista-contador">
              📋 {postesFiltrados.length} dispositivos
              {busqueda && ` (filtrados de ${postesDisponibles.length})`}
            </span>
          </div>
          
          <div className="lista-controles">
            <button
              className={`btn-toggle ${mostrarDetalles ? 'activo' : ''}`}
              onClick={() => setMostrarDetalles(!mostrarDetalles)}
            >
              {mostrarDetalles ? '🔼 Ocultar detalles' : '🔽 Mostrar detalles'}
            </button>
          </div>
        </div>

        <div className="dispositivos-grid">
          {postesFiltrados.map(poste => (
            <DispositivoCard key={poste.id} poste={poste} />
          ))}
        </div>

        {postesFiltrados.length === 0 && !cargandoDatos && (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <h4>No se encontraron dispositivos</h4>
            <p>
              {busqueda 
                ? 'No hay dispositivos que coincidan con tu búsqueda'
                : 'No hay dispositivos con los filtros aplicados'
              }
            </p>
            {busqueda && (
              <button
                className="btn-limpiar-busqueda"
                onClick={() => setBusqueda('')}
              >
                🗑️ Limpiar búsqueda
              </button>
            )}
          </div>
        )}
      </div>

      {/* Resumen de selección */}
      {postesSeleccionados.length > 0 && (
        <div className="resumen-seleccion">
          <div className="resumen-header">
            <h4>📊 Resumen de Selección</h4>
            <span className="resumen-contador">{estadisticas.total} dispositivos</span>
          </div>
          
          <div className="resumen-contenido">
            <div className="resumen-metricas">
              <div className="metrica-resumen">
                <span className="metrica-icono">🟢</span>
                <span className="metrica-texto">{estadisticas.online} online</span>
              </div>
              <div className="metrica-resumen">
                <span className="metrica-icono">💡</span>
                <span className="metrica-texto">{estadisticas.encendidos} encendidos</span>
              </div>
              <div className="metrica-resumen">
                <span className="metrica-icono">⚡</span>
                <span className="metrica-texto">{estadisticas.consumoTotal.toFixed(1)}W total</span>
              </div>
            </div>

            {estadisticas.zonasSeleccionadas.length > 0 && (
              <div className="resumen-zonas">
                <span className="zonas-label">Zonas seleccionadas:</span>
                <div className="zonas-tags">
                  {estadisticas.zonasSeleccionadas.map(zona => (
                    <span key={zona} className="zona-tag-resumen">📍 {zona}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Información de depuración */}
      {process.env.NODE_ENV === 'development' && postesDisponibles.length > 0 && (
        <div className="debug-info">
          <details>
            <summary>🔧 Información de Debug</summary>
            <div className="debug-contenido">
              <h5>Datos de Firebase cargados:</h5>
              <ul>
                {postesDisponibles.slice(0, 3).map(poste => (
                  <li key={poste.id}>
                    <strong>{poste.nombre}</strong> - 
                    Online: {poste.estado.online ? '✅' : '❌'} - 
                    Encendido: {poste.estado.encendido ? '💡' : '⚫'} - 
                    Intensidad: {poste.calculados.intensidadLED}/255 - 
                    IP: {poste.red.ip}
                  </li>
                ))}
                {postesDisponibles.length > 3 && (
                  <li>... y {postesDisponibles.length - 3} dispositivos más</li>
                )}
              </ul>
            </div>
          </details>
        </div>
      )}

      {/* Ayuda contextual */}
      <div className="ayuda-contextual">
        <div className="ayuda-item">
          <span className="ayuda-icono">💡</span>
          <span className="ayuda-texto">
            {modoSeleccion === 'multiple' 
              ? 'Selecciona múltiples dispositivos para control grupal'
              : 'Selecciona un dispositivo a la vez para control individual'
            }
          </span>
        </div>
        
        <div className="ayuda-item">
          <span className="ayuda-icono">🔍</span>
          <span className="ayuda-texto">
            Usa los filtros para encontrar dispositivos específicos por estado o zona
          </span>
        </div>
        
        <div className="ayuda-item">
          <span className="ayuda-icono">⚡</span>
          <span className="ayuda-texto">
            Los dispositivos offline aparecen atenuados y pueden tener funcionalidad limitada
          </span>
        </div>

        <div className="ayuda-item">
          <span className="ayuda-icono">🔥</span>
          <span className="ayuda-texto">
            Datos en tiempo real desde Firebase • Actualización automática
          </span>
        </div>
      </div>
    </div>
  );
};

export default SelectorDispositivos;