import React from 'react';
import BarraNavLateral from '../../components/barra-nav-lateral/barra-nav';
import PerfilCliente from '../../components/perfil-cliente/perfil-cliente';
import './perfil-cliente.css';

const VistaPerfilCliente = () => {
  return (
    <div className="vista-perfil-cliente">
      <div className="barra-nav-lateral">
        <BarraNavLateral /> 
      </div>
      <div className="perfil-cliente-container">
        <PerfilCliente />
      </div>
    </div>
  );
};

export default VistaPerfilCliente;
