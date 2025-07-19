// src/components/MonitoreoControl/MonitoreoController.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import SelectorDispositivos from './components/SelectorDispositivos/SelectorDispositivos';
import MonitorTiempoReal from './components/MonitorTiempoReal/MonitorTiempoReal';
import ControlPanel from './components/ControlPanel/ControlPanel';
import EstadisticasPanel from './components/EstadisticasPanel/EstadisticasPanel';
import HistorialEventos from './components/HistorialEventos/HistorialEventos';
import './MonitoreoController.css';

const MonitoreoController = () => {
  // ===== ESTADOS PRINCIPALES =====
  const [postesSeleccionados, setPostesSeleccionados] = useState([]);
  const [datosEnVivo, setDatosEnVivo] = useState({});
  const [vistaActiva, setVistaActiva] = useState('selector');
  const [actualizacionAutomatica, setActualizacionAutomatica] = useState(true);
  const [filtroZona, setFiltroZona] = useState(null);
  const [modoVisualizacion, setModoVisualizacion] = useState('global');
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);

  // ===== FUNCIÓN DE MAPEO DE DATOS =====
  const mapearDatosPoste = useCallback((data, posteId) => {
    // DETECCIÓN DE ESTADO ONLINE
    const isOnline = data.online === true || 
                    data.estado?.online === true || 
                    data.conectado === true ||
                    data.activo === true ||
                    data.control?.online === true ||
                    (data.ultimaConexion && 
                     new Date() - new Date(data.ultimaConexion) < 300000);
    
    // DETECCIÓN DE INTENSIDAD LED
    const intensidadActual = Number(
      data.control?.intensidad ||
      data.control?.intensidadLED ||
      data.calculados?.intensidadLED ||
      data.intensidadLED ||
      data.intensidad ||
      data.brillo ||
      0
    );
    
    // DETECCIÓN DE ESTADO ENCENDIDO
    const isEncendido = data.encendido === true ||
                       data.estado?.encendido === true ||
                       data.ledEncendido === true ||
                       data.ledState === true ||
                       data.ledStatus === 'ON' ||
                       data.control?.encendido === true ||
                       data.control?.ledEncendido === true ||
                       intensidadActual > 0;
    
    // DETECCIÓN DE MODO AUTOMÁTICO
    const isAutomatico = data.automatizacion?.habilitada === true || 
                        data.modoAutomatico === true || 
                        data.autoMode === true ||
                        data.control?.automatico === true ||
                        data.automatico === true;

    return {
      // Información básica
      id: posteId,
      nombre: data.nombre || `Poste ${posteId.split('_')[1] || posteId}`,
      ubicacion: data.ubicacion || 'Ubicación no especificada',
      zona: data.zona || 'Villa Adela Norte',
      
      // Estado actual
      estado: {
        online: isOnline,
        encendido: isEncendido,
        automatico: isAutomatico,
        activo: data.activo !== false,
        deshabilitado: data.deshabilitado === true
      },
      
      // Datos calculados
      calculados: {
        intensidadLED: intensidadActual,
        potenciaActual: Number(
          data.calculados?.potenciaActual ||
          data.calculados?.consumo ||
          data.potenciaActual ||
          data.consumoActual ||
          data.potencia ||
          data.control?.consumo ||
          data.control?.potencia ||
          0
        ),
        consumoHoy: Number(
          data.calculados?.consumoHoy ||
          data.consumoHoy ||
          data.consumo ||
          data.control?.consumoHoy ||
          0
        ),
        costoHoy: Number(
          data.calculados?.costoHoy ||
          data.costoHoy ||
          data.costo ||
          0
        ),
        corriente: Number(
          data.calculados?.corriente ||
          data.corriente ||
          data.control?.corriente ||
          data.sensores?.acs712?.corriente ||
          0
        ),
        voltaje: Number(
          data.calculados?.voltaje ||
          data.voltaje ||
          data.control?.voltaje ||
          data.sensores?.acs712?.voltaje ||
          220
        ),
        eficienciaHoy: Number(
          data.calculados?.eficiencia ||
          data.eficienciaHoy ||
          data.eficiencia ||
          85
        ),
        encendidosHoy: Number(
          data.calculados?.encendidosHoy ||
          data.encendidosHoy ||
          data.contadorEncendidos ||
          0
        ),
        tiempoEncendidoHoy: Number(
          data.calculados?.tiempoEncendidoHoy ||
          data.tiempoEncendidoHoy ||
          data.tiempoEncendido ||
          0
        )
      },
      
      // Sensores
      sensores: {
        ldr: {
          funcionando: data.sensores?.ldr?.funcionando !== false,
          valor: Number(
            data.sensores?.ldr?.valor ||
            data.ldr ||
            data.valorLDR ||
            data.control?.ldr ||
            500
          ),
          luxCalculado: Number(
            data.sensores?.ldr?.luxCalculado ||
            data.luxCalculado ||
            data.lux ||
            data.control?.lux ||
            200
          )
        },
        pir: {
          funcionando: data.sensores?.pir?.funcionando !== false,
          movimiento: data.sensores?.pir?.movimiento === true || 
                     data.movimiento === true ||
                     data.control?.movimiento === true ||
                     data.pirDetectado === true,
          detecciones: Number(
            data.sensores?.pir?.detecciones ||
            data.pirDetecciones ||
            data.control?.pirDetecciones ||
            0
          ),
          contadorHoy: Number(
            data.sensores?.pir?.contadorHoy ||
            data.pirContadorHoy ||
            data.deteccionesHoy ||
            data.control?.deteccionesHoy ||
            0
          )
        },
        acs712: {
          funcionando: data.sensores?.acs712?.funcionando !== false,
          corriente: Number(
            data.sensores?.acs712?.corriente ||
            data.corriente ||
            data.amperaje ||
            data.control?.corriente ||
            0
          ),
          voltaje: Number(
            data.sensores?.acs712?.voltaje ||
            data.voltaje ||
            data.control?.voltaje ||
            220
          )
        }
      },
      
      // Automatización
      automatizacion: {
        habilitada: isAutomatico,
        programaciones: data.automatizacion?.programaciones || [],
        sensoresActivos: data.automatizacion?.sensoresActivos !== false
      },
      
      // Red
      red: {
        ip: data.red?.ip || data.ip || '192.168.1.100',
        puerto: Number(data.red?.puerto || data.puerto || 80),
        mac: data.red?.mac || data.mac || '00:00:00:00:00:00',
        rssi: Number(data.red?.rssi || data.rssi || data.wifi || -50),
        latencia: Number(data.red?.latencia || data.latencia || Math.random() * 100)
      },
      
      // Metadatos
      metadatos: {
        ultimaActualizacion: data.ultimaActualizacion || data.timestamp || new Date().toISOString(),
        version: data.hardware?.version || data.version || '4.0',
        firmware: data.hardware?.firmware || data.firmware || '4.0.1'
      },
      
      // Timestamp
      timestamp: data.timestamp || new Date().toISOString()
    };
  }, []);

  // ===== CARGAR DATOS DE FIREBASE =====
  useEffect(() => {
    setCargando(true);
    setError(null);

    console.log('🔥 Iniciando conexión con Firebase...');

    const unsubscribe = onSnapshot(
      collection(db, 'postes'),
      (snapshot) => {
        try {
          const nuevosDatos = {};
          
          snapshot.forEach((doc) => {
            const data = doc.data();
            const posteId = doc.id;
            
            console.log(`📡 Procesando ${posteId}:`, {
              online: data.online || data.estado?.online,
              intensidad: data.intensidadLED || data.intensidad || data.control?.intensidad,
              encendido: data.encendido || data.estado?.encendido
            });
            
            // Mapear datos del poste
            nuevosDatos[posteId] = mapearDatosPoste(data, posteId);
          });
          
          console.log(`✅ ${Object.keys(nuevosDatos).length} postes cargados desde Firebase`);
          
          setDatosEnVivo(nuevosDatos);
          setUltimaActualizacion(new Date().toISOString());
          setCargando(false);
          
        } catch (err) {
          console.error('❌ Error procesando datos:', err);
          setError('Error al procesar los datos de Firebase');
          setCargando(false);
        }
      },
      (err) => {
        console.error('❌ Error de conexión Firebase:', err);
        setError('Error de conexión con Firebase');
        setCargando(false);
      }
    );

    return () => {
      console.log('🔌 Desconectando de Firebase...');
      unsubscribe();
    };
  }, [mapearDatosPoste]);

  // ===== DATOS CALCULADOS =====
  const postesDisponibles = useMemo(() => {
    return Object.values(datosEnVivo);
  }, [datosEnVivo]);

  const postesFiltrados = useMemo(() => {
    if (!filtroZona || filtroZona === 'todas') {
      return postesDisponibles;
    }
    return postesDisponibles.filter(poste => poste.zona === filtroZona);
  }, [postesDisponibles, filtroZona]);

  const zonasDisponibles = useMemo(() => {
    const zonas = [...new Set(postesDisponibles.map(p => p.zona).filter(Boolean))];
    return zonas.sort();
  }, [postesDisponibles]);

  const estadisticasGlobales = useMemo(() => {
    const stats = {
      total: postesDisponibles.length,
      online: postesDisponibles.filter(p => p.estado.online).length,
      encendidos: postesDisponibles.filter(p => p.estado.encendido).length,
      automaticos: postesDisponibles.filter(p => p.estado.automatico).length
    };
    
    stats.porcentajeOnline = stats.total > 0 ? Math.round((stats.online / stats.total) * 100) : 0;
    stats.porcentajeEncendidos = stats.total > 0 ? Math.round((stats.encendidos / stats.total) * 100) : 0;
    
    return stats;
  }, [postesDisponibles]);

  // ===== MANEJADORES DE EVENTOS =====
  const handleSeleccionChange = useCallback((nuevaSeleccion) => {
    console.log('🎯 Selección actualizada:', nuevaSeleccion);
    setPostesSeleccionados(nuevaSeleccion);
  }, []);

  const handleControlGlobal = useCallback(async (tipo, parametros) => {
    console.log('🎮 Control global:', tipo, parametros);
    
    try {
      // Aquí implementarías la lógica de control global
      switch (tipo) {
        case 'intensidad_global':
          console.log(`💡 Configurando intensidad global: ${parametros.intensidad}`);
          break;
        case 'modo_automatico':
          console.log(`🤖 Cambiando modo automático: ${parametros.habilitado}`);
          break;
        default:
          console.log(`❓ Comando no reconocido: ${tipo}`);
      }
      
    } catch (error) {
      console.error('❌ Error en control global:', error);
      setError(`Error en control global: ${error.message}`);
    }
  }, []);

  const handleError = useCallback((mensaje) => {
    console.error('❌ Error:', mensaje);
    setError(mensaje);
    
    // Auto-limpiar error después de 5 segundos
    setTimeout(() => {
      setError(null);
    }, 5000);
  }, []);

  const handleToggleActualizacion = useCallback(() => {
    const nuevoEstado = !actualizacionAutomatica;
    setActualizacionAutomatica(nuevoEstado);
    console.log(`🔄 Actualización automática: ${nuevoEstado ? 'ACTIVADA' : 'DESACTIVADA'}`);
  }, [actualizacionAutomatica]);

  // ===== COMPONENTES DE RENDERIZADO =====
  const renderNavegacion = () => (
    <div className="navegacion-principal">
      <div className="nav-botones">
        <button
          className={`nav-btn ${vistaActiva === 'selector' ? 'activo' : ''}`}
          onClick={() => setVistaActiva('selector')}
        >
          🎯 Selector
        </button>
        <button
          className={`nav-btn ${vistaActiva === 'monitor' ? 'activo' : ''}`}
          onClick={() => setVistaActiva('monitor')}
          disabled={postesSeleccionados.length === 0}
        >
          📡 Monitor
        </button>
        <button
          className={`nav-btn ${vistaActiva === 'control' ? 'activo' : ''}`}
          onClick={() => setVistaActiva('control')}
          disabled={postesSeleccionados.length === 0}
        >
          🎮 Control
        </button>
        <button
          className={`nav-btn ${vistaActiva === 'estadisticas' ? 'activo' : ''}`}
          onClick={() => setVistaActiva('estadisticas')}
        >
          📊 Estadísticas
        </button>
        <button
          className={`nav-btn ${vistaActiva === 'historial' ? 'activo' : ''}`}
          onClick={() => setVistaActiva('historial')}
          disabled={postesSeleccionados.length === 0}
        >
          📋 Historial
        </button>
      </div>
      
      <div className="nav-controles">
        {zonasDisponibles.length > 0 && (
          <select
            value={filtroZona || 'todas'}
            onChange={(e) => setFiltroZona(e.target.value === 'todas' ? null : e.target.value)}
            className="filtro-zona"
          >
            <option value="todas">📍 Todas las zonas</option>
            {zonasDisponibles.map(zona => (
              <option key={zona} value={zona}>📍 {zona}</option>
            ))}
          </select>
        )}
        
        <button
          className={`btn-actualizacion ${actualizacionAutomatica ? 'activo' : ''}`}
          onClick={handleToggleActualizacion}
          title={actualizacionAutomatica ? 'Pausar actualización' : 'Reanudar actualización'}
        >
          {actualizacionAutomatica ? '⏸️' : '▶️'}
        </button>
      </div>
    </div>
  );

  const renderEstadoConexion = () => (
    <div className="estado-conexion-global">
      <div className="conexion-info">
        <span className={`estado-firebase ${cargando ? 'cargando' : error ? 'error' : 'conectado'}`}>
          {cargando ? '🔄 Conectando...' : error ? '❌ Error' : '🔥 Firebase'}
        </span>
        
        <span className="dispositivos-info">
          📱 {estadisticasGlobales.total} dispositivos
        </span>
        
        <span className="online-info">
          🟢 {estadisticasGlobales.online} online ({estadisticasGlobales.porcentajeOnline}%)
        </span>
        
        <span className="seleccionados-info">
          🎯 {postesSeleccionados.length} seleccionados
        </span>
        
        {ultimaActualizacion && (
          <span className="ultima-actualizacion">
            🕐 {new Date(ultimaActualizacion).toLocaleTimeString('es-ES', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            })}
          </span>
        )}
      </div>
    </div>
  );

  const renderContenidoPrincipal = () => {
    if (error) {
      return (
        <div className="error-global">
          <div className="error-icono">⚠️</div>
          <div className="error-mensaje">
            <h3>Error de Conexión</h3>
            <p>{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="btn-reintentar"
            >
              🔄 Reintentar
            </button>
          </div>
        </div>
      );
    }

    switch (vistaActiva) {
      case 'selector':
        return (
          <SelectorDispositivos
            postesSeleccionados={postesSeleccionados}
            onSeleccionChange={handleSeleccionChange}
            filtroZona={filtroZona}
          />
        );
        
      case 'monitor':
        return (
          <MonitorTiempoReal
            postesSeleccionados={postesSeleccionados}
            datosEnVivo={datosEnVivo}
            actualizacionAutomatica={actualizacionAutomatica}
          />
        );
        
      case 'control':
        return (
          <ControlPanel
            postesSeleccionados={postesSeleccionados}
            modoVisualizacion={modoVisualizacion}
            onControlGlobal={handleControlGlobal}
            onError={handleError}
          />
        );
        
      case 'estadisticas':
        return (
          <EstadisticasPanel
            filtroZona={filtroZona}
          />
        );
        
      case 'historial':
        return (
          <HistorialEventos
            postesSeleccionados={postesSeleccionados}
            datosEnVivo={datosEnVivo}
            filtroZona={filtroZona}
          />
        );
        
      default:
        return null;
    }
  };

  // ===== RENDER PRINCIPAL =====
  return (
    <div className="monitoreo-controller">
      <div className="controller-header">
        <div className="header-titulo">
          <h1>🏠 Sistema de Monitoreo y Control</h1>
          <p>Gestión inteligente de iluminación pública en tiempo real</p>
        </div>
        
        {renderEstadoConexion()}
      </div>

      {renderNavegacion()}

      <div className="controller-contenido">
        {renderContenidoPrincipal()}
      </div>

      {/* Footer con información adicional */}
      <div className="controller-footer">
        <div className="footer-info">
          <span>🔥 Firebase: Tiempo real</span>
          <span>📍 Zonas: {zonasDisponibles.length}</span>
          <span>🎯 Seleccionados: {postesSeleccionados.length}</span>
          <span>🔄 Auto-actualización: {actualizacionAutomatica ? 'ON' : 'OFF'}</span>
          <span>📋 Vista: {vistaActiva}</span>
        </div>
      </div>

      {/* Debug info en desarrollo */}
      {process.env.NODE_ENV === 'development' && (
        <div className="debug-controller">
          <details>
            <summary>🔧 Debug Controller</summary>
            <div className="debug-contenido">
              <h5>Estado del Controller:</h5>
              <ul>
                <li>Vista activa: {vistaActiva}</li>
                <li>Datos cargados: {Object.keys(datosEnVivo).length}</li>
                <li>Postes seleccionados: {postesSeleccionados.length}</li>
                <li>Filtro zona: {filtroZona || 'Todas'}</li>
                <li>Actualización automática: {actualizacionAutomatica ? 'Sí' : 'No'}</li>
                <li>Última actualización: {ultimaActualizacion || 'N/A'}</li>
              </ul>
              
              <h5>Estadísticas rápidas:</h5>
              <ul>
                <li>Total dispositivos: {estadisticasGlobales.total}</li>
                <li>Online: {estadisticasGlobales.online} ({estadisticasGlobales.porcentajeOnline}%)</li>
                <li>Encendidos: {estadisticasGlobales.encendidos} ({estadisticasGlobales.porcentajeEncendidos}%)</li>
                <li>Automáticos: {estadisticasGlobales.automaticos}</li>
                <li>Zonas disponibles: {zonasDisponibles.join(', ')}</li>
              </ul>
              
              <h5>Postes seleccionados:</h5>
              <ul>
                {postesSeleccionados.map(id => (
                  <li key={id}>
                    {id}: {datosEnVivo[id]?.nombre} - {datosEnVivo[id]?.estado?.online ? 'Online' : 'Offline'}
                  </li>
                ))}
              </ul>
            </div>
          </details>
        </div>
      )}
    </div>
  );
};

export default MonitoreoController;