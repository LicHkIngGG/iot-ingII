import React, { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  updateDoc, 
  doc, 
  getDoc, 
  deleteDoc, 
  setDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../utils/firebase';
import './solicitudes-conductores.css';

const VistaSolicitudesConductores = () => {
  const [solicitudes, setSolicitudes] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedConductor, setSelectedConductor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Establecer un usuario predeterminado para evitar la validación
  const currentUser = {
    uid: 'sistema',
    email: 'sistema@app.com'
  };

  // Cargar solicitudes desde Firestore
  useEffect(() => {
    const obtenerSolicitudes = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'solicitudes_conductores'));
        const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSolicitudes(docs);
      } catch (error) {
        console.error("Error al obtener solicitudes:", error);
        setError("Error al cargar solicitudes: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    obtenerSolicitudes();
  }, []);

  // Abrir modal con detalles del conductor seleccionado
  const openModal = (conductor) => {
    setSelectedConductor(conductor);
    setModalOpen(true);
  };

  // Cerrar modal
  const closeModal = () => {
    setSelectedConductor(null);
    setModalOpen(false);
  };

  // Función para formatear fecha
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Fecha desconocida';
    
    try {
      // Puede ser un objeto Timestamp de Firestore o un string
      const date = typeof timestamp === 'string' 
        ? new Date(timestamp) 
        : timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      
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

  // Función para aceptar conductor
  const aceptarConductor = async (id) => {
    try {
      // Obtener el documento de la solicitud
      const solicitudDocRef = doc(db, 'solicitudes_conductores', id);
      const solicitudDoc = await getDoc(solicitudDocRef);
      
      if (!solicitudDoc.exists()) {
        console.error("Documento de solicitud no encontrado");
        return;
      }
      
      const conductorData = solicitudDoc.data();

      // Crear el documento en la colección "conductores"
      const nuevoConductor = {
        nombre: conductorData.nombre || "",
        email: conductorData.email || "",
        telefono: conductorData.telefono || "",
        direccion: conductorData.direccion || "",
        licencia_categoria: conductorData.licencia_categoria || "",
        placa_vehiculo: conductorData.placa_vehiculo || "",
        modelo_vehiculo: conductorData.modelo_vehiculo || "",
        foto_perfil: conductorData.foto_perfil || "",
        licenciaURL: conductorData.licenciaURL || "",
        test_psicotecnico: conductorData.test_psicotecnico || "",
        comentarios_adicionales: conductorData.comentarios_adicionales || "",
        estado: "activo",
        fecha_registro: serverTimestamp(),
        fecha_solicitud: conductorData.fecha_solicitud || serverTimestamp(),
        aprobado_por: currentUser.email,
        calificacion_promedio: 0,
        viajes_completados: 0
      };

      // Usar el mismo ID para mantener consistencia
      await setDoc(doc(db, 'conductores', id), nuevoConductor);

      // Actualizar estado de la solicitud en lugar de eliminarla
      await updateDoc(solicitudDocRef, { 
        estado: "aprobado",
        fecha_aprobacion: serverTimestamp() 
      });

      // Actualizar el estado local
      setSolicitudes(prev => prev.map(c => 
        c.id === id ? { ...c, estado: "aprobado" } : c
      ));
      
      closeModal();
      alert(`La solicitud de ${conductorData.nombre} ha sido aprobada con éxito.`);
    } catch (error) {
      console.error("Error al aceptar conductor:", error);
      alert("Ha ocurrido un error al procesar la solicitud.");
    }
  };

  // Función para rechazar conductor
  const rechazarConductor = async (id) => {
    try {
      const solicitudDocRef = doc(db, 'solicitudes_conductores', id);
      const solicitudDoc = await getDoc(solicitudDocRef);
      
      if (!solicitudDoc.exists()) {
        console.error("Documento de solicitud no encontrado");
        return;
      }
      
      const conductorData = solicitudDoc.data();
      
      // Actualizar el estado a "rechazado"
      await updateDoc(solicitudDocRef, { 
        estado: "rechazado",
        fecha_rechazo: serverTimestamp(),
        rechazado_por: currentUser.email
      });
      
      // Actualizar el estado local
      setSolicitudes(prev => prev.map(c => 
        c.id === id ? { ...c, estado: "rechazado" } : c
      ));
      
      closeModal();
      alert(`La solicitud de ${conductorData.nombre} ha sido rechazada.`);
    } catch (error) {
      console.error("Error al rechazar conductor:", error);
      alert("Ha ocurrido un error al procesar la solicitud.");
    }
  };

  return (
    <div className="solicitudes-conductores-container">
      <h2>Solicitudes de Conductores</h2>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Cargando solicitudes...</p>
        </div>
      ) : solicitudes.length === 0 ? (
        <div className="no-data-message">
          <i className="fa fa-search"></i>
          <p>No hay solicitudes pendientes.</p>
        </div>
      ) : (
        <div className="solicitudes-grid">
          {solicitudes.map((conductor) => (
            <div key={conductor.id} className={`solicitud-card estado-${conductor.estado?.toLowerCase() || 'pendiente'}`}>
              <div className="conductor-header">
                {conductor.foto_perfil ? (
                  <div className="conductor-avatar" style={{ backgroundImage: `url(${conductor.foto_perfil})` }}></div>
                ) : (
                  <div className="conductor-avatar default-avatar">
                    {conductor.nombre?.slice(0, 1) || "C"}
                  </div>
                )}
                <h3>{conductor.nombre || "Sin nombre"}</h3>
              </div>
              
              <div className="conductor-info">
                <p><i className="fa fa-envelope"></i> {conductor.email || "Sin email"}</p>
                <p><i className="fa fa-phone"></i> {conductor.telefono || "Sin teléfono"}</p>
                <p><i className="fa fa-car"></i> {conductor.modelo_vehiculo || "Sin vehículo"} ({conductor.placa_vehiculo || "Sin placa"})</p>
                <p><i className="fa fa-id-card"></i> Licencia: {conductor.licencia_categoria || "No especificada"}</p>
                <p><i className="fa fa-calendar"></i> Solicitud: {formatDate(conductor.fecha_solicitud)}</p>
                <p className="conductor-estado">
                  <i className="fa fa-check-circle"></i> 
                  <span className={`estado-badge ${conductor.estado?.toLowerCase() || 'pendiente'}`}>
                    {conductor.estado || "Pendiente"}
                  </span>
                </p>
              </div>
              
              <div className="conductor-actions">
                <button 
                  className="btn-ver-mas" 
                  onClick={() => openModal(conductor)}
                >
                  Ver Detalles
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal para mostrar detalles de la solicitud */}
      {modalOpen && selectedConductor && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <span className="close-modal" onClick={closeModal}>&times;</span>
            
            <div className="modal-header">
              <h3>Detalles de la Solicitud</h3>
              <span className={`estado-badge ${selectedConductor.estado?.toLowerCase() || 'pendiente'}`}>
                {selectedConductor.estado || "Pendiente"}
              </span>
            </div>
            
            <div className="conductor-profile">
              {selectedConductor.foto_perfil ? (
                <img 
                  src={selectedConductor.foto_perfil} 
                  alt={selectedConductor.nombre} 
                  className="conductor-photo"
                />
              ) : (
                <div className="conductor-photo default-photo">
                  {selectedConductor.nombre?.slice(0, 1) || "C"}
                </div>
              )}
              <h4>{selectedConductor.nombre || "Sin nombre"}</h4>
            </div>
            
            <div className="modal-body">
              <div className="info-section">
                <h5>Información Personal</h5>
                <p><strong>Email:</strong> {selectedConductor.email || "No especificado"}</p>
                <p><strong>Teléfono:</strong> {selectedConductor.telefono || "No especificado"}</p>
                <p><strong>Dirección:</strong> {selectedConductor.direccion || "No especificada"}</p>
              </div>
              
              <div className="info-section">
                <h5>Información del Vehículo</h5>
                <p><strong>Modelo:</strong> {selectedConductor.modelo_vehiculo || "No especificado"}</p>
                <p><strong>Placa:</strong> {selectedConductor.placa_vehiculo || "No especificada"}</p>
              </div>
              
              <div className="info-section">
                <h5>Licencia y Documentos</h5>
                <p><strong>Categoría:</strong> {selectedConductor.licencia_categoria || "No especificada"}</p>
                <p><strong>Test Psicotécnico:</strong> {selectedConductor.test_psicotecnico || "No realizado"}</p>
                
                {selectedConductor.licenciaURL && (
                  <div className="license-preview">
                    <p><strong>Vista previa de licencia:</strong></p>
                    <a 
                      href={selectedConductor.licenciaURL} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="license-link"
                    >
                      <img 
                        src={selectedConductor.licenciaURL} 
                        alt="Licencia" 
                        className="license-thumbnail"
                      />
                      <span>Ver documento completo</span>
                    </a>
                  </div>
                )}
              </div>
              
              {selectedConductor.comentarios_adicionales && (
                <div className="info-section">
                  <h5>Comentarios Adicionales</h5>
                  <p className="comments-text">{selectedConductor.comentarios_adicionales}</p>
                </div>
              )}
              
              <div className="info-section dates-section">
                <p><strong>Fecha de Solicitud:</strong> {formatDate(selectedConductor.fecha_solicitud)}</p>
              </div>
            </div>
            
            {/* Solo mostrar botones si el estado es pendiente */}
            {(!selectedConductor.estado || selectedConductor.estado.toLowerCase() === 'pendiente') && (
              <div className="modal-buttons">
                <button 
                  className="btn-aceptar" 
                  onClick={() => aceptarConductor(selectedConductor.id)}
                >
                  <i className="fa fa-check"></i> Aprobar
                </button>
                <button 
                  className="btn-rechazar" 
                  onClick={() => rechazarConductor(selectedConductor.id)}
                >
                  <i className="fa fa-times"></i> Rechazar
                </button>
              </div>
            )}
            
            {/* Si ya está aprobado o rechazado, mostrar mensaje informativo */}
            {selectedConductor.estado && selectedConductor.estado.toLowerCase() !== 'pendiente' && (
              <div className="modal-info">
                <p className="status-message">
                  Esta solicitud ya ha sido {selectedConductor.estado.toLowerCase()}.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VistaSolicitudesConductores;