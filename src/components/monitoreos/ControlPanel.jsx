// src/components/MonitoreoControl/components/ControlPanel/ControlPanel.jsx
import React, { useState, useEffect } from 'react';
import { firebaseService } from '../../services/firebaseService';
import { HttpManager } from '../../utils/http';
import './ControlPanel.css';

const ControlPanel = ({ postesSeleccionados, datosEnVivo, modoVisualizacion, onControlGlobal, onError }) => {
  const [intensidadGlobal, setIntensidadGlobal] = useState(0);
  const [modoControl, setModoControl] = useState('manual'); // manual, automatico, programado
  const [controlIndividual, setControlIndividual] = useState({});
  const [cargando, setCargando] = useState(false);
  const [httpManagers, setHttpManagers] = useState({});

  useEffect(() => {
    inicializarControladores();
  }, [postesSeleccionados]);

  useEffect(() => {
    calcularIntensidadPromedio();
  }, [datosEnVivo, postesSeleccionados]);

  const inicializarControladores = () => {
    const managers = {};
    
    postesSeleccionados.forEach(poste => {
      if (poste.red?.ip) {
        managers[poste.id] = new HttpManager(poste.red.ip, poste.red.puerto || 80);
      }
    });
    
    setHttpManagers(managers);
  };

  const calcularIntensidadPromedio = () => {
    if (postesSeleccionados.length === 0) return;
    
    const intensidades = postesSeleccionados.map(poste => {
      const datos = datosEnVivo[poste.id];
      return datos?.calculados?.intensidadLED || 0;
    });
    
    const promedio = Math.round(intensidades.reduce((a, b) => a + b, 0) / intensidades.length);
    setIntensidadGlobal(promedio);
  };

  const handleControlGlobalIntensidad = async (nuevaIntensidad) => {
    setCargando(true);
    setIntensidadGlobal(nuevaIntensidad);
    
    try {
      if (onControlGlobal) {
        await onControlGlobal('intensidad_global', { intensidad: nuevaIntensidad });
      }
      
      // También enviar comandos HTTP directos si están conectados
      const promesasHTTP = Object.entries(httpManagers).map(async ([posteId, manager]) => {
        try {
          const conectado = await manager.testConnection();
          if (conectado) {
            await manager.setLED(nuevaIntensidad);
          }
        } catch (error) {
          console.error(`❌ Error HTTP ${posteId}:`, error);
        }
      });
      
      await Promise.all(promesasHTTP);
      
    } catch (error) {
      console.error('❌ Error en control global:', error);
      if (onError) onError(`Error controlando intensidad: ${error.message}`);
    } finally {
      setCargando(false);
    }
  };

  const handleControlIndividual = async (posteId, intensidad) => {
    setCargando(true);
    
    try {
      // Actualizar estado local inmediatamente
      setControlIndividual(prev => ({
        ...prev,
        [posteId]: intensidad
      }));
      
      // Actualizar en Firebase
      await firebaseService.updateLEDIntensity(posteId, intensidad);
      
      // Enviar comando HTTP directo si está disponible
      const manager = httpManagers[posteId];
      if (manager) {
        try {
          const conectado = await manager.testConnection();
          if (conectado) {
            await manager.setLED(intensidad);
            console.log(`💡 Control HTTP directo ${posteId}: ${intensidad}`);
          } else {
            console.warn(`⚠️ ${posteId} no responde por HTTP`);
          }
        } catch (httpError) {
          console.warn(`⚠️ Error HTTP ${posteId}:`, httpError.message);
        }
      }
      
    } catch (error) {
      console.error(`❌ Error controlando ${posteId}:`, error);
      if (onError) onError(`Error controlando poste ${posteId}: ${error.message}`);
    } finally {
      setCargando(false);
    }
  };

  const handleAccionRapida = (accion) => {
    switch (accion) {
      case 'encender_todos':
        handleControlGlobalIntensidad(255);
        break;
      case 'apagar_todos':
        handleControlGlobalIntensidad(0);
        break;
      case 'intensidad_25':
        handleControlGlobalIntensidad(64);
        break;
      case 'intensidad_50':
        handleControlGlobalIntensidad(128);
        break;
      case 'intensidad_75':
        handleControlGlobalIntensidad(191);
        break;
      case 'modo_automatico':
        toggleModoAutomatico();
        break;
    }
  };

  const toggleModoAutomatico = async () => {
    const nuevoModo = modoControl === 'automatico' ? 'manual' : 'automatico';
    setModoControl(nuevoModo);
    
    if (onControlGlobal) {
      await onControlGlobal('modo_automatico', { habilitado: nuevoModo === 'automatico' });
    }
  };

  const obtenerEstadoPoste = (poste) => {
    const datos = datosEnVivo[poste.id];
    return {
      online: datos?.estado?.online || false,
      encendido: datos?.estado?.encendido || false,
      intensidad: datos?.calculados?.intensidadLED || 0,
      automatico: datos?.automatizacion?.habilitada || false,
      ip: datos?.red?.ip || poste.red?.ip
    };
  };

  const renderControlGlobal = () => (
    <div className="control-global">
      <h3>🎮 Control Global</h3>
      
      <div className="control-intensidad-global">
        <label>Intensidad Global:</label>
        <div className="slider-container">
          <input
            type="range"
            min="0"
            max="255"
            value={intensidadGlobal}
            onChange={(e) => handleControlGlobalIntensidad(parseInt(e.target.value))}
            className="slider-global"
            disabled={cargando}
          />
          <div className="intensidad-valor">
            {intensidadGlobal}/255 ({Math.round((intensidadGlobal/255)*100)}%)
          </div>
        </div>
      </div>

      <div className="acciones-rapidas">
        <h4>Acciones Rápidas:</h4>
        <div className="botones-rapidos">
          <button
            className="btn-accion apagar"
            onClick={() => handleAccionRapida('apagar_todos')}
            disabled={cargando}
          >
            🌑 Apagar Todos
          </button>
          
          <button
            className="btn-accion intensidad-25"
            onClick={() => handleAccionRapida('intensidad_25')}
            disabled={cargando}
          >
            🌘 25%
          </button>
          
          <button
            className="btn-accion intensidad-50"
            onClick={() => handleAccionRapida('intensidad_50')}
            disabled={cargando}
          >
            🌗 50%
          </button>
          
          <button
            className="btn-accion intensidad-75"
            onClick={() => handleAccionRapida('intensidad_75')}
            disabled={cargando}
          >
            🌖 75%
          </button>
          
          <button
            className="btn-accion encender"
            onClick={() => handleAccionRapida('encender_todos')}
            disabled={cargando}
          >
            🌕 Máximo
          </button>
        </div>
      </div>

      <div className="modo-control">
        <h4>Modo de Control:</h4>
        <div className="modo-selector">
          <button
            className={`btn-modo ${modoControl === 'manual' ? 'activo' : ''}`}
            onClick={() => setModoControl('manual')}
          >
            🎮 Manual
          </button>
          
          <button
            className={`btn-modo ${modoControl === 'automatico' ? 'activo' : ''}`}
            onClick={() => handleAccionRapida('modo_automatico')}
          >
            🤖 Automático
          </button>
          
          <button
            className={`btn-modo ${modoControl === 'programado' ? 'activo' : ''}`}
            onClick={() => setModoControl('programado')}
          >
            ⏰ Programado
          </button>
        </div>
      </div>
    </div>
  );

  const renderControlIndividual = () => (
    <div className="control-individual">
      <h3>🔧 Control Individual</h3>
      
      <div className="postes-grid">
        {postesSeleccionados.map(poste => {
          const estado = obtenerEstadoPoste(poste);
          
          return (
            <div key={poste.id} className={`poste-control ${estado.online ? 'online' : 'offline'}`}>
              <div className="poste-header">
                <span className="poste-nombre">{poste.nombre}</span>
                <div className="poste-indicadores">
                  <span className={`indicador-conexion ${estado.online ? 'online' : 'offline'}`}>
                    {estado.online ? '🟢' : '🔴'}
                  </span>
                  <span className={`indicador-estado ${estado.encendido ? 'encendido' : 'apagado'}`}>
                    {estado.encendido ? '💡' : '⚫'}
                  </span>
                  <span className={`indicador-modo ${estado.automatico ? 'auto' : 'manual'}`}>
                    {estado.automatico ? '🤖' : '🎮'}
                  </span>
                </div>
              </div>
              
              <div className="poste-info">
                <div className="info-item">
                  <span className="info-label">IP:</span>
                  <span className="info-valor">{estado.ip || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Zona:</span>
                  <span className="info-valor">{poste.zona || 'N/A'}</span>
                </div>
              </div>
              
              <div className="poste-control-slider">
                <label>Intensidad: {estado.intensidad}/255</label>
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={controlIndividual[poste.id] ?? estado.intensidad}
                  onChange={(e) => {
                    const nuevaIntensidad = parseInt(e.target.value);
                    setControlIndividual(prev => ({
                      ...prev,
                      [poste.id]: nuevaIntensidad
                    }));
                  }}
                  onMouseUp={(e) => {
                    const nuevaIntensidad = parseInt(e.target.value);
                    handleControlIndividual(poste.id, nuevaIntensidad);
                  }}
                  className="slider-individual"
                  disabled={cargando || !estado.online}
                />
                <div className="intensidad-porcentaje">
                  {Math.round(((controlIndividual[poste.id] ?? estado.intensidad)/255)*100)}%
                </div>
              </div>
              
              <div className="poste-acciones">
                <button
                  className="btn-poste-accion apagar"
                  onClick={() => handleControlIndividual(poste.id, 0)}
                  disabled={cargando || !estado.online}
                >
                  🌑
                </button>
                <button
                  className="btn-poste-accion medio"
                  onClick={() => handleControlIndividual(poste.id, 128)}
                  disabled={cargando || !estado.online}
                >
                  🌗
                </button>
                <button
                  className="btn-poste-accion encender"
                  onClick={() => handleControlIndividual(poste.id, 255)}
                  disabled={cargando || !estado.online}
                >
                  🌕
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="control-panel">
      <div className="panel-header">
        <h2>🎛️ Panel de Control</h2>
        <div className="panel-stats">
          <span className="stat">📊 {postesSeleccionados.length} seleccionados</span>
          <span className="stat">💡 Promedio: {Math.round((intensidadGlobal/255)*100)}%</span>
        </div>
      </div>

      {cargando && (
        <div className="carga-overlay">
          <div className="carga-spinner"></div>
          <span>🔄 Enviando comandos...</span>
        </div>
      )}

      <div className="panel-contenido">
        {modoVisualizacion === 'global' || modoVisualizacion === 'grupal' ? 
          renderControlGlobal() : 
          renderControlIndividual()
        }
      </div>
    </div>
  );
};

export default ControlPanel;