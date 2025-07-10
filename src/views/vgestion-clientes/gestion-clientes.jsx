import React, { useState, useEffect } from 'react';
import { 
  collection, 
  updateDoc, 
  doc, 
  onSnapshot, 
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp
} from 'firebase/firestore';
import { db } from '../../utils/firebase';
import './gestion-clientes.css';

const GestionClientes = () => {
  // Estados para gestionar clientes
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDetails, setShowDetails] = useState({});
  
  // Estados para el perfil de cliente
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [showPerfilModal, setShowPerfilModal] = useState(false);
  const [historialViajes, setHistorialViajes] = useState([]);
  const [comentariosConductores, setComentariosConductores] = useState([]);
  const [activeTab, setActiveTab] = useState('info');
  const [nuevoComentario, setNuevoComentario] = useState('');
  
  // Estados para el modal de edición
  const [showEditModal, setShowEditModal] = useState(false);
  const [clienteEdit, setClienteEdit] = useState({
    nombre: '',
    email: '',
    telefono: '',
    direccion: '',
    activo: true
  });

  // Obtener clientes de Firebase
  useEffect(() => {
    setLoading(true);
    const unsubscribe = onSnapshot(collection(db, 'clientes'), (snapshot) => {
      const clientesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClientes(clientesData);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, []);

  // Cambiar estado de activación de cliente
  const toggleAccountStatus = async (clienteId, currentStatus) => {
    try {
      await updateDoc(doc(db, 'clientes', clienteId), { 
        activo: !currentStatus,
        fechaActualizacion: new Date().toISOString()
      });
      
      // Actualizar el estado local inmediatamente para mejor UX
      setClientes(prevClientes => 
        prevClientes.map(cliente => 
          cliente.id === clienteId 
            ? {...cliente, activo: !currentStatus} 
            : cliente
        )
      );
      
      // Mostrar una notificación de éxito más elegante
      const mensaje = !currentStatus ? 'Cliente activado correctamente' : 'Cliente desactivado correctamente';
      mostrarNotificacion(mensaje, 'success');
    } catch (error) {
      console.error('Error al actualizar estado:', error);
      mostrarNotificacion('Error al actualizar estado del cliente', 'error');
    }
  };

  // Toggle para mostrar detalles
  const toggleDetails = (clienteId) => {
    setShowDetails(prev => ({
      ...prev,
      [clienteId]: !prev[clienteId]
    }));
  };

  // Cargar cliente para editar
  const openEditModal = async (clienteId) => {
    try {
      const clienteDoc = await getDoc(doc(db, 'clientes', clienteId));
      
      if (clienteDoc.exists()) {
        setClienteEdit({
          id: clienteId,
          ...clienteDoc.data()
        });
        setShowEditModal(true);
      } else {
        mostrarNotificacion('El cliente no existe en la base de datos', 'error');
      }
    } catch (error) {
      console.error('Error al cargar cliente:', error);
      mostrarNotificacion('Error al cargar datos del cliente', 'error');
    }
  };
  
  // Guardar cambios de edición
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    
    if (!clienteEdit.nombre || !clienteEdit.email || !clienteEdit.telefono) {
      mostrarNotificacion('Los campos Nombre, Email y Teléfono son obligatorios', 'warning');
      return;
    }
    
    setLoading(true);
    
    try {
      await updateDoc(doc(db, 'clientes', clienteEdit.id), {
        nombre: clienteEdit.nombre,
        email: clienteEdit.email,
        telefono: clienteEdit.telefono,
        direccion: clienteEdit.direccion,
        activo: clienteEdit.activo,
        fechaActualizacion: new Date().toISOString()
      });
      
      // Actualizar el estado local para mejor UX
      setClientes(prevClientes => 
        prevClientes.map(cliente => 
          cliente.id === clienteEdit.id 
            ? {...cliente, ...clienteEdit, fechaActualizacion: new Date().toISOString()} 
            : cliente
        )
      );
      
      setShowEditModal(false);
      mostrarNotificacion('Cliente actualizado correctamente', 'success');
    } catch (error) {
      console.error('Error al actualizar cliente:', error);
      mostrarNotificacion(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Ver perfil de cliente
  const verPerfil = async (clienteId) => {
    try {
      setLoading(true);
      
      // Obtener datos del cliente
      const clienteDoc = await getDoc(doc(db, 'clientes', clienteId));
      
      if (!clienteDoc.exists()) {
        mostrarNotificacion('El cliente no existe en la base de datos', 'error');
        setLoading(false);
        return;
      }
      
      const clienteData = { id: clienteDoc.id, ...clienteDoc.data() };
      setSelectedCliente(clienteData);
      
      // Cargar historial de viajes
      const viajesQuery = query(
        collection(db, 'viajes'),
        where('clienteId', '==', clienteId),
        orderBy('fecha', 'desc'),
        limit(10)
      );
      
      const viajesSnapshot = await getDocs(viajesQuery);
      const viajesData = viajesSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        fecha: doc.data().fecha ? formatDate(doc.data().fecha) : 'Fecha desconocida'
      }));
      
      setHistorialViajes(viajesData);
      
      // Cargar comentarios
      const comentariosQuery = query(
        collection(db, 'comentarios'),
        where('clienteId', '==', clienteId),
        orderBy('fecha', 'desc')
      );
      
      const comentariosSnapshot = await getDocs(comentariosQuery);
      const comentariosData = comentariosSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        fecha: doc.data().fecha ? formatDate(doc.data().fecha) : 'Fecha desconocida'
      }));
      
      setComentariosConductores(comentariosData);
      
      // Mostrar modal
      setShowPerfilModal(true);
      setLoading(false);
    } catch (error) {
      console.error('Error al cargar perfil:', error);
      mostrarNotificacion('Error al cargar perfil del cliente', 'error');
      setLoading(false);
    }
  };

  // Añadir comentario de conductor
  const handleAddComentario = async (e) => {
    e.preventDefault();
    
    if (!nuevoComentario.trim()) {
      mostrarNotificacion('Por favor, escriba un comentario', 'warning');
      return;
    }
    
    try {
      // En un caso real, este ID vendría del conductor que está logueado
      const demoSelectedConductorId = "conductor-demo-id";
      
      await addDoc(collection(db, 'comentarios'), {
        clienteId: selectedCliente.id,
        conductorId: demoSelectedConductorId,
        conductor: "Conductor Demo", // En un caso real, esto vendría de la BD
        mensaje: nuevoComentario,
        fecha: Timestamp.now()
      });
      
      setNuevoComentario('');
      
      // Recargar los comentarios
      const comentariosQuery = query(
        collection(db, 'comentarios'),
        where('clienteId', '==', selectedCliente.id),
        orderBy('fecha', 'desc')
      );
      
      const comentariosSnapshot = await getDocs(comentariosQuery);
      const comentariosData = comentariosSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        fecha: doc.data().fecha ? formatDate(doc.data().fecha) : 'Fecha desconocida'
      }));
      
      setComentariosConductores(comentariosData);
      
      mostrarNotificacion('Comentario añadido correctamente', 'success');
    } catch (error) {
      console.error('Error al añadir comentario:', error);
      mostrarNotificacion('Error al añadir comentario', 'error');
    }
  };

  // Formatear fecha
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Fecha desconocida';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Sistema de notificaciones
  const [notificacion, setNotificacion] = useState({ visible: false, mensaje: '', tipo: '' });
  
  const mostrarNotificacion = (mensaje, tipo = 'info') => {
    setNotificacion({
      visible: true,
      mensaje,
      tipo
    });
    
    // Auto-ocultar después de 3 segundos
    setTimeout(() => {
      setNotificacion(prev => ({ ...prev, visible: false }));
    }, 3000);
  };

  // Manejador de cambios en el formulario de edición
  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    setClienteEdit(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  // Filtrar clientes por término de búsqueda
  const filteredClientes = clientes.filter(cliente => 
    cliente.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.telefono?.includes(searchTerm)
  );

  return (
    <div className="gestion-clientes-container">
      {/* Encabezado de sección */}
      <div className="section-header">
        <h2>Panel de Gestión de Clientes</h2>
        <div className="green-underline"></div>
      </div>
      
      {/* Barra de búsqueda */}
      <div className="clients-section">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Buscar por nombre, email o teléfono"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        {loading && (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p className="loading-message">Cargando clientes...</p>
          </div>
        )}
        
        {!loading && filteredClientes.length === 0 && (
          <div className="no-results">
            <i className="fa fa-exclamation-circle"></i>
            <p>No hay clientes que coincidan con la búsqueda.</p>
          </div>
        )}
        
        {!loading && filteredClientes.length > 0 && (
          <>
            {/* Vista de escritorio: Tabla */}
            <div className="desktop-view">
              <table className="clients-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Teléfono</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClientes.map(cliente => (
                    <React.Fragment key={cliente.id}>
                      <tr className={cliente.activo ? 'row-active' : 'row-inactive'}>
                        <td>{cliente.nombre}</td>
                        <td>{cliente.email}</td>
                        <td>{cliente.telefono}</td>
                        <td>
                          <span className={`status-badge ${cliente.activo ? 'active' : 'inactive'}`}>
                            {cliente.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button 
                              onClick={() => toggleDetails(cliente.id)} 
                              className="btn-table-action btn-details"
                            >
                              <i className="fa fa-info-circle"></i>
                              <span>Detalles</span>
                            </button>
                            <button 
                              onClick={() => openEditModal(cliente.id)} 
                              className="btn-table-action btn-edit"
                            >
                              <i className="fa fa-pencil"></i>
                              <span>Editar</span>
                            </button>
                            <button 
                              onClick={() => toggleAccountStatus(cliente.id, cliente.activo)} 
                              className={`btn-table-action ${cliente.activo ? 'btn-deactivate' : 'btn-activate'}`}
                            >
                              <i className={cliente.activo ? "fa fa-toggle-on" : "fa fa-toggle-off"}></i>
                              <span>{cliente.activo ? 'Desactivar' : 'Activar'}</span>
                            </button>
                            <button 
                              onClick={() => verPerfil(cliente.id)} 
                              className="btn-table-action btn-profile"
                            >
                              <i className="fa fa-user"></i>
                              <span>Perfil</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                      
                      {/* Fila expandible con detalles */}
                      {showDetails[cliente.id] && (
                        <tr className="details-row">
                          <td colSpan="5">
                            <div className="client-details">
                              <p><strong>Dirección:</strong> {cliente.direccion || 'No especificada'}</p>
                              <p><strong>Fecha de Registro:</strong> {
                                cliente.fechaRegistro ? 
                                  formatDate(cliente.fechaRegistro) : 
                                  'Fecha desconocida'
                              }</p>
                              {cliente.fechaActualizacion && (
                                <p><strong>Última Actualización:</strong> {
                                  formatDate(cliente.fechaActualizacion)
                                }</p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Vista móvil: Tarjetas */}
            <div className="mobile-view">
              {filteredClientes.map(cliente => (
                <div 
                  key={cliente.id} 
                  className={`client-card ${cliente.activo ? 'card-active' : 'card-inactive'}`}
                >
                  <div className="card-header">
                    <h3>{cliente.nombre}</h3>
                    <span className={`status-badge ${cliente.activo ? 'active' : 'inactive'}`}>
                      {cliente.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  
                  <div className="card-body">
                    <p><i className="fa fa-envelope"></i> {cliente.email}</p>
                    <p><i className="fa fa-phone"></i> {cliente.telefono}</p>
                    
                    {showDetails[cliente.id] && (
                      <div className="card-expanded">
                        <p><i className="fa fa-map-marker"></i> {cliente.direccion || 'Dirección no especificada'}</p>
                        <p><i className="fa fa-calendar"></i> Registro: {
                          cliente.fechaRegistro ? 
                            formatDate(cliente.fechaRegistro) : 
                            'Fecha desconocida'
                        }</p>
                        {cliente.fechaActualizacion && (
                          <p><i className="fa fa-refresh"></i> Actualización: {
                            formatDate(cliente.fechaActualizacion)
                          }</p>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="card-actions">
                    <button 
                      onClick={() => toggleDetails(cliente.id)} 
                      className="btn-card-action"
                    >
                      {showDetails[cliente.id] ? 'Ocultar detalles' : 'Ver detalles'}
                    </button>
                    
                    <div className="card-buttons">
                      <button 
                        onClick={() => openEditModal(cliente.id)} 
                        className="btn-card-action btn-edit"
                      >
                        <i className="fa fa-pencil"></i>
                        Editar Cliente
                      </button>
                      <button 
                        onClick={() => toggleAccountStatus(cliente.id, cliente.activo)} 
                        className={`btn-card-action ${cliente.activo ? 'btn-deactivate' : 'btn-activate'}`}
                      >
                        <i className={cliente.activo ? "fa fa-toggle-on" : "fa fa-toggle-off"}></i>
                        {cliente.activo ? 'Desactivar Cliente' : 'Activar Cliente'}
                      </button>
                      <button 
                        onClick={() => verPerfil(cliente.id)} 
                        className="btn-card-action btn-profile"
                      >
                        <i className="fa fa-user"></i>
                        Ver Perfil Completo
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      
      {/* Sistema de notificaciones */}
      {notificacion.visible && (
        <div className={`notification notification-${notificacion.tipo}`}>
          <span className="notification-message">{notificacion.mensaje}</span>
          <button 
            className="notification-close" 
            onClick={() => setNotificacion(prev => ({ ...prev, visible: false }))}
          >
            <i className="fa fa-times"></i>
          </button>
        </div>
      )}
      
      {/* Modal de edición de cliente */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Editar Cliente</h3>
              <button 
                className="close-button" 
                onClick={() => setShowEditModal(false)}
              >
                &times;
              </button>
            </div>
            
            <div className="modal-body">
              <form onSubmit={handleSaveEdit}>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="nombre">Nombre Completo</label>
                    <input 
                      type="text" 
                      id="nombre"
                      name="nombre" 
                      value={clienteEdit.nombre || ''} 
                      onChange={handleEditChange} 
                      required 
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="email">Correo Electrónico</label>
                    <input 
                      type="email" 
                      id="email"
                      name="email" 
                      value={clienteEdit.email || ''} 
                      onChange={handleEditChange} 
                      required 
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="telefono">Teléfono</label>
                    <input 
                      type="tel" 
                      id="telefono"
                      name="telefono" 
                      value={clienteEdit.telefono || ''} 
                      onChange={handleEditChange} 
                      required 
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="direccion">Dirección</label>
                    <input 
                      type="text" 
                      id="direccion"
                      name="direccion" 
                      value={clienteEdit.direccion || ''} 
                      onChange={handleEditChange} 
                    />
                  </div>
                </div>
                
                <div className="form-checkbox">
                  <label>
                    <input 
                      type="checkbox" 
                      name="activo" 
                      checked={clienteEdit.activo || false} 
                      onChange={handleEditChange} 
                    />
                    Cliente Activo
                  </label>
                </div>
                
                <div className="modal-footer">
                  <button type="button" onClick={() => setShowEditModal(false)} className="btn-cancel">
                    Cancelar
                  </button>
                  <button type="submit" className="btn-save" disabled={loading}>
                    {loading ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal para Perfil de Cliente */}
      {showPerfilModal && selectedCliente && (
        <div className="profile-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Perfil del Cliente</h3>
              <button 
                className="close-button" 
                onClick={() => setShowPerfilModal(false)}
              >
                &times;
              </button>
            </div>
            
            <div className="modal-tabs">
              <button 
                className={`tab-button ${activeTab === 'info' ? 'active' : ''}`}
                onClick={() => setActiveTab('info')}
              >
                Información
              </button>
              <button 
                className={`tab-button ${activeTab === 'viajes' ? 'active' : ''}`}
                onClick={() => setActiveTab('viajes')}
              >
                Historial de Viajes
              </button>
              <button 
                className={`tab-button ${activeTab === 'comentarios' ? 'active' : ''}`}
                onClick={() => setActiveTab('comentarios')}
              >
                Comentarios
              </button>
            </div>
            
            <div className="modal-body">
              {/* Tab de Información */}
              {activeTab === 'info' && (
                <div className="info-tab">
                  <div className="info-section">
                    <h4>Datos Personales</h4>
                    <div className="info-grid">
                      <div className="info-item">
                        <span className="info-label">Nombre:</span>
                        <span className="info-value">{selectedCliente.nombre}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Email:</span>
                        <span className="info-value">{selectedCliente.email}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Teléfono:</span>
                        <span className="info-value">{selectedCliente.telefono}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Dirección:</span>
                        <span className="info-value">{selectedCliente.direccion || 'No especificada'}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Estado:</span>
                        <span className="info-value">
                          <span className={`status-badge ${selectedCliente.activo ? 'active' : 'inactive'}`}>
                            {selectedCliente.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Fecha de Registro:</span>
                        <span className="info-value">
                          {selectedCliente.fechaRegistro ? 
                            formatDate(selectedCliente.fechaRegistro) : 
                            'Fecha desconocida'}
                        </span>
                      </div>
                      {selectedCliente.fechaActualizacion && (
                        <div className="info-item">
                          <span className="info-label">Última Actualización:</span>
                          <span className="info-value">
                            {formatDate(selectedCliente.fechaActualizacion)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                    <div className="actions-section">
                    <h4>Acciones Rápidas</h4>
                    <div className="action-buttons">
                      <button 
                        onClick={() => {
                          openEditModal(selectedCliente.id);
                          setShowPerfilModal(false);
                        }} 
                        className="btn-modal-action"
                      >
                        <i className="fa fa-pencil"></i> 
                        Modificar Datos del Cliente
                      </button>
                      <button 
                        onClick={() => {
                          toggleAccountStatus(selectedCliente.id, selectedCliente.activo);
                          setSelectedCliente(prev => ({...prev, activo: !prev.activo}));
                        }} 
                        className={selectedCliente.activo ? 'btn-modal-deactivate' : 'btn-modal-activate'}
                      >
                        <i className={selectedCliente.activo ? "fa fa-toggle-on" : "fa fa-toggle-off"}></i>
                        {selectedCliente.activo ? 'Desactivar Cuenta de Cliente' : 'Activar Cuenta de Cliente'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Tab de Historial de Viajes */}
              {activeTab === 'viajes' && (
                <div className="viajes-tab">
                  <h4>Historial de Viajes</h4>
                  {historialViajes.length > 0 ? (
                    <div className="viajes-list">
                      {historialViajes.map((viaje) => (
                        <div key={viaje.id} className="viaje-item">
                          <div className="viaje-header">
                            <div className="viaje-fecha">{viaje.fecha}</div>
                            <div className="viaje-calificacion">
                              {[...Array(5)].map((_, i) => (
                                <span key={i} 
                                  className={i < (viaje.calificacion || 0) ? "star-filled" : "star-empty"}>
                                  ★
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="viaje-route">
                            <span className="viaje-origen">{viaje.origen || 'Origen no especificado'}</span>
                            <span> → </span>
                            <span className="viaje-destino">{viaje.destino || 'Destino no especificado'}</span>
                          </div>
                          {viaje.conductorNombre && (
                            <div className="viaje-conductor">
                              <i className="fa fa-user-circle"></i>
                              <span>{viaje.conductorNombre}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="no-data">
                      <i className="fa fa-car"></i>
                      <p>No hay viajes registrados para este cliente.</p>
                    </div>
                  )}
                </div>
              )}
              
              {/* Tab de Comentarios */}
              {activeTab === 'comentarios' && (
                <div className="comentarios-tab">
                  <div className="comentarios-form">
                    <h4>Añadir Nuevo Comentario</h4>
                    <form onSubmit={handleAddComentario}>
                      <textarea
                        value={nuevoComentario}
                        onChange={(e) => setNuevoComentario(e.target.value)}
                        placeholder="Escriba su comentario sobre este cliente..."
                        required
                      ></textarea>
                      <button type="submit" className="btn-save">
                        <i className="fa fa-plus-circle"></i> Añadir Comentario
                      </button>
                    </form>
                  </div>
                  
                  <div className="comentarios-section">
                    <h4>Comentarios Registrados</h4>
                    {comentariosConductores.length > 0 ? (
                      <div className="comentarios-list">
                        {comentariosConductores.map((comentario) => (
                          <div key={comentario.id} className="comentario-item">
                            <div className="comentario-header">
                              <div className="comentario-conductor">
                                <i className="fa fa-user-circle"></i>
                                <span>{comentario.conductor || 'Conductor no identificado'}</span>
                              </div>
                              <div className="comentario-fecha">{comentario.fecha}</div>
                            </div>
                            <div className="comentario-body">
                              {comentario.mensaje}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="no-data">
                        <i className="fa fa-comments"></i>
                        <p>No hay comentarios registrados para este cliente.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionClientes;