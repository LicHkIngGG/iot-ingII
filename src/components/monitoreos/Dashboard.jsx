import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  collection, 
  doc, 
  getDocs, 
  updateDoc, 
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  addDoc,
  where
} from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { registrarLog } from '../../utils/logUtils';
import { 
  Activity, 
  AlertTriangle, 
  Clock, 
  Wifi,
  WifiOff,
  Bell,
  MapPin,
  Gauge,
  RefreshCw
} from 'lucide-react';
import KPICards from './KPICards';
import AlertCenter from './AlertCenter';
import RealtimeChart from './RealtimeChart';
import EventsTimeline from './EventsTimeline';
import PostesGrid from './PostesGrid';
import './Dashboard.css';

const Dashboard = ({ userRole }) => {
  const [postes, setPostes] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  // WebSocket para comunicación en tiempo real con ESP32
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      // Configurar WebSocket para recibir datos de ESP32
      wsRef.current = new WebSocket('ws://192.168.1.100:8080/ws');
      
      wsRef.current.onopen = () => {
        console.log('WebSocket conectado');
        setConnectionStatus('connected');
        setReconnectAttempts(0);
        
        // Enviar heartbeat cada 30 segundos
        const heartbeatInterval = setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              type: 'heartbeat',
              timestamp: new Date().toISOString()
            }));
          }
        }, 30000);

        // Solicitar estado inicial de todos los dispositivos
        wsRef.current.send(JSON.stringify({
          type: 'request_all_status',
          requester: 'dashboard'
        }));
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
          setLastUpdate(new Date());
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket desconectado');
        setConnectionStatus('disconnected');
        
        // Reconectar automáticamente con backoff exponencial
        if (reconnectAttempts < 5) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts(prev => prev + 1);
            connectWebSocket();
          }, delay);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
      };

    } catch (error) {
      console.error('Error connecting WebSocket:', error);
      setConnectionStatus('error');
    }
  }, [reconnectAttempts]);

  // Manejar mensajes del WebSocket
  const handleWebSocketMessage = async (data) => {
    switch (data.type) {
      case 'sensor_data':
        await updatePosteData(data);
        break;
      case 'device_status':
        await updateDeviceStatus(data);
        break;
      case 'alert':
        await createAlert(data);
        break;
      case 'event':
        await createEvent(data);
        break;
      case 'all_devices_status':
        await updateAllDevicesStatus(data.devices);
        break;
      default:
        console.log('Mensaje WebSocket no reconocido:', data);
    }
  };

  // Actualizar datos de sensores de un poste
  const updatePosteData = async (data) => {
    const { posteId, sensores, calculados } = data;
    
    try {
      const posteRef = doc(db, 'postes', posteId);
      const updateData = {
        sensores: {
          ...sensores,
          ultimaActualizacion: serverTimestamp()
        },
        calculados: {
          ...calculados,
          ultimaActualizacion: serverTimestamp()
        },
        estado: {
          online: true,
          ultimaConexion: serverTimestamp(),
          ultimaActualizacion: serverTimestamp()
        }
      };

      await updateDoc(posteRef, updateData);

      // Actualizar estado local
      setPostes(prev => prev.map(poste => 
        poste.id === posteId 
          ? { ...poste, ...updateData }
          : poste
      ));

      // Verificar alertas automáticas
      await checkAutomaticAlerts(posteId, sensores, calculados);

    } catch (error) {
      console.error('Error updating poste data:', error);
    }
  };

  // Actualizar estado de dispositivo
  const updateDeviceStatus = async (data) => {
    const { posteId, status, uptime, reconnections } = data;
    
    try {
      const posteRef = doc(db, 'postes', posteId);
      await updateDoc(posteRef, {
        'estado.online': status === 'online',
        'estado.uptime': uptime,
        'estado.reconexiones': reconnections,
        'estado.ultimaConexion': serverTimestamp()
      });

      setPostes(prev => prev.map(poste => 
        poste.id === posteId 
          ? { 
              ...poste, 
              estado: {
                ...poste.estado,
                online: status === 'online',
                uptime,
                reconexiones: reconnections,
                ultimaConexion: new Date()
              }
            }
          : poste
      ));

    } catch (error) {
      console.error('Error updating device status:', error);
    }
  };

  // Actualizar estado de todos los dispositivos
  const updateAllDevicesStatus = async (devices) => {
    try {
      const updates = devices.map(async (device) => {
        const posteRef = doc(db, 'postes', device.id);
        return updateDoc(posteRef, {
          sensores: device.sensores,
          calculados: device.calculados,
          estado: {
            ...device.estado,
            ultimaActualizacion: serverTimestamp()
          }
        });
      });

      await Promise.all(updates);

      // Actualizar estado local
      setPostes(prev => prev.map(poste => {
        const updatedDevice = devices.find(d => d.id === poste.id);
        return updatedDevice ? { ...poste, ...updatedDevice } : poste;
      }));

    } catch (error) {
      console.error('Error updating all devices:', error);
    }
  };

  // Verificar alertas automáticas
  const checkAutomaticAlerts = async (posteId, sensores, calculados) => {
    const alertsToCreate = [];

    // Verificar sensores no funcionando
    if (sensores.ldr && !sensores.ldr.funcionando) {
      alertsToCreate.push({
        tipo: 'sensor',
        severidad: 'high',
        mensaje: 'Sensor LDR no responde',
        posteId,
        detalles: 'El sensor de luminosidad no está funcionando correctamente'
      });
    }

    if (sensores.pir && !sensores.pir.funcionando) {
      alertsToCreate.push({
        tipo: 'sensor',
        severidad: 'medium',
        mensaje: 'Sensor PIR no responde',
        posteId,
        detalles: 'El sensor de movimiento no está funcionando correctamente'
      });
    }

    if (sensores.acs712 && !sensores.acs712.funcionando) {
      alertsToCreate.push({
        tipo: 'sensor',
        severidad: 'high',
        mensaje: 'Sensor ACS712 no responde',
        posteId,
        detalles: 'El sensor de corriente no está funcionando correctamente'
      });
    }

    // Verificar consumo anormal
    const consumoEsperado = 60 * 0.22; // 60W por ~22 horas
    if (calculados.consumoHoy > consumoEsperado * 1.3) {
      alertsToCreate.push({
        tipo: 'consumo',
        severidad: 'high',
        mensaje: 'Consumo anormalmente alto',
        posteId,
        detalles: `Consumo actual: ${calculados.consumoHoy}kWh, esperado: ${consumoEsperado.toFixed(2)}kWh`
      });
    }

    // Crear alertas en Firebase
    for (const alert of alertsToCreate) {
      await createAlert(alert);
    }
  };

  // Crear alerta
  const createAlert = async (alertData) => {
    try {
      const alertaRef = await addDoc(collection(db, 'alertas'), {
        ...alertData,
        timestamp: serverTimestamp(),
        leida: false,
        fechaCreacion: serverTimestamp()
      });

      // Actualizar estado local
      const newAlert = {
        id: alertaRef.id,
        ...alertData,
        timestamp: new Date(),
        leida: false
      };

      setAlertas(prev => [newAlert, ...prev]);

      // Registrar evento
      await createEvent({
        tipo: 'sistema',
        evento: 'Alerta generada',
        posteId: alertData.posteId,
        detalles: alertData.mensaje,
        severidad: alertData.severidad
      });

    } catch (error) {
      console.error('Error creating alert:', error);
    }
  };

  // Crear evento
  const createEvent = async (eventData) => {
    try {
      const eventoRef = await addDoc(collection(db, 'eventos'), {
        ...eventData,
        timestamp: serverTimestamp(),
        usuario: localStorage.getItem('userEmail') || 'sistema'
      });

      const newEvent = {
        id: eventoRef.id,
        ...eventData,
        timestamp: new Date(),
        usuario: localStorage.getItem('userEmail') || 'sistema'
      };

      setEventos(prev => [newEvent, ...prev.slice(0, 49)]); // Mantener últimos 50

    } catch (error) {
      console.error('Error creating event:', error);
    }
  };

  // Cargar datos iniciales
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        
        // Cargar postes
        const postesSnapshot = await getDocs(
          query(collection(db, 'postes'), orderBy('nombre'))
        );
        const postesData = postesSnapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        }));

        // Cargar alertas recientes
        const alertasSnapshot = await getDocs(
          query(
            collection(db, 'alertas'), 
            orderBy('timestamp', 'desc')
          )
        );
        const alertasData = alertasSnapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        })).slice(0, 50); // Últimas 50 alertas

        // Cargar eventos recientes
        const eventosSnapshot = await getDocs(
          query(
            collection(db, 'eventos'), 
            orderBy('timestamp', 'desc')
          )
        );
        const eventosData = eventosSnapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        })).slice(0, 100); // Últimos 100 eventos

        setPostes(postesData);
        setAlertas(alertasData);
        setEventos(eventosData);

        // Conectar WebSocket después de cargar datos
        connectWebSocket();

        setLoading(false);

      } catch (error) {
        console.error('Error loading initial data:', error);
        setLoading(false);
      }
    };

    loadInitialData();

    // Cleanup
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connectWebSocket]);

  // Suscribirse a cambios en Firebase
  useEffect(() => {
    const unsubscribePostes = onSnapshot(
      query(collection(db, 'postes'), orderBy('nombre')), 
      (snapshot) => {
        const updatedPostes = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        }));
        setPostes(updatedPostes);
      }
    );

    const unsubscribeAlertas = onSnapshot(
      query(collection(db, 'alertas'), orderBy('timestamp', 'desc')), 
      (snapshot) => {
        const updatedAlertas = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        })).slice(0, 50);
        setAlertas(updatedAlertas);
      }
    );

    return () => {
      unsubscribePostes();
      unsubscribeAlertas();
    };
  }, []);

  // Manejar click en alerta
  const handleAlertaClick = async (alertaId) => {
    if (userRole === 'administrador') {
      try {
        const docRef = doc(db, 'alertas', alertaId);
        await updateDoc(docRef, {
          leida: true,
          fechaLectura: serverTimestamp()
        });
        
        setAlertas(prev => prev.map(alerta => 
          alerta.id === alertaId 
            ? { ...alerta, leida: true, fechaLectura: new Date() }
            : alerta
        ));

        await registrarLog(
          'sistema',
          localStorage.getItem('userEmail') || 'admin',
          'marcar_alerta_leida',
          `Alerta ${alertaId} marcada como leída`,
          'monitoreo',
          'exitoso'
        );
      } catch (error) {
        console.error('Error marking alert as read:', error);
      }
    }
  };

  // Forzar reconexión
  const forceReconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    setReconnectAttempts(0);
    connectWebSocket();
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Cargando dashboard...</p>
        <p className="loading-subtitle">Conectando con dispositivos IoT...</p>
      </div>
    );
  }

  const connectionStatusIcon = connectionStatus === 'connected' ? Wifi : WifiOff;
  const connectionStatusColor = connectionStatus === 'connected' ? 'online' : 'offline';

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1 className="dashboard-title">
          <Activity className="title-icon" />
          Dashboard de Monitoreo IoT
        </h1>
        <div className="dashboard-status">
          <div className={`status-indicator ${connectionStatusColor}`}>
            {React.createElement(connectionStatusIcon, { className: 'status-icon' })}
            {connectionStatus === 'connected' ? 'Sistema Online' : 'Sistema Offline'}
            {reconnectAttempts > 0 && (
              <span className="reconnect-attempts">
                (Reintento {reconnectAttempts}/5)
              </span>
            )}
          </div>
          <div className="last-update">
            <Clock className="update-icon" />
            Última actualización: {lastUpdate.toLocaleTimeString()}
          </div>
          {connectionStatus !== 'connected' && (
            <button 
              className="reconnect-button"
              onClick={forceReconnect}
              title="Forzar reconexión"
            >
              <RefreshCw className="reconnect-icon" />
            </button>
          )}
        </div>
      </div>

      {/* KPIs Section */}
      <div className="dashboard-section">
        <KPICards postes={postes} isLoading={loading} />
      </div>

      {/* Main Content Grid */}
      <div className="dashboard-grid">
        {/* Gráfico en tiempo real */}
        <div className="dashboard-card chart-card">
          <div className="card-header">
            <h3 className="card-title">
              <Gauge className="card-icon" />
              Monitoreo en Tiempo Real
            </h3>
            <div className="card-status">
              {connectionStatus === 'connected' && (
                <span className="realtime-indicator">
                  <span className="pulse-dot"></span>
                  En vivo
                </span>
              )}
            </div>
          </div>
          <RealtimeChart postes={postes} />
        </div>

        {/* Centro de Alertas */}
        <div className="dashboard-card alerts-card">
          <div className="card-header">
            <h3 className="card-title">
              <Bell className="card-icon" />
              Centro de Alertas
              {alertas.filter(a => !a.leida).length > 0 && (
                <span className="alert-badge">
                  {alertas.filter(a => !a.leida).length}
                </span>
              )}
            </h3>
          </div>
          <AlertCenter 
            alertas={alertas} 
            onAlertaClick={handleAlertaClick}
            userRole={userRole}
          />
        </div>

        {/* Timeline de Eventos */}
        <div className="dashboard-card events-card">
          <div className="card-header">
            <h3 className="card-title">
              <Clock className="card-icon" />
              Eventos del Sistema
            </h3>
          </div>
          <EventsTimeline eventos={eventos} />
        </div>

        {/* Grid de Postes */}
        <div className="dashboard-card postes-card">
          <div className="card-header">
            <h3 className="card-title">
              <MapPin className="card-icon" />
              Estado de Dispositivos IoT
            </h3>
            <div className="card-subtitle">
              {postes.filter(p => p.estado?.online).length} de {postes.length} conectados
            </div>
          </div>
          <PostesGrid postes={postes} userRole={userRole} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;