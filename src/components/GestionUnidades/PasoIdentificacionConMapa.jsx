// src/components/GestionUnidades/MapeoDispositivos/PasoIdentificacionConMapa.jsx
import React, { useState } from 'react';
import MapaSeleccionUbicacion from '../MapeoDispositivos/MapaSeleccionUbicacion';
import './PasoIdentificacionConMapa.css';

const PasoIdentificacionConMapa = ({
  datosDispositivo = {},
  identificacion = {},
  setIdentificacion = () => {},
  onUbicacionConfirmada = () => {}
}) => {
  const [ubicacionSeleccionada, setUbicacionSeleccionada] = useState(null);
  const [mostrandoMapa, setMostrandoMapa] = useState(false);

  const manejarUbicacionSeleccionada = (ubicacion) => {
    console.log('📍 Ubicación temporal seleccionada:', ubicacion);
    setUbicacionSeleccionada(ubicacion);
  };

  const manejarUbicacionConfirmada = (datosUbicacion) => {
    console.log('✅ Ubicación confirmada:', datosUbicacion);
    
    // Actualizar datos de identificación automáticamente
    setIdentificacion(prev => ({
      ...prev,
      nombre: datosUbicacion.nombre,
      ubicacion: datosUbicacion.ubicacion,
      zona: datosUbicacion.zona,
      coordenadas: datosUbicacion.coordenadas
    }));

    setUbicacionSeleccionada(datosUbicacion);
    setMostrandoMapa(false);
    
    if (onUbicacionConfirmada) {
      onUbicacionConfirmada(datosUbicacion);
    }
  };

  const abrirSelectorMapa = () => {
    setMostrandoMapa(true);
  };

  const cerrarSelectorMapa = () => {
    setMostrandoMapa(false);
  };

  const limpiarUbicacion = () => {
    setUbicacionSeleccionada(null);
    setIdentificacion(prev => ({
      ...prev,
      coordenadas: null
    }));
  };

  return (
    <div className="paso-contenido">
      <div className="paso-header">
        <h3>🏷️ Información del Dispositivo</h3>
        <p>Configura los datos básicos y ubicación del dispositivo</p>
      </div>

      {/* Información del dispositivo detectado */}
      <div className="dispositivo-detectado">
        <div className="detectado-info">
          <span className="detectado-icon">📱</span>
          <div>
            <strong>{datosDispositivo.deviceId || 'ESP32'}</strong>
            <p>IP: {datosDispositivo.ip} | Firmware: v{datosDispositivo.firmwareVersion || '1.0.0'}</p>
          </div>
        </div>
      </div>

      {/* Formulario de identificación */}
      <div className="form-identificacion">
        <div className="form-group">
          <label>Nombre del Dispositivo *</label>
          <input
            type="text"
            value={identificacion.nombre}
            onChange={(e) => setIdentificacion(prev => ({ ...prev, nombre: e.target.value }))}
            placeholder="Ej: Poste Villa Adela Norte 001"
            className="input-form"
            required
          />
        </div>

        <div className="form-group">
          <label>Ubicación *</label>
          <div className="ubicacion-input-group">
            <input
              type="text"
              value={identificacion.ubicacion}
              onChange={(e) => setIdentificacion(prev => ({ ...prev, ubicacion: e.target.value }))}
              placeholder="Ej: Calle Murillo 456, Villa Adela"
              className="input-form ubicacion-input"
              required
            />
            <button
              type="button"
              className="btn-mapa"
              onClick={abrirSelectorMapa}
              title="Seleccionar en mapa"
            >
              🗺️ Mapa
            </button>
          </div>
          
          {ubicacionSeleccionada && (
            <div className="ubicacion-confirmada">
              <div className="confirmada-info">
                <span className="confirmada-icon">📍</span>
                <div className="confirmada-datos">
                  <strong>Ubicación confirmada en mapa</strong>
                  <p>Coordenadas: 
                    {ubicacionSeleccionada.coordenadas 
                      ? `${ubicacionSeleccionada.coordenadas.lat.toFixed(6)}, ${ubicacionSeleccionada.coordenadas.lng.toFixed(6)}`
                      : `${ubicacionSeleccionada.lat?.toFixed(6) || 'N/A'}, ${ubicacionSeleccionada.lng?.toFixed(6) || 'N/A'}`
                    }
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn-limpiar-ubicacion"
                onClick={limpiarUbicacion}
                title="Limpiar ubicación"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        <div className="form-group">
          <label>Zona</label>
          <select
            value={identificacion.zona}
            onChange={(e) => setIdentificacion(prev => ({ ...prev, zona: e.target.value }))}
            className="select-form"
          >
            <option value="">Seleccionar zona</option>
            <option value="Norte">Norte</option>
            <option value="Centro">Centro</option>
            <option value="Sur">Sur</option>
            <option value="Este">Este</option>
            <option value="Oeste">Oeste</option>
          </select>
        </div>

        <div className="form-group">
          <label>Descripción</label>
          <textarea
            value={identificacion.descripcion}
            onChange={(e) => setIdentificacion(prev => ({ ...prev, descripcion: e.target.value }))}
            placeholder="Descripción adicional del dispositivo..."
            className="textarea-form"
            rows={3}
          />
        </div>
      </div>

      {/* Selector de mapa modal */}
      {mostrandoMapa && (
        <div className="mapa-modal-overlay">
          <div className="mapa-modal">
            <div className="mapa-modal-header">
              <h3>📍 Seleccionar Ubicación en Mapa</h3>
              <button
                className="btn-cerrar-mapa"
                onClick={cerrarSelectorMapa}
              >
                ✕
              </button>
            </div>
            
            <div className="mapa-modal-contenido">
              <MapaSeleccionUbicacion
                ubicacionSeleccionada={ubicacionSeleccionada}
                onUbicacionSeleccionada={manejarUbicacionSeleccionada}
                onUbicacionConfirmada={manejarUbicacionConfirmada}
                datosDispositivo={datosDispositivo}
                className="mapa-en-modal"
              />
            </div>

            <div className="mapa-modal-acciones">
              <button
                className="btn-cancelar-mapa"
                onClick={cerrarSelectorMapa}
              >
                ❌ Cancelar
              </button>
              <button
                className="btn-manual-mapa"
                onClick={() => {
                  setMostrandoMapa(false);
                }}
              >
                ✏️ Configurar Manualmente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PasoIdentificacionConMapa;