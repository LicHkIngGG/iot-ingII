// src/components/GestionUnidades/GestionUnidades.jsx
import React, { useState, useEffect } from 'react';
import { firebaseService } from '../../services/firebaseService';
import DetectorDispositivos from './DetectorDispositivos';
import ConfiguradorIP from './ConfiguradorIP';
import ConfiguradorSensores from './ConfiguradorSensores';
import ConfiguradorRed from './ConfiguradorRed';
import ListaDispositivos from './ListaDispositivos';
import AsistenteConfiguracion from './AsistenteConfiguracion';
import './GestionUnidades.css';

const GestionUnidades = () => {
  const [dispositivos, setDispositivos] = useState([]);
  const [dispositivoSeleccionado, setDispositivoSeleccionado] = useState(null);
  const [vistaActiva, setVistaActiva] = useState('dashboard');
  const [cargando, setCargando] = useState(true);
  const [estadisticas, setEstadisticas] = useState({
    total: 0,
    configurados: 0,
    online: 0,
    offline: 0,
    pendientes: 0
  });
  const [filtros, setFiltros] = useState({
    busqueda: '',
    estado: 'todos',
    zona: 'todas',
    tipo: 'todos'
  });
  const [mostrarAsistente, setMostrarAsistente] = useState(false);

  // Cargar datos iniciales
  useEffect(() => {
    cargarDispositivos();
    cargarEstadisticas();
  }, []);

  const cargarDispositivos = async () => {
    try {
      setCargando(true);
      const postesData = await firebaseService.getAllPostes();
      setDispositivos(postesData);
      console.log('📋 Dispositivos cargados:', postesData.length);
    } catch (error) {
      console.error('❌ Error cargando dispositivos:', error);
    } finally {
      setCargando(false);
    }
  };

  const cargarEstadisticas = async () => {
    try {
      const stats = await firebaseService.getSystemStats();
      if (stats) {
        setEstadisticas({
          total: stats.total,
          configurados: stats.total,
          online: stats.online,
          offline: stats.offline,
          pendientes: 0
        });
      }
    } catch (error) {
      console.error('❌ Error cargando estadísticas:', error);
    }
  };

  // Filtrar dispositivos
  const dispositivosFiltrados = dispositivos.filter(dispositivo => {
    const coincideBusqueda = dispositivo.nombre?.toLowerCase().includes(filtros.busqueda.toLowerCase()) ||
                            dispositivo.id?.toLowerCase().includes(filtros.busqueda.toLowerCase()) ||
                            dispositivo.ubicacion?.toLowerCase().includes(filtros.busqueda.toLowerCase());
    
    const coincifeEstado = filtros.estado === 'todos' || 
                          (filtros.estado === 'online' && dispositivo.estado?.online) ||
                          (filtros.estado === 'offline' && !dispositivo.estado?.online) ||
                          (filtros.estado === 'configurado' && dispositivo.metadatos?.numeroConfiguraciones > 1);
    
    const coincifeZona = filtros.zona === 'todas' || dispositivo.zona === filtros.zona;
    
    return coincideBusqueda && coincifeEstado && coincifeZona;
  });

  // Handlers
  const handleNuevoDispositivo = () => {
    setMostrarAsistente(true);
  };

  const handleSeleccionarDispositivo = (dispositivo) => {
    setDispositivoSeleccionado(dispositivo);
    setVistaActiva('configuracion');
  };

  const handleActualizarDispositivo = async () => {
    await cargarDispositivos();
    await cargarEstadisticas();
  };

  const handleCerrarAsistente = () => {
    setMostrarAsistente(false);
    cargarDispositivos();
  };

  // Render de vistas
  const renderVistaActiva = () => {
    switch (vistaActiva) {
      case 'detector':
        return (
          <DetectorDispositivos 
            onDispositivoEncontrado={handleSeleccionarDispositivo}
            onVolver={() => setVistaActiva('dashboard')}
          />
        );
      
      case 'configuracion':
        return dispositivoSeleccionado ? (
          <div className="configuracion-container">
            <div className="configuracion-header">
              <button 
                className="btn-volver"
                onClick={() => setVistaActiva('dashboard')}
              >
                ← Volver al Dashboard
              </button>
              <h3>Configurando: {dispositivoSeleccionado.nombre}</h3>
            </div>
            
            <div className="configuracion-tabs">
              <ConfiguradorIP 
                dispositivo={dispositivoSeleccionado}
                onActualizar={handleActualizarDispositivo}
              />
              <ConfiguradorRed 
                dispositivo={dispositivoSeleccionado}
                onActualizar={handleActualizarDispositivo}
              />
              <ConfiguradorSensores 
                dispositivo={dispositivoSeleccionado}
                onActualizar={handleActualizarDispositivo}
              />
            </div>
          </div>
        ) : null;
      
      default:
        return (
          <div className="dashboard-container">
            {/* Header con estadísticas */}
            <div className="estadisticas-grid">
              <div className="stat-card total">
                <div className="stat-icon">📱</div>
                <div className="stat-info">
                  <h3>{estadisticas.total}</h3>
                  <p>Total Dispositivos</p>
                </div>
              </div>
              
              <div className="stat-card configurados">
                <div className="stat-icon">⚙️</div>
                <div className="stat-info">
                  <h3>{estadisticas.configurados}</h3>
                  <p>Configurados</p>
                </div>
              </div>
              
              <div className="stat-card online">
                <div className="stat-icon">🟢</div>
                <div className="stat-info">
                  <h3>{estadisticas.online}</h3>
                  <p>En Línea</p>
                </div>
              </div>
              
              <div className="stat-card offline">
                <div className="stat-icon">🔴</div>
                <div className="stat-info">
                  <h3>{estadisticas.offline}</h3>
                  <p>Desconectados</p>
                </div>
              </div>
            </div>

            {/* Controles principales */}
            <div className="controles-principales">
              <div className="acciones-rapidas">
                <button 
                  className="btn-accion primary"
                  onClick={handleNuevoDispositivo}
                >
                  <span className="icon">➕</span>
                  Añadir Nuevo Dispositivo
                </button>
                
                <button 
                  className="btn-accion secondary"
                  onClick={() => setVistaActiva('detector')}
                >
                  <span className="icon">🔍</span>
                  Detectar Dispositivos
                </button>
                
                <button 
                  className="btn-accion secondary"
                  onClick={cargarDispositivos}
                >
                  <span className="icon">🔄</span>
                  Actualizar Lista
                </button>
              </div>

              {/* Filtros y búsqueda */}
              <div className="filtros-container">
                <div className="busqueda-container">
                  <input
                    type="text"
                    placeholder="Buscar por nombre, ID o ubicación..."
                    value={filtros.busqueda}
                    onChange={(e) => setFiltros({...filtros, busqueda: e.target.value})}
                    className="input-busqueda"
                  />
                  <span className="busqueda-icon">🔍</span>
                </div>

                <div className="filtros-grid">
                  <select
                    value={filtros.estado}
                    onChange={(e) => setFiltros({...filtros, estado: e.target.value})}
                    className="select-filtro"
                  >
                    <option value="todos">Todos los estados</option>
                    <option value="online">En línea</option>
                    <option value="offline">Desconectados</option>
                    <option value="configurado">Configurados</option>
                  </select>

                  <select
                    value={filtros.zona}
                    onChange={(e) => setFiltros({...filtros, zona: e.target.value})}
                    className="select-filtro"
                  >
                    <option value="todas">Todas las zonas</option>
                    <option value="Norte">Norte</option>
                    <option value="Sur">Sur</option>
                    <option value="Centro">Centro</option>
                  </select>

                  <button 
                    className="btn-limpiar-filtros"
                    onClick={() => setFiltros({busqueda: '', estado: 'todos', zona: 'todas', tipo: 'todos'})}
                  >
                    Limpiar Filtros
                  </button>
                </div>
              </div>
            </div>

            {/* Lista de dispositivos */}
            <ListaDispositivos 
              dispositivos={dispositivosFiltrados}
              cargando={cargando}
              onSeleccionar={handleSeleccionarDispositivo}
              onActualizar={handleActualizarDispositivo}
            />
          </div>
        );
    }
  };

  return (
    <div className="gestion-unidades">
      <div className="gestion-header">
        <div className="header-info">
          <h1 className="titulo-principal">
            <span className="icon">⚙️</span>
            Gestión de Unidades IoT
          </h1>
          <p className="subtitulo">
            Configuración y administración de dispositivos ESP32 + WIZnet
          </p>
        </div>
        
        <div className="header-acciones">
          <div className="indicador-protocolo">
            <span className="protocolo-badge">HTTP/1.1</span>
            <span className="puerto-badge">Puerto 80</span>
          </div>
        </div>
      </div>

      <div className="gestion-contenido">
        {renderVistaActiva()}
      </div>

      {/* Asistente de configuración */}
      {mostrarAsistente && (
        <AsistenteConfiguracion 
          onCerrar={handleCerrarAsistente}
          onCompletar={handleActualizarDispositivo}
        />
      )}

      {/* Información adicional */}
      <div className="info-footer">
        <div className="info-item">
          <span className="info-label">Protocolo:</span>
          <span className="info-value">HTTP REST API</span>
        </div>
        <div className="info-item">
          <span className="info-label">Módulo de Red:</span>
          <span className="info-value">WIZnet W5500</span>
        </div>
        <div className="info-item">
          <span className="info-label">Sensores:</span>
          <span className="info-value">LDR, PIR, ACS712</span>
        </div>
      </div>
    </div>
  );
};

export default GestionUnidades;