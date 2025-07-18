import React, { useState } from 'react';
import {
  updateDoc,
  doc
} from 'firebase/firestore';
import { db } from '../../utils/firebase';
import './gestion-adm-tabla.css';

const GestionAdmTabla = ({ 
  usuarios, 
  loading, 
  mostrarNotificacion, 
  generarContraseña,
  copiarAlPortapapeles,
  setShowNewUserModal,
  setNuevoUsuario,
  showNewUserModal,
  nuevoUsuario,
  enviarEmailCredenciales
}) => {
  // Estados locales para la tabla
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [showResendEmailModal, setShowResendEmailModal] = useState(false);
  const [enviandoEmail, setEnviandoEmail] = useState(false);

  // 🔧 FIX: Restablecimiento de contraseña mejorado
  const restablecerContrasena = async () => {
    if (!selectedUser) return;

    setLoadingAction(true);
    try {
      // Generar nueva contraseña
      const nuevaContraseña = generarContraseña();

      // Actualizar en Firestore que requiere cambio de contraseña
      const userRef = doc(db, 'usuarios', selectedUser.id);
      await updateDoc(userRef, {
        requiereCambioPassword: true,
        fechaRestablecimientoPassword: new Date().toISOString()
      });

      // Cerrar modal de restablecimiento
      setShowPasswordModal(false);
      
      // Preparar usuario con nueva contraseña para mostrar
      const usuarioConNuevaPassword = {
        ...selectedUser,
        password: nuevaContraseña,
        email: selectedUser.email
      };
      
      // 🔧 MEJORADO: Intentar enviar email con manejo de errores
      let emailEnviado = false;
      if (selectedUser.correoPersonal && enviarEmailCredenciales) {
        try {
          emailEnviado = await enviarEmailCredenciales(selectedUser, nuevaContraseña);
        } catch (emailError) {
          console.error('Error al enviar email durante restablecimiento:', emailError);
          emailEnviado = false;
        }
      }
      
      // Agregar información sobre el envío de email
      usuarioConNuevaPassword.emailEnviado = emailEnviado;
      setNuevoUsuario(usuarioConNuevaPassword);
      
      // Mensaje personalizado según el resultado del email
      const mensajeExito = emailEnviado 
        ? 'Contraseña restablecida y enviada al correo personal exitosamente'
        : selectedUser.correoPersonal 
        ? 'Contraseña restablecida. No se pudo enviar por correo, verifique las credenciales en pantalla.'
        : 'Contraseña restablecida exitosamente. Verifique las credenciales en pantalla.';
      
      mostrarNotificacion(mensajeExito, emailEnviado ? 'success' : 'warning');
      
      // Mostrar modal con nueva contraseña
      setShowNewUserModal(true);

    } catch (error) {
      console.error('Error al restablecer contraseña:', error);
      mostrarNotificacion('Error al restablecer contraseña', 'error');
    } finally {
      setLoadingAction(false);
    }
  };

  // 🔧 FIX: Función mejorada para reenviar credenciales
  const reenviarCredenciales = async () => {
    if (!selectedUser || !selectedUser.correoPersonal) return;

    setEnviandoEmail(true);
    try {
      // Generar nueva contraseña temporal
      const nuevaContraseña = generarContraseña();

      // Actualizar en Firestore que requiere cambio de contraseña
      const userRef = doc(db, 'usuarios', selectedUser.id);
      await updateDoc(userRef, {
        requiereCambioPassword: true,
        fechaReenvioCredenciales: new Date().toISOString()
      });

      // Enviar email con nuevas credenciales
      let emailEnviado = false;
      if (enviarEmailCredenciales) {
        try {
          emailEnviado = await enviarEmailCredenciales(selectedUser, nuevaContraseña);
        } catch (emailError) {
          console.error('Error específico al reenviar credenciales:', emailError);
          emailEnviado = false;
        }
        
        if (emailEnviado) {
          // Preparar datos para mostrar en modal
          setNuevoUsuario({
            ...selectedUser,
            password: nuevaContraseña,
            emailEnviado: true
          });
          
          setShowNewUserModal(true);
          mostrarNotificacion(`Credenciales reenviadas exitosamente a ${selectedUser.correoPersonal}`, 'success');
        } else {
          // Mostrar credenciales en modal aunque no se haya enviado el email
          setNuevoUsuario({
            ...selectedUser,
            password: nuevaContraseña,
            emailEnviado: false
          });
          
          setShowNewUserModal(true);
          mostrarNotificacion('No se pudo enviar el correo. Verifique las credenciales en pantalla.', 'warning');
        }
      }

      setShowResendEmailModal(false);
    } catch (error) {
      console.error('Error al reenviar credenciales:', error);
      mostrarNotificacion('Error al reenviar credenciales', 'error');
    } finally {
      setEnviandoEmail(false);
    }
  };

  // Habilitar / Deshabilitar usuario
  const toggleAccountStatus = async (userId, currentStatus) => {
    setLoadingAction(true);
    try {
      await updateDoc(doc(db, 'usuarios', userId), { 
        active: !currentStatus,
        fechaActualizacion: new Date().toISOString()
      });

      const mensaje = !currentStatus ? 'Administrador activado correctamente' : 'Administrador desactivado correctamente';
      mostrarNotificacion(mensaje, 'success');
    } catch (error) {
      console.error('Error al actualizar estado del usuario:', error);
      mostrarNotificacion('Error al actualizar estado del administrador', 'error');
    } finally {
      setLoadingAction(false);
    }
  };

  // Filtrar usuarios por búsqueda
  const filteredUsuarios = usuarios.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.email?.toLowerCase().includes(searchLower) ||
      user.role?.toLowerCase().includes(searchLower) ||
      user.nombres?.toLowerCase().includes(searchLower) ||
      user.apellidoPaterno?.toLowerCase().includes(searchLower) ||
      user.apellidoMaterno?.toLowerCase().includes(searchLower) ||
      user.ci?.includes(searchTerm) ||
      user.correoPersonal?.toLowerCase().includes(searchLower)
    );
  });

  // Traducir rol
  const traducirRol = (rol) => {
    switch(rol) {
      case 'admin': return 'Administrador';
      case 'receptionist': return 'Recepcionista';
      default: return rol;
    }
  };

  return (
    <div className="tabla-usuarios-container">
      {/* Modal de restablecimiento de contraseña */}
      {showPasswordModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Restablecer Contraseña</h3>
              <button 
                className="close-button" 
                onClick={() => setShowPasswordModal(false)}
              >
                &times;
              </button>
            </div>
            
            <div className="modal-body">
              <p>¿Está seguro que desea restablecer la contraseña para <strong>{selectedUser?.nombres} {selectedUser?.apellidoPaterno}</strong>?</p>
              <p>Se generará una nueva contraseña temporal y se requerirá cambio en el próximo inicio de sesión.</p>
              
              {/* Mostrar información de envío si tiene correo personal */}
              {selectedUser?.correoPersonal && (
                <div className="info-box">
                  <i className="fa fa-envelope"></i>
                  <p>Las nuevas credenciales se intentarán enviar automáticamente a: <strong>{selectedUser.correoPersonal}</strong></p>
                  <small>Si no se puede enviar, las credenciales se mostrarán en pantalla.</small>
                </div>
              )}
              
              {!selectedUser?.correoPersonal && (
                <div className="warning-box">
                  <i className="fa fa-exclamation-triangle"></i>
                  <p>Este usuario no tiene correo personal registrado. Las credenciales se mostrarán únicamente en pantalla.</p>
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn-secondary" 
                onClick={() => setShowPasswordModal(false)}
              >
                Cancelar
              </button>
              <button 
                className="btn-primary" 
                onClick={restablecerContrasena}
                disabled={loadingAction}
              >
                {loadingAction ? 'Restableciendo...' : 'Restablecer Contraseña'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para reenviar credenciales */}
      {showResendEmailModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Reenviar Credenciales</h3>
              <button 
                className="close-button" 
                onClick={() => setShowResendEmailModal(false)}
              >
                &times;
              </button>
            </div>
            
            <div className="modal-body">
              <p>¿Está seguro que desea reenviar las credenciales de acceso para <strong>{selectedUser?.nombres} {selectedUser?.apellidoPaterno}</strong>?</p>
              
              {selectedUser?.correoPersonal ? (
                <div className="success-box">
                  <i className="fa fa-envelope"></i>
                  <p>Se generará una nueva contraseña temporal y se intentará enviar a: <strong>{selectedUser.correoPersonal}</strong></p>
                  <p><small>El usuario deberá cambiar la contraseña en el próximo inicio de sesión.</small></p>
                  <p><small>Si no se puede enviar el correo, las credenciales se mostrarán en pantalla.</small></p>
                </div>
              ) : (
                <div className="warning-box">
                  <i className="fa fa-exclamation-triangle"></i>
                  <p>Este usuario no tiene un correo personal registrado. No se pueden reenviar credenciales automáticamente.</p>
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn-secondary" 
                onClick={() => setShowResendEmailModal(false)}
              >
                Cancelar
              </button>
              {selectedUser?.correoPersonal && (
                <button 
                  className="btn-primary" 
                  onClick={reenviarCredenciales}
                  disabled={enviandoEmail}
                >
                  {enviandoEmail ? 'Enviando...' : 'Reenviar Credenciales'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sección de lista de usuarios */}
      <div className="usuarios-section">
        <h3>Administradores Registrados en el Sistema</h3>
        
        <div className="search-bar">
          <input
            type="text"
            placeholder="Buscar por nombre, apellido, correo institucional, correo personal o carnet"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        {loading && (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p className="loading-message">Cargando usuarios...</p>
          </div>
        )}
        
        {!loading && filteredUsuarios.length === 0 && (
          <div className="no-results">
            <i className="fa fa-exclamation-circle"></i>
            <p>No hay administradores que coincidan con la búsqueda.</p>
          </div>
        )}
        
        {!loading && filteredUsuarios.length > 0 && (
          <div className="table-container">
            <table className="usuarios-table">
              <thead>
                <tr>
                  <th>Nombre Completo</th>
                  <th>Correo Institucional</th>
                  <th>Correo Personal</th>
                  <th>Carnet</th>
                  <th>Celular</th>
                  <th>Tipo</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsuarios.map(user => (
                  <tr key={user.id} className={user.active ? 'row-active' : 'row-inactive'}>
                    <td data-label="Nombre Completo">
                      {`${user.nombres || ''} ${user.apellidoPaterno || ''} ${user.apellidoMaterno || ''}`}
                    </td>
                    <td data-label="Correo Institucional">{user.email}</td>
                    
                    <td data-label="Correo Personal">
                      {user.correoPersonal ? (
                        <span className="email-personal">
                          <i className="fa fa-envelope"></i>
                          {user.correoPersonal}
                        </span>
                      ) : (
                        <span className="no-email">
                          <i className="fa fa-minus-circle"></i>
                          No registrado
                        </span>
                      )}
                    </td>
                    
                    <td data-label="Carnet">{user.ci}</td>
                    <td data-label="Celular">{user.celular}</td>
                    <td data-label="Tipo">{traducirRol(user.role)}</td>
                    <td data-label="Estado">
                      <span className={`status-badge ${user.active ? 'active' : 'inactive'}`}>
                        {user.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td data-label="Acciones">
                      <div className="action-buttons">
                        <button 
                          onClick={() => {
                            setSelectedUser(user);
                            setShowPasswordModal(true);
                          }} 
                          className="btn-table-action btn-password"
                          title="Restablecer contraseña"
                          disabled={loadingAction}
                        >
                          <i className="fa fa-key"></i>
                          <span>Cambiar Contraseña</span>
                        </button>

                        {/* Botón de reenviar credenciales (solo si tiene correo personal) */}
                        {user.correoPersonal && (
                          <button 
                            onClick={() => {
                              setSelectedUser(user);
                              setShowResendEmailModal(true);
                            }} 
                            className="btn-table-action btn-email"
                            title="Reenviar credenciales al correo personal"
                            disabled={loadingAction || enviandoEmail}
                          >
                            <i className="fa fa-paper-plane"></i>
                            <span>Reenviar Credenciales</span>
                          </button>
                        )}

                        <button 
                          onClick={() => toggleAccountStatus(user.id, user.active)} 
                          className={`btn-table-action ${user.active ? 'btn-deactivate' : 'btn-activate'}`}
                          title={user.active ? 'Desactivar administrador' : 'Activar administrador'}
                          disabled={loadingAction}
                        >
                          <i className={user.active ? "fa fa-toggle-on" : "fa fa-toggle-off"}></i>
                          <span>{user.active ? 'Desactivar' : 'Activar'}</span>
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
    </div>
  );
};

export default GestionAdmTabla;