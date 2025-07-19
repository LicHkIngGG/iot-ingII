import React from 'react'; 
import { useNavigate } from 'react-router-dom'; 
import './bienvenida-login.css'; 

function BienvenidaLogin() { 
  const navigate = useNavigate(); 

  const handleLoginClick = () => { 
    navigate('/login'); 
  }; 

  return ( 
    <div className="bienvenida-login-background"> 
      <div className="bienvenida-login-container"> 
        <div className="logo-container"> 
          <img 
            src="https://i.ibb.co/xtN8mjLv/logo.png" 
            alt="viajeseguroiaje Seguro" 
            className="logo" 
          /> 
        </div> 
        <h1 className="welcome-text">Bienvenido a ViajeSegu</h1> 
        <button className="bienvenida-login-button" onClick={handleLoginClick}>
          Inicia Sesión
        </button> 
      </div> 
    </div> 
  ); 
} 

export default BienvenidaLogin;