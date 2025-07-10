import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import './perfil-cliente.css';

const PerfilCliente = () => {
  const { clienteId } = useParams();
  const [cliente, setCliente] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Datos artificiales
  const datosArtificiales = {
    nombre: 'Ana Pérez',
    email: 'ana.perez@example.com',
    telefono: '555-5678',
    activo: true,
  };

  const historialViajes = [
    { id: 1, fecha: '2025-03-05', origen: 'Casa', destino: 'Oficina', calificacion: 5 },
    { id: 2, fecha: '2025-03-07', origen: 'Centro Comercial', destino: 'Casa', calificacion: 4 },
    { id: 3, fecha: '2025-03-10', origen: 'Gimnasio', destino: 'Supermercado', calificacion: 5 },
  ];

  const comentariosConductores = [
    { id: 1, conductor: 'Carlos Gómez', mensaje: 'Muy buen conductor, seguro y puntual.' },
    { id: 2, conductor: 'María Rodríguez', mensaje: 'Excelente servicio, muy profesional.' },
    { id: 3, conductor: 'Juan López', mensaje: 'Me sentí muy cómodo en el viaje.' },
  ];

  useEffect(() => {
    setCliente(datosArtificiales);
  }, []);

  if (!cliente) {
    return <p>Cargando datos del cliente...</p>;
  }

  return (
    <div className="perfil-cliente">
      <h2>Perfil del Cliente</h2>
      
      {/* Card con datos personales */}
      <div className="info-card">
        <h3>Datos Personales</h3>
        <p><strong>Nombre:</strong> {cliente.nombre}</p>
        <p><strong>Email:</strong> {cliente.email}</p>
        <p><strong>Teléfono:</strong> {cliente.telefono}</p>
      </div>

      {/* Botón para abrir el modal */}
      <button className="btn-mas-detalles" onClick={() => setModalOpen(true)}>Más Detalles</button>

      {/* Modal con información adicional */}
      <div className={`modal ${modalOpen ? "show" : ""}`}>
        <div className="modal-content">
          <span className="close" onClick={() => setModalOpen(false)}>&times;</span>
          
          {/* Historial de Viajes */}
          <div className="info-card">
            <h3>Historial de Viajes</h3>
            <ul>
              {historialViajes.map((viaje) => (
                <li key={viaje.id}>
                  {viaje.fecha} - {viaje.origen} ➝ {viaje.destino} (⭐ {viaje.calificacion})
                </li>
              ))}
            </ul>
          </div>

          {/* Comentarios a Conductores */}
          <div className="info-card">
            <h3>Comentarios sobre Conductores</h3>
            <ul>
              {comentariosConductores.map((comentario) => (
                <li key={comentario.id}><strong>{comentario.conductor}:</strong> {comentario.mensaje}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerfilCliente;
