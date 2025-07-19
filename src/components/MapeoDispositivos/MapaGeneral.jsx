// src/components/Mapas/MapaGeneral.jsx
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapaGeneral.css';

// Configurar iconos de Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const MapaGeneral = ({
  center = [-16.521523, -68.212580], // Centro de Villa Adela
  zoom = 17,
  altura = '400px',
  mostrarLimites = true,
  postes = [],
  onPosteClick = null,
  onMapaClick = null,
  modo = 'visualizacion', // 'visualizacion', 'seleccion'
  puntosPermitidos = [],
  className = ''
}) => {
  const mapaRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const limitesRef = useRef(null);
  const [mapaListo, setMapaListo] = useState(false);

  // Coordenadas que delimitan el área de Villa Adela (corregidas para formar polígono)
  const LIMITES_AREA = [
    [-16.521691, -68.210984], // Punto 1 - Noroeste
    [-16.520326, -68.212580], // Punto 2 - Noreste  
    [-16.521523, -68.213657], // Punto 4 - Sureste
    [-16.522871, -68.212068]  // Punto 3 - Suroeste
  ];

  // Puntos estratégicos donde se pueden colocar postes (actualizados para Villa Adela)
  const PUNTOS_ESTRATEGICOS = [
    { lat: -16.521400, lng: -68.211200, nombre: 'Av. Circunvalación Norte' },
    { lat: -16.521200, lng: -68.211500, nombre: 'Av. Circunvalación Centro' },
    { lat: -16.521600, lng: -68.211800, nombre: 'Av. Circunvalación Este' },
    { lat: -16.521000, lng: -68.212000, nombre: 'Calle Murillo Norte' },
    { lat: -16.521300, lng: -68.212300, nombre: 'Calle Murillo Centro' },
    { lat: -16.521700, lng: -68.212600, nombre: 'Calle Murillo Sur' },
    { lat: -16.520800, lng: -68.212000, nombre: 'C. Hernando Siles Norte' },
    { lat: -16.521100, lng: -68.212400, nombre: 'C. Hernando Siles Centro' },
    { lat: -16.521500, lng: -68.212800, nombre: 'C. Hernando Siles Sur' },
    { lat: -16.522200, lng: -68.211600, nombre: 'Av. Junín Norte' },
    { lat: -16.522000, lng: -68.212200, nombre: 'Av. Junín Centro' },
    { lat: -16.521800, lng: -68.212700, nombre: 'Av. Junín Sur' },
    { lat: -16.521200, lng: -68.213000, nombre: 'Plaza Simón Bolívar Norte' },
    { lat: -16.521600, lng: -68.213200, nombre: 'Plaza Simón Bolívar Sur' },
    { lat: -16.520600, lng: -68.212500, nombre: 'Mercado Popular Norte' },
    { lat: -16.522400, lng: -68.212300, nombre: 'Mercado Popular Sur' },
    { lat: -16.521000, lng: -68.213400, nombre: 'Zona Residencial Norte' },
    { lat: -16.521400, lng: -68.213500, nombre: 'Zona Residencial Sur' },
    { lat: -16.520900, lng: -68.211700, nombre: 'Sector El Carmen' },
    { lat: -16.522600, lng: -68.212600, nombre: 'Villa Adela Sur' }
  ];

  // Iconos personalizados
  const crearIconoPoste = (estado = 'offline', tipo = 'normal') => {
    return L.divIcon({
      className: `custom-poste-icon poste-${estado} poste-${tipo}`,
      html: '<div class="poste-icon-content">💡</div>',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [0, -41]
    });
  };

  const crearIconoPuntoDisponible = () => {
    return L.divIcon({
      className: 'custom-punto-disponible',
      html: '<div class="punto-disponible-content"></div>',
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });
  };

  // Verificar si un punto está dentro del área permitida (algoritmo mejorado)
  const puntoDentroDelArea = (lat, lng) => {
    const punto = [lat, lng];
    const vertices = LIMITES_AREA;
    let dentro = false;
    
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
      const xi = vertices[i][0], yi = vertices[i][1];
      const xj = vertices[j][0], yj = vertices[j][1];
      
      if (((yi > punto[1]) !== (yj > punto[1])) &&
          (punto[0] < (xj - xi) * (punto[1] - yi) / (yj - yi) + xi)) {
        dentro = !dentro;
      }
    }
    
    return dentro;
  };

  // Inicializar mapa
  useEffect(() => {
    if (!mapaRef.current || mapInstanceRef.current) return;

    // Crear mapa
    const map = L.map(mapaRef.current, {
      center: center,
      zoom: zoom,
      zoomControl: true,
      scrollWheelZoom: true,
      doubleClickZoom: false
    });

    // Añadir capa base
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    // Dibujar límites del área si está habilitado
    if (mostrarLimites) {
      const polygon = L.polygon(LIMITES_AREA, {
        color: '#3b82f6',
        weight: 3,
        opacity: 0.8,
        fillColor: '#3b82f6',
        fillOpacity: 0.1,
        dashArray: '10, 5'
      }).addTo(map);

      limitesRef.current = polygon;

      polygon.bindTooltip('Área de Villa Adela - Zona de Cobertura', {
        permanent: false,
        direction: 'center',
        className: 'area-tooltip'
      });
    }

    // Mostrar puntos disponibles para selección
    if (modo === 'seleccion') {
      PUNTOS_ESTRATEGICOS.forEach((punto, index) => {
        if (puntoDentroDelArea(punto.lat, punto.lng)) {
          const marker = L.marker([punto.lat, punto.lng], {
            icon: crearIconoPuntoDisponible()
          }).addTo(map);

          marker.bindPopup(`
            <div class="popup-punto-disponible">
              <h4>📍 Ubicación Disponible</h4>
              <p><strong>${punto.nombre}</strong></p>
              <p>Lat: ${punto.lat.toFixed(6)}</p>
              <p>Lng: ${punto.lng.toFixed(6)}</p>
              <button class="btn-seleccionar-punto" onclick="window.seleccionarPunto(${index})">
                ➕ Añadir Poste Aquí
              </button>
            </div>
          `);

          // Evento click en punto disponible
          marker.on('click', () => {
            if (onMapaClick) {
              onMapaClick({
                lat: punto.lat,
                lng: punto.lng,
                nombre: punto.nombre,
                tipo: 'punto_disponible'
              });
            }
          });

          markersRef.current.push(marker);
        }
      });

      // Función global para seleccionar punto
      window.seleccionarPunto = (index) => {
        const punto = PUNTOS_ESTRATEGICOS[index];
        if (onMapaClick) {
          onMapaClick({
            lat: punto.lat,
            lng: punto.lng,
            nombre: punto.nombre,
            tipo: 'seleccion_confirmada'
          });
        }
      };
    }

    // Evento click en mapa general
    if (onMapaClick && modo === 'seleccion') {
      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        
        if (puntoDentroDelArea(lat, lng)) {
          // Buscar el punto estratégico más cercano
          let puntoMasCercano = null;
          let distanciaMinima = Infinity;

          PUNTOS_ESTRATEGICOS.forEach(punto => {
            const distancia = map.distance([lat, lng], [punto.lat, punto.lng]);
            if (distancia < distanciaMinima && distancia < 100) { // 100 metros de tolerancia
              distanciaMinima = distancia;
              puntoMasCercano = punto;
            }
          });

          if (puntoMasCercano) {
            onMapaClick({
              lat: puntoMasCercano.lat,
              lng: puntoMasCercano.lng,
              nombre: puntoMasCercano.nombre,
              tipo: 'punto_sugerido'
            });
          } else {
            // Mostrar mensaje de que debe seleccionar un punto estratégico
            L.popup()
              .setLatLng([lat, lng])
              .setContent(`
                <div class="popup-fuera-area">
                  <h4>❌ Ubicación No Disponible</h4>
                  <p>Selecciona uno de los puntos azules marcados</p>
                  <p>Estos representan ubicaciones estratégicas en calles principales</p>
                </div>
              `)
              .openOn(map);
          }
        } else {
          // Punto fuera del área
          L.popup()
            .setLatLng([lat, lng])
            .setContent(`
              <div class="popup-fuera-area">
                <h4>🚫 Fuera del Área</h4>
                <p>Este punto está fuera de la zona de Villa Adela</p>
                <p>Selecciona un punto dentro del área delimitada</p>
              </div>
            `)
            .openOn(map);
        }
      });
    }

    mapInstanceRef.current = map;
    setMapaListo(true);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [center, zoom, modo, mostrarLimites]);

  // Actualizar postes cuando cambien
  useEffect(() => {
    if (!mapInstanceRef.current || !mapaListo) return;

    // Limpiar markers existentes de postes
    markersRef.current.forEach(marker => {
      if (marker._posteMarker) {
        mapInstanceRef.current.removeLayer(marker);
      }
    });

    // Agregar nuevos markers de postes
    postes.forEach((poste, index) => {
      if (poste.coordenadas && poste.coordenadas.lat && poste.coordenadas.lng) {
        const { lat, lng } = poste.coordenadas;
        
        // Determinar estado del poste
        let estado = 'offline';
        if (poste.estado?.online) {
          estado = 'online';
        } else if (poste.estado?.deshabilitado) {
          estado = 'mantenimiento';
        } else if (poste.estado?.alerta) {
          estado = 'alerta';
        }
        
        const marker = L.marker([lat, lng], {
          icon: crearIconoPoste(estado, 'normal')
        }).addTo(mapInstanceRef.current);

        marker._posteMarker = true;

        // Popup del poste con información completa
        const popupContent = `
          <div class="popup-poste">
            <h4>🏙️ ${poste.nombre || poste.id}</h4>
            <div class="poste-info">
              <p><strong>📍 Ubicación:</strong> ${poste.ubicacion || 'No especificada'}</p>
              <p><strong>🏘️ Zona:</strong> ${poste.zona || 'No asignada'}</p>
              <p><strong>🌐 IP:</strong> ${poste.red?.ip || 'No configurada'}</p>
              <p><strong>⚡ Estado:</strong> 
                <span class="estado-${estado}">${
                  estado === 'online' ? '🟢 Online' : 
                  estado === 'alerta' ? '🟡 Alerta' :
                  estado === 'mantenimiento' ? '🟣 Mantenimiento' :
                  '🔴 Offline'
                }</span>
              </p>
              <p><strong>💡 LED:</strong> ${poste.control?.intensidadLED || poste.calculados?.intensidadLED || 0}%</p>
              ${poste.sensores ? `
                <p><strong>🌅 LDR:</strong> ${poste.sensores.ldr?.luxCalculado || 0} lux</p>
                <p><strong>👁️ PIR:</strong> ${poste.sensores.pir?.movimiento ? '🟢 Detectando' : '⚪ Inactivo'}</p>
                <p><strong>⚡ Corriente:</strong> ${(poste.sensores.acs712?.corriente || 0).toFixed(2)}A</p>
              ` : ''}
            </div>
            ${onPosteClick ? `<button class="btn-ver-poste" onclick="window.verPoste('${poste.id}')">👁️ Ver Detalles</button>` : ''}
          </div>
        `;
        
        marker.bindPopup(popupContent);

        // Evento click en poste
        if (onPosteClick) {
          marker.on('click', () => {
            console.log('🏙️ Click en poste:', poste.id);
            onPosteClick(poste);
          });
        }

        markersRef.current.push(marker);
      } else {
        console.warn(`⚠️ Poste ${poste.id} no tiene coordenadas válidas:`, poste.coordenadas);
      }
    });

    // Función global para ver poste
    if (onPosteClick) {
      window.verPoste = (posteId) => {
        const poste = postes.find(p => p.id === posteId);
        if (poste) {
          onPosteClick(poste);
        }
      };
    }
  }, [postes, mapaListo, onPosteClick]);

  // Métodos públicos del componente
  const centrarEnPoste = (posteId) => {
    const poste = postes.find(p => p.id === posteId);
    if (poste && poste.coordenadas && mapInstanceRef.current) {
      mapInstanceRef.current.setView([poste.coordenadas.lat, poste.coordenadas.lng], 18);
    }
  };

  const centrarEnArea = () => {
    if (mapInstanceRef.current && limitesRef.current) {
      mapInstanceRef.current.fitBounds(limitesRef.current.getBounds());
    }
  };

  const obtenerPuntosDisponibles = () => {
    return PUNTOS_ESTRATEGICOS.filter(punto => 
      puntoDentroDelArea(punto.lat, punto.lng)
    );
  };

  return (
    <div className={`mapa-general-container ${className}`}>
      <div 
        className="mapa-general"
        ref={mapaRef}
        style={{ height: altura }}
      />
      
      {modo === 'seleccion' && (
        <div className="mapa-controles">
          <div className="controles-info">
            <div className="info-item">
              <span className="punto-azul"></span>
              <span>Puntos disponibles para postes</span>
            </div>
            <div className="info-item">
              <span className="area-delimitada"></span>
              <span>Área de cobertura Villa Adela</span>
            </div>
          </div>
          
          <div className="controles-acciones">
            <button 
              className="btn-centrar-area"
              onClick={centrarEnArea}
              title="Centrar en área"
            >
              🎯 Centrar Área
            </button>
            <span className="puntos-disponibles">
              {obtenerPuntosDisponibles().length} puntos disponibles
            </span>
          </div>
        </div>
      )}

      {!mapaListo && (
        <div className="mapa-cargando">
          <div className="cargando-spinner"></div>
          <p>Cargando mapa de Villa Adela...</p>
        </div>
      )}
    </div>
  );
};

export default MapaGeneral;