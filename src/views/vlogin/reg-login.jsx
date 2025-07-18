import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut,
  updatePassword 
} from 'firebase/auth';
import { 
  query, 
  where, 
  getDocs, 
  collection,
  updateDoc,
  doc 
} from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { registrarLog } from '../../utils/logUtils';
import './reg-login.css';

function RegLogin({ setUserRole }) {
  const navigate = useNavigate();
  const auth = getAuth();
  
  // Estados de navegación
  const [showLogin, setShowLogin] = useState(false);
  
  // Estados del formulario de login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  
  // 🔐 Estados para cambio obligatorio de contraseña
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [usuarioActual, setUsuarioActual] = useState(null);
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log("🔐 Usuario detectado en sesión:", user.email);

        // 🔐 VERIFICAR SI REQUIERE CAMBIO DE CONTRASEÑA
        await verificarCambioObligatorio(user);
      } else {
        console.log("❌ No hay usuario autenticado.");
        setInitialLoading(false);
      }
    });

    return () => unsubscribe();
  }, [auth]);

  // 🔐 FUNCIÓN PARA VERIFICAR CAMBIO OBLIGATORIO DE CONTRASEÑA
  const verificarCambioObligatorio = async (user) => {
    try {
      const q = query(collection(db, 'usuarios'), where('email', '==', user.email));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        console.log('🔍 Verificando datos de usuario:', userData);

        // 🔐 VERIFICAR SI REQUIERE CAMBIO DE CONTRASEÑA
        if (userData.requiereCambioPassword) {
          console.log('🔐 Usuario requiere cambio de contraseña obligatorio');
          
          // Verificar tiempo desde creación para evitar modal inmediato
          const tiempoCreacion = new Date(userData.fechaCreacion).getTime();
          const tiempoActual = new Date().getTime();
          const diferenciaTiempo = tiempoActual - tiempoCreacion;
          
          // Solo mostrar modal si han pasado al menos 10 segundos
          if (diferenciaTiempo > 10000) {
            setUsuarioActual({
              ...userData,
              docId: userDoc.id
            });
            setShowPasswordChangeModal(true);
            setInitialLoading(false);
            return; // No continuar con validación normal
          }
        }

        // Continuar con validación normal si no requiere cambio
        await validarSesion(user, userDoc, userData);
      } else {
        console.error("❌ Usuario no encontrado en Firestore");
        await signOut(auth);
        setError("Usuario no registrado en el sistema");
        setInitialLoading(false);
      }
    } catch (error) {
      console.error("❌ Error verificando cambio obligatorio:", error);
      setError("Error validando sesión.");
      setInitialLoading(false);
    }
  };

  // 🔐 FUNCIÓN PARA MANEJAR CAMBIO OBLIGATORIO DE CONTRASEÑA
  const handleCambioObligatorio = async (e) => {
    e.preventDefault();
    
    if (nuevaPassword !== confirmarPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    
    // 🔐 VALIDACIONES DE SEGURIDAD ESTRICTAS
    if (nuevaPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    
    const regexMayuscula = /[A-Z]/;
    const regexMinuscula = /[a-z]/;
    const regexNumero = /[0-9]/;
    const regexEspecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/;
    
    if (!regexMayuscula.test(nuevaPassword) || 
        !regexMinuscula.test(nuevaPassword) || 
        !regexNumero.test(nuevaPassword) || 
        !regexEspecial.test(nuevaPassword)) {
      setError('La contraseña debe incluir: mayúsculas, minúsculas, números y caracteres especiales (!@#$%^&*)');
      return;
    }
    
    setChangingPassword(true);
    setError('');
    
    try {
      const user = auth.currentUser;
      
      // 🔐 ACTUALIZAR CONTRASEÑA EN FIREBASE AUTH
      await updatePassword(user, nuevaPassword);
      
      // 🔐 ACTUALIZAR ESTADO EN FIRESTORE
      await updateDoc(doc(db, 'usuarios', usuarioActual.docId), {
        requiereCambioPassword: false,
        fechaCambioClave: new Date().toISOString(),
        fechaActualizacion: new Date().toISOString()
      });
      
      // 🔐 REGISTRAR ACCIÓN
      await registrarLog(
        usuarioActual.docId,
        user.email,
        'cambio_password_obligatorio',
        'Cambio obligatorio de contraseña completado exitosamente',
        'seguridad',
        'exitoso'
      );
      
      console.log('✅ Contraseña cambiada exitosamente');
      
      // Limpiar estados del modal
      setShowPasswordChangeModal(false);
      setNuevaPassword('');
      setConfirmarPassword('');
      setUsuarioActual(null);
      
      // Continuar con validación normal
      const q = query(collection(db, 'usuarios'), where('email', '==', user.email));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const userData = { ...userDoc.data(), requiereCambioPassword: false };
        await validarSesion(user, userDoc, userData);
      }
      
    } catch (error) {
      console.error('❌ Error al cambiar contraseña:', error);
      setError('Error al cambiar contraseña. Inténtelo nuevamente.');
      
      await registrarLog(
        usuarioActual?.docId || 'sistema',
        auth.currentUser?.email || 'unknown',
        'cambio_password_obligatorio',
        `Error al cambiar contraseña: ${error.message}`,
        'seguridad',
        'fallido'
      );
    } finally {
      setChangingPassword(false);
    }
  };

  const validarSesion = async (user, userDoc = null, userData = null) => {
    try {
      // Si no se proporcionan los datos, buscarlos
      if (!userDoc || !userData) {
        const q = query(collection(db, 'usuarios'), where('email', '==', user.email));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          userDoc = querySnapshot.docs[0];
          userData = userDoc.data();
        } else {
          throw new Error('Usuario no encontrado en Firestore');
        }
      }

      console.log('🔍 Validando sesión para:', userData);

      // 🔐 VERIFICAR SI LA CUENTA ESTÁ ACTIVA
      if (userData.activo === false || userData.active === false) {
        console.error("❌ Cuenta deshabilitada.");
        setError("Tu cuenta está deshabilitada. Contacta al administrador.");

        await registrarLog(
          userDoc.id,
          user.email,
          'intento_login',
          'Intento de inicio de sesión con cuenta deshabilitada',
          'autenticacion',
          'fallido'
        );

        await signOut(auth);
        setInitialLoading(false);
        return;
      }

      // 🔐 REGISTRAR ACCESO EXITOSO
      await registrarLog(
        userDoc.id, 
        user.email,
        'inicio_sesion',
        'Inicio de sesión exitoso',
        'autenticacion',
        'exitoso'
      );

      // 🔐 ACTUALIZAR ÚLTIMO ACCESO
      await updateDoc(doc(db, 'usuarios', userDoc.id), {
        ultimoAcceso: new Date().toISOString()
      });

      // Establecer rol de usuario
      const userRole = userData.role || userData.rol;
      localStorage.setItem('userRole', userRole);
      setUserRole(userRole);
      
      console.log('✅ Sesión validada exitosamente. Rol:', userRole);
      
      // 🔐 REDIRECCIONAR SEGÚN ROL
      if (userRole === 'admin' || userRole === 'administrador') {
        navigate('/gestion-usuarios');
      } else if (userRole === 'receptionist' || userRole === 'operador') {
        navigate('/gestion-clientes');
      } else {
        navigate('/gestion-usuarios'); // Default fallback
      }

    } catch (error) {
      console.error("❌ Error validando sesión:", error);
      setError("Error validando sesión.");
      
      if (user) {
        await registrarLog(
          user.uid,
          user.email,
          'validar_sesion',
          `Error en validación: ${error.message}`,
          'autenticacion',
          'fallido'
        );
      }
      
      await signOut(auth);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleIngresarClick = async () => {
    try {
      if (loginLoading || initialLoading) return;
      setError('');
      setLoginLoading(true);

      const emailTrimmed = email.trim();
      
      // 🔐 VALIDACIONES DE ENTRADA MEJORADAS
      if (!emailTrimmed || !emailTrimmed.includes('@')) {
        setError('Por favor, ingresa un correo electrónico válido');
        setLoginLoading(false);
        return;
      }

      if (!password || password.length < 6) {
        setError('La contraseña debe tener al menos 6 caracteres');
        setLoginLoading(false);
        return;
      }

      console.log('🔐 Intentando autenticación para:', emailTrimmed);

      // 🔐 AUTENTICACIÓN CON FIREBASE
      const userCredential = await signInWithEmailAndPassword(auth, emailTrimmed, password);
      const user = userCredential.user;

      console.log('✅ Usuario autenticado exitosamente:', user.email);
      
      // La verificación de cambio obligatorio se maneja en el useEffect
      // a través de onAuthStateChanged

    } catch (error) {
      console.error("❌ Error en login:", error);
      
      await registrarLog(
        'sistema',
        email.trim(),
        'intento_login',
        `Credenciales incorrectas: ${error.message}`,
        'autenticacion',
        'fallido'
      );

      // 🔐 MENSAJES DE ERROR ESPECÍFICOS
      let errorMessage = 'Credenciales incorrectas';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No existe una cuenta con este correo electrónico';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Contraseña incorrecta';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Demasiados intentos fallidos. Inténtalo más tarde';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'Tu cuenta está deshabilitada. Contacta al administrador';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'El formato del correo electrónico no es válido';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Error de conexión. Verifica tu internet';
      }

      setError(errorMessage);
      setLoginLoading(false);
    }
  };

  // Manejar tecla Enter
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleIngresarClick();
    }
  };

  // 🔐 RENDERIZAR MODAL DE CAMBIO OBLIGATORIO DE CONTRASEÑA
  const renderModalCambioPassword = () => {
    return (
      <div className="modal-overlay">
        <div className="modal-container">
          <div className="modal-header">
            <h3>🔐 Cambio de Contraseña Obligatorio</h3>
          </div>
          
          <form onSubmit={handleCambioObligatorio} className="modal-body">
            <div className="warning-message">
              <p><strong>Por seguridad, debe cambiar su contraseña en el primer inicio de sesión.</strong></p>
            </div>
            
            <div className="form-group">
              <label htmlFor="nuevaPassword">Nueva Contraseña *</label>
              <input 
                type="password"
                id="nuevaPassword"
                value={nuevaPassword}
                onChange={(e) => setNuevaPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Ingrese su nueva contraseña"
                disabled={changingPassword}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="confirmarPassword">Confirmar Nueva Contraseña *</label>
              <input 
                type="password"
                id="confirmarPassword"
                value={confirmarPassword}
                onChange={(e) => setConfirmarPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Confirme su nueva contraseña"
                disabled={changingPassword}
              />
            </div>
            
            <div className="password-requirements">
              <h4>Requisitos de seguridad:</h4>
              <ul>
                <li>✓ Mínimo 8 caracteres</li>
                <li>✓ Al menos una mayúscula (A-Z)</li>
                <li>✓ Al menos una minúscula (a-z)</li>
                <li>✓ Al menos un número (0-9)</li>
                <li>✓ Al menos un carácter especial (!@#$%^&*)</li>
              </ul>
            </div>
            
            {error && <div className="error-message">{error}</div>}
            
            <div className="modal-footer">
              <button 
                type="submit" 
                className="change-password-btn" 
                disabled={changingPassword}
              >
                {changingPassword ? '🔄 Cambiando...' : '🔐 Cambiar Contraseña'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // 🎨 RENDERIZAR PANTALLA DE BIENVENIDA
  if (!showLogin && !initialLoading) {
    return (
      <div className="bienvenida-login-background">
        <div className="bienvenida-login-container">
          <div className="logo-container">
            <img 
              src="https://i.ibb.co/xtN8mjLv/logo.png" 
              alt="Logo Sistema" 
              className="logo" 
            />
          </div>
          <h1 className="welcome-text">Bienvenido al Sistema</h1>
          <p className="welcome-subtitle">Gestión Segura de Personal y Clientes</p>
          <button 
            className="bienvenida-login-button" 
            onClick={() => setShowLogin(true)}
          >
            🔐 Iniciar Sesión
          </button>
        </div>
      </div>
    );
  }

  // 🔐 RENDERIZAR PANTALLA DE LOGIN
  return (
    <div className="login-container">
      {/* MODAL DE CAMBIO OBLIGATORIO DE CONTRASEÑA */}
      {showPasswordChangeModal && renderModalCambioPassword()}
      
      <div className="login-card">
        <div className="login-header">
          <img 
            src="https://i.ibb.co/xtN8mjLv/logo.png" 
            alt="Logo" 
            className="login-image" 
          />
          <h2>🔐 Acceso Seguro</h2>
          <p className="login-subtitle">Ingrese sus credenciales corporativas</p>
        </div>
        
        <div className="login-form">
          <div className="input-group">
            <label htmlFor="email">📧 Correo Electrónico</label>
            <input
              type="email"
              id="email"
              placeholder="usuario@dominio.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={initialLoading || loginLoading}
              autoComplete="email"
            />
          </div>
          
          <div className="input-group">
            <label htmlFor="password">🔑 Contraseña</label>
            <input
              type="password"
              id="password"
              placeholder="Ingrese su contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={initialLoading || loginLoading}
              autoComplete="current-password"
            />
          </div>
          
          <button 
            className="login-button"
            onClick={handleIngresarClick} 
            disabled={loginLoading || initialLoading}
          >
            {loginLoading ? '🔄 Iniciando sesión...' : 
             initialLoading ? '⏳ Cargando...' : 
             '🚀 Ingresar'}
          </button>
          
          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}
          
          <div className="login-footer">
            <button 
              className="back-button"
              onClick={() => setShowLogin(false)}
              disabled={loginLoading || initialLoading}
            >
              ← Volver
            </button>
          </div>
        </div>
      </div>
      
      {/* INDICADOR DE SEGURIDAD */}
      <div className="security-indicator">
        <p>🔒 Conexión segura protegida</p>
      </div>
    </div>
  );
}

export default RegLogin;