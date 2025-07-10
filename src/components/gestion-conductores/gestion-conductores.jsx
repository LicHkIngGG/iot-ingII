import React, { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  onSnapshot, 
  getDocs,
  query,
  where
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db } from '../../utils/firebase';
import GestionConductoresTabla from './gestion-conductores-tabla';
import './gestion-conductores.css';

const GestionConductores = () => {
  // Estado para el formulario
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    licencia: '',
    licenciaURL: '',
    activo: true,
    fechaRegistro: new Date().toISOString()
  });

  // Estados para gestionar conductores
  const [conductores, setConductores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [notificacion, setNotificacion] = useState({ visible: false, mensaje: '', tipo: '' });
  const [activeTab, setActiveTab] = useState('registro'); // Estado para controlar la vista activa

  const storage = getStorage();
  
  // Sistema de notificaciones
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

  // Obtener conductores de Firebase
  useEffect(() => {
    setLoading(true);
    try {
      const unsubscribe = onSnapshot(collection(db, 'conductores'), (snapshot) => {
        const conductoresData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setConductores(conductoresData);
        setLoading(false);
      });
      
      return () => unsubscribe();
    } catch (error) {
      console.error("Error al obtener conductores:", error);
      setLoading(false);
      mostrarNotificacion('Error al cargar conductores', 'error');
    }
  }, []);

  // Manejador de cambios en el formulario
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ 
      ...formData, 
      [name]: type === 'checkbox' ? checked : value 
    });
  };

  // Manejador para el archivo de licencia
  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  // Crear conductor
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nombre || !formData.email || !formData.telefono || !formData.licencia) {
      mostrarNotificacion('Los campos Nombre, Email, Teléfono y Licencia son obligatorios', 'warning');
      return;
    }

    if (!file) {
      mostrarNotificacion('La foto de la licencia es requerida para nuevos conductores', 'warning');
      return;
    }

    setLoading(true);
    
    try {
      // Verificar si el email ya existe
      const emailQuery = query(collection(db, 'conductores'), where('email', '==', formData.email));
      const emailSnapshot = await getDocs(emailQuery);
      
      if (!emailSnapshot.empty) {
        mostrarNotificacion('Ya existe un conductor con este correo electrónico', 'warning');
        setLoading(false);
        return;
      }
      
      let licenciaURL = '';
      
      // Subir archivo a Storage
      if (file) {
        const storageRef = ref(storage, `licencias/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        licenciaURL = await getDownloadURL(storageRef);
      }
      
      // Crear nuevo conductor
      await addDoc(collection(db, 'conductores'), {
        ...formData,
        licenciaURL,
        fechaRegistro: new Date().toISOString()
      });
      
      mostrarNotificacion('Conductor agregado correctamente', 'success');
      
      // Resetear el formulario
      resetForm();
    } catch (error) {
      console.error('Error al procesar conductor:', error);
      mostrarNotificacion(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Resetear formulario
  const resetForm = () => {
    setFormData({
      nombre: '',
      email: '',
      telefono: '',
      licencia: '',
      licenciaURL: '',
      activo: true,
      fechaRegistro: new Date().toISOString()
    });
    setFile(null);
  };

  // Renderizado del formulario de registro
  const renderFormularioRegistro = () => {
    return (
      <div className="conductor-section">
        <h3>Agregar Nuevo Conductor</h3>
        
        <form onSubmit={handleSubmit} className="conductor-form">
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="nombre">Nombre Completo *</label>
              <input 
                type="text" 
                id="nombre"
                name="nombre" 
                value={formData.nombre} 
                onChange={handleInputChange} 
                required 
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="email">Correo Electrónico *</label>
              <input 
                type="email" 
                id="email"
                name="email" 
                value={formData.email} 
                onChange={handleInputChange} 
                required 
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="telefono">Teléfono *</label>
              <input 
                type="tel" 
                id="telefono"
                name="telefono" 
                value={formData.telefono} 
                onChange={handleInputChange} 
                required 
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="licencia">Número de Licencia *</label>
              <input 
                type="text" 
                id="licencia"
                name="licencia" 
                value={formData.licencia} 
                onChange={handleInputChange} 
                required 
              />
            </div>
          </div>
          
          <div className="form-file-group">
            <label htmlFor="file">Foto de Licencia *</label>
            <div className="file-input-container">
              <input 
                type="file" 
                id="file" 
                accept="image/*" 
                onChange={handleFileChange} 
                required
                className="file-input"
              />
              <div className="file-input-label">
                <i className="fa fa-upload"></i>
                <span>{file ? file.name : 'Seleccionar archivo'}</span>
              </div>
            </div>
            <div className="form-checkbox">
              <label>
                <input 
                  type="checkbox" 
                  name="activo" 
                  checked={formData.activo} 
                  onChange={handleInputChange} 
                />
                Conductor Activo
              </label>
            </div>
          </div>
          
          <div className="form-info">
            <p><small>* Campos obligatorios</small></p>
            <p><small>La foto de la licencia debe estar en formato JPG, PNG o similar.</small></p>
            <p><small>Asegúrese de que la imagen sea clara y legible.</small></p>
          </div>
          
          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Procesando...' : 'Registrar Conductor'}
            </button>
          </div>
        </form>
      </div>
    );
  };

  return (
    <div className="gestion-conductores-container">
      {/* Encabezado de sección */}
      <div className="section-header">
        <h2>Panel de Gestión de Conductores</h2>
        <div className="green-underline"></div>
      </div>

      {/* Sistema de pestañas */}
      <div className="tabs-container">
        <div className="tabs-nav">
          <button 
            className={`tab-button ${activeTab === 'registro' ? 'active' : ''}`}
            onClick={() => setActiveTab('registro')}
          >
            <i className="fa fa-plus-circle"></i>
            <span>Registrar Conductor</span>
          </button>
          <button 
            className={`tab-button ${activeTab === 'lista' ? 'active' : ''}`}
            onClick={() => setActiveTab('lista')}
          >
            <i className="fa fa-list"></i>
            <span>Lista de Conductores</span>
          </button>
        </div>
      </div>

      {/* Contenido de las pestañas */}
      <div className="tab-content">
        {activeTab === 'registro' && renderFormularioRegistro()}
        
        {activeTab === 'lista' && (
          <GestionConductoresTabla 
            conductores={conductores}
            loading={loading}
            mostrarNotificacion={mostrarNotificacion}
            storage={storage}
          />
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
    </div>
  );
};

export default GestionConductores;