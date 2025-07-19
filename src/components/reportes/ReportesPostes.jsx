// src/components/MonitoreoControl/components/ReportesPostes/ReportesPostes.jsx
import React, { useState, useEffect, useRef } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './ReportesPostes.css';

// Importar módulos especializados adaptados
import { cargarPostes, cargarEventos, cargarEstadisticas, cargarConsumos, cargarSensores, cargarAlertas } from './reportes-data-loader-postes';
import { exportarCSV, exportarPDF } from './reportes-exporters-postes';
import { renderGraficosPostes, renderGraficosEventos, renderGraficosEstadisticas, renderGraficosConsumos, renderGraficosSensores, renderGraficosAlertas } from './reportes-charts-postes';
import { renderTablaPostes, renderTablaEventos, renderTablaEstadisticas, renderTablaConsumos, renderTablaSensores, renderTablaAlertas } from './reportes-tables-postes';

const ReportesPostes = () => {
  // Estados para gestión de pestañas y datos
  const [activeTab, setActiveTab] = useState('postes');
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
  const [postesData, setPostesData] = useState([]);
  const [eventosData, setEventosData] = useState([]);
  const [estadisticasData, setEstadisticasData] = useState([]);
  const [consumosData, setConsumosData] = useState([]);
  const [sensoresData, setSensoresData] = useState([]);
  const [alertasData, setAlertasData] = useState([]);
 
  // Estados para paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const [itemsPorPagina, setItemsPorPagina] = useState(10);
  const [ultimoDocumento, setUltimoDocumento] = useState(null);
  const [primerDocumento, setPrimerDocumento] = useState(null);
  const [totalItems, setTotalItems] = useState(0);
 
  // Estados para filtros adicionales
  const [filtroEstado, setFiltroEstado] = useState('todos'); // online, offline, todos
  const [filtroZona, setFiltroZona] = useState('todas');
  const [filtroTipo, setFiltroTipo] = useState('todos'); // encendido, apagado, automatico, manual
  const [filtroPrioridad, setFiltroPrioridad] = useState('todas'); // para alertas
  
  // Estados para métricas de negocio
  const [metricasPostes, setMetricasPostes] = useState({
    totalPostes: 0,
    postesOnline: 0,
    postesEncendidos: 0,
    postesAutomaticos: 0,
    consumoTotal: 0,
    consumoPromedio: 0,
    eficienciaPromedio: 0,
    alertasActivas: 0
  });
  
  const [metricasEventos, setMetricasEventos] = useState({
    totalEventos: 0,
    eventosCriticos: 0,
    eventosControl: 0,
    eventosConexion: 0,
    eventosSensores: 0
  });
  
  const [metricasConsumo, setMetricasConsumo] = useState({
    consumoTotal: 0,
    consumoPromedio: 0,
    costoTotal: 0,
    eficienciaPromedio: 0,
    ahorroEnergetico: 0
  });

  // Zones disponibles (se cargarán dinámicamente)
  const [zonasDisponibles, setZonasDisponibles] = useState([]);

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
          filtroZona,
          filtroTipo,
          filtroPrioridad
        };

        switch(activeTab) {
          case 'postes':
            const resultPostes = await cargarPostes(params);
            setPostesData(resultPostes.postes);
            setMetricasPostes(resultPostes.metricas);
            setZonasDisponibles(resultPostes.zonas);
            setTotalItems(resultPostes.totalItems);
            setUltimoDocumento(resultPostes.ultimoDocumento);
            setPrimerDocumento(resultPostes.primerDocumento);
            break;
          case 'eventos':
            const resultEventos = await cargarEventos(params);
            setEventosData(resultEventos.eventos);
            setMetricasEventos(resultEventos.metricas);
            setTotalItems(resultEventos.totalItems);
            setUltimoDocumento(resultEventos.ultimoDocumento);
            setPrimerDocumento(resultEventos.primerDocumento);
            break;
          case 'estadisticas':
            const resultEstadisticas = await cargarEstadisticas(params);
            setEstadisticasData(resultEstadisticas.estadisticas);
            setTotalItems(resultEstadisticas.totalItems);
            setUltimoDocumento(resultEstadisticas.ultimoDocumento);
            setPrimerDocumento(resultEstadisticas.primerDocumento);
            break;
          case 'consumos':
            const resultConsumos = await cargarConsumos(params);
            setConsumosData(resultConsumos.consumos);
            setMetricasConsumo(resultConsumos.metricas);
            setTotalItems(resultConsumos.totalItems);
            setUltimoDocumento(resultConsumos.ultimoDocumento);
            setPrimerDocumento(resultConsumos.primerDocumento);
            break;
          case 'sensores':
            const resultSensores = await cargarSensores(params);
            setSensoresData(resultSensores.sensores);
            setTotalItems(resultSensores.totalItems);
            setUltimoDocumento(resultSensores.ultimoDocumento);
            setPrimerDocumento(resultSensores.primerDocumento);
            break;
          case 'alertas':
            const resultAlertas = await cargarAlertas(params);
            setAlertasData(resultAlertas.alertas);
            setTotalItems(resultAlertas.totalItems);
            setUltimoDocumento(resultAlertas.ultimoDocumento);
            setPrimerDocumento(resultAlertas.primerDocumento);
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
  }, [activeTab, fechaInicio, fechaFin, paginaActual, itemsPorPagina, filtroEstado, filtroZona, filtroTipo, filtroPrioridad]);

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
      case 'postes':
        return postesData;
      case 'eventos':
        return eventosData;
      case 'estadisticas':
        return estadisticasData;
      case 'consumos':
        return consumosData;
      case 'sensores':
        return sensoresData;
      case 'alertas':
        return alertasData;
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
      postes: metricasPostes,
      eventos: metricasEventos,
      consumos: metricasConsumo
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
      case 'postes':
        return renderGraficosPostes(postesData, metricasPostes);
      case 'eventos':
        return renderGraficosEventos(eventosData, metricasEventos);
      case 'estadisticas':
        return renderGraficosEstadisticas(estadisticasData);
      case 'consumos':
        return renderGraficosConsumos(consumosData, metricasConsumo);
      case 'sensores':
        return renderGraficosSensores(sensoresData);
      case 'alertas':
        return renderGraficosAlertas(alertasData);
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
          <i className="fa fa-info-circle"></i>
          <p>No hay datos disponibles para el período seleccionado.</p>
        </div>
      );
    }
    
    switch(activeTab) {
      case 'postes':
        return renderTablaPostes(datos, tableRef);
      case 'eventos':
        return renderTablaEventos(datos, tableRef);
      case 'estadisticas':
        return renderTablaEstadisticas(datos, tableRef);
      case 'consumos':
        return renderTablaConsumos(datos, tableRef);
      case 'sensores':
        return renderTablaSensores(datos, tableRef);
      case 'alertas':
        return renderTablaAlertas(datos, tableRef);
      default:
        return <p>Seleccione una categoría para ver los datos.</p>;
    }
  };

  return (
    <div className="reportes-container">
      <h2>📊 Reportes y Estadísticas de SmartLight</h2>
     
      {/* Pestañas principales */}
      <div className="tabs">
        <button
          className={activeTab === 'postes' ? 'active' : ''}
          onClick={() => setActiveTab('postes')}
        >
          <i className="fa fa-lightbulb-o"></i> Postes
        </button>
        <button
          className={activeTab === 'eventos' ? 'active' : ''}
          onClick={() => setActiveTab('eventos')}
        >
          <i className="fa fa-list-alt"></i> Eventos
        </button>
        <button
          className={activeTab === 'estadisticas' ? 'active' : ''}
          onClick={() => setActiveTab('estadisticas')}
        >
          <i className="fa fa-bar-chart"></i> Estadísticas
        </button>
        <button
          className={activeTab === 'consumos' ? 'active' : ''}
          onClick={() => setActiveTab('consumos')}
        >
          <i className="fa fa-bolt"></i> Consumos
        </button>
        <button
          className={activeTab === 'sensores' ? 'active' : ''}
          onClick={() => setActiveTab('sensores')}
        >
          <i className="fa fa-microchip"></i> Sensores
        </button>
        <button
          className={activeTab === 'alertas' ? 'active' : ''}
          onClick={() => setActiveTab('alertas')}
        >
          <i className="fa fa-exclamation-triangle"></i> Alertas
        </button>
      </div>
     
      {/* Filtros y controles */}
      <div className="filtros-container">
        <div className="fecha-filtros">
          <div className="filtro-grupo">
            <label>📅 Desde:</label>
            <DatePicker
              selected={fechaInicio}
              onChange={(date) => setFechaInicio(date)}
              dateFormat="dd/MM/yyyy"
              className="date-input"
            />
          </div>
          <div className="filtro-grupo">
            <label>📅 Hasta:</label>
            <DatePicker
              selected={fechaFin}
              onChange={(date) => setFechaFin(date)}
              dateFormat="dd/MM/yyyy"
              className="date-input"
            />
          </div>
        </div>
       
        {/* Filtros específicos según la categoría */}
        {activeTab === 'postes' && (
          <div className="filtros-especificos">
            <div className="filtro-grupo">
              <label>🔌 Estado:</label>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="select-input"
              >
                <option value="todos">Todos</option>
                <option value="online">Online</option>
                <option value="offline">Offline</option>
              </select>
            </div>
            <div className="filtro-grupo">
              <label>💡 Tipo:</label>
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="select-input"
              >
                <option value="todos">Todos</option>
                <option value="encendido">Encendidos</option>
                <option value="apagado">Apagados</option>
                <option value="automatico">Automático</option>
                <option value="manual">Manual</option>
              </select>
            </div>
            <div className="filtro-grupo">
              <label>📍 Zona:</label>
              <select
                value={filtroZona}
                onChange={(e) => setFiltroZona(e.target.value)}
                className="select-input"
              >
                <option value="todas">Todas</option>
                {zonasDisponibles.map(zona => (
                  <option key={zona} value={zona}>{zona}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {activeTab === 'eventos' && (
          <div className="filtros-especificos">
            <div className="filtro-grupo">
              <label>📋 Tipo:</label>
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="select-input"
              >
                <option value="todos">Todos</option>
                <option value="control">Control</option>
                <option value="conexion">Conexión</option>
                <option value="sensor">Sensores</option>
                <option value="alerta">Alertas</option>
                <option value="configuracion">Configuración</option>
              </select>
            </div>
            <div className="filtro-grupo">
              <label>📍 Zona:</label>
              <select
                value={filtroZona}
                onChange={(e) => setFiltroZona(e.target.value)}
                className="select-input"
              >
                <option value="todas">Todas</option>
                {zonasDisponibles.map(zona => (
                  <option key={zona} value={zona}>{zona}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {activeTab === 'alertas' && (
          <div className="filtros-especificos">
            <div className="filtro-grupo">
              <label>⚠️ Prioridad:</label>
              <select
                value={filtroPrioridad}
                onChange={(e) => setFiltroPrioridad(e.target.value)}
                className="select-input"
              >
                <option value="todas">Todas</option>
                <option value="critica">Crítica</option>
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </select>
            </div>
            <div className="filtro-grupo">
              <label>📍 Zona:</label>
              <select
                value={filtroZona}
                onChange={(e) => setFiltroZona(e.target.value)}
                className="select-input"
              >
                <option value="todas">Todas</option>
                {zonasDisponibles.map(zona => (
                  <option key={zona} value={zona}>{zona}</option>
                ))}
              </select>
            </div>
          </div>
        )}
 
        {/* Filtro de idioma para CSV */}
        <div className="filtro-grupo idioma-selector">
          <label>🌐 Formato CSV:</label>
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

export default ReportesPostes;