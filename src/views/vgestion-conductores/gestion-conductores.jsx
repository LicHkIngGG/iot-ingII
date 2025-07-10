import React from 'react';
import BarraNavLateral from '../../components/barra-nav-lateral/barra-nav';
import GestionConductores from '../../components/gestion-conductores/gestion-conductores';
import './gestion-conductores.css';

const VistaGestionConductores = () => {
  return (
    <div className="vista-gestion-usuarios vista-gestion-conductores">
      <div className="barra-nav-lateral">
        <BarraNavLateral />
      </div>
      <div className="gestion-usuarios-container gestion-conductores-container">
        <GestionConductores />
      </div>
    </div>
  );
};

export default VistaGestionConductores;