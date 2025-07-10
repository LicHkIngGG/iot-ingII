import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  limit,
  startAfter,
  doc,
  getDoc
} from 'firebase/firestore';
import { db } from '../../utils/firebase';

// Función para formatear fecha para visualización
const formatDate = (timestamp) => {
  if (!timestamp) return 'Fecha desconocida';
 
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
   
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error("Error al formatear fecha:", error);
    return 'Fecha inválida';
  }
};

// Función para preparar datos de gráficos de viajes
const prepararDatosGraficosViajes = (viajes, gananciaDiaria) => {
  try {
    const viajesPorDia = {};
    
    viajes.forEach(viaje => {
      const fechaSolo = viaje.fecha.split(' ')[0];
      
      if (!viajesPorDia[fechaSolo]) {
        viajesPorDia[fechaSolo] = {
          viajes: 0,
          ganancias: 0,
          distancia: 0
        };
      }
      
      viajesPorDia[fechaSolo].viajes++;
      
      if (viaje.estado === 'completado') {
        viajesPorDia[fechaSolo].ganancias += parseFloat(viaje.precio) || 0;
        viajesPorDia[fechaSolo].distancia += parseFloat(viaje.distancia) || 0;
      }
    });
    
    const datosGrafico = Object.keys(viajesPorDia).map(fecha => ({
      fecha,
      viajes: viajesPorDia[fecha].viajes,
      ganancias: viajesPorDia[fecha].ganancias,
      distancia: viajesPorDia[fecha].distancia
    }));
    
    datosGrafico.sort((a, b) => {
      const partsA = a.fecha.split('/');
      const partsB = b.fecha.split('/');
      
      const dateA = new Date(partsA[2], partsA[1]-1, partsA[0]);
      const dateB = new Date(partsB[2], partsB[1]-1, partsB[0]);
      
      return dateA - dateB;
    });
    
    return datosGrafico;
  } catch (error) {
    console.error("Error al preparar datos para gráficos:", error);
    return [];
  }
};

