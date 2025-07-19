import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import { 
  Activity, 
  Lightbulb, 
  Settings, 
  Users, 
  BarChart3, 
  Wifi,
  LogOut,
  Menu,
  X,
  Zap,
  Monitor,
  MapPin,
  User // Icono específico para perfil
} from 'lucide-react';
import './barra-nav.css';

const BarraNavLateral = ({ handleLogout: appHandleLogout }) => {
  const location = useLocation();
  const [userRole, setUserRole] = useState(null);
  const [isVisible, setIsVisible] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const auth = getAuth();

  // Detectar si es móvil
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      
      // En móviles, el sidebar inicia oculto
      if (mobile && isVisible) {
        setIsVisible(false);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Cargar configuración inicial
  useEffect(() => {
    const role = localStorage.getItem('userRole');
    setUserRole(role);
    
    // Solo aplicar configuración guardada en desktop
    if (!isMobile) {
      const savedVisibility = localStorage.getItem('sidebarVisible');
      if (savedVisibility !== null) {
        setIsVisible(savedVisibility === 'true');
      }
    }
  }, [isMobile]);

  // Aplicar clases al body para controlar el layout
  useEffect(() => {
    const body = document.body;
    
    // Limpiar clases existentes
    body.classList.remove('sidebar-visible', 'sidebar-hidden');
    
    // Aplicar clase según estado
    if (isVisible) {
      body.classList.add('sidebar-visible');
    } else {
      body.classList.add('sidebar-hidden');
    }

    // Cleanup al desmontar
    return () => {
      body.classList.remove('sidebar-visible', 'sidebar-hidden');
    };
  }, [isVisible]);

  // Cerrar sidebar al hacer clic fuera en móviles
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isMobile && isVisible) {
        const sidebar = document.querySelector('.sidebar');
        const toggleBtn = document.querySelector('.toggle-btn');
        
        if (sidebar && !sidebar.contains(event.target) && !toggleBtn.contains(event.target)) {
          setIsVisible(false);
        }
      }
    };

    if (isMobile) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isMobile, isVisible]);

  // Configuración de navegación ACTUALIZADA con perfil para todos los roles
  const navOptions = {
    administrador: [
      { 
        path: '/gestion-usuarios', 
        label: 'Gestión de Personal', 
        icon: Users,
        description: 'Administradores y operadores'
      },
      { 
        path: '/monitoreo', 
        label: 'Monitoreo y Control', 
        icon: Activity,
        description: 'Monitoreo en tiempo real'
      },
      { 
        path: '/gestion-unidades', 
        label: 'Gestión de Unidades', 
        icon: Settings,
        description: 'Configuración de unidades'
      },
      { 
        path: '/mapeo-dispositivos', 
        label: 'Mapeo de Dispositivos', 
        icon: MapPin,
        description: 'Ubicación y mapeo'
      },
      { 
        path: '/reportes', 
        label: 'Reportes', 
        icon: BarChart3,
        description: 'Consumo y eficiencia'
      },
      { 
        path: '/perfil', 
        label: 'Mi Perfil', 
        icon: User,
        description: 'Perfil de Usuario'
      }
    ],
    operador: [
      { 
        path: '/monitoreo', 
        label: 'Monitoreo y Control', 
        icon: Activity,
        description: 'Monitoreo en tiempo real'
      },
      { 
        path: '/gestion-unidades', 
        label: 'Gestión de Unidades', 
        icon: Settings,
        description: 'Configuración de unidades'
      },
      { 
        path: '/mapeo-dispositivos', 
        label: 'Mapeo de Dispositivos', 
        icon: MapPin,
        description: 'Ubicación y mapeo'
      },
      { 
        path: '/reportes', 
        label: 'Reportes', 
        icon: BarChart3,
        description: 'Reportes operacionales'
      },
      { 
        path: '/perfil', 
        label: 'Mi Perfil', 
        icon: User,
        description: 'Perfil de Usuario'
      }
    ],
    // Compatibilidad con roles antiguos - AHORA CON PERFIL
    admin: [
      { 
        path: '/gestion-usuarios', 
        label: 'Gestión de Personal', 
        icon: Users,
        description: 'Administradores y operadores'
      },
      { 
        path: '/monitoreo', 
        label: 'Monitoreo y Control', 
        icon: Activity,
        description: 'Monitoreo en tiempo real'
      },
      { 
        path: '/gestion-unidades', 
        label: 'Gestión de Unidades', 
        icon: Settings,
        description: 'Configuración de unidades'
      },
      { 
        path: '/mapeo-dispositivos', 
        label: 'Mapeo de Dispositivos', 
        icon: MapPin,
        description: 'Ubicación y mapeo'
      },
      { 
        path: '/reportes', 
        label: 'Reportes', 
        icon: BarChart3,
        description: 'Consumo y eficiencia'
      },
      { 
        path: '/perfil', 
        label: 'Mi Perfil', 
        icon: User,
        description: 'Perfil de Usuario'
      }
    ],
    receptionist: [
      { 
        path: '/monitoreo', 
        label: 'Monitoreo y Control', 
        icon: Activity,
        description: 'Monitoreo en tiempo real'
      },
      { 
        path: '/gestion-unidades', 
        label: 'Gestión de Unidades', 
        icon: Settings,
        description: 'Configuración de unidades'
      },
      { 
        path: '/mapeo-dispositivos', 
        label: 'Mapeo de Dispositivos', 
        icon: MapPin,
        description: 'Ubicación y mapeo'
      },
      { 
        path: '/reportes', 
        label: 'Reportes', 
        icon: BarChart3,
        description: 'Reportes operacionales'
      },
      { 
        path: '/perfil', 
        label: 'Mi Perfil', 
        icon: User,
        description: 'Perfil de Usuario'
      }
    ]
  };

  const userNavOptions = navOptions[userRole] || [];

  const handleLogout = async () => {
    try {
      if (appHandleLogout) {
        appHandleLogout();
      } else {
        console.log("Iniciando proceso de logout desde barra lateral");
        localStorage.clear();
        await signOut(auth);
        window.location.href = '/login';
      }
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      alert("Error al cerrar sesión. Intenta recargar la página.");
    }
  };

  const toggleSidebar = () => {
    const newVisibility = !isVisible;
    setIsVisible(newVisibility);
    
    // Solo guardar en localStorage en desktop
    if (!isMobile) {
      localStorage.setItem('sidebarVisible', newVisibility);
    }
  };

  const handleNavClick = () => {
    // Cerrar sidebar en móviles al hacer clic en navegación
    if (isMobile) {
      setIsVisible(false);
    }
  };

  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'administrador':
      case 'admin':
        return 'ADMINISTRADOR';
      case 'operador':
      case 'receptionist':
        return 'OPERADOR';
      default:
        return 'USUARIO';
    }
  };

  if (!userRole) return null;

  return (
    <div className="barra-nav-lateral">
      <div className={`sidebar ${isVisible ? '' : 'hidden'}`}>
        <div className="logo">
          <div className="logo-container">
            <div className="logo-icon">
              <Lightbulb className="logo-light" />
            </div>
            <div className="logo-text">
              <p>SMART LIGHT</p>
              <span className="user-role">
                {getRoleDisplayName(userRole)}
              </span>
            </div>
          </div>
        </div>

        <div className="nav-links">
          {userNavOptions.map((option) => {
            const IconComponent = option.icon;
            return (
              <Link
                key={option.path}
                to={option.path}
                className={`nav-button ${location.pathname === option.path ? 'active' : ''}`}
                onClick={handleNavClick}
                data-discover="true"
              >
                <div className="nav-button-content">
                  <div className="nav-button-main">
                    <IconComponent className="nav-icon" />
                    <span className="nav-label">{option.label}</span>
                  </div>
                  <span className="nav-description">{option.description}</span>
                </div>
              </Link>
            );
          })}
         
          <button className="nav-button logout-button" onClick={handleLogout}>
            <div className="nav-button-content">
              <div className="nav-button-main">
                <LogOut className="nav-icon" />
                <span className="nav-label">Cerrar Sesión</span>
              </div>
              <span className="nav-description">Salir del sistema</span>
            </div>
          </button>
        </div>

        <div className="sidebar-footer">
          <div className="system-status">
            <div className="status-indicator online">
              <div className="status-dot"></div>
              <span className="status-text">Sistema Online</span>
            </div>
            <div className="last-sync">
              <span>Última sync: {new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      </div>

      <button 
        id="toggle-btn-unique" 
        className="toggle-btn" 
        onClick={toggleSidebar}
        aria-label={isVisible ? 'Ocultar sidebar' : 'Mostrar sidebar'}
      >
        {isVisible ? <X className="toggle-icon" /> : <Menu className="toggle-icon" />}
      </button>
      
      {/* Overlay para móviles */}
      {isMobile && isVisible && (
        <div 
          className="sidebar-overlay"
          onClick={() => setIsVisible(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 999
          }}
        />
      )}
    </div>
  );
};

export default BarraNavLateral;