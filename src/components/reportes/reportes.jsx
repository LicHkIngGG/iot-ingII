import React, { useState, useEffect, useRef } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './reportes.css';

// Importar módulos especializados
import { cargarViajes, cargarConductores, cargarSolicitudes, cargarAdministradores, cargarGrabaciones, cargarLogs } from './reportes-data-loader';
import { exportarCSV, exportarPDF } from './reportes-exporters';
import { renderGraficosViajes, renderGraficosConductores, renderGraficosSolicitudes, renderGraficosAdmins, renderGraficosGrabaciones, renderGraficosLogs } from './reportes-charts';
import { renderTablaViajes, renderTablaConductores, renderTablaSolicitudes, renderTablaAdmins, renderTablaGrabaciones, renderTablaLogs } from './reportes-tables';
import { renderMetricasViajes, renderMetricasConductores, renderMetricasSolicitudes } from './reportes-metrics';

const Reportes = () => {
  // Estados para gestión de pestañas y datos
  const [activeTab, setActiveTab] = useState('viajes');
  const [activeSubTab, setActiveSubTab] = useState('graficos');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Estado para idioma (para exportación CSV)
  const [idioma, setIdioma] = useState('es');
 
  // Estados para fechas de filtrado
  const [fechaInicio, setFechaInicio] = useState(new Date(new Date().setDate(new Date().getDate() - 30)));
  const [fechaFin, setFechaFin] = useState(new Date());
 
  // Referencias para tablas y gráficos
  const tableRef = useRef(null);
  const chartRef = useRef(null);
 
  // Estados para almacenar datos
  const [viajesData, setViajesData] = useState([]);
  const [viajesDataGrafico, setViajesDataGrafico] = useState([]);
  const [conductoresData, setConductoresData] = useState([]);
  const [solicitudesData, setSolicitudesData] = useState([]);
  const [administradoresData, setAdministradoresData] = useState([]);
  const [grabacionesData, setGrabacionesData] = useState([]);
  const [logsData, setLogsData] = useState([]);
 
  // Estados para paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const [itemsPorPagina, setItemsPorPagina] = useState(10);
  const [ultimoDocumento, setUltimoDocumento] = useState(null);
  const [primerDocumento, setPrimerDocumento] = useState(null);
  const [totalItems, setTotalItems] = useState(0);
 
  // Estados para filtros adicionales
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroUsuario, setFiltroUsuario] = useState('');
  const [filtroConductor, setFiltroConductor] = useState('');
  const [filtroTipoViaje, setFiltroTipoViaje] = useState('todos');
  
  // Estados para métricas de negocio
  const [metricasViajes, setMetricasViajes] = useState({
    gananciaTotal: 0,
    viajesCompletados: 0,
    viajesCancelados: 0,
    distanciaTotal: 0,
    distanciaPromedio: 0,
    tarifaPromedio: 0,
    gananciaDiaria: {}
  });
  
  const [metricasConductores, setMetricasConductores] = useState({
    activos: 0,
    inactivos: 0,
    totalViajes: 0,
    calificacionPromedio: 0
  });
  
  const [metricasSolicitudes, setMetricasSolicitudes] = useState({
    pendientes: 0,
    aprobadas: 0,
    rechazadas: 0,
    tiempoPromedioAprobacion: 0
  });

  // UseEffect para cargar datos según la pestaña activa
  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true);
      setError(null);
     
      try {
        const params = {
          fechaInicio,
          fechaFin,
          paginaActual,
          itemsPorPagina,
          ultimoDocumento,
          filtroEstado,
          filtroTipoViaje,
          filtroConductor,
          filtroUsuario
        };

        switch(activeTab) {
          case 'viajes':
            const resultViajes = await cargarViajes(params);
            setViajesData(resultViajes.viajes);
            setViajesDataGrafico(resultViajes.viajesDataGrafico);
            setMetricasViajes(resultViajes.metricas);
            setTotalItems(resultViajes.totalItems);
            setUltimoDocumento(resultViajes.ultimoDocumento);
            setPrimerDocumento(resultViajes.primerDocumento);
            break;
          case 'conductores':
            const resultConductores = await cargarConductores(params);
            setConductoresData(resultConductores.conductores);
            setMetricasConductores(resultConductores.metricas);
            setTotalItems(resultConductores.totalItems);
            setUltimoDocumento(resultConductores.ultimoDocumento);
            setPrimerDocumento(resultConductores.primerDocumento);
            break;
          case 'solicitudes':
            const resultSolicitudes = await cargarSolicitudes(params);
            setSolicitudesData(resultSolicitudes.solicitudes);
            setMetricasSolicitudes(resultSolicitudes.metricas);
            setTotalItems(resultSolicitudes.totalItems);
            setUltimoDocumento(resultSolicitudes.ultimoDocumento);
            setPrimerDocumento(resultSolicitudes.primerDocumento);
            break;
          case 'admins':
            const resultAdmins = await cargarAdministradores(params);
            setAdministradoresData(resultAdmins.administradores);
            setTotalItems(resultAdmins.totalItems);
            setUltimoDocumento(resultAdmins.ultimoDocumento);
            setPrimerDocumento(resultAdmins.primerDocumento);
            break;
          case 'grabaciones':
            const resultGrabaciones = await cargarGrabaciones(params);
            setGrabacionesData(resultGrabaciones.grabaciones);
            setTotalItems(resultGrabaciones.totalItems);
            setUltimoDocumento(resultGrabaciones.ultimoDocumento);
            setPrimerDocumento(resultGrabaciones.primerDocumento);
            break;
          case 'logs':
            const resultLogs = await cargarLogs(params);
            setLogsData(resultLogs.logs);
            setTotalItems(resultLogs.totalItems);
            setUltimoDocumento(resultLogs.ultimoDocumento);
            setPrimerDocumento(resultLogs.primerDocumento);
            break;
          default:
            break;
        }
      } catch (error) {
        console.error(`Error al cargar datos de ${activeTab}:`, error);
        setError(`Error al cargar datos: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };
   
    cargarDatos();
  }, [activeTab, fechaInicio, fechaFin, paginaActual, itemsPorPagina, filtroEstado, filtroTipoViaje, filtroConductor, filtroUsuario]);

  // Funciones para navegación de paginación
  const irPaginaAnterior = () => {
    if (paginaActual > 1) {
      setPaginaActual(paginaActual - 1);
    }
  };

  const irPaginaSiguiente = () => {
    if (paginaActual * itemsPorPagina < totalItems) {
      setPaginaActual(paginaActual + 1);
    }
  };

  // Función para cambiar el número de elementos por página
  const cambiarItemsPorPagina = (e) => {
    setItemsPorPagina(parseInt(e.target.value));
    setPaginaActual(1);
  };

  // Función para obtener los datos actuales según la pestaña activa
  const obtenerDatosActuales = () => {
    switch(activeTab) {
      case 'viajes':
        return viajesData;
      case 'conductores':
        return conductoresData;
      case 'solicitudes':
        return solicitudesData;
      case 'admins':
        return administradoresData;
      case 'grabaciones':
        return grabacionesData;
      case 'logs':
        return logsData;
      default:
        return [];
    }
  };

  // Funciones de exportación
  const handleExportarCSV = () => {
    const datos = obtenerDatosActuales();
    exportarCSV(datos, activeTab, fechaInicio, fechaFin, idioma);
  };

  const handleExportarPDF = () => {
    const datos = obtenerDatosActuales();
    const metricas = {
      viajes: metricasViajes,
      conductores: metricasConductores,
      solicitudes: metricasSolicitudes
    };
    exportarPDF(datos, activeTab, fechaInicio, fechaFin, metricas);
  };

  // Renderizado de gráficos según la pestaña activa
  const renderGraficosActuales = () => {
    if (loading) {
      return <div className="loading-message">Cargando datos para gráficos...</div>;
    }
   
    if (error) {
      return <div className="error-message">Error al cargar los datos: {error}</div>;
    }
   
    switch(activeTab) {
      case 'viajes':
        return renderGraficosViajes(viajesData, viajesDataGrafico, metricasViajes);
      case 'conductores':
        return renderGraficosConductores(conductoresData, metricasConductores);
      case 'solicitudes':
        return renderGraficosSolicitudes(solicitudesData, metricasSolicitudes);
      case 'admins':
        return renderGraficosAdmins(administradoresData);
      case 'grabaciones':
        return renderGraficosGrabaciones(grabacionesData);
      case 'logs':
        return renderGraficosLogs(logsData);
      default:
        return <div className="no-data-message">Seleccione una categoría para ver gráficos estadísticos.</div>;
    }
  };

  // Renderizado de tabla según la pestaña activa
  const renderTablaActual = () => {
    const datos = obtenerDatosActuales();
   
    if (datos.length === 0) {
      return (
        <div className="no-data-message">
          <p>No hay datos disponibles para el período seleccionado.</p>
        </div>
      );
    }
    
    switch(activeTab) {
      case 'viajes':
        return renderTablaViajes(datos, tableRef);
      case 'conductores':
        return renderTablaConductores(datos, tableRef);
      case 'solicitudes':
        return renderTablaSolicitudes(datos, tableRef);
      case 'admins':
        return renderTablaAdmins(datos, tableRef);
      case 'grabaciones':
        return renderTablaGrabaciones(datos, tableRef);
      case 'logs':
        return renderTablaLogs(datos, tableRef);
      default:
        return <p>Seleccione una categoría para ver los datos.</p>;
    }
  };

  return (
    <div className="reportes-container">
      <h2>📊 Módulo de Reportes y Estadísticas</h2>
     
      {/* Pestañas principales */}
      <div className="tabs">
        <button
          className={activeTab === 'viajes' ? 'active' : ''}
          onClick={() => setActiveTab('viajes')}
        >
          <i className="fa fa-car"></i> Viajes
        </button>
        <button
          className={activeTab === 'conductores' ? 'active' : ''}
          onClick={() => setActiveTab('conductores')}
        >
          <i className="fa fa-id-card"></i> Conductores
        </button>
        <button
          className={activeTab === 'solicitudes' ? 'active' : ''}
          onClick={() => setActiveTab('solicitudes')}
        >
          <i className="fa fa-file-text"></i> Solicitudes
        </button>
        <button
          className={activeTab === 'admins' ? 'active' : ''}
          onClick={() => setActiveTab('admins')}
        >
          <i className="fa fa-shield"></i> Administradores
        </button>
        <button
          className={activeTab === 'grabaciones' ? 'active' : ''}
          onClick={() => setActiveTab('grabaciones')}
        >
          <i className="fa fa-video-camera"></i> Grabaciones
        </button>
        <button
          className={activeTab === 'logs' ? 'active' : ''}
          onClick={() => setActiveTab('logs')}
        >
          <i className="fa fa-list-alt"></i> Logs
        </button>
      </div>
     
      {/* Filtros y controles */}
      <div className="filtros-container">
        <div className="fecha-filtros">
          <div className="filtro-grupo">
            <label>Desde:</label>
            <DatePicker
              selected={fechaInicio}
              onChange={(date) => setFechaInicio(date)}
              dateFormat="dd/MM/yyyy"
              className="date-input"
            />
          </div>
          <div className="filtro-grupo">
            <label>Hasta:</label>
            <DatePicker
              selected={fechaFin}
              onChange={(date) => setFechaFin(date)}
              dateFormat="dd/MM/yyyy"
              className="date-input"
            />
          </div>
        </div>
       
        {/* Filtros específicos según la categoría */}
        {activeTab === 'viajes' && (
          <div className="filtros-especificos">
            <div className="filtro-grupo">
              <label>Estado:</label>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="select-input"
              >
                <option value="todos">Todos</option>
                <option value="pendiente">Pendiente</option>
                <option value="en_curso">En Curso</option>
                <option value="completado">Completado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
            <div className="filtro-grupo">
              <label>Tipo:</label>
              <select
                value={filtroTipoViaje}
                onChange={(e) => setFiltroTipoViaje(e.target.value)}
                className="select-input"
              >
                <option value="todos">Todos</option>
                <option value="estándar">Estándar</option>
                <option value="ejecutivo">Ejecutivo</option>
                <option value="compartido">Compartido</option>
              </select>
            </div>
          </div>
        )}
 
        {/* Filtro de idioma para CSV */}
        <div className="filtro-grupo idioma-selector">
          <label>Formato CSV:</label>
          <select
            value={idioma}
            onChange={(e) => setIdioma(e.target.value)}
            className="select-input"
          >
            <option value="es">Español (;)</option>
            <option value="en">Inglés (,)</option>
          </select>
        </div>
       
        {/* Botones de exportación */}
        <div className="exportar-botones">
          <button className="btn-exportar csv" onClick={handleExportarCSV}>
            <i className="fa fa-file-text-o"></i> Exportar CSV
          </button>
          <button className="btn-exportar pdf" onClick={handleExportarPDF}>
            <i className="fa fa-file-pdf-o"></i> Exportar PDF
          </button>
        </div>
      </div>
     
      {/* Subtabs para visualización */}
      <div className="subtabs">
        <button
          className={activeSubTab === 'graficos' ? 'active' : ''}
          onClick={() => setActiveSubTab('graficos')}
        >
          <i className="fa fa-bar-chart"></i> Gráficos
        </button>
        <button
          className={activeSubTab === 'tabla' ? 'active' : ''}
          onClick={() => setActiveSubTab('tabla')}
        >
          <i className="fa fa-table"></i> Tabla
        </button>
      </div>
     
      {/* Contenido de Reportes */}
      <div className="report-content">
        {loading && <div className="loading-overlay"><div className="loader"></div></div>}
       
        {error && <div className="error-message">{error}</div>}
       
        {!loading && !error && (
          <>
            {activeSubTab === 'graficos' && renderGraficosActuales()}
           
            {activeSubTab === 'tabla' && (
              <div className="tabla-container">
                {renderTablaActual()}
               
                {/* Controles de paginación */}
                <div className="paginacion-container">
                  <div className="items-por-pagina">
                    <label>Mostrar:</label>
                    <select
                      value={itemsPorPagina}
                      onChange={cambiarItemsPorPagina}
                    >
                      <option value="10">10</option>
                      <option value="25">25</option>
                      <option value="50">50</option>
                      <option value="100">100</option>
                    </select>
                    <span> entradas</span>
                  </div>
                 
                  <div className="info-paginacion">
                    Mostrando {((paginaActual - 1) * itemsPorPagina) + 1}
                    -
                    {Math.min(paginaActual * itemsPorPagina, totalItems)}
                    de {totalItems} registros
                  </div>
                 
                  <div className="controles-paginacion">
                    <button
                      onClick={irPaginaAnterior}
                      disabled={paginaActual === 1}
                      className="btn-paginacion"
                    >
                      <i className="fa fa-chevron-left"></i> Anterior
                    </button>
                    <span className="pagina-actual">{paginaActual}</span>
                    <button
                      onClick={irPaginaSiguiente}
                      disabled={paginaActual * itemsPorPagina >= totalItems}
                      className="btn-paginacion"
                    >
                      Siguiente <i className="fa fa-chevron-right"></i>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Reportes;