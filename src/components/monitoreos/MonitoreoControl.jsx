// src/components/MonitoreoControl/MonitoreoControl.jsx
import React, { useState, useEffect } from 'react';
import { firebaseService } from '../../services/firebaseService';
import ControlPanel from './ControlPanel';
import EstadisticasPanel from './EstadísticasPanel';
import MonitorTiempoReal from './MonitorTiempoReal';
import SelectorDispositivos from './SelectorDispositivos';
import HistorialEventos from './HistorialEventos';
import './MonitoreoControl.css';

const MonitoreoControl = () => {
  const [postesActivos, setPostesActivos] = useState([]);
  const [postesSeleccionados, setPostesSeleccionados] = useState([]);
  const [estadisticasGlobales, setEstadisticasGlobales] = useState({});
  const [modoVisualizacion, setModoVisualizacion] = useState('individual'); // individual, grupal, global
  const [filtroZona, setFiltroZona] = useState('todas');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [actualizacionAutomatica, setActualizacionAutomatica] = useState(true);

  // Estados para tiempo real
  const [datosEnVivo, setDatosEnVivo] = useState({});
  const [suscripciones, setSuscripciones] = useState([]);

  useEffect(() => {
    inicializarMonitoreo();
    return () => limpiarSuscripciones();
  }, []);

  useEffect(() => {
    if (actualizacionAutomatica) {
      configurarSuscripcionesTimeReal();
    } else {
      limpiarSuscripciones();
    }
  }, [postesActivos, actualizacionAutomatica]);

  const inicializarMonitoreo = async () => {
    setCargando(true);
    setError('');
    
    try {
      console.log('🚀 Inicializando módulo de Monitoreo y Control...');
      
      // 1. Cargar postes activos
      const postes = await firebaseService.getActivePostes();
      setPostesActivos(postes);
      
      // 2. Seleccionar todos por defecto
      setPostesSeleccionados(postes.map(p => p.id));
      
      // 3. Cargar estadísticas globales
      const stats = await firebaseService.getSystemStats();
      setEstadisticasGlobales(stats);
      
      console.log(`✅ Monitoreo inicializado: ${postes.length} postes activos`);
      
    } catch (error) {
      console.error('❌ Error inicializando monitoreo:', error);
      setError('Error cargando datos del sistema');
    } finally {
      setCargando(false);
    }
  };

  const configurarSuscripcionesTimeReal = () => {
    limpiarSuscripciones();
    
    const nuevasSuscripciones = [];
    
    // Suscribirse a cada poste seleccionado
    postesActivos.forEach(poste => {
      if (postesSeleccionados.includes(poste.id)) {
        const unsubscribe = firebaseService.subscribeToPoste(poste.id, (datos) => {
          if (datos) {
            setDatosEnVivo(prev => ({
              ...prev,
              [poste.id]: datos
            }));
          }
        });
        
        nuevasSuscripciones.push(unsubscribe);
      }
    });
    
    // Suscribirse a configuración del sistema
    const unsubscribeSystem = firebaseService.subscribeToSystemConfig((config) => {
      if (config?.estadisticas) {
        setEstadisticasGlobales(config.estadisticas);
      }
    });
    
    nuevasSuscripciones.push(unsubscribeSystem);
    setSuscripciones(nuevasSuscripciones);
  };

  const limpiarSuscripciones = () => {
    suscripciones.forEach(unsubscribe => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
    setSuscripciones([]);
  };

  const handleSeleccionPostes = (postesIds) => {
    setPostesSeleccionados(postesIds);
  };

  const handleCambioZona = (zona) => {
    setFiltroZona(zona);
    
    if (zona === 'todas') {
      setPostesSeleccionados(postesActivos.map(p => p.id));
    } else {
      const postesFiltrados = postesActivos.filter(p => p.zona === zona);
      setPostesSeleccionados(postesFiltrados.map(p => p.id));
    }
  };

  const handleControlGlobal = async (accion, parametros = {}) => {
    try {
      console.log(`🎮 Control global: ${accion}`, parametros);
      
      switch (accion) {
        case 'encender_todos':
          await controlarTodosLosPostes(255);
          break;
        case 'apagar_todos':
          await controlarTodosLosPostes(0);
          break;
        case 'intensidad_global':
          await controlarTodosLosPostes(parametros.intensidad);
          break;
        case 'modo_automatico':
          await configurarModoAutomatico(parametros.habilitado);
          break;
        default:
          console.warn('Acción no reconocida:', accion);
      }
    } catch (error) {
      console.error('❌ Error en control global:', error);
      setError(`Error ejecutando ${accion}: ${error.message}`);
    }
  };

  const controlarTodosLosPostes = async (intensidad) => {
    const promesas = postesSeleccionados.map(async (posteId) => {
      try {
        await firebaseService.updateLEDIntensity(posteId, intensidad);
        return { posteId, success: true };
      } catch (error) {
        console.error(`❌ Error controlando ${posteId}:`, error);
        return { posteId, success: false, error: error.message };
      }
    });
    
    const resultados = await Promise.all(promesas);
    const exitosos = resultados.filter(r => r.success).length;
    const fallidos = resultados.filter(r => !r.success).length;
    
    console.log(`📊 Control masivo: ${exitosos} exitosos, ${fallidos} fallidos`);
    
    if (fallidos > 0) {
      setError(`${fallidos} dispositivos no pudieron ser controlados`);
    }
  };

  const configurarModoAutomatico = async (habilitado) => {
    const promesas = postesSeleccionados.map(async (posteId) => {
      try {
        await firebaseService.updateDoc(`postes/${posteId}`, {
          'automatizacion.habilitada': habilitado,
          'control.modoManual': !habilitado,
          'metadatos.ultimaActualizacion': new Date().toISOString()
        });
        return { posteId, success: true };
      } catch (error) {
        return { posteId, success: false, error: error.message };
      }
    });
    
    await Promise.all(promesas);
  };

  const obtenerPostesVisibles = () => {
    let postesFiltrados = postesActivos;
    
    if (filtroZona !== 'todas') {
      postesFiltrados = postesFiltrados.filter(p => p.zona === filtroZona);
    }
    
    return postesFiltrados.filter(p => postesSeleccionados.includes(p.id));
  };

  if (cargando) {
    return (
      <div className="monitoreo-loading">
        <div className="loading-spinner"></div>
        <p>🔄 Cargando sistema de monitoreo...</p>
      </div>
    );
  }

  return (
    <div className="monitoreo-control">
      {/* Header de Control */}
      <div className="monitoreo-header">
        <div className="header-info">
          <h1>📊 Monitoreo y Control de Alumbrado</h1>
          <div className="stats-quick">
            <span className="stat-item">
              📍 {postesActivos.length} Postes Activos
            </span>
            <span className="stat-item">
              🟢 {estadisticasGlobales.online || 0} Online
            </span>
            <span className="stat-item">
              💡 {estadisticasGlobales.encendidos || 0} Encendidos
            </span>
            <span className="stat-item">
              ⚡ {(estadisticasGlobales.consumoTotal || 0).toFixed(2)} kWh
            </span>
          </div>
        </div>
        
        <div className="header-controls">
          <div className="modo-visualizacion">
            <label>Vista:</label>
            <select 
              value={modoVisualizacion} 
              onChange={(e) => setModoVisualizacion(e.target.value)}
              className="select-modo"
            >
              <option value="individual">Individual</option>
              <option value="grupal">Por Grupos</option>
              <option value="global">Global</option>
            </select>
          </div>
          
          <div className="filtro-zona">
            <label>Zona:</label>
            <select 
              value={filtroZona} 
              onChange={(e) => handleCambioZona(e.target.value)}
              className="select-zona"
            >
              <option value="todas">Todas</option>
              <option value="Norte">Norte</option>
              <option value="Sur">Sur</option>
              <option value="Centro">Centro</option>
              <option value="Este">Este</option>
              <option value="Oeste">Oeste</option>
            </select>
          </div>
          
          <button
            className={`btn-tiempo-real ${actualizacionAutomatica ? 'activo' : ''}`}
            onClick={() => setActualizacionAutomatica(!actualizacionAutomatica)}
          >
            {actualizacionAutomatica ? '⏸️ Pausar' : '▶️ Tiempo Real'}
          </button>
          
          <button
            className="btn-actualizar"
            onClick={inicializarMonitoreo}
          >
            🔄 Actualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <span className="error-text">{error}</span>
          <button 
            className="error-close"
            onClick={() => setError('')}
          >
            ✕
          </button>
        </div>
      )}

      {/* Grid Principal */}
      <div className="monitoreo-grid">
        {/* Panel de Control Principal */}
        <div className="grid-item control-principal">
          <ControlPanel
            postesSeleccionados={obtenerPostesVisibles()}
            datosEnVivo={datosEnVivo}
            modoVisualizacion={modoVisualizacion}
            onControlGlobal={handleControlGlobal}
            onError={setError}
          />
        </div>

        {/* Monitor en Tiempo Real */}
        <div className="grid-item monitor-tiempo-real">
          <MonitorTiempoReal
            postes={obtenerPostesVisibles()}
            datosEnVivo={datosEnVivo}
            actualizacionAutomatica={actualizacionAutomatica}
          />
        </div>

        {/* Estadísticas */}
        <div className="grid-item estadisticas">
          <EstadisticasPanel
            postes={obtenerPostesVisibles()}
            datosEnVivo={datosEnVivo}
            estadisticasGlobales={estadisticasGlobales}
            filtroZona={filtroZona}
          />
        </div>

        {/* Selector de Dispositivos */}
        <div className="grid-item selector-dispositivos">
          <SelectorDispositivos
            postesDisponibles={postesActivos}
            postesSeleccionados={postesSeleccionados}
            onSeleccionChange={handleSeleccionPostes}
            filtroZona={filtroZona}
            datosEnVivo={datosEnVivo}
          />
        </div>

        {/* Historial */}
        <div className="grid-item historial">
          <HistorialEventos
            postes={obtenerPostesVisibles()}
            filtroZona={filtroZona}
          />
        </div>
      </div>
    </div>
  );
};

export default MonitoreoControl;