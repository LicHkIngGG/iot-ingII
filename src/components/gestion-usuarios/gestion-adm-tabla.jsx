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
  nuevoUsuario
}) => {
  // Estados locales para la tabla
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);

  // Restablecimiento de contraseña de usuario existente
  const restablecerContrasena = async () => {
    if (!selectedUser) return;

    setLoadingAction(true);
    try {
      // Generar nueva contraseña
      const nuevaContraseña = generarContraseña();

      // Reestablecer contraseña en Firebase
      const userRef = doc(db, 'usuarios', selectedUser.id);
      await updateDoc(userRef, {
        requiereCambioPassword: true,
        fechaRestablecimientoPassword: new Date().toISOString()
      });

      // Cerrar modal de restablecimiento
      setShowPasswordModal(false);
      
      // Preparar usuario con nueva contraseña para mostrar
      setNuevoUsuario({
        ...selectedUser,
        password: nuevaContraseña,
        email: selectedUser.email
      });
      
      // Mostrar modal con nueva contraseña
      setShowNewUserModal(true);

      mostrarNotificacion('Contraseña restablecida exitosamente', 'success');
    } catch (error) {
      console.error('Error al restablecer contraseña:', error);
      mostrarNotificacion('Error al restablecer contraseña', 'error');
    } finally {
      setLoadingAction(false);
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
      user.ci?.includes(searchTerm)
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
      {/* Modal de restablecimiento de contraseña para usuarios existentes */}
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
              <p>¿Está seguro que desea restablecer la contraseña para {selectedUser?.nombres} {selectedUser?.apellidoPaterno}?</p>
              <p>Se generará una nueva contraseña temporal y se requerirá cambio en el próximo inicio de sesión.</p>
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

      {/* Sección de lista de usuarios */}
      <div className="usuarios-section">
        <h3>Administradores Registrados en el Sistema</h3>
        
        <div className="search-bar">
          <input
            type="text"
            placeholder="Buscar por nombre, apellido, correo o carnet"
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
                  <th>Correo Electrónico</th>
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
                    <td data-label="Correo Electrónico">{user.email}</td>
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