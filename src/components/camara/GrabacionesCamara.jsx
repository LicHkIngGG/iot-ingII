import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  onSnapshot,
  Timestamp,
  doc,
  updateDoc
} from 'firebase/firestore';
import L from 'leaflet';
import { db } from '../../utils/firebase';
import 'leaflet/dist/leaflet.css';
//import '/Users/CAPRI/Desktop/a/ViajeSeguro/src/views/vviajes-en-tiempo-real/viajes-tiempo-real.css';
import "../viajes-tiempo-real/viajes-tiempo-real.css"
import "./Camara.css"
// Icono personalizado para los marcadores
const iconoVehiculo = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const VistaViajesTiempoReal = () => {
  // Estados para datos
  const [viajes, setViajes] = useState([]);
  const [posiciones, setPosiciones] = useState([]);
  const [estadisticas, setEstadisticas] = useState([]);
  const [conductores, setConductores] = useState([]);
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroConductor, setFiltroConductor] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Cargar conductores
  useEffect(() => {
    const cargarConductores = async () => {
      try {
        const conductoresQuery = query(
          collection(db, 'conductores'),
          where('estado', '==', 'activo'),
          orderBy('nombre')
        );
        
        const conductoresSnapshot = await getDocs(conductoresQuery);
        const conductoresData = conductoresSnapshot.docs.map(doc => ({
          id: doc.id,
          nombre: doc.data().nombre || 'Sin nombre',
          telefono: doc.data().telefono || '',
          email: doc.data().email || ''
        }));
        
        setConductores(conductoresData);
      } catch (error) {
        console.error("Error al cargar conductores:", error);
        // Datos de ejemplo si falla
        setConductores([
          { id: 'C1', nombre: 'Dilan Cimar', telefono: '123654', email: 'flaquito@gmail.com' },
          { id: 'C2', nombre: 'Ana Martínez', telefono: '987654', email: 'ana@example.com' },
          { id: 'C3', nombre: 'Carlos López', telefono: '456789', email: 'carlos@example.com' }
        ]);
      }
    };
    
    cargarConductores();
  }, []);
  
  // Escuchar viajes en tiempo real
  useEffect(() => {
    const cargarViajes = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Consulta base
        let viajesQuery = query(
          collection(db, 'viajes'),
          orderBy('fecha_inicio', 'desc')
        );
        
        // Aplicar filtro de estado
        if (filtroEstado !== 'todos') {
          viajesQuery = query(viajesQuery, where('estado', '==', filtroEstado));
        }
        
        // Aplicar filtro de conductor
        if (filtroConductor) {
          viajesQuery = query(viajesQuery, where('conductor_id', '==', filtroConductor));
        }
        
        // Suscripción en tiempo real a viajes
        const unsubscribe = onSnapshot(viajesQuery, (querySnapshot) => {
          const viajesData = [];
          
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            // Encontrar nombre del conductor
            const conductor = conductores.find(c => c.id === data.conductor_id);
            
            viajesData.push({
              id: doc.id,
              conductor: conductor ? conductor.nombre : 'Conductor desconocido',
              conductorId: data.conductor_id || '',
              destino: data.destino || 'Sin destino',
              origen: data.origen || 'Sin origen',
              estado: data.estado || 'pendiente',
              fecha: data.fecha_inicio ? formatDate(data.fecha_inicio) : 'Sin fecha',
              tiempoEstimado: data.tiempo_estimado || 0,
              pasajero: data.pasajero || 'Sin pasajero',
              tarifa: data.tarifa || 0
            });
          });
          
          setViajes(viajesData);
          setLoading(false);
        }, (error) => {
          console.error("Error al cargar viajes:", error);
          setError("Error al cargar viajes: " + error.message);
          setLoading(false);
          
          // Datos de prueba en caso de error
          setViajes([
            { id: '1', conductor: 'Dilan Cimar', conductorId: 'C1', destino: 'Centro Comercial', origen: 'Zona Sur', estado: 'en_curso', fecha: '09/04/2025 15:30', tiempoEstimado: 15, pasajero: 'Juan Pérez', tarifa: 25 },
            { id: '2', conductor: 'Ana Martínez', conductorId: 'C2', destino: 'Aeropuerto', origen: 'Centro', estado: 'pendiente', fecha: '09/04/2025 16:00', tiempoEstimado: 30, pasajero: 'María González', tarifa: 40 },
            { id: '3', conductor: 'Carlos López', conductorId: 'C3', destino: 'Universidad', origen: 'Norte', estado: 'completado', fecha: '09/04/2025 14:20', tiempoEstimado: 0, pasajero: 'Roberto Méndez', tarifa: 18 }
          ]);
        });
        
        return () => unsubscribe();
      } catch (error) {
        console.error("Error al configurar la consulta de viajes:", error);
        setError("Error al configurar la consulta: " + error.message);
        setLoading(false);
      }
    };
    
    cargarViajes();
  }, [filtroEstado, filtroConductor, conductores]);
  
  // Cargar posiciones en tiempo real
  useEffect(() => {
    const cargarPosiciones = async () => {
      try {
        // Consulta para posiciones en tiempo real
        const posicionesQuery = query(
          collection(db, 'posiciones_conductores'),
          orderBy('timestamp', 'desc')
        );
        
        const unsubscribe = onSnapshot(posicionesQuery, (querySnapshot) => {
          const posicionesData = [];
          const conductoresIds = new Set(); // Para evitar duplicados
          
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            const conductorId = data.conductor_id;
            
            // Solo tomar la posición más reciente de cada conductor
            if (!conductoresIds.has(conductorId)) {
              conductoresIds.add(conductorId);
              
              // Encontrar nombre del conductor
              const conductor = conductores.find(c => c.id === conductorId);
              
              posicionesData.push({
                id: doc.id,
                lat: data.lat || -16.505,
                lng: data.lng || -68.130,
                conductorId: conductorId,
                conductor: conductor ? conductor.nombre : 'Conductor desconocido',
                velocidad: data.velocidad || 0,
                timestamp: data.timestamp,
                disponible: data.disponible || false
              });
            }
          });
          
          setPosiciones(posicionesData);
        }, (error) => {
          console.error("Error al cargar posiciones:", error);
          
          // Datos de ejemplo en caso de error
          setPosiciones([
            { id: '1', lat: -16.505, lng: -68.130, conductorId: 'C1', conductor: 'Dilan Cimar', velocidad: 30, disponible: true },
            { id: '2', lat: -16.510, lng: -68.125, conductorId: 'C2', conductor: 'Ana Martínez', velocidad: 0, disponible: true },
            { id: '3', lat: -16.500, lng: -68.140, conductorId: 'C3', conductor: 'Carlos López', velocidad: 45, disponible: false }
          ]);
        });
        
        return () => unsubscribe();
      } catch (error) {
        console.error("Error al configurar la consulta de posiciones:", error);
        
        // Datos de ejemplo en caso de error
        setPosiciones([
          { id: '1', lat: -16.505, lng: -68.130, conductorId: 'C1', conductor: 'Dilan Cimar', velocidad: 30, disponible: true },
          { id: '2', lat: -16.510, lng: -68.125, conductorId: 'C2', conductor: 'Ana Martínez', velocidad: 0, disponible: true },
          { id: '3', lat: -16.500, lng: -68.140, conductorId: 'C3', conductor: 'Carlos López', velocidad: 45, disponible: false }
        ]);
      }
    };
    
    cargarPosiciones();
  }, [conductores]);
  
  // Cargar estadísticas
  useEffect(() => {
    const cargarEstadisticas = async () => {
      try {
        // Obtener datos para los últimos 7 días
        const fechaFin = new Date();
        const fechaInicio = new Date();
        fechaInicio.setDate(fechaInicio.getDate() - 7);
        
        const timestampInicio = Timestamp.fromDate(fechaInicio);
        const timestampFin = Timestamp.fromDate(fechaFin);
        
        const viajesQuery = query(
          collection(db, 'viajes'),
          where('fecha_inicio', '>=', timestampInicio),
          where('fecha_inicio', '<=', timestampFin),
          orderBy('fecha_inicio', 'asc')
        );
        
        const viajesSnapshot = await getDocs(viajesQuery);
        
        // Agrupar viajes por fecha
        const viajesPorFecha = {};
        
        viajesSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.fecha_inicio) {
            const fecha = data.fecha_inicio.toDate();
            const fechaStr = fecha.toISOString().split('T')[0]; // YYYY-MM-DD
            
            if (!viajesPorFecha[fechaStr]) {
              viajesPorFecha[fechaStr] = 0;
            }
            
            viajesPorFecha[fechaStr]++;
          }
        });
        
        // Formatear para el gráfico
        const estadisticasData = [];
        
        // Asegurarse de tener datos para todos los días
        for (let i = 0; i < 7; i++) {
          const fecha = new Date(fechaInicio);
          fecha.setDate(fechaInicio.getDate() + i);
          const fechaStr = fecha.toISOString().split('T')[0];
          
          estadisticasData.push({
            fecha: fechaStr,
            viajes: viajesPorFecha[fechaStr] || 0
          });
        }
        
        setEstadisticas(estadisticasData);
      } catch (error) {
        console.error("Error al cargar estadísticas:", error);
        
        // Datos de ejemplo en caso de error
        const hoy = new Date();
        const estadisticasData = [];
        
        for (let i = 6; i >= 0; i--) {
          const fecha = new Date(hoy);
          fecha.setDate(hoy.getDate() - i);
          const fechaStr = fecha.toISOString().split('T')[0];
          
          estadisticasData.push({
            fecha: fechaStr,
            viajes: Math.floor(Math.random() * 20) + 5
          });
        }
        
        setEstadisticas(estadisticasData);
      }
    };
    
    cargarEstadisticas();
    
    // Actualizar estadísticas cada 10 minutos
    const intervalId = setInterval(cargarEstadisticas, 600000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  // Formatear fecha
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Sin fecha';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      
      return date.toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error("Error al formatear fecha:", error);
      return 'Fecha inválida';
    }
  };
  
  // Filtrar viajes según el estado seleccionado
  const viajesFiltrados = viajes.filter(viaje => {
    if (filtroEstado !== 'todos' && viaje.estado !== filtroEstado) {
      return false;
    }
    
    if (filtroConductor && viaje.conductorId !== filtroConductor) {
      return false;
    }
    
    return true;
  });
  
  // Cambiar estado de un viaje
  const cambiarEstadoViaje = async (id, nuevoEstado) => {
    try {
      await updateDoc(doc(db, 'viajes', id), {
        estado: nuevoEstado,
        fecha_actualizacion: Timestamp.now()
      });
      
      // No necesitamos actualizar el estado local porque onSnapshot lo hará automáticamente
    } catch (error) {
      console.error("Error al actualizar estado del viaje:", error);
      setError("Error al actualizar el viaje: " + error.message);
    }
  };
  
  // Simular un nuevo viaje para pruebas
  const agregarNuevoViaje = async () => {
    setLoading(true);
    
    try {
      // Seleccionar conductor aleatorio
      const conductorIndex = Math.floor(Math.random() * conductores.length);
      const conductor = conductores[conductorIndex];
      
      const destinos = ['Centro Comercial', 'Aeropuerto', 'Universidad', 'Hospital', 'Parque Central'];
      const origenes = ['Zona Sur', 'Zona Norte', 'Centro', 'Zona Este', 'Zona Oeste'];
      
      const destinoIndex = Math.floor(Math.random() * destinos.length);
      const origenIndex = Math.floor(Math.random() * origenes.length);
      
      const nuevoViaje = {
        conductor_id: conductor.id,
        destino: destinos[destinoIndex],
        origen: origenes[origenIndex],
        estado: 'pendiente',
        fecha_inicio: Timestamp.now(),
        fecha_actualizacion: Timestamp.now(),
        tiempo_estimado: Math.floor(Math.random() * 30) + 5,
        pasajero: 'Usuario de prueba',
        tarifa: Math.floor(Math.random() * 50) + 10
      };
      
      await addDoc(collection(db, 'viajes'), nuevoViaje);
      
      setLoading(false);
    } catch (error) {
      console.error("Error al crear nuevo viaje:", error);
      setError("Error al crear nuevo viaje: " + error.message);
      setLoading(false);
    }
  };
  
  return (
    <div className="viajes-container">
      <h2>Monitoreo de Viajes en Tiempo Real</h2>
      
      {/* Panel de control */}
      <div className="panel-control">
        <div className="filtros">
          <span>Filtrar por estado: </span>
          <select 
            value={filtroEstado} 
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="select-filtro"
          >
            <option value="todos">Todos</option>
            <option value="pendiente">Pendiente</option>
            <option value="en_curso">En Curso</option>
            <option value="completado">Completado</option>
            <option value="cancelado">Cancelado</option>
          </select>
          
          <span>Conductor: </span>
          <select 
            value={filtroConductor} 
            onChange={(e) => setFiltroConductor(e.target.value)}
            className="select-filtro"
          >
            <option value="">Todos</option>
            {conductores.map(conductor => (
              <option key={conductor.id} value={conductor.id}>
                {conductor.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Mapa de posiciones */}
      <div className="map-section">
        <h3>Ubicación de Conductores</h3>
        <MapContainer center={[-16.505, -68.130]} zoom={13} className="map">
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {posiciones.map((pos) => (
            <Marker 
              key={pos.id} 
              position={[pos.lat, pos.lng]} 
              icon={iconoVehiculo}
            >
              <Popup>
                <div className="popup-info">
                  <strong>{pos.conductor}</strong><br />
                  Velocidad: {pos.velocidad} km/h<br />
                  Estado: {pos.disponible ? 'Disponible' : 'Ocupado'}<br />
                  {pos.velocidad > 0 ? 'En movimiento' : 'Detenido'}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Lista de viajes */}
      <div className="viajes-list-section">
        <h3>Viajes Activos</h3>
        {loading && <div className="loading-message">Cargando viajes...</div>}
        {error && <div className="error-message">{error}</div>}
        
        <ul className="viajes-list">
          {viajesFiltrados.length > 0 ? (
            viajesFiltrados.map((viaje) => (
              <li key={viaje.id} className={`viaje-card ${viaje.estado}`}>
                <div className="viaje-header">
                  <span className="viaje-id">#{viaje.id.substr(0, 6)}</span>
                  <span className={`viaje-estado ${viaje.estado}`}>
                    {viaje.estado.replace('_', ' ')}
                  </span>
                </div>
                <div className="viaje-body">
                  <p><strong>Conductor:</strong> {viaje.conductor}</p>
                  <p><strong>Origen:</strong> {viaje.origen}</p>
                  <p><strong>Destino:</strong> {viaje.destino}</p>
                  <p><strong>Pasajero:</strong> {viaje.pasajero}</p>
                  <p><strong>Fecha:</strong> {viaje.fecha}</p>
                  {viaje.tiempoEstimado > 0 && viaje.estado !== 'completado' && (
                    <p><strong>Tiempo est.:</strong> {viaje.tiempoEstimado} min</p>
                  )}
                  <p><strong>Tarifa:</strong> ${viaje.tarifa}</p>
                </div>
                <div className="viaje-actions">
                  {viaje.estado === 'pendiente' && (
                    <button 
                      onClick={() => cambiarEstadoViaje(viaje.id, 'en_curso')}
                      className="btn-action iniciar"
                    >
                      Iniciar
                    </button>
                  )}
                  {viaje.estado === 'en_curso' && (
                    <button 
                      onClick={() => cambiarEstadoViaje(viaje.id, 'completado')}
                      className="btn-action completar"
                    >
                      Completar
                    </button>
                  )}
                  {(viaje.estado === 'pendiente' || viaje.estado === 'en_curso') && (
                    <button 
                      onClick={() => cambiarEstadoViaje(viaje.id, 'cancelado')}
                      className="btn-action cancelar"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </li>
            ))
          ) : (
            <li className="sin-viajes">No hay viajes que coincidan con los filtros</li>
          )}
        </ul>
      </div>
      
      {/* Gráfico de estadísticas */}
      <div className="grafico-viajes">
        <h3>Historial de Viajes (Últimos 7 días)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={estadisticas}>
            <XAxis dataKey="fecha" />
            <YAxis />
            <Tooltip />
            <Line 
              type="monotone" 
              dataKey="viajes" 
              stroke="#007BFF" 
              strokeWidth={2} 
              dot={{ r: 4 }}
              activeDot={{ r: 6, stroke: '#004a99', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Resumen estadístico */}
      <div className="resumen-estadistico">
        <div className="stat-card">
          <div className="stat-title">Viajes Activos</div>
          <div className="stat-value">{viajes.filter(v => v.estado === 'en_curso').length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Viajes Pendientes</div>
          <div className="stat-value">{viajes.filter(v => v.estado === 'pendiente').length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Viajes Hoy</div>
          <div className="stat-value">{viajes.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Conductores Online</div>
          <div className="stat-value">{posiciones.filter(p => p.disponible).length}</div>
        </div>
      </div>
    </div>
  );
};

export default VistaViajesTiempoReal;