// App.jsx - VERSIÓN COMBINADA
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged, signOut, setPersistence, browserSessionPersistence } from 'firebase/auth';
import { query, where, getDocs, collection } from 'firebase/firestore';
import { db } from './utils/firebase';

// Componentes de autenticación
import RegLogin from './views/vlogin/reg-login';

// Componentes del sistema (usando las rutas del segundo código)
//import Dashboard from './components/monitoreos/Dashboard.jsx'
import Dashboard from './components/monitoreos/'
import GestionUnidades from './components/GestionUnidades/GestionUnidades.jsx'
import MapeoDispositivos from './components/MapeoDispositivos/MapeoDispositivos.jsx'
import GestionUsuarios from './components/gestion-usuarios/gestion-usuarios.jsx';
import Reportes from './components/reportes/reportes.jsx';
import PerfilUsuario from './components/miPerfil/PerfilUsuario.jsx';

// Layout
import DashboardLayout from './components/barra-nav-lateral/Layout.jsx';

// Componente temporal para configuración
import SetupSystem from './components/SetupSystem.jsx';
import { firebaseService } from './services/firebaseService';

function App() {
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const auth = getAuth();

  useEffect(() => {
    // Deshabilitar persistencia de la sesión para evitar que se mantenga (lógica del primer código)
    setPersistence(auth, browserSessionPersistence)
      .then(() => {
        console.log('Persistencia de sesión configurada');
        
        // Verificar si ya hay un rol guardado localmente
        const role = localStorage.getItem('userRole');
        if (role) {
          setUserRole(role);
        }
      })
      .catch((error) => {
        console.error("Error configurando persistencia:", error);
      });

    // Escuchar cambios de autenticación (lógica del segundo código mejorada)
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      
      if (firebaseUser) {
        console.log("Usuario autenticado:", firebaseUser.email);
        
        try {
          // Verificar usuario en Firestore
          const q = query(collection(db, 'usuarios'), where('email', '==', firebaseUser.email));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            const userData = userDoc.data();
            
            // Verificar si el usuario está activo (compatibilidad con ambos campos)
            const isActive = userData.activo !== false && userData.active !== false;
            
            if (isActive) {
              // Usuario válido y activo
              setUser(firebaseUser);
              
              // Usar 'rol' como campo principal, 'role' como fallback
              const userRole = userData.rol || userData.role;
              setUserRole(userRole);
              
              localStorage.setItem('userRole', userRole);
              localStorage.setItem('userEmail', firebaseUser.email);
              localStorage.setItem('userName', userData.nombre || userData.name || firebaseUser.email);
              
              // Inicializar datos si es necesario
              if (!localStorage.getItem('dataInitialized')) {
                try {
                  await firebaseService.initializeExampleData();
                  localStorage.setItem('dataInitialized', 'true');
                  console.log('Datos inicializados correctamente');
                } catch (error) {
                  console.error('Error inicializando datos:', error);
                }
              }
              
            } else {
              // Usuario desactivado
              console.log("Usuario desactivado");
              await signOut(auth);
              setUser(null);
              setUserRole(null);
              localStorage.clear();
            }
          } else {
            // Usuario no encontrado en Firestore
            console.log("Usuario no encontrado en Firestore");
            await signOut(auth);
            setUser(null);
            setUserRole(null);
            localStorage.clear();
          }
        } catch (error) {
          console.error("Error verificando usuario:", error);
          setUser(null);
          setUserRole(null);
          localStorage.clear();
        }
      } else {
        // No hay usuario autenticado
        console.log("No hay usuario autenticado");
        setUser(null);
        setUserRole(null);
        localStorage.clear();
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth]);

  const handleLogout = async () => {
    try {
      console.log("Iniciando proceso de logout desde App");
      
      setLoading(true);
      
      // 1. Limpiar almacenamiento local primero
      localStorage.clear();
      
      // 2. Actualizar estado para desmontar componentes
      setUser(null);
      setUserRole(null);
      
      // 3. Cerrar sesión de Firebase
      await signOut(auth);
      
      console.log("Sesión cerrada exitosamente");
      
      // 4. Usar una redirección dura para evitar problemas con react-router
      window.location.href = '/login';
    } catch (error) {
      console.error("Error cerrando sesión:", error);
    } finally {
      setLoading(false);
    }
  };

  // Verificar permisos (usando las rutas del segundo código)
  const hasPermission = (route) => {
    if (!userRole) return false;
    
    const adminRoutes = [
      '/gestion-usuarios',
      '/monitoreo', 
      '/gestion-unidades',
      '/mapeo-dispositivos',
      '/reportes',
      '/perfil'
    ];
    
    const operadorRoutes = [
      '/monitoreo', 
      '/gestion-unidades',
      '/mapeo-dispositivos',
      '/reportes',
      '/perfil'
    ];
    
    // Mapear roles con compatibilidad
    if (userRole === 'administrador' || userRole === 'admin') {
      return adminRoutes.includes(route);
    }
    
    if (userRole === 'operador' || userRole === 'receptionist') {
      return operadorRoutes.includes(route);
    }
    
    return false;
  };

  // Componente para rutas protegidas (lógica del primer código mejorada)
  const ProtectedRoute = ({ children, path }) => {
    if (loading) {
      return (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Cargando...</p>
        </div>
      );
    }
    
    if (!user || !userRole) {
      return <Navigate to="/login" replace />;
    }
    
    if (!hasPermission(path)) {
      return <Navigate to="/monitoreo" replace />;
    }
    
    return (
      <DashboardLayout handleLogout={handleLogout}>
        {children}
      </DashboardLayout>
    );
  };

  // Componente para rutas públicas (solo login)
  const PublicRoute = ({ children }) => {
    if (loading) {
      return (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Verificando autenticación...</p>
        </div>
      );
    }
    
    if (user && userRole) {
      return <Navigate to="/monitoreo" replace />;
    }
    
    return children;
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div className="loading-spinner" style={{
          width: '40px',
          height: '40px',
          border: '4px solid #e2e8f0',
          borderTop: '4px solid #3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <span>Inicializando SmartLight...</span>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Ruta temporal para configuración */}
        <Route 
          path="/setup" 
          element={<SetupSystem />} 
        />

        {/* Ruta de login */}
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <RegLogin setUserRole={setUserRole} />
            </PublicRoute>
          } 
        />

        {/* Rutas protegidas - Usando las rutas del segundo código */}
        <Route 
          path="/gestion-usuarios" 
          element={
            <ProtectedRoute path="/gestion-usuarios">
              <GestionUsuarios />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/monitoreo" 
          element={
            <ProtectedRoute path="/monitoreo">
              <Dashboard userRole={userRole} />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/gestion-unidades" 
          element={
            <ProtectedRoute path="/gestion-unidades">
              <GestionUnidades userRole={userRole} />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/mapeo-dispositivos" 
          element={
            <ProtectedRoute path="/mapeo-dispositivos">
              <MapeoDispositivos userRole={userRole} />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/reportes" 
          element={
            <ProtectedRoute path="/reportes">
              <Reportes />
            </ProtectedRoute>
          } 
        />
         
        <Route 
          path="/perfil" 
          element={
            <ProtectedRoute path="/perfil">
              <PerfilUsuario />
            </ProtectedRoute>
          } 
        />

        {/* Rutas por defecto - Redirigir a /monitoreo en lugar de /gestion-usuarios */}
        <Route 
          path="/" 
          element={
            user && userRole ? 
            <Navigate to="/monitoreo" replace /> : 
            <Navigate to="/login" replace />
          } 
        />
        
        <Route 
          path="*" 
          element={
            user && userRole ? 
            <Navigate to="/monitoreo" replace /> : 
            <Navigate to="/login" replace />
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;