// Función para cargar viajes desde Firestore
export const cargarViajes = async (params) => {
  const {
    fechaInicio,
    fechaFin,
    paginaActual,
    itemsPorPagina,
    ultimoDocumento,
    filtroEstado,
    filtroTipoViaje,
    filtroConductor,
    filtroUsuario
  } = params;

  try {
    const timestampInicio = Timestamp.fromDate(fechaInicio);
    const timestampFin = Timestamp.fromDate(fechaFin);
   
    let viajesQuery = query(
      collection(db, 'viajes'),
      where('fecha_creacion', '>=', timestampInicio),
      where('fecha_creacion', '<=', timestampFin),
      orderBy('fecha_creacion', 'desc')
    );
   
    if (filtroEstado !== 'todos') {
      viajesQuery = query(viajesQuery, where('estado', '==', filtroEstado));
    }
   
    if (filtroTipoViaje !== 'todos' && filtroTipoViaje !== '') {
      viajesQuery = query(viajesQuery, where('tipoViaje', '==', filtroTipoViaje));
    }
   
    if (filtroConductor !== '') {
      viajesQuery = query(viajesQuery, where('conductor_id', '==', filtroConductor));
    }
   
    if (filtroUsuario !== '') {
      viajesQuery = query(viajesQuery, where('cliente_id', '==', filtroUsuario));
    }
   
    if (ultimoDocumento && paginaActual > 1) {
      viajesQuery = query(viajesQuery, startAfter(ultimoDocumento), limit(itemsPorPagina));
    } else {
      viajesQuery = query(viajesQuery, limit(itemsPorPagina));
    }
   
    const viajesSnapshot = await getDocs(viajesQuery);
   
    let newUltimoDocumento = null;
    let newPrimerDocumento = null;
    
    if (!viajesSnapshot.empty) {
      newUltimoDocumento = viajesSnapshot.docs[viajesSnapshot.docs.length - 1];
      newPrimerDocumento = viajesSnapshot.docs[0];
    }
   
    // Obtener total de items
    const totalQuery = query(
      collection(db, 'viajes'),
      where('fecha_creacion', '>=', timestampInicio),
      where('fecha_creacion', '<=', timestampFin)
    );
   
    const totalSnapshot = await getDocs(totalQuery);
    const totalItems = totalSnapshot.size;
   
    // Inicializar métricas
    const metricasTemp = {
      gananciaTotal: 0,
      viajesCompletados: 0,
      viajesCancelados: 0,
      distanciaTotal: 0,
      distanciaPromedio: 0,
      tarifaPromedio: 0,
      gananciaDiaria: {}
    };
    
    // Procesar datos de viajes
    const viajes = [];
    for (const docSnapshot of viajesSnapshot.docs) {
      const viajeData = docSnapshot.data();
      
      const nombreConductor = viajeData.conductor_nombre || 'Desconocido';
      const nombreCliente = viajeData.cliente_nombre || 'Desconocido';
      
      const fechaCreacion = viajeData.fecha_creacion ? formatDate(viajeData.fecha_creacion) : 'Fecha desconocida';
      const fechaInicio = viajeData.fecha_inicio ? formatDate(viajeData.fecha_inicio) : '';
      
      const origen = `${viajeData.origen_lat || 0}, ${viajeData.origen_lng || 0}`;
      const destino = `${viajeData.destino_lat || 0}, ${viajeData.destino_lng || 0}`;
      
      const precio = parseFloat(viajeData.tarifa) || 0;
      const distancia = parseFloat(viajeData.distancia_km) || 0;
      
      let duracion = viajeData.tiempo_estimado || 0;
      
      // Actualizar métricas
      if (viajeData.estado === 'completado') {
        metricasTemp.viajesCompletados++;
        metricasTemp.gananciaTotal += precio;
        metricasTemp.distanciaTotal += distancia;
        
        const fechaSolo = fechaCreacion.split(' ')[0];
        if (!metricasTemp.gananciaDiaria[fechaSolo]) {
          metricasTemp.gananciaDiaria[fechaSolo] = 0;
        }
        metricasTemp.gananciaDiaria[fechaSolo] += precio;
      } else if (viajeData.estado === 'cancelado') {
        metricasTemp.viajesCancelados++;
      }
      
      viajes.push({
        id: docSnapshot.id,
        fecha: fechaCreacion,
        fecha_inicio: fechaInicio,
        origen,
        destino,
        estado: viajeData.estado || 'desconocido',
        conductor: nombreConductor,
        conductor_id: viajeData.conductor_id || '',
        cliente: nombreCliente,
        cliente_id: viajeData.cliente_id || '',
        precio,
        distancia,
        duracion,
        calificacion: viajeData.calificacion || 0,
        tipoViaje: viajeData.tipoViaje || 'estándar',
        raw: viajeData
      });
    }
    
    if (metricasTemp.viajesCompletados > 0) {
      metricasTemp.distanciaPromedio = metricasTemp.distanciaTotal / metricasTemp.viajesCompletados;
      metricasTemp.tarifaPromedio = metricasTemp.gananciaTotal / metricasTemp.viajesCompletados;
    }
    
    const viajesDataGrafico = prepararDatosGraficosViajes(viajes, metricasTemp.gananciaDiaria);
    
    return {
      viajes,
      viajesDataGrafico,
      metricas: metricasTemp,
      totalItems,
      ultimoDocumento: newUltimoDocumento,
      primerDocumento: newPrimerDocumento
    };
  } catch (error) {
    console.error("Error al cargar viajes:", error);
    throw error;
  }
};

