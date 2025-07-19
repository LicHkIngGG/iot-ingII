import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { query, where, getDocs, collection } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { registrarLog } from '../../utils/logUtils';
import './reg-login.css';

function RegLogin({ setUserRole }) {
  const navigate = useNavigate();
  const auth = getAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log("Usuario detectado en sesión:", user.email);

        const isLoginPage = window.location.pathname === '/login';
        if (isLoginPage) {
          console.log("En página de login con sesión activa - esperando acción del usuario");
          setInitialLoading(false);
        } else {
          await validarSesion(user);
        }
      } else {
        console.log("No hay usuario autenticado.");
        setInitialLoading(false);
      }
    });

    return () => unsubscribe();
  }, [auth]);

  const validarSesion = async (user) => {
    try {
      const q = query(collection(db, 'usuarios'), where('email', '==', user.email));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        console.log('Datos en Firestore:', userData);

        // Verificar si el usuario está activo (usando ambos campos por compatibilidad)
        const isActive = userData.active !== false && userData.activo !== false;

        if (isActive) {
          try {
            await registrarLog(
              userDoc.id, 
              user.email,
              'inicio_sesion',
              'Acceso exitoso al sistema de alumbrado público',
              'autenticacion',
              'exitoso'
            );
          } catch (logError) {
            console.log('Error al registrar log (no crítico):', logError);
          }

          // Usar 'rol' como campo principal, 'role' como fallback
          const userRole = userData.rol || userData.role;
          
          localStorage.setItem('userRole', userRole);
          localStorage.setItem('userEmail', user.email);
          localStorage.setItem('userName', userData.nombre || userData.name || user.email);
          setUserRole(userRole);
          
          // Redirigir según el rol (usando las rutas del segundo código)
          navigate('/monitoreo');
          
        } else {
          console.error("Cuenta deshabilitada.");
          setError("Tu cuenta está deshabilitada. Contacta al administrador del sistema.");

          try {
            await registrarLog(
              userDoc.id,
              user.email,
              'intento_login',
              'Intento de acceso con cuenta deshabilitada',
              'autenticacion',
              'fallido'
            );
          } catch (logError) {
            console.log('Error al registrar log (no crítico):', logError);
          }

          await signOut(auth);
        }
      } else {
        console.error("Usuario no encontrado en Firestore");
        setError("Usuario no autorizado para acceder al sistema");
        
        try {
          await registrarLog(
            'sistema',
            user.email,
            'intento_login',
            'Intento de acceso con usuario no autorizado',
            'autenticacion',
            'fallido'
          );
        } catch (logError) {
          console.log('Error al registrar log (no crítico):', logError);
        }

        await signOut(auth);
      }
    } catch (error) {
      console.error("Error validando sesión:", error);
      setError("Error validando sesión.");
      
      if (user) {
        try {
          await registrarLog(
            user.uid,
            user.email,
            'validar_sesion',
            `Error en validación: ${error.message}`,
            'autenticacion',
            'fallido'
          );
        } catch (logError) {
          console.log('Error al registrar log (no crítico):', logError);
        }
      }
    } finally {
      setInitialLoading(false);
    }
  };

  const handleIngresarClick = async (e) => {
    e.preventDefault();
    
    if (loginLoading || initialLoading) return;
    
    setError('');
    setLoginLoading(true);

    try {
      // Validaciones básicas
      const emailTrimmed = email.trim();
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

      console.log('Intentando login con:', emailTrimmed);

      // Autenticar con Firebase
      const userCredential = await signInWithEmailAndPassword(auth, emailTrimmed, password);
      const user = userCredential.user;

      console.log('Usuario autenticado:', user.email);
      await validarSesion(user);

    } catch (error) {
      console.error("Error en login:", error);
      
      // Registrar error
      try {
        await registrarLog(
          'sistema',
          email.trim(),
          'intento_login',
          `Error de autenticación: ${error.message}`,
          'autenticacion',
          'fallido'
        );
      } catch (logError) {
        console.log('Error al registrar log (no crítico):', logError);
      }

      // Mostrar mensaje de error
      let errorMessage = 'Error al iniciar sesión';
      
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'Usuario no encontrado en el sistema';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Contraseña incorrecta';
          break;
        case 'auth/invalid-email':
          errorMessage = 'El formato del correo electrónico es inválido';
          break;
        case 'auth/user-disabled':
          errorMessage = 'Esta cuenta ha sido deshabilitada';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Demasiados intentos fallidos. Intenta más tarde';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Error de conexión. Verifica tu internet';
          break;
        case 'auth/invalid-credential':
          errorMessage = 'Credenciales inválidas';
          break;
        default:
          errorMessage = 'Credenciales incorrectas';
      }

      setError(errorMessage);
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <img 
          src="https://i.imgur.com/cXkWtJv.png" 
          alt="Logo Villa Adela" 
          className="login-image" 
        />
        <h2>Sistema de Alumbrado Público</h2>

        <form onSubmit={handleIngresarClick}>
          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={initialLoading || loginLoading}
            required
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={initialLoading || loginLoading}
            required
          />
          <button 
            type="submit" 
            disabled={loginLoading || initialLoading}
            className={loginLoading ? 'loading' : ''}
          >
            {loginLoading ? 'Iniciando sesión...' : initialLoading ? 'Cargando...' : 'Ingresar'}
          </button>
        </form>

        {error && <div className="error">{error}</div>}
      </div>
    </div>
  );
}

export default RegLogin;