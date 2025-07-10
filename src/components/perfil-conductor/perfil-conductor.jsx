import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import './perfil-conductor.css';

const PerfilConductor = () => {
  const { conductorId } = useParams();
  const [conductor, setConductor] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Datos artificiales
  const datosArtificiales = {
    nombre: 'Carlos Gómez',
    email: 'carlos.gomez@example.com',
    telefono: '555-1234',
    licencia: 'LIC123456',
    activo: true,
  };

  const viajesRealizados = [
    { id: 1, fecha: '2025-03-01', destino: 'Centro Comercial', calificacion: 5 },
    { id: 2, fecha: '2025-03-02', destino: 'Aeropuerto', calificacion: 4 },
    { id: 3, fecha: '2025-03-03', destino: 'Hospital Central', calificacion: 5 },
  ];

  const comentarios = [
    { id: 1, usuario: 'Juan Pérez', mensaje: 'Excelente servicio, muy amable.' },
    { id: 2, usuario: 'María López', mensaje: 'Conductor puntual y profesional.' },
    { id: 3, usuario: 'Carlos Sánchez', mensaje: 'Muy buena conducción, viaje seguro.' },
  ];

  const horariosDisponibles = [
    { dia: 'Lunes', disponible: true },
    { dia: 'Martes', disponible: false },
    { dia: 'Miércoles', disponible: true },
  ];

  useEffect(() => {
    setConductor(datosArtificiales);
  }, []);

  if (!conductor) {
    return <p>Cargando datos del conductor...</p>;
  }

  return (
    <div className="perfil-conductor">
      <h2>Perfil del Conductor</h2>

      {/* Card con datos personales */}
      <div className="info-card">
        <h3>Datos Personales</h3>
        <p><strong>Nombre:</strong> {conductor.nombre}</p>
        <p><strong>Email:</strong> {conductor.email}</p>
        <p><strong>Teléfono:</strong> {conductor.telefono}</p>
        <p><strong>Licencia:</strong> {conductor.licencia}</p>
      </div>

      {/* Botón para abrir el modal */}
      <button className="btn-mas-detalles" onClick={() => setModalOpen(true)}>Más Detalles</button>

      {/* Modal con información adicional */}
      {modalOpen && (
        <div className="modal show">
          <div className="modal-content">
            <span className="close" onClick={() => setModalOpen(false)}>&times;</span>

            {/* Estado y Disponibilidad */}
            <div className="info-card">
              <h3>Estado y Disponibilidad</h3>
              <p><strong>Estado:</strong> {conductor.activo ? 'Activo' : 'Inactivo'}</p>
              <button className="btn-toggle">{conductor.activo ? 'Deshabilitar' : 'Habilitar'}</button>
              <h4>Horarios Disponibles</h4>
              <ul className="horarios-disponibles">
                {horariosDisponibles.map((horario) => (
                  <li key={horario.dia}>{horario.dia}: {horario.disponible ? 'Disponible' : 'No Disponible'}</li>
                ))}
              </ul>
            </div>

            {/* Calificación y Viajes */}
            <div className="info-card">
              <h3>Calificación y Desempeño</h3>
              <p><strong>Calificación:</strong> ⭐⭐⭐⭐☆ (4.2/5)</p>
              <p><strong>Viajes Completados:</strong> {viajesRealizados.length}</p>
              <h4>Últimos Viajes</h4>
              <ul>
                {viajesRealizados.map((viaje) => (
                  <li key={viaje.id}>{viaje.fecha} - {viaje.destino} (⭐ {viaje.calificacion})</li>
                ))}
              </ul>
            </div>

            {/* Comentarios de Pasajeros */}
            <div className="info-card">
              <h3>Comentarios de Pasajeros</h3>
              <ul>
                {comentarios.map((comentario) => (
                  <li key={comentario.id}><strong>{comentario.usuario}:</strong> {comentario.mensaje}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerfilConductor;
