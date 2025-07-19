// views/vlogin/reg-login.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
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
  const [loginLoading, setLoginLoading] = useState(false);

  const handleIngresarClick = async (e) => {
    e.preventDefault();
    
    if (loginLoading) return;
    
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

      // Verificar usuario en Firestore
      const q = query(collection(db, 'usuarios'), where('email', '==', user.email));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        
        console.log('Datos del usuario:', userData);

        if (userData.activo !== false) {
          // Usuario válido y activo
          console.log('Login exitoso, rol:', userData.rol);
          
          // Registrar log exitoso
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

          // Guardar información del usuario
          localStorage.setItem('userRole', userData.rol);
          localStorage.setItem('userEmail', user.email);
          localStorage.setItem('userName', userData.nombre || user.email);
          setUserRole(userData.rol);
          
          // Redirigir al dashboard
          navigate('/monitoreo');
          
        } else {
          // Usuario desactivado
          console.error("Cuenta deshabilitada");
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

          await auth.signOut();
        }
      } else {
        // Usuario no encontrado
        console.error("Usuario no encontrado en la base de datos");
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

        await auth.signOut();
      }

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
      <h2>SMART LIGHT</h2>

      <form onSubmit={handleIngresarClick}>
        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loginLoading}
          required
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loginLoading}
          required
        />
        <button 
          type="submit" 
          disabled={loginLoading}
          className={loginLoading ? 'loading' : ''}
        >
          {loginLoading ? 'Iniciando sesión...' : 'Ingresar'}
        </button>
      </form>

      {error && <div className="error">{error}</div>}
    </div>
  </div>
);
}
export default RegLogin;