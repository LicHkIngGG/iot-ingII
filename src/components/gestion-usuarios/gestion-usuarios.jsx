import React, { useState, useEffect } from 'react';
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  onSnapshot,
  query,
  where,
  deleteDoc
} from 'firebase/firestore';
import {
  getAuth,
  createUserWithEmailAndPassword,
  updatePassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import { db } from '../../utils/firebase';
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  Key,
  Shield,
  AlertCircle,
  CheckCircle,
  Copy,
  X
} from 'lucide-react';
import './gestion-usuarios.css';

const GestionUsuarios = () => {
  // Estados para manejo de formularios y datos
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    rol: 'operador',
    activo: true
  });
  
  // Estados de la aplicación
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [nuevoUsuario, setNuevoUsuario] = useState(null);
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [notificacion, setNotificacion] = useState({ 
    visible: false, 
    mensaje: '', 
    tipo: '' 
  });
  
  // Configuraciones de autenticación
  const auth = getAuth();
  const DOMAIN = 'alto.gov.bo';

  // Efecto para obtener usuarios en tiempo real
  useEffect(() => {
    const obtenerUsuarios = async () => {
      try {
        const usuariosRef = collection(db, 'usuarios');
        const unsubscribe = onSnapshot(usuariosRef, (snapshot) => {
          const usuariosActualizados = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setUsuarios(usuariosActualizados);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('Error al obtener usuarios:', error);
        mostrarNotificacion('Error al cargar usuarios', 'error');
      }
    };

    obtenerUsuarios();
  }, []);

  // Función para mostrar notificaciones
  const mostrarNotificacion = (mensaje, tipo = 'info') => {
    setNotificacion({
      visible: true,
      mensaje,
      tipo
    });
    
    setTimeout(() => {
      setNotificacion(prev => ({ ...prev, visible: false }));
    }, 4000);
  };

  // Generar contraseña aleatoria segura
  const generarContraseña = (longitud = 12) => {
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let contraseña = '';
    
    // Asegurar complejidad
    contraseña += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]; // Mayúscula
    contraseña += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]; // Minúscula
    contraseña += '0123456789'[Math.floor(Math.random() * 10)]; // Número
    contraseña += '!@#$%^&*'[Math.floor(Math.random() * 8)]; // Especial
    
    // Completar el resto
    for (let i = 4; i < longitud; i++) {
      contraseña += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    
    return contraseña.split('').sort(() => 0.5 - Math.random()).join('');
  };

  // Verificar si el email ya existe
  const verificarEmailExistente = async (email, excludeId = null) => {
    try {
      const q = query(collection(db, 'usuarios'), where('email', '==', email));
      const querySnapshot = await getDocs(q);
      
      if (excludeId) {
        return querySnapshot.docs.some(doc => doc.id !== excludeId);
      }
      
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error al verificar email:', error);
      return true;
    }
  };

  // Manejar cambios en inputs
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ 
      ...formData, 
      [name]: type === 'checkbox' ? checked : value 
    });
  };

  // Crear nuevo usuario
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nombre || !formData.email) {
      mostrarNotificacion('Por favor, complete todos los campos obligatorios', 'error');
      return;
    }
    
    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      mostrarNotificacion('El formato del email no es válido', 'error');
      return;
    }
    
    setLoading(true);
    
    try {
      // Verificar si el email ya existe
      const emailExiste = await verificarEmailExistente(formData.email);
      if (emailExiste) {
        mostrarNotificacion(`El email ${formData.email} ya está registrado`, 'error');
        setLoading(false);
        return;
      }
      
      // Generar contraseña temporal
      const passwordTemporal = generarContraseña();
      
      // Crear usuario en Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email, 
        passwordTemporal
      );
      
      // Datos del usuario para Firestore
      const userData = {
        nombre: formData.nombre.trim(),
        email: formData.email.trim(),
        rol: formData.rol,
        activo: formData.activo,
        uid: userCredential.user.uid,
        requiereCambioPassword: true,
        fechaCreacion: new Date().toISOString(),
        fechaActualizacion: new Date().toISOString()
      };
      
      // Guardar en Firestore
      const docRef = await addDoc(collection(db, 'usuarios'), userData);
      
      // Preparar datos para mostrar
      setNuevoUsuario({ 
        ...userData, 
        password: passwordTemporal, 
        docId: docRef.id 
      });
      
      // Resetear formulario
      setFormData({
        nombre: '',
        email: '',
        rol: 'operador',
        activo: true
      });
      
      setShowNewUserModal(false);
      setShowPasswordModal(true);
      
      mostrarNotificacion('Usuario creado exitosamente', 'success');
    } catch (error) {
      console.error('Error al crear usuario:', error);
      let mensajeError = 'Error al crear usuario';
      
      if (error.code === 'auth/email-already-in-use') {
        mensajeError = 'Este email ya está en uso';
      } else if (error.code === 'auth/invalid-email') {
        mensajeError = 'El formato del email no es válido';
      } else if (error.code === 'auth/weak-password') {
        mensajeError = 'La contraseña es demasiado débil';
      }
      
      mostrarNotificacion(mensajeError, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Editar usuario
  const handleEditUser = async (e) => {
    e.preventDefault();
    
    if (!selectedUser) return;
    
    setLoading(true);
    
    try {
      // Verificar email si cambió
      if (formData.email !== selectedUser.email) {
        const emailExiste = await verificarEmailExistente(formData.email, selectedUser.id);
        if (emailExiste) {
          mostrarNotificacion('Este email ya está en uso', 'error');
          setLoading(false);
          return;
        }
      }
      
      // Actualizar en Firestore
      await updateDoc(doc(db, 'usuarios', selectedUser.id), {
        nombre: formData.nombre.trim(),
        email: formData.email.trim(),
        rol: formData.rol,
        activo: formData.activo,
        fechaActualizacion: new Date().toISOString()
      });
      
      setShowEditModal(false);
      setSelectedUser(null);
      mostrarNotificacion('Usuario actualizado exitosamente', 'success');
    } catch (error) {
      console.error('Error al actualizar usuario:', error);
      mostrarNotificacion('Error al actualizar usuario', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Eliminar usuario
  const handleDeleteUser = async (userId) => {
    if (!window.confirm('¿Está seguro de eliminar este usuario?')) {
      return;
    }
    
    setLoading(true);
    
    try {
      await deleteDoc(doc(db, 'usuarios', userId));
      mostrarNotificacion('Usuario eliminado exitosamente', 'success');
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      mostrarNotificacion('Error al eliminar usuario', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Resetear contraseña
  const handleResetPassword = async (userId) => {
    setLoading(true);
    
    try {
      const nuevaPassword = generarContraseña();
      
      // Actualizar en Firestore
      await updateDoc(doc(db, 'usuarios', userId), {
        requiereCambioPassword: true,
        fechaActualizacion: new Date().toISOString()
      });
      
      setNuevaPassword(nuevaPassword);
      mostrarNotificacion('Contraseña reseteada exitosamente', 'success');
    } catch (error) {
      console.error('Error al resetear contraseña:', error);
      mostrarNotificacion('Error al resetear contraseña', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Copiar al portapapeles
  const copiarAlPortapapeles = (texto) => {
    navigator.clipboard.writeText(texto)
      .then(() => mostrarNotificacion('Copiado al portapapeles', 'success'))
      .catch(() => mostrarNotificacion('Error al copiar', 'error'));
  };

  // Abrir modal de edición
  const openEditModal = (user) => {
    setSelectedUser(user);
    setFormData({
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      activo: user.activo
    });
    setShowEditModal(true);
  };

  // Formatear fecha
  const formatearFecha = (fecha) => {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="gestion-usuarios-container">
      {/* Header */}
      <div className="section-header">
        <h2>
          <Users className="header-icon" />
          Gestión de Usuarios
        </h2>
        <button 
          className="btn-primary"
          onClick={() => setShowNewUserModal(true)}
        >
          <Plus className="btn-icon" />
          Nuevo Usuario
        </button>
      </div>

      {/* Tabla de usuarios */}
      <div className="usuarios-table-container">
        <div className="table-header">
          <h3>Lista de Usuarios del Sistema</h3>
          <span className="users-count">Total: {usuarios.length}</span>
        </div>
        
        <div className="table-responsive">
          <table className="usuarios-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Fecha Creación</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((usuario) => (
                <tr key={usuario.id}>
                  <td>
                    <div className="user-info">
                      <div className="user-avatar">
                        {usuario.nombre.charAt(0).toUpperCase()}
                      </div>
                      <span className="user-name">{usuario.nombre}</span>
                    </div>
                  </td>
                  <td>
                    <span className="user-email">{usuario.email}</span>
                  </td>
                  <td>
                    <span className={`role-badge ${usuario.rol}`}>
                      {usuario.rol === 'administrador' ? 'Administrador' : 'Operador'}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${usuario.activo ? 'active' : 'inactive'}`}>
                      {usuario.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <span className="creation-date">
                      {formatearFecha(usuario.fechaCreacion)}
                    </span>
                  </td>
                  <td>
                    <div className="actions-group">
                      <button 
                        className="btn-action edit"
                        onClick={() => openEditModal(usuario)}
                        title="Editar usuario"
                      >
                        <Edit className="action-icon" />
                      </button>
                      <button 
                        className="btn-action reset"
                        onClick={() => handleResetPassword(usuario.id)}
                        title="Resetear contraseña"
                      >
                        <Key className="action-icon" />
                      </button>
                      <button 
                        className="btn-action delete"
                        onClick={() => handleDeleteUser(usuario.id)}
                        title="Eliminar usuario"
                      >
                        <Trash2 className="action-icon" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {usuarios.length === 0 && (
            <div className="empty-state">
              <Users className="empty-icon" />
              <p>No hay usuarios registrados</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Nuevo Usuario */}
      {showNewUserModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Crear Nuevo Usuario</h3>
              <button 
                className="close-button" 
                onClick={() => setShowNewUserModal(false)}
              >
                <X className="close-icon" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-group">
                <label htmlFor="nombre">Nombre Completo *</label>
                <input 
                  type="text" 
                  id="nombre"
                  name="nombre" 
                  value={formData.nombre} 
                  onChange={handleInputChange} 
                  required 
                  placeholder="Ej: Juan Pérez López"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="email">Email *</label>
                <input 
                  type="email" 
                  id="email"
                  name="email" 
                  value={formData.email} 
                  onChange={handleInputChange} 
                  required 
                  placeholder="Ej: juan.perez@alto.gov.bo"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="rol">Rol *</label>
                <select 
                  id="rol"
                  name="rol" 
                  value={formData.rol} 
                  onChange={handleInputChange}
                  required
                >
                  <option value="operador">Operador</option>
                  <option value="administrador">Administrador</option>
                </select>
              </div>
              
              <div className="form-group">
                <label className="checkbox-label">
                  <input 
                    type="checkbox"
                    name="activo" 
                    checked={formData.activo} 
                    onChange={handleInputChange}
                  />
                  Usuario activo
                </label>
              </div>
              
              <div className="form-info">
                <AlertCircle className="info-icon" />
                <p>Se generará una contraseña temporal automáticamente. El usuario deberá cambiarla en su primer inicio de sesión.</p>
              </div>
              
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setShowNewUserModal(false)}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  disabled={loading}
                >
                  {loading ? 'Creando...' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Usuario */}
      {showEditModal && selectedUser && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Editar Usuario</h3>
              <button 
                className="close-button" 
                onClick={() => setShowEditModal(false)}
              >
                <X className="close-icon" />
              </button>
            </div>
            
            <form onSubmit={handleEditUser} className="modal-body">
              <div className="form-group">
                <label htmlFor="editNombre">Nombre Completo *</label>
                <input 
                  type="text" 
                  id="editNombre"
                  name="nombre" 
                  value={formData.nombre} 
                  onChange={handleInputChange} 
                  required 
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="editEmail">Email *</label>
                <input 
                  type="email" 
                  id="editEmail"
                  name="email" 
                  value={formData.email} 
                  onChange={handleInputChange} 
                  required 
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="editRol">Rol *</label>
                <select 
                  id="editRol"
                  name="rol" 
                  value={formData.rol} 
                  onChange={handleInputChange}
                  required
                >
                  <option value="operador">Operador</option>
                  <option value="administrador">Administrador</option>
                </select>
              </div>
              
              <div className="form-group">
                <label className="checkbox-label">
                  <input 
                    type="checkbox"
                    name="activo" 
                    checked={formData.activo} 
                    onChange={handleInputChange}
                  />
                  Usuario activo
                </label>
              </div>
              
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setShowEditModal(false)}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  disabled={loading}
                >
                  {loading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Contraseña Generada */}
      {showPasswordModal && nuevoUsuario && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Usuario Creado Exitosamente</h3>
              <button 
                className="close-button" 
                onClick={() => setShowPasswordModal(false)}
              >
                <X className="close-icon" />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="success-message">
                <CheckCircle className="success-icon" />
                <p>El usuario <strong>{nuevoUsuario.nombre}</strong> ha sido creado exitosamente.</p>
              </div>
              
              <div className="credentials-box">
                <h4>Credenciales de Acceso</h4>
                <div className="credential-item">
                  <span className="credential-label">Email:</span>
                  <span className="credential-value">{nuevoUsuario.email}</span>
                  <button 
                    className="copy-btn"
                    onClick={() => copiarAlPortapapeles(nuevoUsuario.email)}
                  >
                    <Copy className="copy-icon" />
                  </button>
                </div>
                <div className="credential-item">
                  <span className="credential-label">Contraseña:</span>
                  <span className="credential-value">{nuevoUsuario.password}</span>
                  <button 
                    className="copy-btn"
                    onClick={() => copiarAlPortapapeles(nuevoUsuario.password)}
                  >
                    <Copy className="copy-icon" />
                  </button>
                </div>
              </div>
              
              <div className="warning-box">
                <AlertCircle className="warning-icon" />
                <p><strong>IMPORTANTE:</strong> Guarde estas credenciales. El usuario deberá cambiar su contraseña en el primer inicio de sesión.</p>
              </div>
              
              <div className="modal-footer">
                <button 
                  className="btn-copy-all" 
                  onClick={() => copiarAlPortapapeles(`Email: ${nuevoUsuario.email}\nContraseña: ${nuevoUsuario.password}`)}
                >
                  <Copy className="btn-icon" />
                  Copiar Todo
                </button>
                <button 
                  className="btn-primary" 
                  onClick={() => setShowPasswordModal(false)}
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Notificaciones */}
      {notificacion.visible && (
        <div className={`notification notification-${notificacion.tipo}`}>
          <span className="notification-message">{notificacion.mensaje}</span>
          <button 
            className="notification-close" 
            onClick={() => setNotificacion(prev => ({ ...prev, visible: false }))}
          >
            <X className="notification-icon" />
          </button>
        </div>
      )}
    </div>
  );
};

export default GestionUsuarios;