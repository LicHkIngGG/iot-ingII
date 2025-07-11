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
  signOut
} from 'firebase/auth';
import { db } from '../../utils/firebase';
import { registrarAccionAdmin } from '../../utils/logUtils';
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
  X,
  Search,
  UserPlus,
  Settings
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
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [nuevoUsuario, setNuevoUsuario] = useState(null);
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [loadingAction, setLoadingAction] = useState(false);
  const [notificacion, setNotificacion] = useState({ 
    visible: false, 
    mensaje: '', 
    tipo: '' 
  });
  
  // Configuraciones de autenticación
  const auth = getAuth();

  // Efecto para obtener usuarios en tiempo real
  useEffect(() => {
    const obtenerUsuarios = async () => {
      try {
        setLoading(true);
        const usuariosRef = collection(db, 'usuarios');
        const unsubscribe = onSnapshot(usuariosRef, (snapshot) => {
          const usuariosActualizados = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setUsuarios(usuariosActualizados);
          setLoading(false);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('Error al obtener usuarios:', error);
        mostrarNotificacion('Error al cargar usuarios', 'error');
        setLoading(false);
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
    
    setLoadingAction(true);
    
    try {
      // Verificar si el email ya existe
      const emailExiste = await verificarEmailExistente(formData.email);
      if (emailExiste) {
        mostrarNotificacion(`El email ${formData.email} ya está registrado`, 'error');
        setLoadingAction(false);
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
        fechaActualizacion: new Date().toISOString(),
        accionesRealizadas: 0,
        ultimoAcceso: null
      };
      
      // Guardar en Firestore
      const docRef = await addDoc(collection(db, 'usuarios'), userData);
      
      // Registrar acción
      await registrarAccionAdmin(
        'admin-temp',
        'admin@sistema.com',
        'Crear usuario',
        `Usuario creado: ${formData.nombre} (${formData.email})`,
        'Gestión de Usuarios',
        'exitoso'
      );
      
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
      setLoadingAction(false);
    }
  };

  // Editar usuario
  const handleEditUser = async (e) => {
    e.preventDefault();
    
    if (!selectedUser) return;
    
    setLoadingAction(true);
    
    try {
      // Verificar email si cambió
      if (formData.email !== selectedUser.email) {
        const emailExiste = await verificarEmailExistente(formData.email, selectedUser.id);
        if (emailExiste) {
          mostrarNotificacion('Este email ya está en uso', 'error');
          setLoadingAction(false);
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
      
      // Registrar acción
      await registrarAccionAdmin(
        'admin-temp',
        'admin@sistema.com',
        'Editar usuario',
        `Usuario editado: ${formData.nombre} (${formData.email})`,
        'Gestión de Usuarios',
        'exitoso'
      );
      
      setShowEditModal(false);
      setSelectedUser(null);
      mostrarNotificacion('Usuario actualizado exitosamente', 'success');
    } catch (error) {
      console.error('Error al actualizar usuario:', error);
      mostrarNotificacion('Error al actualizar usuario', 'error');
    } finally {
      setLoadingAction(false);
    }
  };

  // Eliminar usuario
  const handleDeleteUser = async (userId, nombreUsuario) => {
    if (!window.confirm(`¿Está seguro de eliminar al usuario ${nombreUsuario}?`)) {
      return;
    }
    
    setLoadingAction(true);
    
    try {
      await deleteDoc(doc(db, 'usuarios', userId));
      
      // Registrar acción
      await registrarAccionAdmin(
        'admin-temp',
        'admin@sistema.com',
        'Eliminar usuario',
        `Usuario eliminado: ${nombreUsuario}`,
        'Gestión de Usuarios',
        'exitoso'
      );
      
      mostrarNotificacion('Usuario eliminado exitosamente', 'success');
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      mostrarNotificacion('Error al eliminar usuario', 'error');
    } finally {
      setLoadingAction(false);
    }
  };

  // Resetear contraseña
  const handleResetPassword = async (usuario) => {
    if (!window.confirm(`¿Está seguro de resetear la contraseña de ${usuario.nombre}?`)) {
      return;
    }
    
    setLoadingAction(true);
    
    try {
      const nuevaPassword = generarContraseña();
      
      // Actualizar en Firestore
      await updateDoc(doc(db, 'usuarios', usuario.id), {
        requiereCambioPassword: true,
        fechaActualizacion: new Date().toISOString()
      });
      
      // Registrar acción
      await registrarAccionAdmin(
        'admin-temp',
        'admin@sistema.com',
        'Resetear contraseña',
        `Contraseña reseteada para: ${usuario.nombre}`,
        'Gestión de Usuarios',
        'exitoso'
      );
      
      // Preparar datos para mostrar
      setNuevoUsuario({
        ...usuario,
        password: nuevaPassword
      });
      
      setShowPasswordModal(true);
      mostrarNotificacion('Contraseña reseteada exitosamente', 'success');
    } catch (error) {
      console.error('Error al resetear contraseña:', error);
      mostrarNotificacion('Error al resetear contraseña', 'error');
    } finally {
      setLoadingAction(false);
    }
  };

  // Cambiar estado del usuario
  const toggleUserStatus = async (userId, currentStatus, nombreUsuario) => {
    setLoadingAction(true);
    
    try {
      await updateDoc(doc(db, 'usuarios', userId), {
        activo: !currentStatus,
        fechaActualizacion: new Date().toISOString()
      });
      
      const accion = !currentStatus ? 'activar' : 'desactivar';
      
      // Registrar acción
      await registrarAccionAdmin(
        'admin-temp',
        'admin@sistema.com',
        `${accion} usuario`,
        `Usuario ${accion}do: ${nombreUsuario}`,
        'Gestión de Usuarios',
        'exitoso'
      );
      
      const mensaje = !currentStatus ? 'Usuario activado correctamente' : 'Usuario desactivado correctamente';
      mostrarNotificacion(mensaje, 'success');
    } catch (error) {
      console.error('Error al cambiar estado del usuario:', error);
      mostrarNotificacion('Error al cambiar estado del usuario', 'error');
    } finally {
      setLoadingAction(false);
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

  // Traducir rol
  const traducirRol = (rol) => {
    switch(rol) {
      case 'administrador': return 'Administrador';
      case 'operador': return 'Operador';
      default: return rol;
    }
  };

  // Filtrar usuarios
  const filteredUsuarios = usuarios.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.nombre?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.rol?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="gestion-usuarios-container">
      {/* Header */}
      <div className="section-header">
        <div className="header-content">
          <h2>
            <Users className="header-icon" />
            Gestión de Personal del Sistema
          </h2>
          <div className="header-stats">
            <span className="stat-item">
              <Shield className="stat-icon" />
              Total: {usuarios.length}
            </span>
            <span className="stat-item">
              <CheckCircle className="stat-icon" />
              Activos: {usuarios.filter(u => u.activo).length}
            </span>
          </div>
        </div>
        <button 
          className="btn-primary"
          onClick={() => setShowNewUserModal(true)}
        >
          <Plus className="btn-icon" />
          Nuevo Usuario
        </button>
      </div>

      {/* Barra de búsqueda */}
      <div className="search-section">
        <div className="search-bar">
          <Search className="search-icon" />
          <input
            type="text"
            placeholder="Buscar por nombre, email o rol..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {/* Tabla de usuarios */}
      <div className="usuarios-table-container">
        <div className="table-header">
          <h3>Lista de Personal Registrados</h3>
          <span className="users-count">
            {filteredUsuarios.length} de {usuarios.length} usuarios
          </span>
        </div>
        
        {loading && (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p className="loading-message">Cargando usuarios...</p>
          </div>
        )}
        
        {!loading && filteredUsuarios.length === 0 && (
          <div className="empty-state">
            <Users className="empty-icon" />
            <p>No hay usuarios que coincidan con la búsqueda</p>
          </div>
        )}
        
        {!loading && filteredUsuarios.length > 0 && (
          <div className="table-responsive">
            <table className="usuarios-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Fecha Creación</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsuarios.map((usuario) => (
                  <tr key={usuario.id} className={usuario.activo ? 'row-active' : 'row-inactive'}>
                    <td data-label="Usuario">
                      <div className="user-info">
                        <div className="user-avatar">
                          {usuario.nombre?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="user-details">
                          <span className="user-name">{usuario.nombre}</span>
                          <span className="user-id">ID: {usuario.uid?.substring(0, 8) || 'N/A'}</span>
                        </div>
                      </div>
                    </td>
                    <td data-label="Email">
                      <span className="user-email">{usuario.email}</span>
                    </td>
                    <td data-label="Rol">
                      <span className={`role-badge ${usuario.rol}`}>
                        {traducirRol(usuario.rol)}
                      </span>
                    </td>
                    <td data-label="Estado">
                      <span className={`status-badge ${usuario.activo ? 'active' : 'inactive'}`}>
                        {usuario.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td data-label="Fecha Creación">
                      <span className="creation-date">
                        {formatearFecha(usuario.fechaCreacion)}
                      </span>
                    </td>
                    <td data-label="Acciones">
                      <div className="actions-group">
                        <button 
                          className="btn-action edit"
                          onClick={() => openEditModal(usuario)}
                          title="Editar usuario"
                          disabled={loadingAction}
                        >
                          <Edit className="action-icon" />
                        </button>
                        <button 
                          className="btn-action reset"
                          onClick={() => handleResetPassword(usuario)}
                          title="Resetear contraseña"
                          disabled={loadingAction}
                        >
                          <Key className="action-icon" />
                        </button>
                        <button 
                          className={`btn-action ${usuario.activo ? 'deactivate' : 'activate'}`}
                          onClick={() => toggleUserStatus(usuario.id, usuario.activo, usuario.nombre)}
                          title={usuario.activo ? 'Desactivar usuario' : 'Activar usuario'}
                          disabled={loadingAction}
                        >
                          {usuario.activo ? <EyeOff className="action-icon" /> : <Eye className="action-icon" />}
                        </button>
                        <button 
                          className="btn-action delete"
                          onClick={() => handleDeleteUser(usuario.id, usuario.nombre)}
                          title="Eliminar usuario"
                          disabled={loadingAction}
                        >
                          <Trash2 className="action-icon" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Nuevo Usuario */}
      {showNewUserModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>
                <UserPlus className="modal-icon" />
                Crear Nuevo Usuario
              </h3>
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
                <label htmlFor="email">Email Corporativo *</label>
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
                <label htmlFor="rol">Rol del Usuario *</label>
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
                  <span className="checkbox-custom"></span>
                  Usuario activo desde la creación
                </label>
              </div>
              
              <div className="form-info">
                <AlertCircle className="info-icon" />
                <div>
                  <p><strong>Información importante:</strong></p>
                  <ul>
                    <li>Se generará una contraseña temporal automáticamente</li>
                    <li>El usuario deberá cambiarla en su primer inicio de sesión</li>
                    <li>Se enviará un email con las credenciales de acceso</li>
                  </ul>
                </div>
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
                  disabled={loadingAction}
                >
                  {loadingAction ? (
                    <>
                      <div className="spinner"></div>
                      Creando...
                    </>
                  ) : (
                    <>
                      <UserPlus className="btn-icon" />
                      Crear Usuario
                    </>
                  )}
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
              <h3>
                <Edit className="modal-icon" />
                Editar Usuario
              </h3>
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
                <label htmlFor="editEmail">Email Corporativo *</label>
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
                <label htmlFor="editRol">Rol del Usuario *</label>
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
                  <span className="checkbox-custom"></span>
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
                  disabled={loadingAction}
                >
                  {loadingAction ? (
                    <>
                      <div className="spinner"></div>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="btn-icon" />
                      Guardar Cambios
                    </>
                  )}
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
              <h3>
                <CheckCircle className="modal-icon success" />
                Credenciales Generadas
              </h3>
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
                <p>Las credenciales para <strong>{nuevoUsuario.nombre}</strong> han sido generadas exitosamente.</p>
              </div>
              
              <div className="credentials-box">
                <h4>Credenciales de Acceso</h4>
                <div className="credential-item">
                  <span className="credential-label">Email:</span>
                  <span className="credential-value">{nuevoUsuario.email}</span>
                  <button 
                    className="copy-btn"
                    onClick={() => copiarAlPortapapeles(nuevoUsuario.email)}
                    title="Copiar email"
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
                    title="Copiar contraseña"
                  >
                    <Copy className="copy-icon" />
                  </button>
                </div>
              </div>
              
              <div className="warning-box">
                <AlertCircle className="warning-icon" />
                <div>
                  <p><strong>IMPORTANTE:</strong></p>
                  <ul>
                    <li>Guarde estas credenciales en un lugar seguro</li>
                    <li>El usuario deberá cambiar su contraseña en el primer inicio de sesión</li>
                    <li>Estas credenciales no se mostrarán nuevamente</li>
                  </ul>
                </div>
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
                  <CheckCircle className="btn-icon" />
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
          <div className="notification-content">
            <div className="notification-icon">
              {notificacion.tipo === 'success' && <CheckCircle />}
              {notificacion.tipo === 'error' && <AlertCircle />}
              {notificacion.tipo === 'warning' && <AlertCircle />}
              {notificacion.tipo === 'info' && <AlertCircle />}
            </div>
            <span className="notification-message">{notificacion.mensaje}</span>
          </div>
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