// src/components/GestionUnidades/MapeoDispositivos/MapeoDispositivos.jsx
import React, { useState } from 'react';
import MapaVisualizacion from './MapaVisualizacion';
import './MapeoDispositivos.css';

const MapeoDispositivos = () => {
  const [posteSeleccionado, setPosteSeleccionado] = useState(null);
  const [vistaActual, setVistaActual] = useState('mapa'); // 'mapa', 'lista', 'estadisticas'

  const handlePosteSeleccionado = (poste) => {
    console.log('🏙️ Poste seleccionado en módulo:', poste);
    setPosteSeleccionado(poste);
    
    // Aquí puedes agregar lógica adicional:
    // - Navegar a página de detalles
    // - Mostrar modal con información
    // - Actualizar estado global
  };

  const cambiarVista = (nuevaVista) => {
    setVistaActual(nuevaVista);
  };

  return (
    <div className="mapeo-dispositivos-container">
      {/* Header del módulo */}
      <div className="mapeo-header">
        <div className="header-info">
          <h1>🗺️ Mapeo de Dispositivos</h1>
          <p>Sistema de visualización y gestión de postes de alumbrado público</p>
        </div>
        
        <div className="header-controles">
          <div className="vista-selector">
            <button 
              className={`vista-btn ${vistaActual === 'mapa' ? 'activo' : ''}`}
              onClick={() => cambiarVista('mapa')}
            >
              🗺️ Mapa
            </button>
            <button 
              className={`vista-btn ${vistaActual === 'lista' ? 'activo' : ''}`}
              onClick={() => cambiarVista('lista')}
            >
              📋 Lista
            </button>
            <button 
              className={`vista-btn ${vistaActual === 'estadisticas' ? 'activo' : ''}`}
              onClick={() => cambiarVista('estadisticas')}
            >
              📊 Estadísticas
            </button>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="mapeo-contenido">
        {vistaActual === 'mapa' && (
          <div className="vista-mapa">
            <MapaVisualizacion
              altura="calc(100vh - 200px)"
              mostrarControles={true}
              mostrarFiltros={true}
              onPosteSeleccionado={handlePosteSeleccionado}
              className="mapa-principal"
            />
          </div>
        )}

        {vistaActual === 'lista' && (
          <div className="vista-lista">
            <div className="lista-placeholder">
              <h3>📋 Vista de Lista</h3>
              <p>Aquí irá la vista de lista de dispositivos</p>
              <p>Puedes integrar tu componente ListaDispositivos.jsx existente</p>
            </div>
          </div>
        )}

        {vistaActual === 'estadisticas' && (
          <div className="vista-estadisticas">
            <div className="estadisticas-placeholder">
              <h3>📊 Vista de Estadísticas</h3>
              <p>Aquí irán los gráficos y métricas del sistema</p>
              <p>Puedes agregar charts con recharts o tu librería preferida</p>
            </div>
          </div>
        )}
      </div>

      {/* Panel lateral si hay poste seleccionado */}
      {posteSeleccionado && (
        <div className="panel-lateral">
          <div className="panel-header">
            <h4>📱 {posteSeleccionado.nombre || posteSeleccionado.id}</h4>
            <button 
              className="btn-cerrar-panel"
              onClick={() => setPosteSeleccionado(null)}
            >
              ✕
            </button>
          </div>
          
          <div className="panel-contenido">
            <div className="info-basica">
              <p><strong>🌐 IP:</strong> {posteSeleccionado.red?.ip}</p>
              <p><strong>📍 Ubicación:</strong> {posteSeleccionado.ubicacion}</p>
              <p><strong>🏘️ Zona:</strong> {posteSeleccionado.zona}</p>
              <p><strong>⚡ Estado:</strong> 
                <span className={`estado ${posteSeleccionado.estado?.online ? 'online' : 'offline'}`}>
                  {posteSeleccionado.estado?.online ? ' 🟢 Online' : ' 🔴 Offline'}
                </span>
              </p>
              <p><strong>💡 LED:</strong> {posteSeleccionado.control?.intensidadLED || 0}%</p>
            </div>
            
            <div className="panel-acciones">
              <button className="btn-accion-secundaria">
                📊 Ver Estadísticas
              </button>
              <button className="btn-accion-primaria">
                ⚙️ Configurar
              </button>
              <button className="btn-accion-secundaria">
                🔧 Mantenimiento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapeoDispositivos;