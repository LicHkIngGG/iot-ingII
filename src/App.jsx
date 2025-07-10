import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged, signOut, setPersistence, browserSessionPersistence } from 'firebase/auth';
import { query, where, getDocs, collection } from 'firebase/firestore';
import { db } from './utils/firebase';

// Componentes de autenticación

import RegLogin from './views/vlogin/reg-login';

// Componentes del sistema
import Dashboard from './components/monitoreos/Dashboard.jsx'
import ControlLuminarias from './components/Control/ControlLuminarias.jsx'
import ConfiguracionSensores from './components/Configuracion/ConfiguracionSensores.jsx'
import GestionDispositivos from './components/Dispositivos/GestionDispositivos.jsx'
import GestionUsuarios from './components/gestion-usuarios/gestion-usuarios.jsx';
import Reportes from './components/reportes/reportes.jsx';

// Layout
import DashboardLayout from './components/barra-nav-lateral/Layout.jsx';

// Componente temporal para configuración
import SetupSystem from './components/SetupSystem.jsx';

function App() {
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const auth = getAuth();

  useEffect(() => {
    // Configurar persistencia de sesión
    setPersistence(auth, browserSessionPersistence)
      .then(() => {
        console.log('Persistencia de sesión configurada');
      })
      .catch((error) => {
        console.error("Error configurando persistencia:", error);
      });

    // Escuchar cambios de autenticación
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
            
            if (userData.activo) {
              // Usuario válido y activo
              setUser(firebaseUser);
              setUserRole(userData.rol); // Usar 'rol' desde Firestore
              localStorage.setItem('userRole', userData.rol);
              localStorage.setItem('userEmail', firebaseUser.email);
              
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
      console.log("Cerrando sesión...");
      
      setLoading(true);
      
      // Limpiar estado
      setUser(null);
      setUserRole(null);
      
      // Limpiar localStorage
      localStorage.clear();
      
      // Cerrar sesión de Firebase
      await signOut(auth);
      
      console.log("Sesión cerrada exitosamente");
    } catch (error) {
      console.error("Error cerrando sesión:", error);
    } finally {
      setLoading(false);
    }
  };

  // Verificar permisos
  const hasPermission = (route) => {
    if (!userRole) return false;
    
    const adminRoutes = [
      '/monitoreo', 
      '/control-luminarias', 
      '/configuracion-sensores',
      '/gestion-dispositivos', 
      '/gestion-usuarios', 
      '/reportes'
    ];
    
    const operadorRoutes = [
      '/monitoreo', 
      '/control-luminarias', 
      '/reportes'
    ];
    
    // Mapear roles de Firestore
    if (userRole === 'administrador' || userRole === 'admin') {
      return adminRoutes.includes(route);
    }
    
    if (userRole === 'operador' || userRole === 'receptionist') {
      return operadorRoutes.includes(route);
    }
    
    return false;
  };

  // Componente para rutas protegidas
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
        <span>Inicializando Sistema de Alumbrado Público...</span>
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

        {/* Rutas protegidas */}
        <Route 
          path="/monitoreo" 
          element={
            <ProtectedRoute path="/monitoreo">
              <Dashboard userRole={userRole} />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/control-luminarias" 
          element={
            <ProtectedRoute path="/control-luminarias">
              <ControlLuminarias userRole={userRole} />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/configuracion-sensores" 
          element={
            <ProtectedRoute path="/configuracion-sensores">
              <ConfiguracionSensores userRole={userRole} />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/gestion-dispositivos" 
          element={
            <ProtectedRoute path="/gestion-dispositivos">
              <GestionDispositivos userRole={userRole} />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/gestion-usuarios" 
          element={
            <ProtectedRoute path="/gestion-usuarios">
              <GestionUsuarios />
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

        {/* Rutas por defecto */}
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