// Función para cargar conductores desde Firestore
export const cargarConductores = async (params) => {
  const { paginaActual, itemsPorPagina, ultimoDocumento } = params;

  try {
    let conductoresQuery = query(
      collection(db, 'conductores'),
      orderBy('fecha_registro', 'desc')
    );
    
    if (ultimoDocumento && paginaActual > 1) {
      conductoresQuery = query(conductoresQuery, startAfter(ultimoDocumento), limit(itemsPorPagina));
    } else {
      conductoresQuery = query(conductoresQuery, limit(itemsPorPagina));
    }
    
    const conductoresSnapshot = await getDocs(conductoresQuery);
    
    let newUltimoDocumento = null;
    let newPrimerDocumento = null;
    
    if (!conductoresSnapshot.empty) {
      newUltimoDocumento = conductoresSnapshot.docs[conductoresSnapshot.docs.length - 1];
      newPrimerDocumento = conductoresSnapshot.docs[0];
    }
    
    // Obtener total de conductores
    const totalQuery = query(collection(db, 'conductores'));
    const totalSnapshot = await getDocs(totalQuery);
    const totalItems = totalSnapshot.size;
    
    // Inicializar métricas de conductores
    const metricasTemp = {
      activos: 0,
      inactivos: 0,
      totalViajes: 0,
      calificacionPromedio: 0,
      totalCalificaciones: 0,
      conductoresCalificados: 0
    };
    
    const conductores = [];
    for (const docSnapshot of conductoresSnapshot.docs) {
      const conductorData = docSnapshot.data();
      
      const estaActivo = conductorData.estado === 'activo' || conductorData.activo === true;
      
      if (estaActivo) {
        metricasTemp.activos++;
      } else {
        metricasTemp.inactivos++;
      }
      
      metricasTemp.totalViajes += conductorData.viajes_completados || conductorData.viajesRealizados || 0;
      
      if (conductorData.calificacion_promedio > 0 || conductorData.calificacionPromedio > 0) {
        metricasTemp.totalCalificaciones += conductorData.calificacion_promedio || conductorData.calificacionPromedio || 0;
        metricasTemp.conductoresCalificados++;
      }
      
      conductores.push({
        id: docSnapshot.id,
        nombre: conductorData.nombre || 'Sin nombre',
        email: conductorData.email || 'Sin email',
        telefono: conductorData.telefono || 'Sin teléfono',
        licencia: conductorData.licencia || conductorData.licenciaURL || 'Sin licencia',
        licencia_categoria: conductorData.licencia_categoria || 'No especificada',
        fechaRegistro: conductorData.fecha_registro ? formatDate(conductorData.fecha_registro) : 
                    conductorData.fechaRegistro ? formatDate(conductorData.fechaRegistro) : 'Desconocida',
        estado: estaActivo ? 'activo' : 'inactivo',
        viajesRealizados: conductorData.viajes_completados || conductorData.viajesRealizados || 0,
        calificacionPromedio: conductorData.calificacion_promedio || conductorData.calificacionPromedio || 0,
        modelo_vehiculo: conductorData.modelo_vehiculo || 'No especificado',
        placa_vehiculo: conductorData.placa_vehiculo || 'No especificada'
      });
    }
    
    if (metricasTemp.conductoresCalificados > 0) {
      metricasTemp.calificacionPromedio = metricasTemp.totalCalificaciones / metricasTemp.conductoresCalificados;
    }
    
    return {
      conductores,
      metricas: metricasTemp,
      totalItems,
      ultimoDocumento: newUltimoDocumento,
      primerDocumento: newPrimerDocumento
    };
  } catch (error) {
    console.error("Error al cargar conductores:", error);
    throw error;
  }
};

// Función para cargar solicitudes de conductores
export const cargarSolicitudes = async (params) => {
  const { fechaInicio, fechaFin, paginaActual, itemsPorPagina, ultimoDocumento } = params;

  try {
    let solicitudesQuery = query(
      collection(db, 'solicitudes_conductores'),
      orderBy('fecha_solicitud', 'desc')
    );
    
    if (fechaInicio && fechaFin) {
      const timestampInicio = Timestamp.fromDate(fechaInicio);
      const timestampFin = Timestamp.fromDate(fechaFin);
      
      solicitudesQuery = query(
        solicitudesQuery,
        where('fecha_solicitud', '>=', timestampInicio),
        where('fecha_solicitud', '<=', timestampFin)
      );
    }
    
    if (ultimoDocumento && paginaActual > 1) {
      solicitudesQuery = query(solicitudesQuery, startAfter(ultimoDocumento), limit(itemsPorPagina));
    } else {
      solicitudesQuery = query(solicitudesQuery, limit(itemsPorPagina));
    }
    
    const solicitudesSnapshot = await getDocs(solicitudesQuery);
    
    let newUltimoDocumento = null;
    let newPrimerDocumento = null;
    
    if (!solicitudesSnapshot.empty) {
      newUltimoDocumento = solicitudesSnapshot.docs[solicitudesSnapshot.docs.length - 1];
      newPrimerDocumento = solicitudesSnapshot.docs[0];
    }
    
    // Obtener total de solicitudes
    const totalQuery = query(collection(db, 'solicitudes_conductores'));
    const totalSnapshot = await getDocs(totalQuery);
    const totalItems = totalSnapshot.size;
    
    // Inicializar métricas
    const metricasTemp = {
      pendientes: 0,
      aprobadas: 0,
      rechazadas: 0,
      tiempoPromedioAprobacion: 0,
      totalTiempoAprobacion: 0,
      solicitudesConTiempo: 0
    };
    
    const solicitudes = [];
    for (const docSnapshot of solicitudesSnapshot.docs) {
      const solicitudData = docSnapshot.data();
      
      let estado = solicitudData.estado || 'pendiente';
      if (typeof estado === 'string') {
        estado = estado.toLowerCase();
      }
      
      if (estado === 'pendiente') {
        metricasTemp.pendientes++;
      } else if (estado === 'aprobada' || estado === 'aprobado') {
        metricasTemp.aprobadas++;
        
        if (solicitudData.fecha_aprobacion && solicitudData.fecha_solicitud) {
          const fechaSolicitud = solicitudData.fecha_solicitud.toDate ? 
                              solicitudData.fecha_solicitud.toDate() : 
                              new Date(solicitudData.fecha_solicitud);
          const fechaAprobacion = solicitudData.fecha_aprobacion.toDate ? 
                               solicitudData.fecha_aprobacion.toDate() : 
                               new Date(solicitudData.fecha_aprobacion);
          
          const tiempoEnHoras = (fechaAprobacion - fechaSolicitud) / (1000 * 60 * 60);
          
          metricasTemp.totalTiempoAprobacion += tiempoEnHoras;
          metricasTemp.solicitudesConTiempo++;
        }
      } else if (estado === 'rechazada' || estado === 'rechazado') {
        metricasTemp.rechazadas++;
      }
      
      solicitudes.push({
        id: docSnapshot.id,
        nombre: solicitudData.nombre || 'Sin nombre',
        email: solicitudData.email || 'Sin email',
        telefono: solicitudData.telefono || 'Sin teléfono',
        licencia: solicitudData.licencia || 'Sin licencia',
        licencia_categoria: solicitudData.licencia_categoria || 'No especificada',
        fechaSolicitud: solicitudData.fecha_solicitud ? formatDate(solicitudData.fecha_solicitud) : 'Desconocida',
        estado: estado,
        documentosCompletos: solicitudData.documentosCompletos || false,
        fecha_aprobacion: solicitudData.fecha_aprobacion ? formatDate(solicitudData.fecha_aprobacion) : 'No aprobada',
        modelo_vehiculo: solicitudData.modelo_vehiculo || 'No especificado',
        placa_vehiculo: solicitudData.placa_vehiculo || 'No especificada'
      });
    }
    
    if (metricasTemp.solicitudesConTiempo > 0) {
      metricasTemp.tiempoPromedioAprobacion = metricasTemp.totalTiempoAprobacion / metricasTemp.solicitudesConTiempo;
    }
    
    return {
      solicitudes,
      metricas: metricasTemp,
      totalItems,
      ultimoDocumento: newUltimoDocumento,
      primerDocumento: newPrimerDocumento
    };
  } catch (error) {
    console.error("Error al cargar solicitudes:", error);
    throw error;
  }
};

