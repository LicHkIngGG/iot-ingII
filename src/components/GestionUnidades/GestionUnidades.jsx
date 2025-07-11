import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  collection, 
  getDocs, 
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { registrarAccionAdmin } from '../../utils/logUtils';
import SensoresInfo from './SensoresInfo';
import ConfiguracionesList from './ConfiguracionesList';
import ConfiguracionModal from './ConfiguracionModal';
import RedManager from './RedManager';
import MonitoreoTiempoReal from './MonitoreoTiempoReal';
import { 
  Settings,
  Cpu,
  Wifi,
  Activity,
  AlertTriangle,
  CheckCircle,
  WifiOff,
  RefreshCw
} from 'lucide-react';
import './GestionUnidades.css';

const GestionUnidades = ({ userRole }) => {
  const [postes, setPostes] = useState([]);
  const [configuraciones, setConfiguraciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [activeTab, setActiveTab] = useState('configuraciones');
  const [connectionStatus, setConnectionStatus] = useState({});
  const [autoDiscovery, setAutoDiscovery] = useState(false);
  const [networkScan, setNetworkScan] = useState({ scanning: false, devices: [] });
  const wsRef = useRef(null);

  // Configuración inicial por defecto
  const defaultConfig = {
    posteId: '',
    nombrePoste: '',
    ubicacion: '',
    hardware: {
      modelo: 'ESP32-WROOM-32',
      tipoLED: '60W',
      versionFirmware: '1.0.0'
    },
    red: {
      ip: '',
      puerto: 8080,
      gateway: '192.168.1.1',
      subnet: '255.255.255.0',
      dns: '8.8.8.8',
      timeout: 5000,
      intervaloEnvio: 30,
      mac: ''
    },
    sensores: {
      ldr: {
        habilitado: true,
        umbralEncendido: 100,
        umbralApagado: 300,
        factorCalibracion: 1.0,
        filtroRuido: 5
      },
      pir: {
        habilitado: true,
        sensibilidad: 'media',
        tiempoActivacion: 30,
        rangoDeteccion: 5,
        retardoLectura: 2
      },
      acs712: {
        habilitado: true,
        modelo: '20A',
        voltajeReferencia: 2.5,
        sensibilidad: 100,
        filtroPromedio: 10,
        alertaMaxima: 20
      }
    },
    automatizacion: {
      habilitada: true,
      modo: 'inteligente',
      reglas: {
        ldrAutomatico: true,
        pirAutomatico: true,
        horarioFijo: false,
        sobreescribirManual: false
      },
      horarios: {
        habilitado: true,
        encendidoForzado: '18:00',
        apagadoForzado: '06:00',
        dimmerNocturno: {
          habilitado: false,
          hora: '22:00',
          intensidad: 60
        }
      }
    },
    alertas: {
      habilitadas: true,
      tipos: {
        desconexion: true,
        sensorFalla: true,
        consumoAnormal: true,
        voltajeBajo: true
      },
      umbrales: {
        tiempoDesconexion: 300,
        consumoMaximo: 400,
        voltajeMinimo: 200
      }
    }
  };

  // WebSocket para comunicación con dispositivos
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      wsRef.current = new WebSocket('ws://192.168.1.100:8080/ws');
      
      wsRef.current.onopen = () => {
        console.log('WebSocket conectado para gestión de unidades');
        // Solicitar lista de dispositivos
        wsRef.current.send(JSON.stringify({
          type: 'request_device_list',
          requester: 'gestion_unidades'
        }));
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket desconectado');
        setTimeout(connectWebSocket, 5000); // Reconectar en 5 segundos
      };

    } catch (error) {
      console.error('Error connecting WebSocket:', error);
    }
  }, []);

  // Manejar mensajes WebSocket
  const handleWebSocketMessage = (data) => {
    switch (data.type) {
      case 'device_list':
        updateDeviceList(data.devices);
        break;
      case 'device_discovered':
        handleDeviceDiscovered(data.device);
        break;
      case 'configuration_applied':
        handleConfigurationApplied(data);
        break;
      case 'device_status':
        updateDeviceStatus(data);
        break;
      default:
        console.log('Mensaje WebSocket no reconocido:', data);
    }
  };

  // Actualizar lista de dispositivos
  const updateDeviceList = (devices) => {
    const statusMap = {};
    devices.forEach(device => {
      statusMap[device.id] = {
        online: device.online,
        ip: device.ip,
        lastSeen: new Date(device.lastSeen),
        uptime: device.uptime,
        version: device.version
      };
    });
    setConnectionStatus(statusMap);
  };

  // Manejar dispositivo descubierto
  const handleDeviceDiscovered = async (device) => {
    if (autoDiscovery) {
      try {
        // Crear configuración automática para dispositivo nuevo
        const newConfig = {
          ...defaultConfig,
          posteId: device.id,
          nombrePoste: `Poste ${device.id}`,
          ubicacion: `Detectado automáticamente - IP: ${device.ip}`,
          red: {
            ...defaultConfig.red,
            ip: device.ip,
            mac: device.mac
          },
          hardware: {
            ...defaultConfig.hardware,
            numeroSerie: device.id,
            versionFirmware: device.version || '1.0.0'
          }
        };

        await setDoc(doc(db, 'configuracionSensores', device.id), {
          ...newConfig,
          fechaCreacion: serverTimestamp(),
          creadoPor: 'auto_discovery',
          estado: 'activo'
        });

        await registrarAccionAdmin(
          'sistema',
          'auto_discovery',
          'Dispositivo auto-descubierto',
          `Nuevo dispositivo ESP32 detectado: ${device.ip}`,
          'Auto-configuración',
          'exitoso'
        );

      } catch (error) {
        console.error('Error en auto-discovery:', error);
      }
    }
  };

  // Manejar configuración aplicada
  const handleConfigurationApplied = (data) => {
    console.log(`Configuración aplicada a ${data.deviceId}:`, data.success);
    if (data.success) {
      // Actualizar estado local
      setConfiguraciones(prev => prev.map(config => 
        config.posteId === data.deviceId 
          ? { ...config, estado: 'aplicado', ultimaActualizacion: new Date() }
          : config
      ));
    }
  };

  // Actualizar estado de dispositivo
  const updateDeviceStatus = (data) => {
    setConnectionStatus(prev => ({
      ...prev,
      [data.deviceId]: {
        ...prev[data.deviceId],
        online: data.online,
        lastSeen: new Date(),
        uptime: data.uptime
      }
    }));
  };

  // Cargar datos iniciales
  useEffect(() => {
    loadData();
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connectWebSocket]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Cargar postes
      const postesSnapshot = await getDocs(collection(db, 'postes'));
      const postesData = postesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPostes(postesData);

      // Suscribirse a configuraciones
      const unsubscribe = onSnapshot(
        collection(db, 'configuracionSensores'),
        (snapshot) => {
          const configData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setConfiguraciones(configData);
          setLoading(false);
        },
        (error) => {
          console.error('Error cargando configuraciones:', error);
          setLoading(false);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  // Aplicar configuración a dispositivo ESP32
  const aplicarConfiguracion = async (config) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        const configMessage = {
          type: 'apply_configuration',
          deviceId: config.posteId,
          configuration: {
            sensors: config.sensores,
            automation: config.automatizacion,
            network: config.red,
            alerts: config.alertas
          }
        };

        wsRef.current.send(JSON.stringify(configMessage));

        // Actualizar estado en Firebase
        await updateDoc(doc(db, 'configuracionSensores', config.id), {
          estado: 'enviando',
          ultimaActualizacion: serverTimestamp()
        });

        await registrarAccionAdmin(
          userRole,
          localStorage.getItem('userEmail') || 'admin',
          'Aplicar configuración',
          `Configuración enviada a dispositivo ${config.nombrePoste}`,
          'Configuración',
          'exitoso'
        );

      } catch (error) {
        console.error('Error aplicando configuración:', error);
      }
    } else {
      alert('No hay conexión WebSocket con los dispositivos');
    }
  };

  // Escanear red en busca de dispositivos ESP32
  const escanearRed = async () => {
    setNetworkScan({ scanning: true, devices: [] });
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'network_scan',
        range: '192.168.1.1-254'
      }));

      // Simular escaneo progresivo
      setTimeout(() => {
        setNetworkScan({ 
          scanning: false, 
          devices: [
            { ip: '192.168.1.101', mac: 'AA:BB:CC:DD:EE:01', status: 'responding' },
            { ip: '192.168.1.102', mac: 'AA:BB:CC:DD:EE:02', status: 'responding' },
            { ip: '192.168.1.103', mac: 'AA:BB:CC:DD:EE:03', status: 'timeout' }
          ]
        });
      }, 3000);
    }
  };

  // Reiniciar dispositivo
  const reiniciarDispositivo = async (config) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'restart_device',
        deviceId: config.posteId
      }));

      await registrarAccionAdmin(
        userRole,
        localStorage.getItem('userEmail') || 'admin',
        'Reiniciar dispositivo',
        `Dispositivo ${config.nombrePoste} reiniciado remotamente`,
        'Control',
        'exitoso'
      );
    }
  };

  // Abrir modal para nueva configuración
  const abrirNuevaConfiguracion = () => {
    setSelectedConfig({ ...defaultConfig });
    setEditMode(false);
    setModalVisible(true);
  };

  // Abrir modal para editar configuración
  const editarConfiguracion = (config) => {
    setSelectedConfig(config);
    setEditMode(true);
    setModalVisible(true);
  };

  // Eliminar configuración
  const eliminarConfiguracion = async (config) => {
    if (window.confirm(`¿Eliminar configuración de ${config.nombrePoste}?`)) {
      try {
        await deleteDoc(doc(db, 'configuracionSensores', config.id));
        
        await registrarAccionAdmin(
          userRole,
          localStorage.getItem('userEmail') || 'admin',
          'Eliminar configuración',
          `Configuración eliminada: ${config.nombrePoste}`,
          'Configuración',
          'exitoso'
        );
      } catch (error) {
        console.error('Error eliminando configuración:', error);
        alert('Error al eliminar la configuración');
      }
    }
  };

  // Cerrar modal
  const cerrarModal = () => {
    setModalVisible(false);
    setSelectedConfig(null);
    setEditMode(false);
  };

  if (loading) {
    return (
      <div className="gestion-loading">
        <div className="loading-spinner"></div>
        <p>Cargando gestión de unidades...</p>
      </div>
    );
  }

  return (
    <div className="gestion-unidades">
      {/* Header */}
      <div className="gestion-header">
        <div className="header-title">
          <Settings className="header-icon" />
          <h1>Gestión de Unidades IoT</h1>
        </div>
        <div className="header-actions">
          <div className="connection-indicator">
            {wsRef.current?.readyState === WebSocket.OPEN ? (
              <div className="status-online">
                <Wifi className="status-icon" />
                <span>Sistema Conectado</span>
              </div>
            ) : (
              <div className="status-offline">
                <WifiOff className="status-icon" />
                <span>Sistema Desconectado</span>
              </div>
            )}
          </div>
          
          <button 
            className="btn-secondary"
            onClick={escanearRed}
            disabled={networkScan.scanning}
          >
            <RefreshCw className={`btn-icon ${networkScan.scanning ? 'spinning' : ''}`} />
            {networkScan.scanning ? 'Escaneando...' : 'Escanear Red'}
          </button>
          
          <button 
            className="btn-primary"
            onClick={abrirNuevaConfiguracion}
          >
            <Settings className="btn-icon" />
            Nueva Configuración
          </button>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon devices">
            <Cpu className="icon" />
          </div>
          <div className="stat-content">
            <h3>{configuraciones.length}</h3>
            <p>Dispositivos Configurados</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon online">
            <CheckCircle className="icon" />
          </div>
          <div className="stat-content">
            <h3>{Object.values(connectionStatus).filter(s => s.online).length}</h3>
            <p>Dispositivos Online</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon offline">
            <AlertTriangle className="icon" />
          </div>
          <div className="stat-content">
            <h3>{Object.values(connectionStatus).filter(s => !s.online).length}</h3>
            <p>Dispositivos Offline</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon activity">
            <Activity className="icon" />
          </div>
          <div className="stat-content">
            <h3>{configuraciones.filter(c => c.estado === 'activo').length}</h3>
            <p>Configuraciones Activas</p>
          </div>
        </div>
      </div>

      {/* Tabs de navegación */}
      <div className="tabs-container">
        <div className="tabs-nav">
          <button 
            className={`tab-btn ${activeTab === 'configuraciones' ? 'active' : ''}`}
            onClick={() => setActiveTab('configuraciones')}
          >
            <Settings className="tab-icon" />
            Configuraciones
          </button>
          <button 
            className={`tab-btn ${activeTab === 'sensores' ? 'active' : ''}`}
            onClick={() => setActiveTab('sensores')}
          >
            <Activity className="tab-icon" />
            Sensores
          </button>
          <button 
            className={`tab-btn ${activeTab === 'red' ? 'active' : ''}`}
            onClick={() => setActiveTab('red')}
          >
            <Wifi className="tab-icon" />
            Red
          </button>
          <button 
            className={`tab-btn ${activeTab === 'monitoreo' ? 'active' : ''}`}
            onClick={() => setActiveTab('monitoreo')}
          >
            <Cpu className="tab-icon" />
            Monitoreo
          </button>
        </div>

        {/* Auto-discovery toggle */}
        <div className="auto-discovery">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={autoDiscovery}
              onChange={(e) => setAutoDiscovery(e.target.checked)}
            />
            <span className="toggle-slider"></span>
            Auto-descubrimiento
          </label>
        </div>
      </div>

      {/* Contenido de tabs */}
      <div className="tab-content">
        {activeTab === 'configuraciones' && (
          <ConfiguracionesList
            configuraciones={configuraciones}
            postes={postes}
            connectionStatus={connectionStatus}
            onEditar={editarConfiguracion}
            onEliminar={eliminarConfiguracion}
            onAplicar={aplicarConfiguracion}
            onReiniciar={reiniciarDispositivo}
            userRole={userRole}
          />
        )}

        {activeTab === 'sensores' && (
          <SensoresInfo
            configuraciones={configuraciones}
            connectionStatus={connectionStatus}
          />
        )}

        {activeTab === 'red' && (
          <RedManager
            configuraciones={configuraciones}
            connectionStatus={connectionStatus}
            networkScan={networkScan}
            onEscanear={escanearRed}
            wsRef={wsRef}
          />
        )}

        {activeTab === 'monitoreo' && (
          <MonitoreoTiempoReal
            configuraciones={configuraciones}
            connectionStatus={connectionStatus}
            wsRef={wsRef}
          />
        )}
      </div>

      {/* Modal de configuración */}
      {modalVisible && (
        <ConfiguracionModal
          visible={modalVisible}
          config={selectedConfig}
          editMode={editMode}
          postes={postes}
          configuraciones={configuraciones}
          onSave={async (configData) => {
            try {
              if (editMode) {
                await updateDoc(doc(db, 'configuracionSensores', selectedConfig.id), {
                  ...configData,
                  ultimaActualizacion: serverTimestamp()
                });
                
                await registrarAccionAdmin(
                  userRole,
                  localStorage.getItem('userEmail') || 'admin',
                  'Actualizar configuración',
                  `Configuración actualizada: ${configData.nombrePoste}`,
                  'Configuración',
                  'exitoso'
                );
              } else {
                await setDoc(doc(db, 'configuracionSensores', configData.posteId), {
                  ...configData,
                  fechaCreacion: serverTimestamp(),
                  estado: 'activo'
                });
                
                await registrarAccionAdmin(
                  userRole,
                  localStorage.getItem('userEmail') || 'admin',
                  'Crear configuración',
                  `Nueva configuración: ${configData.nombrePoste}`,
                  'Configuración',
                  'exitoso'
                );
              }
              
              cerrarModal();
            } catch (error) {
              console.error('Error guardando configuración:', error);
              alert('Error al guardar la configuración');
            }
          }}
          onClose={cerrarModal}
        />
      )}
    </div>
  );
};

export default GestionUnidades;