// components/Monitoreo/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { 
  collection, 
  doc, 
  getDocs, 
  updateDoc, 
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { registrarLog } from '../../utils/logUtils';
import { initializeExampleData } from '../../utils/initData';
import { 
  Activity, 
  AlertTriangle, 
  Clock, 
  TrendingUp,
  TrendingDown,
  Wifi,
  WifiOff,
  Bell,
  MapPin,
  Gauge
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
  const [kpis, setKpis] = useState({
    consumoTotal: 0,
    postesActivos: 0,
    totalPostes: 0,
    eficiencia: 0
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Verificar si hay datos, si no, crear datos de ejemplo
        const postesSnapshot = await getDocs(collection(db, 'postes'));
        if (postesSnapshot.empty) {
          console.log('No hay datos, creando datos de ejemplo...');
          await initializeExampleData();
        }
        
        // Cargar datos iniciales
        const [postesData, alertasData, eventosData] = await Promise.all([
          loadPostes(),
          loadAlertas(),
          loadEventos()
        ]);

        setPostes(postesData);
        setAlertas(alertasData);
        setEventos(eventosData);

        // Calcular KPIs
        calculateKPIs(postesData);

        // Suscribirse a cambios en tiempo real
        const unsubscribe = onSnapshot(
          query(collection(db, 'postes'), orderBy('nombre')), 
          (snapshot) => {
            const updatedPostes = snapshot.docs.map(doc => ({ 
              id: doc.id, 
              ...doc.data() 
            }));
            setPostes(updatedPostes);
            calculateKPIs(updatedPostes);
          }
        );

        setLoading(false);
        return unsubscribe;
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const loadPostes = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'postes'));
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error loading postes:', error);
      return [];
    }
  };

  const loadAlertas = async () => {
    try {
      const q = query(collection(db, 'alertas'), orderBy('timestamp', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error loading alertas:', error);
      return [];
    }
  };

  const loadEventos = async () => {
    try {
      const q = query(collection(db, 'eventos'), orderBy('timestamp', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error loading eventos:', error);
      return [];
    }
  };

  const calculateKPIs = (postesData) => {
    const totalPostes = postesData.length;
    const postesActivos = postesData.filter(p => p.estado === 'online').length;
    const consumoTotal = postesData.reduce((sum, p) => sum + (p.consumoActual || 0), 0);
    const eficiencia = totalPostes > 0 ? (postesActivos / totalPostes) * 100 : 0;

    setKpis({
      consumoTotal,
      postesActivos,
      totalPostes,
      eficiencia
    });
  };

  const handleAlertaClick = async (alertaId) => {
    if (userRole === 'admin') {
      try {
        const docRef = doc(db, 'alertas', alertaId);
        await updateDoc(docRef, {
          leida: true,
          fechaLectura: serverTimestamp()
        });
        
        // Actualizar alertas
        const alertasData = await loadAlertas();
        setAlertas(alertasData);

        // Registrar log
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

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Cargando dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1 className="dashboard-title">
          <Activity className="title-icon" />
          Dashboard de Monitoreo
        </h1>
        <div className="dashboard-status">
          <div className="status-indicator online">
            <Wifi className="status-icon" />
            Sistema Online
          </div>
          <div className="last-update">
            <Clock className="update-icon" />
            Última actualización: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* KPIs Section */}
      <div className="dashboard-section">
        <KPICards kpis={kpis} />
      </div>

      {/* Main Content Grid */}
      <div className="dashboard-grid">
        {/* Gráfico en tiempo real */}
        <div className="dashboard-card chart-card">
          <div className="card-header">
            <h3 className="card-title">
              <TrendingUp className="card-icon" />
              Consumo en Tiempo Real
            </h3>
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
              Eventos Recientes
            </h3>
          </div>
          <EventsTimeline eventos={eventos} />
        </div>

        {/* Grid de Postes */}
        <div className="dashboard-card postes-card">
          <div className="card-header">
            <h3 className="card-title">
              <MapPin className="card-icon" />
              Estado de Postes
            </h3>
          </div>
          <PostesGrid postes={postes} userRole={userRole} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;