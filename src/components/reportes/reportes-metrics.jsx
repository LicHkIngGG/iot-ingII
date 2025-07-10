import React from 'react';

// Función para formatear moneda
const formatCurrency = (value) => {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN'
  }).format(value);
};

// Componente de métricas para viajes
export const renderMetricasViajes = (metricasViajes) => {
  return (
    <div className="metricas-container">
      <h3>Métricas de Viajes</h3>
      <div className="metricas-grid">
        <div className="metrica-card">
          <div className="metrica-valor">{formatCurrency(metricasViajes.gananciaTotal)}</div>
          <div className="metrica-label">Ingresos Totales</div>
        </div>
        <div className="metrica-card">
          <div className="metrica-valor">{metricasViajes.viajesCompletados}</div>
          <div className="metrica-label">Viajes Completados</div>
        </div>
        <div className="metrica-card">
          <div className="metrica-valor">{metricasViajes.viajesCancelados}</div>
          <div className="metrica-label">Viajes Cancelados</div>
        </div>
        <div className="metrica-card">
          <div className="metrica-valor">{metricasViajes.distanciaTotal.toFixed(1)} km</div>
          <div className="metrica-label">Distancia Total</div>
        </div>
        <div className="metrica-card">
          <div className="metrica-valor">{formatCurrency(metricasViajes.tarifaPromedio)}</div>
          <div className="metrica-label">Tarifa Promedio</div>
        </div>
      </div>
    </div>
  );
};

// Componente de métricas para conductores
export const renderMetricasConductores = (metricasConductores) => {
  return (
    <div className="metricas-container">
      <h3>Métricas de Conductores</h3>
      <div className="metricas-grid">
        <div className="metrica-card">
          <div className="metrica-valor">{metricasConductores.activos}</div>
          <div className="metrica-label">Conductores Activos</div>
        </div>
        <div className="metrica-card">
          <div className="metrica-valor">{metricasConductores.inactivos}</div>
          <div className="metrica-label">Conductores Inactivos</div>
        </div>
        <div className="metrica-card">
          <div className="metrica-valor">{metricasConductores.totalViajes}</div>
          <div className="metrica-label">Total de Viajes</div>
        </div>
        <div className="metrica-card">
          <div className="metrica-valor">{metricasConductores.calificacionPromedio.toFixed(1)}</div>
          <div className="metrica-label">Calificación Promedio</div>
        </div>
      </div>
    </div>
  );
};

// Componente de métricas para solicitudes
export const renderMetricasSolicitudes = (metricasSolicitudes) => {
  return (
    <div className="metricas-container">
      <h3>Métricas de Solicitudes</h3>
      <div className="metricas-grid">
        <div className="metrica-card">
          <div className="metrica-valor">{metricasSolicitudes.pendientes}</div>
          <div className="metrica-label">Pendientes</div>
        </div>
        <div className="metrica-card">
          <div className="metrica-valor">{metricasSolicitudes.aprobadas}</div>
          <div className="metrica-label">Aprobadas</div>
        </div>
        <div className="metrica-card">
          <div className="metrica-valor">{metricasSolicitudes.rechazadas}</div>
          <div className="metrica-label">Rechazadas</div>
        </div>
        <div className="metrica-card">
          <div className="metrica-valor">{metricasSolicitudes.tiempoPromedioAprobacion.toFixed(1)} hrs</div>
          <div className="metrica-label">Tiempo Promedio de Aprobación</div>
        </div>
      </div>
    </div>
  );
};

// Componente de métricas generales para administradores
export const renderMetricasAdmins = (administradoresData) => {
  const activos = administradoresData.filter(admin => admin.active).length;
  const inactivos = administradoresData.filter(admin => !admin.active).length;
  const totalAcciones = administradoresData.reduce((total, admin) => total + admin.accionesRealizadas, 0);
  
  return (
    <div className="metricas-container">
      <h3>Métricas de Administradores</h3>
      <div className="metricas-grid">
        <div className="metrica-card">
          <div className="metrica-valor">{administradoresData.length}</div>
          <div className="metrica-label">Total Administradores</div>
        </div>
        <div className="metrica-card">
          <div className="metrica-valor">{activos}</div>
          <div className="metrica-label">Activos</div>
        </div>
        <div className="metrica-card">
          <div className="metrica-valor">{inactivos}</div>
          <div className="metrica-label">Inactivos</div>
        </div>
        <div className="metrica-card">
          <div className="metrica-valor">{totalAcciones}</div>
          <div className="metrica-label">Total Acciones</div>
        </div>
      </div>
    </div>
  );
};

// Componente de métricas para grabaciones
export const renderMetricasGrabaciones = (grabacionesData) => {
  const disponibles = grabacionesData.filter(g => g.estado === 'disponible').length;
  const procesando = grabacionesData.filter(g => g.estado === 'procesando').length;
  const archivadas = grabacionesData.filter(g => g.estado === 'archivado').length;
  const totalVisualizaciones = grabacionesData.reduce((total, g) => total + g.visualizaciones, 0);
  
  return (
    <div className="metricas-container">
      <h3>Métricas de Grabaciones</h3>
      <div className="metricas-grid">
        <div className="metrica-card">
          <div className="metrica-valor">{grabacionesData.length}</div>
          <div className="metrica-label">Total Grabaciones</div>
        </div>
        <div className="metrica-card">
          <div className="metrica-valor">{disponibles}</div>
          <div className="metrica-label">Disponibles</div>
        </div>
        <div className="metrica-card">
          <div className="metrica-valor">{procesando}</div>
          <div className="metrica-label">Procesando</div>
        </div>
        <div className="metrica-card">
          <div className="metrica-valor">{totalVisualizaciones}</div>
          <div className="metrica-label">Total Visualizaciones</div>
        </div>
      </div>
    </div>
  );
};

// Componente de métricas para logs
export const renderMetricasLogs = (logsData) => {
  const exitosos = logsData.filter(log => log.resultado === 'exitoso' || log.resultado === 'completado').length;
  const errores = logsData.filter(log => log.resultado === 'error' || log.resultado === 'fallido').length;
  const modulosUnicos = [...new Set(logsData.map(log => log.modulo))].length;
  const usuariosUnicos = [...new Set(logsData.map(log => log.usuario))].length;
  
  return (
    <div className="metricas-container">
      <h3>Métricas de Logs</h3>
      <div className="metricas-grid">
        <div className="metrica-card">
          <div className="metrica-valor">{logsData.length}</div>
          <div className="metrica-label">Total Registros</div>
        </div>
        <div className="metrica-card">
          <div className="metrica-valor">{exitosos}</div>
          <div className="metrica-label">Acciones Exitosas</div>
        </div>
        <div className="metrica-card">
          <div className="metrica-valor">{errores}</div>
          <div className="metrica-label">Errores</div>
        </div>
        <div className="metrica-card">
          <div className="metrica-valor">{modulosUnicos}</div>
          <div className="metrica-label">Módulos Activos</div>
        </div>
      </div>
    </div>
  );
};