// Función para cargar administradores
export const cargarAdministradores = async (params) => {
  const { paginaActual, itemsPorPagina, ultimoDocumento } = params;

  try {
    let adminsQuery = query(
      collection(db, 'usuarios'),
      where('role', '==', 'admin')
    );
    
    if (ultimoDocumento && paginaActual > 1) {
      adminsQuery = query(adminsQuery, startAfter(ultimoDocumento), limit(itemsPorPagina));
    } else {
      adminsQuery = query(adminsQuery, limit(itemsPorPagina));
    }
    
    const adminsSnapshot = await getDocs(adminsQuery);
    
    let newUltimoDocumento = null;
    let newPrimerDocumento = null;
    
    if (!adminsSnapshot.empty) {
      newUltimoDocumento = adminsSnapshot.docs[adminsSnapshot.docs.length - 1];
      newPrimerDocumento = adminsSnapshot.docs[0];
    }
    
    // Obtener total de administradores
    const totalQuery = query(
      collection(db, 'usuarios'),
      where('role', '==', 'admin')
    );
    const totalSnapshot = await getDocs(totalQuery);
    const totalItems = totalSnapshot.size;
    
    const administradores = [];
    for (const docSnapshot of adminsSnapshot.docs) {
      const adminData = docSnapshot.data();
      administradores.push({
        id: docSnapshot.id,
        nombre: adminData.nombre || 'Administrador',
        email: adminData.email || 'Sin email',
        rol: adminData.role || 'admin',
        fechaRegistro: adminData.fechaRegistro ? formatDate(adminData.fechaRegistro) : 'Desconocida',
        ultimoAcceso: adminData.ultimoAcceso ? formatDate(adminData.ultimoAcceso) : 'Nunca',
        accionesRealizadas: adminData.accionesRealizadas || 0,
        active: adminData.active || true,
        uid: adminData.uid || ''
      });
    }
    
    return {
      administradores,
      totalItems,
      ultimoDocumento: newUltimoDocumento,
      primerDocumento: newPrimerDocumento
    };
  } catch (error) {
    console.error("Error al cargar administradores:", error);
    throw error;
  }
};

