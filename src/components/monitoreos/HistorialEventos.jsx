// src/components/MonitoreoControl/components/HistorialEventos/HistorialEventos.jsx
import React, { useState, useEffect } from 'react';
import { firebaseService } from '../../services/firebaseService';
import './HistorialEventos.css';

const HistorialEventos = ({ postes, filtroZona }) => {
  const [eventos, setEventos] = useState([]);
  const [eventosFiltrados, setEventosFiltrados] = useState([]);
  const [filtroTipo, setFiltroTipo] = useState('todos'); // todos, control, configuracion, alerta, conexion
  const [filtroPrioridad, setFiltroPrioridad] = useState('todas'); // todas, critica, alta, media, baja
  const [filtroFecha, setFiltroFecha] = useState('hoy'); // hoy, semana, mes, personalizado
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(false);
  const [paginaActual, setPaginaActual] = useState(1);
  const [eventosPorPagina] = useState(20);
  const [modoVisualizacion, setModoVisualizacion] = useState('lista'); // lista, timeline, tabla

  useEffect(() => {
    cargarEventos();
  }, [postes, filtroZona]);

  useEffect(() => {
    aplicarFiltros();
  }, [eventos, filtroTipo, filtroPrioridad, filtroFecha, fechaInicio, fechaFin, busqueda]);

  const cargarEventos = async () => {
    setCargando(true);
    try {
      console.log('📋 Cargando historial de eventos...');
      
      const todosLosEventos = [];
      
      // Cargar eventos de cada poste seleccionado
      for (const poste of postes) {
        try {
          const posteData = await firebaseService.getPosteById(poste.id);
          if (posteData && posteData.historial) {
            const eventosPoste = posteData.historial.map(evento => ({
              ...evento,
              posteId: poste.id,
              posteNombre: poste.nombre,
              zona: poste.zona || 'Sin zona'
            }));
            todosLosEventos.push(...eventosPoste);
          }
        } catch (error) {
          console.error(`❌ Error cargando eventos de ${poste.id}:`, error);
        }
      }
      
      // Ordenar por fecha descendente
      todosLosEventos.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      // Agregar metadatos a los eventos
      const eventosEnriquecidos = todosLosEventos.map(evento => ({
        ...evento,
        id: `${evento.posteId}_${evento.timestamp}`,
        prioridad: determinarPrioridad(evento),
        categoria: determinarCategoria(evento),
        icono: determinarIcono(evento),
        color: determinarColor(evento)
      }));
      
      setEventos(eventosEnriquecidos);
      console.log(`✅ ${eventosEnriquecidos.length} eventos cargados`);
      
    } catch (error) {
      console.error('❌ Error cargando historial:', error);
    } finally {
      setCargando(false);
    }
  };

  const determinarPrioridad = (evento) => {
    const tiposAlta = ['error', 'alerta', 'falla', 'desconexion'];
    const tiposMedia = ['configuracion', 'reinicio', 'reconexion'];
    const tiposBaja = ['control', 'actualizacion', 'creacion'];
    
    if (tiposAlta.some(tipo => evento.tipo?.includes(tipo) || evento.descripcion?.toLowerCase().includes(tipo))) {
      return 'critica';
    }
    if (tiposMedia.some(tipo => evento.tipo?.includes(tipo) || evento.descripcion?.toLowerCase().includes(tipo))) {
      return 'alta';
    }
    if (tiposBaja.some(tipo => evento.tipo?.includes(tipo) || evento.descripcion?.toLowerCase().includes(tipo))) {
      return 'baja';
    }
    return 'media';
  };

  const determinarCategoria = (evento) => {
    if (evento.tipo?.includes('control') || evento.descripcion?.toLowerCase().includes('intensidad')) {
      return 'control';
    }
    if (evento.tipo?.includes('configuracion') || evento.descripcion?.toLowerCase().includes('configuración')) {
      return 'configuracion';
    }
    if (evento.tipo?.includes('error') || evento.tipo?.includes('alerta')) {
      return 'alerta';
    }
    if (evento.tipo?.includes('conexion') || evento.descripcion?.toLowerCase().includes('conectado')) {
      return 'conexion';
    }
    return 'sistema';
  };

  const determinarIcono = (evento) => {
    const categoria = evento.categoria || determinarCategoria(evento);
    const iconos = {
      control: '🎮',
      configuracion: '⚙️',
      alerta: '⚠️',
      conexion: '🌐',
      sistema: '🔧'
    };
    return iconos[categoria] || '📋';
  };

  const determinarColor = (evento) => {
    const prioridad = evento.prioridad || determinarPrioridad(evento);
    const colores = {
      critica: '#DC2626',
      alta: '#FF8F00',
      media: '#0066FF',
      baja: '#00D68F'
    };
    return colores[prioridad] || '#64748B';
  };

  const aplicarFiltros = () => {
    let eventosFiltrados = [...eventos];

    // Filtro por tipo
    if (filtroTipo !== 'todos') {
      eventosFiltrados = eventosFiltrados.filter(evento => 
        evento.categoria === filtroTipo
      );
    }

    // Filtro por prioridad
    if (filtroPrioridad !== 'todas') {
      eventosFiltrados = eventosFiltrados.filter(evento => 
        evento.prioridad === filtroPrioridad
      );
    }

    // Filtro por fecha
    const ahora = new Date();
    let fechaLimite;
    
    switch (filtroFecha) {
      case 'hoy':
        fechaLimite = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
        break;
      case 'semana':
        fechaLimite = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'mes':
        fechaLimite = new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'personalizado':
        if (fechaInicio) {
          fechaLimite = new Date(fechaInicio);
        }
        break;
      default:
        fechaLimite = null;
    }

    if (fechaLimite) {
      eventosFiltrados = eventosFiltrados.filter(evento => {
        const fechaEvento = new Date(evento.timestamp);
        if (filtroFecha === 'personalizado' && fechaFin) {
          const fechaFinDate = new Date(fechaFin);
          return fechaEvento >= fechaLimite && fechaEvento <= fechaFinDate;
        }
        return fechaEvento >= fechaLimite;
      });
    }

    // Filtro por búsqueda
    if (busqueda) {
      const terminoBusqueda = busqueda.toLowerCase();
      eventosFiltrados = eventosFiltrados.filter(evento =>
        evento.descripcion?.toLowerCase().includes(terminoBusqueda) ||
        evento.tipo?.toLowerCase().includes(terminoBusqueda) ||
        evento.posteNombre?.toLowerCase().includes(terminoBusqueda) ||
        evento.usuario?.toLowerCase().includes(terminoBusqueda)
      );
    }

    setEventosFiltrados(eventosFiltrados);
    setPaginaActual(1); // Reset página al cambiar filtros
  };

  const limpiarFiltros = () => {
    setFiltroTipo('todos');
    setFiltroPrioridad('todas');
    setFiltroFecha('hoy');
    setFechaInicio('');
    setFechaFin('');
    setBusqueda('');
  };

  const exportarEventos = () => {
    const datosExport = eventosFiltrados.map(evento => ({
      Fecha: new Date(evento.timestamp).toLocaleString('es-ES'),
      Poste: evento.posteNombre,
      Zona: evento.zona,
      Tipo: evento.tipo,
      Descripción: evento.descripcion,
      Usuario: evento.usuario || 'Sistema',
      Prioridad: evento.prioridad,
      Protocolo: evento.protocolo || 'HTTP'
    }));

    const csv = [
      Object.keys(datosExport[0]).join(','),
      ...datosExport.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `historial_eventos_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const obtenerEventosPaginados = () => {
    const inicio = (paginaActual - 1) * eventosPorPagina;
    const fin = inicio + eventosPorPagina;
    return eventosFiltrados.slice(inicio, fin);
  };

  const totalPaginas = Math.ceil(eventosFiltrados.length / eventosPorPagina);

  const formatearFecha = (timestamp) => {
    const fecha = new Date(timestamp);
    const ahora = new Date();
    const diferencia = ahora - fecha;
    
    // Si es hoy
    if (diferencia < 24 * 60 * 60 * 1000 && fecha.getDate() === ahora.getDate()) {
      return `Hoy ${fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // Si es ayer
    const ayer = new Date(ahora.getTime() - 24 * 60 * 60 * 1000);
    if (fecha.getDate() === ayer.getDate() && fecha.getMonth() === ayer.getMonth()) {
      return `Ayer ${fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // Fecha completa
    return fecha.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderVistaLista = () => {
    const eventosPaginados = obtenerEventosPaginados();
    
    return (
      <div className="eventos-lista">
        {eventosPaginados.map(evento => (
          <div key={evento.id} className={`evento-item prioridad-${evento.prioridad}`}>
            <div className="evento-icono" style={{ color: evento.color }}>
              {evento.icono}
            </div>
            
            <div className="evento-contenido">
              <div className="evento-header">
                <span className="evento-poste">{evento.posteNombre}</span>
                <span className="evento-zona">📍 {evento.zona}</span>
                <span className="evento-fecha">{formatearFecha(evento.timestamp)}</span>
              </div>
              
              <div className="evento-descripcion">
                {evento.descripcion}
              </div>
              
              <div className="evento-detalles">
                <span className="evento-tipo">🏷️ {evento.tipo}</span>
                <span className="evento-usuario">👤 {evento.usuario || 'Sistema'}</span>
                <span className="evento-protocolo">🌐 {evento.protocolo || 'HTTP'}</span>
              </div>
            </div>
            
            <div className="evento-prioridad">
              <span className={`prioridad-badge ${evento.prioridad}`}>
                {evento.prioridad?.toUpperCase()}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderVistaTimeline = () => {
    const eventosPaginados = obtenerEventosPaginados();
    
    return (
      <div className="eventos-timeline">
        {eventosPaginados.map((evento, index) => (
          <div key={evento.id} className={`timeline-item prioridad-${evento.prioridad}`}>
            <div className="timeline-marker" style={{ backgroundColor: evento.color }}>
              {evento.icono}
            </div>
            
            <div className="timeline-contenido">
              <div className="timeline-fecha">
                {formatearFecha(evento.timestamp)}
              </div>
              
              <div className="timeline-evento">
                <div className="timeline-header">
                  <span className="timeline-poste">{evento.posteNombre}</span>
                  <span className={`timeline-prioridad ${evento.prioridad}`}>
                    {evento.prioridad}
                  </span>
                </div>
                
                <div className="timeline-descripcion">
                  {evento.descripcion}
                </div>
                
                <div className="timeline-meta">
                  <span>📍 {evento.zona}</span>
                  <span>🏷️ {evento.tipo}</span>
                  <span>👤 {evento.usuario || 'Sistema'}</span>
                </div>
              </div>
            </div>
            
            {index < eventosPaginados.length - 1 && (
              <div className="timeline-linea"></div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderVistaTabla = () => {
    const eventosPaginados = obtenerEventosPaginados();
    
    return (
      <div className="eventos-tabla-container">
        <table className="eventos-tabla">
          <thead>
            <tr>
              <th>Fecha/Hora</th>
              <th>Poste</th>
              <th>Zona</th>
              <th>Tipo</th>
              <th>Descripción</th>
              <th>Usuario</th>
              <th>Prioridad</th>
            </tr>
          </thead>
          <tbody>
            {eventosPaginados.map(evento => (
              <tr key={evento.id} className={`prioridad-${evento.prioridad}`}>
                <td className="tabla-fecha">
                  {formatearFecha(evento.timestamp)}
                </td>
                <td className="tabla-poste">
                  <span className="evento-icono-mini">{evento.icono}</span>
                  {evento.posteNombre}
                </td>
                <td className="tabla-zona">{evento.zona}</td>
                <td className="tabla-tipo">{evento.tipo}</td>
                <td className="tabla-descripcion">{evento.descripcion}</td>
                <td className="tabla-usuario">{evento.usuario || 'Sistema'}</td>
                <td className="tabla-prioridad">
                  <span className={`prioridad-badge-mini ${evento.prioridad}`}>
                    {evento.prioridad}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="historial-eventos">
      <div className="historial-header">
        <h3>📋 Historial de Eventos</h3>
        <div className="historial-controles">
          <div className="vista-selector">
            <button
              className={`btn-vista ${modoVisualizacion === 'lista' ? 'activo' : ''}`}
              onClick={() => setModoVisualizacion('lista')}
            >
              📋 Lista
            </button>
            <button
              className={`btn-vista ${modoVisualizacion === 'timeline' ? 'activo' : ''}`}
              onClick={() => setModoVisualizacion('timeline')}
            >
              📅 Timeline
            </button>
            <button
              className={`btn-vista ${modoVisualizacion === 'tabla' ? 'activo' : ''}`}
              onClick={() => setModoVisualizacion('tabla')}
            >
              📊 Tabla
            </button>
          </div>
          
          <button
            className="btn-exportar"
            onClick={exportarEventos}
            disabled={eventosFiltrados.length === 0}
          >
            📤 Exportar
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="historial-filtros">
        <div className="filtros-fila-1">
          <div className="filtro-busqueda">
            <input
              type="text"
              placeholder="🔍 Buscar eventos..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="input-busqueda"
            />
          </div>
          
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="select-filtro"
          >
            <option value="todos">📋 Todos los tipos</option>
            <option value="control">🎮 Control</option>
            <option value="configuracion">⚙️ Configuración</option>
            <option value="alerta">⚠️ Alertas</option>
            <option value="conexion">🌐 Conexión</option>
            <option value="sistema">🔧 Sistema</option>
          </select>
          
          <select
            value={filtroPrioridad}
            onChange={(e) => setFiltroPrioridad(e.target.value)}
            className="select-filtro"
          >
            <option value="todas">🎯 Todas las prioridades</option>
            <option value="critica">🔴 Crítica</option>
            <option value="alta">🟠 Alta</option>
            <option value="media">🔵 Media</option>
            <option value="baja">🟢 Baja</option>
          </select>
        </div>
        
        <div className="filtros-fila-2">
          <select
            value={filtroFecha}
            onChange={(e) => setFiltroFecha(e.target.value)}
            className="select-filtro"
          >
            <option value="hoy">📅 Hoy</option>
            <option value="semana">📅 Última semana</option>
            <option value="mes">📅 Último mes</option>
            <option value="personalizado">📅 Rango personalizado</option>
          </select>
          
          {filtroFecha === 'personalizado' && (
            <>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="input-fecha"
              />
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="input-fecha"
              />
            </>
          )}
          
          <button
            className="btn-limpiar-filtros"
            onClick={limpiarFiltros}
          >
            🧹 Limpiar
          </button>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="eventos-stats">
        <div className="stat-evento">
          <span className="stat-numero">{eventosFiltrados.length}</span>
          <span className="stat-label">Eventos</span>
        </div>
        <div className="stat-evento">
          <span className="stat-numero">
            {eventosFiltrados.filter(e => e.prioridad === 'critica').length}
          </span>
          <span className="stat-label">Críticos</span>
        </div>
        <div className="stat-evento">
          <span className="stat-numero">
            {eventosFiltrados.filter(e => e.categoria === 'control').length}
          </span>
          <span className="stat-label">Control</span>
        </div>
        <div className="stat-evento">
          <span className="stat-numero">{new Set(eventosFiltrados.map(e => e.posteId)).size}</span>
          <span className="stat-label">Postes</span>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="historial-contenido">
        {cargando ? (
          <div className="cargando-eventos">
            <div className="spinner"></div>
            <span>Cargando historial de eventos...</span>
          </div>
        ) : eventosFiltrados.length === 0 ? (
          <div className="sin-eventos">
            <div className="sin-eventos-icono">📋</div>
            <div className="sin-eventos-mensaje">
              No se encontraron eventos con los filtros aplicados
            </div>
            <button className="btn-limpiar-filtros-mini" onClick={limpiarFiltros}>
              🧹 Limpiar filtros
            </button>
          </div>
        ) : (
          <>
            {modoVisualizacion === 'lista' && renderVistaLista()}
            {modoVisualizacion === 'timeline' && renderVistaTimeline()}
            {modoVisualizacion === 'tabla' && renderVistaTabla()}
            
            {/* Paginación */}
            {totalPaginas > 1 && (
              <div className="paginacion">
                <button
                  className="btn-paginacion"
                  onClick={() => setPaginaActual(paginaActual - 1)}
                  disabled={paginaActual === 1}
                >
                  ← Anterior
                </button>
                
                <div className="paginacion-info">
                  Página {paginaActual} de {totalPaginas}
                  <br />
                  <small>
                    {(paginaActual - 1) * eventosPorPagina + 1}-
                    {Math.min(paginaActual * eventosPorPagina, eventosFiltrados.length)} de {eventosFiltrados.length}
                  </small>
                </div>
                
                <button
                  className="btn-paginacion"
                  onClick={() => setPaginaActual(paginaActual + 1)}
                  disabled={paginaActual === totalPaginas}
                >
                  Siguiente →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default HistorialEventos;