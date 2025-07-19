// src/components/Mapas/MapaSeleccionUbicacion.jsx
import React, { useState, useEffect } from 'react';
import MapaGeneral from './MapaGeneral';
import './MapaSeleccionUbicacion.css';

const MapaSeleccionUbicacion = ({
  ubicacionSeleccionada = null,
  onUbicacionSeleccionada = () => {},
  onUbicacionConfirmada = () => {},
  datosDispositivo = {},
  className = ''
}) => {
  const [ubicacionTemporal, setUbicacionTemporal] = useState(null);
  const [mostrandoConfirmacion, setMostrandoConfirmacion] = useState(false);
  const [ubicacionesOcupadas, setUbicacionesOcupadas] = useState([]);

  // Simular ubicaciones ya ocupadas (en un caso real vendría de Firebase)
  useEffect(() => {
    // Aquí podrías cargar las ubicaciones ya ocupadas desde Firebase
    const ocupadas = [
      { lat: -16.521200, lng: -68.211500 }, // Ya ocupada como ejemplo
      { lat: -16.522200, lng: -68.212100 }  // Ya ocupada como ejemplo
    ];
    setUbicacionesOcupadas(ocupadas);
  }, []);

  const manejarClickMapa = (ubicacion) => {
    console.log('🗺️ Click en mapa:', ubicacion);

    if (!ubicacion || (!ubicacion.lat && !ubicacion.lng)) {
      console.error('❌ Ubicación inválida:', ubicacion);
      return;
    }

    // Verificar si la ubicación ya está ocupada
    const yaOcupada = ubicacionesOcupadas.some(ocupada => 
      Math.abs(ocupada.lat - ubicacion.lat) < 0.000050 && 
      Math.abs(ocupada.lng - ubicacion.lng) < 0.000050
    );

    if (yaOcupada) {
      alert('⚠️ Esta ubicación ya tiene un poste instalado. Selecciona otra ubicación.');
      return;
    }

    if (ubicacion.tipo === 'seleccion_confirmada') {
      // Confirmación directa desde popup
      confirmarUbicacion(ubicacion);
    } else {
      // Selección temporal
      setUbicacionTemporal(ubicacion);
      setMostrandoConfirmacion(true);
      onUbicacionSeleccionada(ubicacion);
    }
  };

  const confirmarUbicacion = (ubicacion = ubicacionTemporal) => {
    if (!ubicacion) return;

    // Generar datos automáticos basados en la ubicación
    const datosUbicacion = {
      coordenadas: {
        lat: ubicacion.lat,
        lng: ubicacion.lng
      },
      ubicacion: ubicacion.nombre || `${ubicacion.lat.toFixed(6)}, ${ubicacion.lng.toFixed(6)}`,
      zona: determinarZona(ubicacion),
      nombre: generarNombrePoste(ubicacion),
      tipo: 'poste_alumbrado',
      categoria: 'via_publica',
      // Mantener propiedades originales si existen
      ...ubicacion
    };

    console.log('✅ Ubicación confirmada:', datosUbicacion);
    
    setMostrandoConfirmacion(false);
    setUbicacionTemporal(null);
    onUbicacionConfirmada(datosUbicacion);
  };

  const cancelarSeleccion = () => {
    setUbicacionTemporal(null);
    setMostrandoConfirmacion(false);
    onUbicacionSeleccionada(null);
  };

  const determinarZona = (ubicacion) => {
    const { lat, lng } = ubicacion;
    
    // Lógica para determinar zona basada en coordenadas
    if (lat > -16.521000) {
      return 'Norte';
    } else if (lat > -16.522000) {
      return 'Centro';
    } else {
      return 'Sur';
    }
  };

  const generarNombrePoste = (ubicacion) => {
    const zona = determinarZona(ubicacion);
    const timestamp = Date.now().toString().slice(-4);
    return `Poste Villa Adela ${zona} ${timestamp}`;
  };

  const obtenerPostesExistentes = () => {
    // Simular postes existentes en ubicaciones ocupadas
    return ubicacionesOcupadas.map((ubicacion, index) => ({
      id: `POSTE_EXISTENTE_${index + 1}`,
      nombre: `Poste Existente ${index + 1}`,
      coordenadas: ubicacion,
      estado: { online: Math.random() > 0.5 },
      ubicacion: `Ubicación ${index + 1}`,
      zona: determinarZona(ubicacion),
      red: { ip: `192.168.1.${101 + index}` },
      control: { intensidadLED: Math.floor(Math.random() * 100) }
    }));
  };

  return (
    <div className={`mapa-seleccion-container ${className}`}>
      <div className="seleccion-header">
        <h3>📍 Seleccionar Ubicación del Poste</h3>
        <p>Haz clic en uno de los puntos azules para colocar el nuevo poste</p>
      </div>

      <div className="seleccion-info">
        <div className="info-dispositivo">
          <div className="dispositivo-card">
            <div className="dispositivo-icon">📱</div>
            <div className="dispositivo-datos">
              <strong>{datosDispositivo.deviceId || 'ESP32'}</strong>
              <span>IP: {datosDispositivo.ip || 'No configurada'}</span>
              <span>Firmware: v{datosDispositivo.firmwareVersion || '1.0.0'}</span>
            </div>
          </div>
        </div>

        {ubicacionSeleccionada && (
          <div className="ubicacion-actual">
            <div className="ubicacion-info">
              <h4>📌 Ubicación Seleccionada</h4>
              <p><strong>Dirección:</strong> {ubicacionSeleccionada.ubicacion || ubicacionSeleccionada.nombre}</p>
              <p><strong>Zona:</strong> {ubicacionSeleccionada.zona || determinarZona(ubicacionSeleccionada)}</p>
              <p><strong>Coordenadas:</strong> 
                {ubicacionSeleccionada.coordenadas 
                  ? `${ubicacionSeleccionada.coordenadas.lat.toFixed(6)}, ${ubicacionSeleccionada.coordenadas.lng.toFixed(6)}`
                  : `${ubicacionSeleccionada.lat?.toFixed(6) || 'N/A'}, ${ubicacionSeleccionada.lng?.toFixed(6) || 'N/A'}`
                }
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="mapa-wrapper">
        <MapaGeneral
          center={[-16.521523, -68.212580]}
          zoom={17}
          altura="450px"
          modo="seleccion"
          mostrarLimites={true}
          postes={obtenerPostesExistentes()}
          onMapaClick={manejarClickMapa}
          className="mapa-seleccion"
        />

        {mostrandoConfirmacion && ubicacionTemporal && (
          <div className="confirmacion-overlay">
            <div className="confirmacion-modal">
              <div className="confirmacion-header">
                <h4>📍 Confirmar Ubicación</h4>
                <button 
                  className="btn-cerrar-confirmacion"
                  onClick={cancelarSeleccion}
                >
                  ✕
                </button>
              </div>

              <div className="confirmacion-contenido">
                <div className="ubicacion-preview">
                  <div className="preview-item">
                    <span className="preview-label">📍 Dirección:</span>
                    <span className="preview-valor">{ubicacionTemporal.nombre || 'Ubicación personalizada'}</span>
                  </div>
                  <div className="preview-item">
                    <span className="preview-label">🏘️ Zona:</span>
                    <span className="preview-valor">{determinarZona(ubicacionTemporal)}</span>
                  </div>
                  <div className="preview-item">
                    <span className="preview-label">🏷️ Nombre:</span>
                    <span className="preview-valor">{generarNombrePoste(ubicacionTemporal)}</span>
                  </div>
                  <div className="preview-item">
                    <span className="preview-label">📐 Coordenadas:</span>
                    <span className="preview-valor">
                      {ubicacionTemporal.lat?.toFixed(6) || 'N/A'}, {ubicacionTemporal.lng?.toFixed(6) || 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="confirmacion-advertencia">
                  <div className="advertencia-icon">⚠️</div>
                  <div className="advertencia-texto">
                    <strong>Importante:</strong>
                    <p>Esta ubicación se asignará permanentemente al dispositivo ESP32. 
                       Asegúrate de que la posición sea correcta antes de confirmar.</p>
                  </div>
                </div>
              </div>

              <div className="confirmacion-acciones">
                <button 
                  className="btn-cancelar"
                  onClick={cancelarSeleccion}
                >
                  ❌ Cancelar
                </button>
                <button 
                  className="btn-confirmar"
                  onClick={() => confirmarUbicacion()}
                  disabled={!ubicacionTemporal.lat || !ubicacionTemporal.lng}
                >
                  ✅ Confirmar Ubicación
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="seleccion-ayuda">
        <div className="ayuda-grid">
          <div className="ayuda-item">
            <div className="ayuda-icon">🎯</div>
            <div className="ayuda-texto">
              <strong>Selecciona un punto azul</strong>
              <p>Los puntos azules indican ubicaciones estratégicas disponibles</p>
            </div>
          </div>
          
          <div className="ayuda-item">
            <div className="ayuda-icon">🚫</div>
            <div className="ayuda-texto">
              <strong>Evita áreas ocupadas</strong>
              <p>Los puntos rojos indican postes ya instalados</p>
            </div>
          </div>
          
          <div className="ayuda-item">
            <div className="ayuda-icon">📍</div>
            <div className="ayuda-texto">
              <strong>Ubicación automática</strong>
              <p>El nombre y zona se asignarán automáticamente</p>
            </div>
          </div>
          
          <div className="ayuda-item">
            <div className="ayuda-icon">✅</div>
            <div className="ayuda-texto">
              <strong>Confirma tu selección</strong>
              <p>Revisa los datos antes de confirmar la ubicación</p>
            </div>
          </div>
        </div>
      </div>

      <div className="seleccion-estadisticas">
        <div className="estadistica-item">
          <span className="estadistica-valor">{obtenerPostesExistentes().length}</span>
          <span className="estadistica-label">Postes Instalados</span>
        </div>
        <div className="estadistica-item">
          <span className="estadistica-valor">20</span>
          <span className="estadistica-label">Ubicaciones Disponibles</span>
        </div>
        <div className="estadistica-item">
          <span className="estadistica-valor">Villa Adela</span>
          <span className="estadistica-label">Zona de Cobertura</span>
        </div>
      </div>
    </div>
  );
};

export default MapaSeleccionUbicacion;