// Función para cargar grabaciones
export const cargarGrabaciones = async (params) => {
  const { paginaActual, itemsPorPagina, ultimoDocumento } = params;

  try {
    let grabacionesQuery = query(
      collection(db, 'grabaciones'),
      orderBy('fecha', 'desc')
    );
    
    if (ultimoDocumento && paginaActual > 1) {
      grabacionesQuery = query(grabacionesQuery, startAfter(ultimoDocumento), limit(itemsPorPagina));
    } else {
      grabacionesQuery = query(grabacionesQuery, limit(itemsPorPagina));
    }
    
    const grabacionesSnapshot = await getDocs(grabacionesQuery);
    
    let newUltimoDocumento = null;
    let newPrimerDocumento = null;
    
    if (!grabacionesSnapshot.empty) {
      newUltimoDocumento = grabacionesSnapshot.docs[grabacionesSnapshot.docs.length - 1];
      newPrimerDocumento = grabacionesSnapshot.docs[0];
    }
    
    // Obtener total de grabaciones
    const totalQuery = query(collection(db, 'grabaciones'));
    const totalSnapshot = await getDocs(totalQuery);
    const totalItems = totalSnapshot.size;
    
    const grabaciones = [];
    for (const docSnapshot of grabacionesSnapshot.docs) {
      const grabacionData = docSnapshot.data();
      grabaciones.push({
        id: docSnapshot.id,
       viajeId: grabacionData.viajeId || 'Sin viaje',
       conductorId: grabacionData.conductorId || 'Sin conductor',
       fecha: grabacionData.fecha ? formatDate(grabacionData.fecha) : 'Desconocida',
       duracion: grabacionData.duracion || '0:00',
       tamaño: grabacionData.tamaño || '0 MB',
       estado: grabacionData.estado || 'procesando',
       visualizaciones: grabacionData.visualizaciones || 0
     });
   }
   
   return {
     grabaciones,
     totalItems,
     ultimoDocumento: newUltimoDocumento,
     primerDocumento: newPrimerDocumento
   };
 } catch (error) {
   console.error("Error al cargar grabaciones:", error);
   throw error;
 }
};

// Función para cargar logs
export const cargarLogs = async (params) => {
  const { fechaInicio, fechaFin, paginaActual, itemsPorPagina, ultimoDocumento } = params;

  try {
    let logsQuery = query(
      collection(db, 'logs'),
      orderBy('fecha', 'desc')
    );
    
    if (fechaInicio && fechaFin) {
      const timestampInicio = Timestamp.fromDate(fechaInicio);
      const timestampFin = Timestamp.fromDate(fechaFin);
      logsQuery = query(
        logsQuery,
        where('fecha', '>=', timestampInicio),
        where('fecha', '<=', timestampFin)
      );
    }
    
    if (ultimoDocumento && paginaActual > 1) {
      logsQuery = query(logsQuery, startAfter(ultimoDocumento), limit(itemsPorPagina));
    } else {
      logsQuery = query(logsQuery, limit(itemsPorPagina));
    }
    
    const logsSnapshot = await getDocs(logsQuery);
    
    let newUltimoDocumento = null;
    let newPrimerDocumento = null;
    
    if (!logsSnapshot.empty) {
      newUltimoDocumento = logsSnapshot.docs[logsSnapshot.docs.length - 1];
      newPrimerDocumento = logsSnapshot.docs[0];
    }
    
    // Obtener total de logs
    const totalQuery = query(collection(db, 'logs'));
    const totalSnapshot = await getDocs(totalQuery);
    const totalItems = totalSnapshot.size;
    
    const logs = [];
    for (const docSnapshot of logsSnapshot.docs) {
      const logData = docSnapshot.data();
      
      // Obtener nombre de usuario en lugar de mostrar el ID
      let usuarioNombre = 'Sistema';
      if (logData.usuarioId && logData.usuarioId !== 'Sistema') {
        try {
          const usuarioDoc = await getDoc(doc(db, 'usuarios', logData.usuarioId));
          if (usuarioDoc.exists()) {
            usuarioNombre = usuarioDoc.data().nombre || 'Usuario';
          }
        } catch (err) {
          console.error("Error al obtener nombre de usuario:", err);
        }
      }
      
      logs.push({
        id: docSnapshot.id,
        fecha: logData.fecha ? formatDate(logData.fecha) : 'Desconocida',
        usuario: usuarioNombre,
        accion: logData.accion ? logData.accion.replace(/_/g, ' ') : 'desconocida',
        detalles: logData.detalles || 'Sin detalles',
        modulo: logData.modulo || 'general',
        resultado: logData.resultado || 'completado'
      });
    }
    
    return {
      logs,
      totalItems,
      ultimoDocumento: newUltimoDocumento,
      primerDocumento: newPrimerDocumento
    };
  } catch (error) {
    console.error("Error al cargar logs:", error);
    throw error;
  }
};