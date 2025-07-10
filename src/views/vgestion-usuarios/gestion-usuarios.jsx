import React from 'react';
import BarraNavLateral from '../../components/barra-nav-lateral/barra-nav';
import GestionUsuarios from '../../components/gestion-usuarios/gestion-usuarios';
import './gestion-usuarios.css';

const VistaGestionUsuarios = () => {
  return (
    <div className="vista-gestion-usuarios">
      <div className="barra-nav-lateral">
        <BarraNavLateral />
      </div>
      <div className="gestion-usuarios-container">
        <GestionUsuarios />
      </div>
    </div>
  );
};

export default VistaGestionUsuarios;