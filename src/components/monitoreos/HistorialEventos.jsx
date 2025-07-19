// src/components/MonitoreoControl/components/HistorialEventos/HistorialEventos.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, onSnapshot, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import './HistorialEventos.css';

const HistorialEventos = ({ postesSeleccionados = [], filtroZona = null }) => {
  // ===== ESTADOS PRINCIPALES =====
  const [eventos, setEventos] = useState([]);
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroPrioridad, setFiltroPrioridad] = useState('todas');
  const [filtroFecha, setFiltroFecha] = useState('hoy');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [paginaActual, setPaginaActual] = useState(1);
  const [eventosPorPagina] = useState(20);
  const [modoVisualizacion, setModoVisualizacion] = useState('lista');

  // ===== CARGAR EVENTOS DE FIREBASE =====
  useEffect(() => {
    if (postesSeleccionados.length === 0) {
      setEventos([]);
      return;
    }

    setCargando(true);
    setError(null);

    console.log('📋 Cargando historial de eventos para:', postesSeleccionados);

    const unsubscribe = onSnapshot(
      collection(db, 'postes'),
      (snapshot) => {
        try {
          const todosLosEventos = [];
          
          snapshot.forEach((doc) => {
            const data = doc.data();
            const posteId = doc.id;
            
            // Solo procesar postes seleccionados
            if (postesSeleccionados.includes(posteId)) {
              console.log(`📊 Procesando eventos de ${posteId}:`, data);
              
              // Generar eventos sintéticos basados en los datos actuales
              const eventosGenerados = generarEventosDePoste(data, posteId);
              todosLosEventos.push(...eventosGenerados);
              
              // Si existe historial real en el documento, agregarlo también
              if (data.historial && Array.isArray(data.historial)) {
                const eventosReales = data.historial.map(evento => ({
                  ...evento,
                  id: `${posteId}_${evento.timestamp || Date.now()}`,
                  posteId,
                  posteNombre: data.nombre || `Poste ${posteId.split('_')[1] || posteId}`,
                  zona: data.zona || 'Villa Adela Norte',
                  esReal: true
                }));
                todosLosEventos.push(...eventosReales);
              }
              
              // Si existe array de eventos/logs, procesarlo
              if (data.eventos && Array.isArray(data.eventos)) {
                const eventosDelArray = data.eventos.map(evento => ({
                  ...evento,
                  id: `${posteId}_evt_${evento.timestamp || Date.now()}`,
                  posteId,
                  posteNombre: data.nombre || `Poste ${posteId.split('_')[1] || posteId}`,
                  zona: data.zona || 'Villa Adela Norte',
                  esReal: true
                }));
                todosLosEventos.push(...eventosDelArray);
              }
            }
          });
          
          // Ordenar por fecha descendente
          todosLosEventos.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
          
          // Enriquecer eventos con metadatos
          const eventosEnriquecidos = todosLosEventos.map(evento => ({
            ...evento,
            prioridad: evento.prioridad || determinarPrioridad(evento),
            categoria: evento.categoria || determinarCategoria(evento),
            icono: evento.icono || determinarIcono(evento),
            color: evento.color || determinarColor(evento)
          }));
          
          console.log(`✅ ${eventosEnriquecidos.length} eventos cargados`);
          setEventos(eventosEnriquecidos);
          setCargando(false);
          
        } catch (err) {
          console.error('❌ Error procesando eventos:', err);
          setError('Error al procesar los eventos');
          setCargando(false);
        }
      },
      (err) => {
        console.error('❌ Error conectando a Firebase para eventos:', err);
        setError('Error de conexión con Firebase');
        setCargando(false);
      }
    );

    return () => unsubscribe();
  }, [postesSeleccionados]);

  // ===== GENERAR EVENTOS SINTÉTICOS =====
  const generarEventosDePoste = useCallback((data, posteId) => {
    const eventos = [];
    const ahora = new Date();
    const posteNombre = data.nombre || `Poste ${posteId.split('_')[1] || posteId}`;
    const zona = data.zona || 'Villa Adela Norte';
    
    // Evento de estado actual
    const estadoOnline = data.online === true || 
                        data.estado?.online === true || 
                        data.conectado === true ||
                        data.activo === true;
    
    const intensidadActual = Number(
      data.control?.intensidad ||
      data.calculados?.intensidadLED ||
      data.intensidadLED ||
      data.intensidad ||
      0
    );
    
    const isEncendido = data.encendido === true ||
                       data.estado?.encendido === true ||
                       data.ledEncendido === true ||
                       intensidadActual > 0;
    
    // Evento de conexión
    eventos.push({
      id: `${posteId}_conexion_${Date.now()}`,
      posteId,
      posteNombre,
      zona,
      tipo: estadoOnline ? 'conexion_activa' : 'desconexion',
      descripcion: estadoOnline ? 
        `Dispositivo conectado y funcionando correctamente` :
        `Dispositivo desconectado o fuera de línea`,
      timestamp: data.ultimaActualizacion || data.timestamp || ahora.toISOString(),
      usuario: 'Sistema',
      protocolo: 'HTTP',
      metadata: {
        ip: data.red?.ip || data.ip,
        rssi: data.red?.rssi || data.rssi,
        version: data.hardware?.version || data.version
      },
      esSintetico: true
    });
    
    // Evento de control LED
    if (isEncendido) {
      eventos.push({
        id: `${posteId}_led_${Date.now() + 1}`,
        posteId,
        posteNombre,
        zona,
        tipo: 'control_led',
        descripcion: `LED encendido al ${Math.round((intensidadActual/255)*100)}% de intensidad (${intensidadActual}/255)`,
        timestamp: new Date(ahora.getTime() - Math.random() * 3600000).toISOString(), // Última hora
        usuario: data.modoAutomatico ? 'Sistema Automático' : 'Control Manual',
        protocolo: 'HTTP',
        metadata: {
          intensidad: intensidadActual,
          porcentaje: Math.round((intensidadActual/255)*100),
          modo: data.modoAutomatico ? 'automatico' : 'manual'
        },
        esSintetico: true
      });
    } else if (intensidadActual === 0) {
      eventos.push({
        id: `${posteId}_led_off_${Date.now() + 2}`,
        posteId,
        posteNombre,
        zona,
        tipo: 'control_led',
        descripcion: `LED apagado (intensidad: 0%)`,
        timestamp: new Date(ahora.getTime() - Math.random() * 1800000).toISOString(), // Última media hora
        usuario: data.modoAutomatico ? 'Sistema Automático' : 'Control Manual',
        protocolo: 'HTTP',
        metadata: {
          intensidad: 0,
          porcentaje: 0,
          modo: data.modoAutomatico ? 'automatico' : 'manual'
        },
        esSintetico: true
      });
    }
    
    // Evento de configuración si está en automático
    if (data.modoAutomatico === true || data.automatizacion?.habilitada === true) {
      eventos.push({
        id: `${posteId}_config_${Date.now() + 3}`,
        posteId,
        posteNombre,
        zona,
        tipo: 'configuracion',
        descripcion: `Modo automático activado - Sensores LDR y PIR en funcionamiento`,
        timestamp: new Date(ahora.getTime() - Math.random() * 7200000).toISOString(), // Últimas 2 horas
        usuario: 'Configuración Sistema',
        protocolo: 'HTTP',
        metadata: {
          modoAutomatico: true,
          sensores: {
            ldr: data.sensores?.ldr?.funcionando !== false,
            pir: data.sensores?.pir?.funcionando !== false
          }
        },
        esSintetico: true
      });
    }
    
    // Evento de sensores si hay datos
    if (data.sensores?.pir?.contadorHoy > 0) {
      eventos.push({
        id: `${posteId}_pir_${Date.now() + 4}`,
        posteId,
        posteNombre,
        zona,
        tipo: 'sensor_pir',
        descripcion: `Sensor PIR detectó ${data.sensores.pir.contadorHoy} movimientos hoy`,
        timestamp: new Date(ahora.getTime() - Math.random() * 14400000).toISOString(), // Últimas 4 horas
        usuario: 'Sensor PIR',
        protocolo: 'HTTP',
        metadata: {
          detecciones: data.sensores.pir.contadorHoy,
          ultimaDeteccion: data.sensores.pir.movimiento
        },
        esSintetico: true
      });
    }
    
    // Evento de consumo si hay datos
    const consumo = data.calculados?.potenciaActual || data.potenciaActual || 0;
    if (consumo > 0) {
      eventos.push({
        id: `${posteId}_consumo_${Date.now() + 5}`,
        posteId,
        posteNombre,
        zona,
        tipo: 'monitoreo_consumo',
        descripcion: `Consumo actual: ${consumo.toFixed(1)}W - Corriente: ${(data.corriente || 0).toFixed(2)}A`,
        timestamp: new Date(ahora.getTime() - Math.random() * 1800000).toISOString(), // Última media hora
        usuario: 'Monitor de Energía',
        protocolo: 'HTTP',
        metadata: {
          potencia: consumo,
          corriente: data.corriente || 0,
          voltaje: data.voltaje || 220,
          eficiencia: data.eficienciaHoy || 85
        },
        esSintetico: true
      });
    }
    
    // Evento de creación/inicialización
    if (data.fechaCreacion) {
      eventos.push({
        id: `${posteId}_init_${Date.now() + 6}`,
        posteId,
        posteNombre,
        zona,
        tipo: 'inicializacion',
        descripcion: `Dispositivo registrado en el sistema e inicializado correctamente`,
        timestamp: data.fechaCreacion,
        usuario: 'Sistema de Registro',
        protocolo: 'HTTP',
        metadata: {
          deviceId: data.deviceId,
          version: data.hardware?.version || data.version,
          firmware: data.hardware?.firmware || data.firmware
        },
        esSintetico: true
      });
    }
    
    return eventos;
  }, []);

  // ===== FUNCIONES DE CLASIFICACIÓN =====
  const determinarPrioridad = useCallback((evento) => {
    const descripcion = evento.descripcion?.toLowerCase() || '';
    const tipo = evento.tipo?.toLowerCase() || '';
    
    if (tipo.includes('error') || tipo.includes('falla') || tipo.includes('desconex') || 
        descripcion.includes('error') || descripcion.includes('falla') || descripcion.includes('crítico')) {
      return 'critica';
    }
    if (tipo.includes('alerta') || tipo.includes('warning') || 
        descripcion.includes('alerta') || descripcion.includes('advertencia')) {
      return 'alta';
    }
    if (tipo.includes('config') || tipo.includes('cambio') || tipo.includes('actualiz') ||
        descripcion.includes('configuración') || descripcion.includes('cambio')) {
      return 'media';
    }
    if (tipo.includes('control') || tipo.includes('monitoreo') || tipo.includes('sensor') ||
        descripcion.includes('intensidad') || descripcion.includes('consumo')) {
      return 'baja';
    }
    return 'media';
  }, []);

  const determinarCategoria = useCallback((evento) => {
    const tipo = evento.tipo?.toLowerCase() || '';
    const descripcion = evento.descripcion?.toLowerCase() || '';
    
    if (tipo.includes('control') || tipo.includes('led') || descripcion.includes('intensidad')) {
      return 'control';
    }
    if (tipo.includes('config') || descripcion.includes('configuración') || descripcion.includes('modo')) {
      return 'configuracion';
    }
    if (tipo.includes('error') || tipo.includes('alerta') || tipo.includes('falla')) {
      return 'alerta';
    }
    if (tipo.includes('conexion') || tipo.includes('conectad') || descripcion.includes('conectado')) {
      return 'conexion';
    }
    if (tipo.includes('sensor') || tipo.includes('pir') || tipo.includes('ldr')) {
      return 'sensores';
    }
    return 'sistema';
  }, []);

  const determinarIcono = useCallback((evento) => {
    const categoria = evento.categoria || determinarCategoria(evento);
    const iconos = {
      control: '🎮',
      configuracion: '⚙️',
      alerta: '⚠️',
      conexion: '🌐',
      sensores: '🔬',
      sistema: '🔧'
    };
    return iconos[categoria] || '📋';
  }, [determinarCategoria]);

  const determinarColor = useCallback((evento) => {
    const prioridad = evento.prioridad || determinarPrioridad(evento);
    const colores = {
      critica: '#DC2626',
      alta: '#FF8F00',
      media: '#0066FF',
      baja: '#00D68F'
    };
    return colores[prioridad] || '#64748B';
  }, [determinarPrioridad]);

  // ===== EVENTOS FILTRADOS =====
  const eventosFiltrados = useMemo(() => {
    let resultado = [...eventos];

    // Filtro por tipo/categoría
    if (filtroTipo !== 'todos') {
      resultado = resultado.filter(evento => evento.categoria === filtroTipo);
    }

    // Filtro por prioridad
    if (filtroPrioridad !== 'todas') {
      resultado = resultado.filter(evento => evento.prioridad === filtroPrioridad);
    }

    // Filtro por fecha
    const ahora = new Date();
    let fechaLimite = null;
    
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
    }

    if (fechaLimite) {
      resultado = resultado.filter(evento => {
        const fechaEvento = new Date(evento.timestamp);
        if (filtroFecha === 'personalizado' && fechaFin) {
          const fechaFinDate = new Date(fechaFin);
          return fechaEvento >= fechaLimite && fechaEvento <= fechaFinDate;
        }
        return fechaEvento >= fechaLimite;
      });
    }

    // Filtro por búsqueda
    if (busqueda.trim()) {
      const termino = busqueda.toLowerCase().trim();
      resultado = resultado.filter(evento =>
        evento.descripcion?.toLowerCase().includes(termino) ||
        evento.tipo?.toLowerCase().includes(termino) ||
        evento.posteNombre?.toLowerCase().includes(termino) ||
        evento.usuario?.toLowerCase().includes(termino) ||
        evento.zona?.toLowerCase().includes(termino)
      );
    }

    return resultado;
  }, [eventos, filtroTipo, filtroPrioridad, filtroFecha, fechaInicio, fechaFin, busqueda]);

  // ===== ESTADÍSTICAS =====
  const estadisticas = useMemo(() => {
    return {
      total: eventosFiltrados.length,
      criticos: eventosFiltrados.filter(e => e.prioridad === 'critica').length,
      control: eventosFiltrados.filter(e => e.categoria === 'control').length,
      postes: new Set(eventosFiltrados.map(e => e.posteId)).size,
      alertas: eventosFiltrados.filter(e => e.categoria === 'alerta').length,
      conexiones: eventosFiltrados.filter(e => e.categoria === 'conexion').length
    };
  }, [eventosFiltrados]);

  // ===== PAGINACIÓN =====
  const eventosPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * eventosPorPagina;
    const fin = inicio + eventosPorPagina;
    return eventosFiltrados.slice(inicio, fin);
  }, [eventosFiltrados, paginaActual, eventosPorPagina]);

  const totalPaginas = Math.ceil(eventosFiltrados.length / eventosPorPagina);

  // ===== FUNCIONES AUXILIARES =====
  const limpiarFiltros = useCallback(() => {
    setFiltroTipo('todos');
    setFiltroPrioridad('todas');
    setFiltroFecha('hoy');
    setFechaInicio('');
    setFechaFin('');
    setBusqueda('');
    setPaginaActual(1);
  }, []);

  const exportarEventos = useCallback(() => {
    if (eventosFiltrados.length === 0) return;
    
    const datosExport = eventosFiltrados.map(evento => ({
      'Fecha/Hora': new Date(evento.timestamp).toLocaleString('es-ES'),
      'Poste': evento.posteNombre,
      'Zona': evento.zona,
      'Tipo': evento.tipo,
      'Descripción': evento.descripcion,
      'Usuario': evento.usuario || 'Sistema',
      'Prioridad': evento.prioridad,
      'Categoría': evento.categoria,
      'Protocolo': evento.protocolo || 'HTTP',
      'Origen': evento.esSintetico ? 'Generado' : 'Real'
    }));

    const csv = [
      Object.keys(datosExport[0]).join(','),
      ...datosExport.map(row => 
        Object.values(row).map(val => 
          typeof val === 'string' && val.includes(',') ? `"${val}"` : val
        ).join(',')
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `historial_eventos_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }, [eventosFiltrados]);

  const formatearFecha = useCallback((timestamp) => {
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
    
    // Si es esta semana
    if (diferencia < 7 * 24 * 60 * 60 * 1000) {
      return fecha.toLocaleString('es-ES', {
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    // Fecha completa
    return fecha.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  // ===== COMPONENTES DE RENDERIZADO =====
  const renderVistaLista = () => (
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
              {evento.esSintetico && (
                <span className="evento-origen">🔄 Generado</span>
              )}
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

  const renderVistaTimeline = () => (
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
                {evento.esSintetico && <span>🔄 Generado</span>}
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

  const renderVistaTabla = () => (
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
            <th>Origen</th>
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
              <td className="tabla-origen">
                {evento.esSintetico ? '🔄 Gen.' : '📋 Real'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // ===== RENDER PRINCIPAL =====
  if (postesSeleccionados.length === 0) {
    return (
      <div className="historial-eventos">
        <div className="sin-postes-seleccionados">
          <div className="sin-postes-icono">📋</div>
          <h3>Historial de Eventos</h3>
          <p>Selecciona dispositivos para ver su historial de eventos</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="historial-eventos">
        <div className="error-historial">
          <div className="error-icono">⚠️</div>
          <div className="error-mensaje">
            <h3>Error al cargar eventos</h3>
            <p>{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="btn-reintentar"
            >
              🔄 Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

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
            <option value="sensores">🔬 Sensores</option>
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
          <span className="stat-numero">{estadisticas.total}</span>
          <span className="stat-label">Eventos</span>
        </div>
        <div className="stat-evento">
          <span className="stat-numero">{estadisticas.criticos}</span>
          <span className="stat-label">Críticos</span>
        </div>
        <div className="stat-evento">
          <span className="stat-numero">{estadisticas.control}</span>
          <span className="stat-label">Control</span>
        </div>
        <div className="stat-evento">
          <span className="stat-numero">{estadisticas.postes}</span>
          <span className="stat-label">Postes</span>
        </div>
        <div className="stat-evento">
          <span className="stat-numero">{estadisticas.alertas}</span>
          <span className="stat-label">Alertas</span>
        </div>
        <div className="stat-evento">
          <span className="stat-numero">{estadisticas.conexiones}</span>
          <span className="stat-label">Conexiones</span>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="historial-contenido">
        {cargando ? (
          <div className="cargando-eventos">
            <div className="spinner"></div>
            <span>Cargando historial de eventos desde Firebase...</span>
          </div>
        ) : eventosFiltrados.length === 0 ? (
          <div className="sin-eventos">
            <div className="sin-eventos-icono">📋</div>
            <div className="sin-eventos-mensaje">
              {eventos.length === 0 
                ? 'No hay eventos disponibles para los dispositivos seleccionados'
                : 'No se encontraron eventos con los filtros aplicados'
              }
            </div>
            {eventos.length > 0 && (
              <button className="btn-limpiar-filtros-mini" onClick={limpiarFiltros}>
                🧹 Limpiar filtros
              </button>
            )}
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
                  onClick={() => setPaginaActual(Math.max(1, paginaActual - 1))}
                  disabled={paginaActual === 1}
                >
                  ← Anterior
                </button>
                
                <div className="paginacion-info">
                  <div className="pagina-actual">
                    Página {paginaActual} de {totalPaginas}
                  </div>
                  <div className="elementos-info">
                    {(paginaActual - 1) * eventosPorPagina + 1}-
                    {Math.min(paginaActual * eventosPorPagina, eventosFiltrados.length)} de {eventosFiltrados.length}
                  </div>
                </div>
                
                <button
                  className="btn-paginacion"
                  onClick={() => setPaginaActual(Math.min(totalPaginas, paginaActual + 1))}
                  disabled={paginaActual === totalPaginas}
                >
                  Siguiente →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Información adicional */}
      <div className="historial-footer">
        <div className="footer-info">
          <span>🔥 Datos en tiempo real desde Firebase</span>
          <span>📊 {postesSeleccionados.length} dispositivos monitoreados</span>
          <span>🕐 Última actualización: {new Date().toLocaleTimeString('es-ES')}</span>
        </div>
      </div>

      {/* Debug info en desarrollo */}
      {process.env.NODE_ENV === 'development' && eventos.length > 0 && (
        <div className="debug-historial">
          <details>
            <summary>🔧 Debug Historial</summary>
            <div className="debug-contenido">
              <h5>Estado del historial:</h5>
              <ul>
                <li>Postes seleccionados: {postesSeleccionados.length}</li>
                <li>Eventos totales: {eventos.length}</li>
                <li>Eventos filtrados: {eventosFiltrados.length}</li>
                <li>Eventos sintéticos: {eventos.filter(e => e.esSintetico).length}</li>
                <li>Eventos reales: {eventos.filter(e => e.esReal).length}</li>
                <li>Página actual: {paginaActual}/{totalPaginas}</li>
              </ul>
              
              <h5>Distribución por categoría:</h5>
              <ul>
                <li>Control: {estadisticas.control}</li>
                <li>Alertas: {estadisticas.alertas}</li>
                <li>Conexiones: {estadisticas.conexiones}</li>
                <li>Críticos: {estadisticas.criticos}</li>
              </ul>
              
              <h5>Últimos eventos generados:</h5>
              <ul>
                {eventos.slice(0, 3).map(evento => (
                  <li key={evento.id}>
                    <strong>{evento.posteNombre}</strong>: {evento.tipo} - {evento.descripcion.substring(0, 50)}...
                    {evento.esSintetico && ' (Sintético)'}
                  </li>
                ))}
              </ul>
            </div>
          </details>
        </div>
      )}
    </div>
  );
};

export default HistorialEventos;