// src/components/Mapas/MapaVisualizacion.jsx
import React, { useState, useEffect, useRef } from 'react';
import MapaGeneral from './MapaGeneral';
import { firebaseService } from '../../services/firebaseService';
import './MapaVisualizacion.css';

const MapaVisualizacion = ({
  className = '',
  altura = '600px',
  mostrarControles = true,
  mostrarFiltros = true,
  onPosteSeleccionado = null
}) => {
  const [postes, setPostes] = useState([]);
  const [posteSeleccionado, setPosteSeleccionado] = useState(null);
  const [filtros, setFiltros] = useState({
    estado: 'todos', // 'todos', 'online', 'offline'
    zona: 'todas', // 'todas', 'Norte', 'Centro', 'Sur'
    intensidad: 'todas' // 'todas', 'encendidos', 'apagados'
  });
  const [vistas, setVistas] = useState({
    mostrarLimites: true,
    mostrarRutas: false,
    mostrarEstadisticas: true,
    agruparPorZona: false
  });
  const [cargando, setCargando] = useState(true);
  const [estadisticas, setEstadisticas] = useState({
    total: 0,
    online: 0,
    offline: 0,
    encendidos: 0,
    consumoTotal: 0
  });
  const unsubscribeRef = useRef(null);

  // Cargar postes desde Firebase
  useEffect(() => {
    setCargando(true);
    
    // Intentar cargar desde Firebase primero
    const unsubscribe = firebaseService.subscribeToPostes((postesData) => {
      console.log('📡 Postes actualizados desde Firebase:', postesData.length);
      
      // Si no hay postes en Firebase, crear datos de ejemplo
      if (postesData.length === 0) {
        console.log('📝 No hay postes en Firebase, generando datos de ejemplo...');
        const postesEjemplo = generarPostesEjemplo();
        setPostes(postesEjemplo);
        calcularEstadisticas(postesEjemplo);
      } else {
        setPostes(postesData);
        calcularEstadisticas(postesData);
      }
      setCargando(false);
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // Generar postes de ejemplo para Villa Adela
  const generarPostesEjemplo = () => {
    const puntosEstrategicos = [
      { lat: -16.521400, lng: -68.211200, nombre: 'Av. Circunvalación Norte', zona: 'Norte' },
      { lat: -16.521200, lng: -68.211500, nombre: 'Av. Circunvalación Centro', zona: 'Centro' },
      { lat: -16.521600, lng: -68.211800, nombre: 'Av. Circunvalación Este', zona: 'Norte' },
      { lat: -16.521000, lng: -68.212000, nombre: 'Calle Murillo Norte', zona: 'Norte' },
      { lat: -16.521300, lng: -68.212300, nombre: 'Calle Murillo Centro', zona: 'Centro' },
      { lat: -16.521700, lng: -68.212600, nombre: 'Calle Murillo Sur', zona: 'Sur' },
      { lat: -16.521100, lng: -68.212400, nombre: 'C. Hernando Siles Centro', zona: 'Centro' },
      { lat: -16.522000, lng: -68.212200, nombre: 'Av. Junín Centro', zona: 'Centro' },
      { lat: -16.521200, lng: -68.213000, nombre: 'Plaza Simón Bolívar Norte', zona: 'Norte' },
      { lat: -16.522400, lng: -68.212300, nombre: 'Mercado Popular Sur', zona: 'Sur' }
    ];

    return puntosEstrategicos.map((punto, index) => {
      const online = Math.random() > 0.3; // 70% online
      const intensidad = online ? Math.floor(Math.random() * 100) : 0;
      
      return {
        id: `POSTE_EJEMPLO_${index + 1}`,
        nombre: `Poste ${punto.nombre}`,
        ubicacion: punto.nombre,
        zona: punto.zona,
        coordenadas: {
          lat: punto.lat,
          lng: punto.lng
        },
        estado: {
          online: online,
          encendido: intensidad > 0,
          activo: true,
          deshabilitado: false,
          ultimaActualizacion: new Date().toISOString()
        },
        red: {
          ip: `192.168.1.${100 + index}`,
          puerto: 80,
          protocolo: 'HTTP'
        },
        control: {
          intensidadLED: intensidad,
          modoManual: true
        },
        calculados: {
          intensidadLED: intensidad,
          potenciaActual: intensidad * 0.235,
          consumoHoy: Math.random() * 10,
          costoHoy: Math.random() * 8,
          tiempoEncendidoHoy: Math.floor(Math.random() * 720),
          encendidosHoy: Math.floor(Math.random() * 5),
          eficienciaHoy: 75 + Math.random() * 25
        },
        sensores: {
          ldr: {
            funcionando: true,
            luxCalculado: Math.floor(Math.random() * 1000),
            timestamp: new Date().toISOString()
          },
          pir: {
            funcionando: true,
            movimiento: Math.random() > 0.8,
            ultimaDeteccion: new Date().toISOString()
          },
          acs712: {
            funcionando: true,
            corriente: (intensidad * 0.02),
            timestamp: new Date().toISOString()
          }
        },
        hardware: {
          modelo: 'ESP32-WROOM-32',
          versionFirmware: '2.1.1',
          protocolo: 'HTTP'
        },
        metadatos: {
          fechaCreacion: new Date().toISOString(),
          ultimaActualizacion: new Date().toISOString(),
          tipo: 'ejemplo'
        }
      };
    });
  };

  // Calcular estadísticas en tiempo real
  const calcularEstadisticas = (postesData) => {
    const stats = {
      total: postesData.length,
      online: postesData.filter(p => p.estado?.online).length,
      offline: postesData.filter(p => !p.estado?.online).length,
      encendidos: postesData.filter(p => p.estado?.encendido).length,
      consumoTotal: postesData.reduce((sum, p) => sum + (p.calculados?.consumoHoy || 0), 0)
    };
    setEstadisticas(stats);
  };

  // Filtrar postes según criterios
  const postesFiltrados = postes.filter(poste => {
    // Filtro por estado
    if (filtros.estado !== 'todos') {
      if (filtros.estado === 'online' && !poste.estado?.online) return false;
      if (filtros.estado === 'offline' && poste.estado?.online) return false;
    }

    // Filtro por zona
    if (filtros.zona !== 'todas' && poste.zona !== filtros.zona) return false;

    // Filtro por intensidad
    if (filtros.intensidad !== 'todas') {
      const encendido = poste.estado?.encendido || false;
      if (filtros.intensidad === 'encendidos' && !encendido) return false;
      if (filtros.intensidad === 'apagados' && encendido) return false;
    }

    return true;
  });

  // Manejar click en poste
  const manejarClickPoste = (poste) => {
    console.log('🏙️ Poste seleccionado:', poste.id);
    setPosteSeleccionado(poste);
    
    if (onPosteSeleccionado) {
      onPosteSeleccionado(poste);
    }
  };

  // Cambiar filtros
  const cambiarFiltro = (tipo, valor) => {
    setFiltros(prev => ({
      ...prev,
      [tipo]: valor
    }));
  };

  // Cambiar vistas
  const cambiarVista = (tipo) => {
    setVistas(prev => ({
      ...prev,
      [tipo]: !prev[tipo]
    }));
  };

  // Obtener zonas disponibles
  const zonasDisponibles = [...new Set(postes.map(p => p.zona).filter(Boolean))];

  return (
    <div className={`mapa-visualizacion-container ${className}`}>
      {/* Header con título y estadísticas rápidas */}
      <div className="visualizacion-header">
        <div className="header-titulo">
          <h2>🗺️ Mapeo de Dispositivos - Villa Adela</h2>
          <p>Visualización en tiempo real del sistema de alumbrado público</p>
        </div>
        
        {vistas.mostrarEstadisticas && (
          <div className="estadisticas-rapidas">
            <div className="stat-item">
              <span className="stat-valor">{estadisticas.total}</span>
              <span className="stat-label">Total</span>
            </div>
            <div className="stat-item online">
              <span className="stat-valor">{estadisticas.online}</span>
              <span className="stat-label">Online</span>
            </div>
            <div className="stat-item offline">
              <span className="stat-valor">{estadisticas.offline}</span>
              <span className="stat-label">Offline</span>
            </div>
            <div className="stat-item encendidos">
              <span className="stat-valor">{estadisticas.encendidos}</span>
              <span className="stat-label">Encendidos</span>
            </div>
          </div>
        )}
      </div>

      {/* Controles y filtros */}
      {(mostrarControles || mostrarFiltros) && (
        <div className="controles-panel">
          {mostrarFiltros && (
            <div className="filtros-section">
              <h4>🔍 Filtros</h4>
              <div className="filtros-grid">
                {/* Filtro por estado */}
                <div className="filtro-grupo">
                  <label>Estado:</label>
                  <select 
                    value={filtros.estado}
                    onChange={(e) => cambiarFiltro('estado', e.target.value)}
                    className="filtro-select"
                  >
                    <option value="todos">Todos</option>
                    <option value="online">Online</option>
                    <option value="offline">Offline</option>
                  </select>
                </div>

                {/* Filtro por zona */}
                <div className="filtro-grupo">
                  <label>Zona:</label>
                  <select 
                    value={filtros.zona}
                    onChange={(e) => cambiarFiltro('zona', e.target.value)}
                    className="filtro-select"
                  >
                    <option value="todas">Todas</option>
                    {zonasDisponibles.map(zona => (
                      <option key={zona} value={zona}>{zona}</option>
                    ))}
                  </select>
                </div>

                {/* Filtro por intensidad */}
                <div className="filtro-grupo">
                  <label>Estado LED:</label>
                  <select 
                    value={filtros.intensidad}
                    onChange={(e) => cambiarFiltro('intensidad', e.target.value)}
                    className="filtro-select"
                  >
                    <option value="todas">Todos</option>
                    <option value="encendidos">Encendidos</option>
                    <option value="apagados">Apagados</option>
                  </select>
                </div>

                {/* Contador de resultados */}
                <div className="filtro-resultado">
                  <span className="resultado-texto">
                    {postesFiltrados.length} de {postes.length} postes
                  </span>
                </div>
              </div>
            </div>
          )}

          {mostrarControles && (
            <div className="vistas-section">
              <h4>👁️ Vistas</h4>
              <div className="vistas-grid">
                <label className="vista-checkbox">
                  <input
                    type="checkbox"
                    checked={vistas.mostrarLimites}
                    onChange={() => cambiarVista('mostrarLimites')}
                  />
                  <span>Mostrar límites de área</span>
                </label>
                
                <label className="vista-checkbox">
                  <input
                    type="checkbox"
                    checked={vistas.mostrarRutas}
                    onChange={() => cambiarVista('mostrarRutas')}
                  />
                  <span>Mostrar rutas de conexión</span>
                </label>
                
                <label className="vista-checkbox">
                  <input
                    type="checkbox"
                    checked={vistas.mostrarEstadisticas}
                    onChange={() => cambiarVista('mostrarEstadisticas')}
                  />
                  <span>Mostrar estadísticas</span>
                </label>
                
                <label className="vista-checkbox">
                  <input
                    type="checkbox"
                    checked={vistas.agruparPorZona}
                    onChange={() => cambiarVista('agruparPorZona')}
                  />
                  <span>Agrupar por zona</span>
                </label>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mapa principal */}
      <div className="mapa-principal">
        <MapaGeneral
          center={[-16.521523, -68.212580]}
          zoom={16}
          altura={altura}
          modo="visualizacion"
          mostrarLimites={vistas.mostrarLimites}
          postes={postesFiltrados}
          onPosteClick={manejarClickPoste}
          className="mapa-dispositivos"
        />

        {/* Panel de información del poste seleccionado */}
        {posteSeleccionado && (
          <div className="panel-poste-info">
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
                <div className="info-item">
                  <span className="info-label">📍 Ubicación:</span>
                  <span className="info-valor">{posteSeleccionado.ubicacion || 'No especificada'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">🏘️ Zona:</span>
                  <span className="info-valor">{posteSeleccionado.zona || 'No asignada'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">🌐 IP:</span>
                  <span className="info-valor">{posteSeleccionado.red?.ip || 'No configurada'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">⚡ Estado:</span>
                  <span className={`info-valor estado-${posteSeleccionado.estado?.online ? 'online' : 'offline'}`}>
                    {posteSeleccionado.estado?.online ? '🟢 Online' : '🔴 Offline'}
                  </span>
                </div>
              </div>

              <div className="info-sensores">
                <h5>🔬 Sensores</h5>
                <div className="sensores-grid">
                  <div className="sensor-item">
                    <span className="sensor-icon">💡</span>
                    <div className="sensor-datos">
                      <span className="sensor-nombre">LED</span>
                      <span className="sensor-valor">{posteSeleccionado.control?.intensidadLED || 0}%</span>
                    </div>
                  </div>
                  <div className="sensor-item">
                    <span className="sensor-icon">🌅</span>
                    <div className="sensor-datos">
                      <span className="sensor-nombre">LDR</span>
                      <span className="sensor-valor">{posteSeleccionado.sensores?.ldr?.luxCalculado || 0} lux</span>
                    </div>
                  </div>
                  <div className="sensor-item">
                    <span className="sensor-icon">👁️</span>
                    <div className="sensor-datos">
                      <span className="sensor-nombre">PIR</span>
                      <span className="sensor-valor">{posteSeleccionado.sensores?.pir?.movimiento ? '🟢 Activo' : '⚪ Inactivo'}</span>
                    </div>
                  </div>
                  <div className="sensor-item">
                    <span className="sensor-icon">⚡</span>
                    <div className="sensor-datos">
                      <span className="sensor-nombre">Corriente</span>
                      <span className="sensor-valor">{(posteSeleccionado.sensores?.acs712?.corriente || 0).toFixed(2)}A</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="info-consumo">
                <h5>📊 Consumo Hoy</h5>
                <div className="consumo-grid">
                  <div className="consumo-item">
                    <span className="consumo-valor">{(posteSeleccionado.calculados?.consumoHoy || 0).toFixed(2)}</span>
                    <span className="consumo-unidad">kWh</span>
                  </div>
                  <div className="consumo-item">
                    <span className="consumo-valor">{(posteSeleccionado.calculados?.costoHoy || 0).toFixed(2)}</span>
                    <span className="consumo-unidad">BOB</span>
                  </div>
                  <div className="consumo-item">
                    <span className="consumo-valor">{Math.floor(posteSeleccionado.calculados?.tiempoEncendidoHoy || 0)}</span>
                    <span className="consumo-unidad">min</span>
                  </div>
                </div>
              </div>

              <div className="panel-acciones">
                <button className="btn-accion-secundaria">
                  📊 Ver Estadísticas
                </button>
                <button className="btn-accion-primaria">
                  ⚙️ Configurar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Leyenda del mapa */}
      <div className="mapa-leyenda">
        <h4>🎨 Leyenda</h4>
        <div className="leyenda-grid">
          <div className="leyenda-item">
            <div className="leyenda-icono poste-online"></div>
            <span>Poste Online</span>
          </div>
          <div className="leyenda-item">
            <div className="leyenda-icono poste-offline"></div>
            <span>Poste Offline</span>
          </div>
          <div className="leyenda-item">
            <div className="leyenda-icono area-cobertura"></div>
            <span>Área de Cobertura</span>
          </div>
          <div className="leyenda-item">
            <div className="leyenda-icono zona-limite"></div>
            <span>Límites de Zona</span>
          </div>
        </div>
      </div>

      {/* Indicador de carga */}
      {cargando && (
        <div className="cargando-overlay">
          <div className="cargando-contenido">
            <div className="cargando-spinner"></div>
            <p>Cargando dispositivos...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapaVisualizacion;