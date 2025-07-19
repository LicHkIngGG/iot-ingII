// components/perfil-usuario/perfil-usuario.jsx
import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc
} from 'firebase/firestore';
import {
  getAuth,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential
} from 'firebase/auth';
import { db } from '../../utils/firebase';
import './PerfilUsuario.css';

const PerfilUsuario = () => {
  // Estados para datos del usuario
  const [usuarioData, setUsuarioData] = useState(null);
  const [formData, setFormData] = useState({
    nombres: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    celular: '',
    correoPersonal: '',
    genero: ''
  });

  // Estados para cambio de contraseña
  const [modalCambioPassword, setModalCambioPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Estados de la aplicación
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [notificacion, setNotificacion] = useState({
    visible: false,
    mensaje: '',
    tipo: ''
  });

  const auth = getAuth();

  // Cargar datos del usuario al montar el componente
  useEffect(() => {
    cargarDatosUsuario();
  }, []);

  // Función para cargar datos del usuario actual
  const cargarDatosUsuario = async () => {
    setLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        mostrarNotificacion('No hay usuario autenticado', 'error');
        return;
      }

      // Buscar datos del usuario en Firestore por UID
      const q = query(
        collection(db, 'usuarios'),
        where('uid', '==', currentUser.uid)
      );

      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();
        const userDocId = querySnapshot.docs[0].id;
        
        const completeUserData = {
          ...userData,
          docId: userDocId
        };

        setUsuarioData(completeUserData);
        setFormData({
          nombres: userData.nombres || '',
          apellidoPaterno: userData.apellidoPaterno || '',
          apellidoMaterno: userData.apellidoMaterno || '',
          celular: userData.celular || '',
          correoPersonal: userData.correoPersonal || '',
          genero: userData.genero || ''
        });
      } else {
        mostrarNotificacion('No se encontraron datos del usuario', 'error');
      }
    } catch (error) {
      console.error('Error al cargar datos del usuario:', error);
      mostrarNotificacion('Error al cargar datos del usuario', 'error');
    } finally {
      setLoading(false);
    }
  };

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

  // Manejar cambios en el formulario
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Validar datos del formulario
  const validarFormulario = () => {
    // Validar celular (8 dígitos)
    if (!/^\d{8}$/.test(formData.celular)) {
      mostrarNotificacion('El número de celular debe contener exactamente 8 dígitos', 'warning');
      return false;
    }

    // Validar correo personal
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.correoPersonal)) {
      mostrarNotificacion('El correo personal no tiene un formato válido', 'warning');
      return false;
    }

    return true;
  };

  // Guardar cambios en el perfil
  const handleGuardarCambios = async () => {
    if (!validarFormulario()) {
      return;
    }

    setSaving(true);
    try {
      const datosActualizados = {
        nombres: formData.nombres.trim(),
        apellidoPaterno: formData.apellidoPaterno.trim(),
        apellidoMaterno: formData.apellidoMaterno.trim(),
        celular: formData.celular.trim(),
        correoPersonal: formData.correoPersonal.trim().toLowerCase(),
        genero: formData.genero,
        fechaActualizacion: new Date().toISOString()
      };

      await updateDoc(doc(db, 'usuarios', usuarioData.docId), datosActualizados);

      // Actualizar estado local
      setUsuarioData(prev => ({
        ...prev,
        ...datosActualizados
      }));

      setEditMode(false);
      mostrarNotificacion('Perfil actualizado correctamente', 'success');
    } catch (error) {
      console.error('Error al actualizar perfil:', error);
      mostrarNotificacion('Error al actualizar perfil', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Cancelar edición
  const handleCancelar = () => {
    // Restaurar datos originales
    setFormData({
      nombres: usuarioData.nombres || '',
      apellidoPaterno: usuarioData.apellidoPaterno || '',
      apellidoMaterno: usuarioData.apellidoMaterno || '',
      celular: usuarioData.celular || '',
      correoPersonal: usuarioData.correoPersonal || '',
      genero: usuarioData.genero || ''
    });
    setEditMode(false);
  };

  // Manejar cambio de contraseña
  const handleCambioPassword = async (e) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      mostrarNotificacion('Las contraseñas nuevas no coinciden', 'error');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      mostrarNotificacion('La nueva contraseña debe tener al menos 8 caracteres', 'warning');
      return;
    }

    // Validar complejidad de contraseña
    const regexMayuscula = /[A-Z]/;
    const regexMinuscula = /[a-z]/;
    const regexNumero = /[0-9]/;
    const regexEspecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/;

    if (!regexMayuscula.test(passwordData.newPassword) ||
        !regexMinuscula.test(passwordData.newPassword) ||
        !regexNumero.test(passwordData.newPassword) ||
        !regexEspecial.test(passwordData.newPassword)) {
      mostrarNotificacion('La contraseña debe incluir mayúsculas, minúsculas, números y caracteres especiales', 'warning');
      return;
    }

    setSaving(true);
    try {
      const user = auth.currentUser;
      
      // Reautenticar usuario
      const credential = EmailAuthProvider.credential(user.email, passwordData.currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Cambiar contraseña
      await updatePassword(user, passwordData.newPassword);

      // Actualizar timestamp en Firestore
      await updateDoc(doc(db, 'usuarios', usuarioData.docId), {
        fechaCambioClave: new Date().toISOString()
      });

      setModalCambioPassword(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      mostrarNotificacion('Contraseña cambiada exitosamente', 'success');
    } catch (error) {
      console.error('Error al cambiar contraseña:', error);
      if (error.code === 'auth/wrong-password') {
        mostrarNotificacion('La contraseña actual es incorrecta', 'error');
      } else {
        mostrarNotificacion('Error al cambiar contraseña', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  // Función para formatear fecha
  const formatearFecha = (fechaISO) => {
    if (!fechaISO) return 'No disponible';
    return new Date(fechaISO).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="perfil-loading">
        <div className="loading-spinner"></div>
        <p>Cargando perfil...</p>
      </div>
    );
  }

  if (!usuarioData) {
    return (
      <div className="perfil-error">
        <p>No se pudieron cargar los datos del perfil</p>
        <button onClick={cargarDatosUsuario} className="btn-retry">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="perfil-usuario-container">
      {/* Encabezado */}
      <div className="perfil-header">
        <div className="header-content">
          <div className="user-avatar">
            <i className="fa fa-user-circle"></i>
          </div>
          <div className="user-info">
            <h1>{`${usuarioData.nombres} ${usuarioData.apellidoPaterno} ${usuarioData.apellidoMaterno || ''}`}</h1>
            <p className="user-role">
              {usuarioData.role === 'admin' ? 'Administrador' : 'Operador'}
            </p>
            <p className="user-email">{usuarioData.email}</p>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="perfil-content">
        {/* Información personal */}
        <div className="perfil-card">
          <div className="card-header">
            <h3>
              <i className="fa fa-user"></i>
              Información Personal
            </h3>
            {!editMode ? (
              <button 
                className="btn-edit"
                onClick={() => setEditMode(true)}
              >
                <i className="fa fa-edit"></i>
                Editar
              </button>
            ) : (
              <div className="edit-actions">
                <button 
                  className="btn-save"
                  onClick={handleGuardarCambios}
                  disabled={saving}
                >
                  <i className="fa fa-save"></i>
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
                <button 
                  className="btn-cancel"
                  onClick={handleCancelar}
                  disabled={saving}
                >
                  <i className="fa fa-times"></i>
                  Cancelar
                </button>
              </div>
            )}
          </div>

          <div className="card-body">
            <div className="form-grid">
              <div className="form-group">
                <label>Nombres</label>
                {editMode ? (
                  <input
                    type="text"
                    name="nombres"
                    value={formData.nombres}
                    onChange={handleInputChange}
                    disabled={saving}
                  />
                ) : (
                  <p className="form-value">{usuarioData.nombres}</p>
                )}
              </div>

              <div className="form-group">
                <label>Apellido Paterno</label>
                {editMode ? (
                  <input
                    type="text"
                    name="apellidoPaterno"
                    value={formData.apellidoPaterno}
                    onChange={handleInputChange}
                    disabled={saving}
                  />
                ) : (
                  <p className="form-value">{usuarioData.apellidoPaterno}</p>
                )}
              </div>

              <div className="form-group">
                <label>Apellido Materno</label>
                {editMode ? (
                  <input
                    type="text"
                    name="apellidoMaterno"
                    value={formData.apellidoMaterno}
                    onChange={handleInputChange}
                    disabled={saving}
                  />
                ) : (
                  <p className="form-value">{usuarioData.apellidoMaterno || 'No especificado'}</p>
                )}
              </div>

              <div className="form-group">
                <label>Género</label>
                {editMode ? (
                  <select
                    name="genero"
                    value={formData.genero}
                    onChange={handleInputChange}
                    disabled={saving}
                  >
                    <option value="masculino">Masculino</option>
                    <option value="femenino">Femenino</option>
                    <option value="otro">Otro</option>
                  </select>
                ) : (
                  <p className="form-value">
                    {usuarioData.genero ? 
                      usuarioData.genero.charAt(0).toUpperCase() + usuarioData.genero.slice(1) : 
                      'No especificado'
                    }
                  </p>
                )}
              </div>

              <div className="form-group">
                <label>Número de Celular</label>
                {editMode ? (
                  <input
                    type="tel"
                    name="celular"
                    value={formData.celular}
                    onChange={handleInputChange}
                    pattern="\d{8}"
                    title="Debe contener exactamente 8 dígitos"
                    disabled={saving}
                  />
                ) : (
                  <p className="form-value">{usuarioData.celular}</p>
                )}
              </div>

              <div className="form-group">
                <label>Correo Personal</label>
                {editMode ? (
                  <input
                    type="email"
                    name="correoPersonal"
                    value={formData.correoPersonal}
                    onChange={handleInputChange}
                    disabled={saving}
                  />
                ) : (
                  <p className="form-value">{usuarioData.correoPersonal}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Información del sistema */}
        <div className="perfil-card">
          <div className="card-header">
            <h3>
              <i className="fa fa-cog"></i>
              Información del Sistema
            </h3>
          </div>

          <div className="card-body">
            <div className="info-grid">
              <div className="info-item">
                <label>Carnet de Identidad</label>
                <p className="form-value readonly">{usuarioData.ci}</p>
                <small>🔒 No modificable</small>
              </div>

              <div className="info-item">
                <label>Correo Institucional</label>
                <p className="form-value readonly">{usuarioData.email}</p>
                <small>🔒 No modificable</small>
              </div>

              <div className="info-item">
                <label>Tipo de Usuario</label>
                <p className="form-value readonly">
                  {usuarioData.role === 'admin' ? 'Administrador' : 'Operador'}
                </p>
                <small>🔒 No modificable</small>
              </div>

              <div className="info-item">
                <label>Estado de la Cuenta</label>
                <p className="form-value readonly">
                  <span className={`status ${usuarioData.active ? 'active' : 'inactive'}`}>
                    {usuarioData.active ? 'Activa' : 'Inactiva'}
                  </span>
                </p>
                <small>🔒 No modificable</small>
              </div>

              <div className="info-item">
                <label>Fecha de Creación</label>
                <p className="form-value readonly">{formatearFecha(usuarioData.fechaCreacion)}</p>
              </div>

              <div className="info-item">
                <label>Última Actualización</label>
                <p className="form-value readonly">{formatearFecha(usuarioData.fechaActualizacion)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Seguridad */}
        <div className="perfil-card">
          <div className="card-header">
            <h3>
              <i className="fa fa-shield-alt"></i>
              Seguridad
            </h3>
          </div>

          <div className="card-body">
            <div className="security-actions">
              <div className="security-item">
                <div className="security-info">
                  <h4>Contraseña</h4>
                  <p>Última actualización: {formatearFecha(usuarioData.fechaCambioClave)}</p>
                </div>
                <button 
                  className="btn-security"
                  onClick={() => setModalCambioPassword(true)}
                >
                  <i className="fa fa-key"></i>
                  Cambiar Contraseña
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de cambio de contraseña */}
      {modalCambioPassword && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Cambiar Contraseña</h3>
              <button 
                className="close-button"
                onClick={() => setModalCambioPassword(false)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCambioPassword} className="modal-body">
              <div className="form-group">
                <label>Contraseña Actual</label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData(prev => ({
                    ...prev,
                    currentPassword: e.target.value
                  }))}
                  required
                  disabled={saving}
                />
              </div>

              <div className="form-group">
                <label>Nueva Contraseña</label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({
                    ...prev,
                    newPassword: e.target.value
                  }))}
                  required
                  minLength={8}
                  disabled={saving}
                />
              </div>

              <div className="form-group">
                <label>Confirmar Nueva Contraseña</label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({
                    ...prev,
                    confirmPassword: e.target.value
                  }))}
                  required
                  minLength={8}
                  disabled={saving}
                />
              </div>

              <div className="password-requirements">
                <p><strong>La contraseña debe contener:</strong></p>
                <ul>
                  <li>Mínimo 8 caracteres</li>
                  <li>Al menos una mayúscula (A-Z)</li>
                  <li>Al menos una minúscula (a-z)</li>
                  <li>Al menos un número (0-9)</li>
                  <li>Al menos un carácter especial (!@#$%^&*)</li>
                </ul>
              </div>

              <div className="modal-footer">
                <button 
                  type="button"
                  className="btn-cancel"
                  onClick={() => setModalCambioPassword(false)}
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="btn-primary"
                  disabled={saving}
                >
                  {saving ? 'Cambiando...' : 'Cambiar Contraseña'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

export default PerfilUsuario;