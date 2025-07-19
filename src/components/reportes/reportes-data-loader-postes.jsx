// src/components/MonitoreoControl/components/ReportesPostes/reportes-data-loader-postes.js
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  limit,
  startAfter
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

// Función para preparar datos de gráficos por fecha
const prepararDatosPorFecha = (datos, campoFecha, campoValor) => {
  try {
    const datosPorDia = {};
    
    datos.forEach(item => {
      const fecha = item[campoFecha];
      const fechaSolo = fecha ? fecha.split(' ')[0] : new Date().toLocaleDateString('es-ES');
      
      if (!datosPorDia[fechaSolo]) {
        datosPorDia[fechaSolo] = {
          fecha: fechaSolo,
          valor: 0,
          count: 0
        };
      }
      
      datosPorDia[fechaSolo].valor += parseFloat(item[campoValor]) || 0;
      datosPorDia[fechaSolo].count++;
    });
    
    const datosGrafico = Object.values(datosPorDia).map(dia => ({
      fecha: dia.fecha,
      valor: dia.valor,
      promedio: dia.count > 0 ? dia.valor / dia.count : 0
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

// Función para cargar postes desde Firestore
export const cargarPostes = async (params) => {
  const {
    fechaInicio,
    fechaFin,
    paginaActual,
    itemsPorPagina,
    ultimoDocumento,
    filtroEstado,
    filtroZona,
    filtroTipo
  } = params;

  try {
    console.log('🔥 Cargando postes desde Firebase...');
    
    let postesQuery = query(collection(db, 'postes'));
   
    // Aplicar filtros si es necesario
    if (filtroZona && filtroZona !== 'todas') {
      postesQuery = query(postesQuery, where('zona', '==', filtroZona));
    }
   
    if (ultimoDocumento && paginaActual > 1) {
      postesQuery = query(postesQuery, startAfter(ultimoDocumento), limit(itemsPorPagina));
    } else {
      postesQuery = query(postesQuery, limit(itemsPorPagina));
    }
   
    const postesSnapshot = await getDocs(postesQuery);
   
    let newUltimoDocumento = null;
    let newPrimerDocumento = null;
    
    if (!postesSnapshot.empty) {
      newUltimoDocumento = postesSnapshot.docs[postesSnapshot.docs.length - 1];
      newPrimerDocumento = postesSnapshot.docs[0];
    }
   
    // Obtener total de items
    const totalQuery = query(collection(db, 'postes'));
    const totalSnapshot = await getDocs(totalQuery);
    const totalItems = totalSnapshot.size;
   
    // Inicializar métricas
    const metricasTemp = {
      totalPostes: 0,
      postesOnline: 0,
      postesEncendidos: 0,
      postesAutomaticos: 0,
      consumoTotal: 0,
      consumoPromedio: 0,
      eficienciaPromedio: 0,
      alertasActivas: 0
    };
    
    const zonasSet = new Set();
    
    // Procesar datos de postes
    const postes = [];
    for (const docSnapshot of postesSnapshot.docs) {
      const posteData = docSnapshot.data();
      
      // Detectar estado online
      const isOnline = posteData.online === true || 
                      posteData.estado?.online === true || 
                      posteData.conectado === true ||
                      posteData.activo === true ||
                      posteData.control?.online === true;
      
      // Detectar intensidad LED
      const intensidadActual = Number(
        posteData.control?.intensidad ||
        posteData.calculados?.intensidadLED ||
        posteData.intensidadLED ||
        posteData.intensidad ||
        posteData.brillo ||
        0
      );
      
      // Detectar estado encendido
      const isEncendido = posteData.encendido === true ||
                         posteData.estado?.encendido === true ||
                         posteData.ledEncendido === true ||
                         posteData.ledState === true ||
                         posteData.control?.encendido === true ||
                         intensidadActual > 0;
      
      // Detectar modo automático
      const isAutomatico = posteData.automatizacion?.habilitada === true || 
                          posteData.modoAutomatico === true || 
                          posteData.autoMode === true ||
                          posteData.control?.automatico === true ||
                          posteData.automatico === true;
      
      const consumoActual = Number(
        posteData.calculados?.potenciaActual ||
        posteData.potenciaActual ||
        posteData.consumoActual ||
        posteData.potencia ||
        posteData.control?.consumo ||
        0
      );
      
      const eficiencia = Number(
        posteData.calculados?.eficienciaHoy ||
        posteData.eficienciaHoy ||
        posteData.eficiencia ||
        85
      );
      
      const zona = posteData.zona || 'Sin zona';
      zonasSet.add(zona);
      
      // Actualizar métricas
      metricasTemp.totalPostes++;
      if (isOnline) metricasTemp.postesOnline++;
      if (isEncendido) metricasTemp.postesEncendidos++;
      if (isAutomatico) metricasTemp.postesAutomaticos++;
      metricasTemp.consumoTotal += consumoActual;
      metricasTemp.eficienciaPromedio += eficiencia;
      
      // Filtrar por estado si es necesario
      let incluirPoste = true;
      if (filtroEstado !== 'todos') {
        if (filtroEstado === 'online' && !isOnline) incluirPoste = false;
        if (filtroEstado === 'offline' && isOnline) incluirPoste = false;
      }
      
      if (filtroTipo !== 'todos') {
        if (filtroTipo === 'encendido' && !isEncendido) incluirPoste = false;
        if (filtroTipo === 'apagado' && isEncendido) incluirPoste = false;
        if (filtroTipo === 'automatico' && !isAutomatico) incluirPoste = false;
        if (filtroTipo === 'manual' && isAutomatico) incluirPoste = false;
      }
      
      if (incluirPoste) {
        postes.push({
          id: docSnapshot.id,
          nombre: posteData.nombre || `Poste ${docSnapshot.id.split('_')[1] || docSnapshot.id}`,
          zona: zona,
          ubicacion: posteData.ubicacion || 'No especificada',
          estado: isOnline ? 'Online' : 'Offline',
          encendido: isEncendido ? 'Sí' : 'No',
          intensidad: `${intensidadActual}/255 (${Math.round((intensidadActual/255)*100)}%)`,
          modoAutomatico: isAutomatico ? 'Automático' : 'Manual',
          consumoActual: consumoActual.toFixed(1),
          eficiencia: eficiencia.toFixed(1),
          ip: posteData.red?.ip || posteData.ip || 'N/A',
          version: posteData.hardware?.version || posteData.version || '4.0',
          firmware: posteData.hardware?.firmware || posteData.firmware || '4.0.1',
          ultimaActualizacion: formatDate(posteData.ultimaActualizacion || posteData.timestamp || new Date().toISOString()),
          sensores: {
            ldr: posteData.sensores?.ldr?.luxCalculado || 0,
            pir: posteData.sensores?.pir?.contadorHoy || 0,
            corriente: posteData.sensores?.acs712?.corriente || 0
          },
          raw: posteData
        });
      }
    }
    
    // Calcular promedios
    if (metricasTemp.totalPostes > 0) {
      metricasTemp.consumoPromedio = metricasTemp.consumoTotal / metricasTemp.totalPostes;
      metricasTemp.eficienciaPromedio = metricasTemp.eficienciaPromedio / metricasTemp.totalPostes;
    }
    
    const zonas = Array.from(zonasSet).sort();
    
    return {
      postes,
      metricas: metricasTemp,
      zonas,
      totalItems,
      ultimoDocumento: newUltimoDocumento,
      primerDocumento: newPrimerDocumento
    };
  } catch (error) {
    console.error("Error al cargar postes:", error);
    throw error;
  }
};

// Función para cargar eventos desde los datos de postes
export const cargarEventos = async (params) => {
  const {
    fechaInicio,
    fechaFin,
    paginaActual,
    itemsPorPagina,
    filtroZona,
    filtroTipo
  } = params;

  try {
    console.log('📋 Generando eventos desde datos de postes...');
    
    const postesQuery = query(collection(db, 'postes'));
    const postesSnapshot = await getDocs(postesQuery);
    
    const eventos = [];
    const metricasTemp = {
      totalEventos: 0,
      eventosCriticos: 0,
      eventosControl: 0,
      eventosConexion: 0,
      eventosSensores: 0
    };
    
    postesSnapshot.forEach((doc) => {
      const data = doc.data();
      const posteId = doc.id;
      const zona = data.zona || 'Sin zona';
      
      // Filtrar por zona si es necesario
      if (filtroZona && filtroZona !== 'todas' && zona !== filtroZona) {
        return;
      }
      
      const posteNombre = data.nombre || `Poste ${posteId.split('_')[1] || posteId}`;
      const ahora = new Date();
      
      // Generar eventos sintéticos basados en el estado actual
      const eventos_generados = [];
      
      // Evento de conexión
      const isOnline = data.online === true || data.estado?.online === true;
      eventos_generados.push({
        id: `${posteId}_conexion_${Date.now()}`,
        posteId,
        posteNombre,
        zona,
        tipo: 'conexion',
        categoria: 'conexion',
        descripcion: isOnline ? 
          'Poste conectado y funcionando correctamente' :
          'Poste desconectado - Sin respuesta del dispositivo',
        timestamp: new Date(ahora.getTime() - Math.random() * 3600000).toISOString(),
        prioridad: isOnline ? 'baja' : 'critica',
        usuario: 'Sistema de Monitoreo'
      });
      
      // Evento de control LED
      const intensidad = Number(data.control?.intensidad || data.intensidadLED || 0);
      if (intensidad > 0) {
        eventos_generados.push({
          id: `${posteId}_control_${Date.now() + 1}`,
          posteId,
          posteNombre,
          zona,
          tipo: 'control',
          categoria: 'control',
          descripcion: `LED activado al ${Math.round((intensidad/255)*100)}% de intensidad`,
          timestamp: new Date(ahora.getTime() - Math.random() * 1800000).toISOString(),
          prioridad: 'baja',
          usuario: data.modoAutomatico ? 'Sistema Automático' : 'Control Manual'
        });
      }
      
      // Evento de sensores PIR
      const pirDetecciones = Number(data.sensores?.pir?.contadorHoy || 0);
      if (pirDetecciones > 0) {
        eventos_generados.push({
          id: `${posteId}_sensor_${Date.now() + 2}`,
          posteId,
          posteNombre,
          zona,
          tipo: 'sensor',
          categoria: 'sensores',
          descripcion: `Sensor PIR detectó ${pirDetecciones} movimientos hoy`,
          timestamp: new Date(ahora.getTime() - Math.random() * 7200000).toISOString(),
          prioridad: 'media',
          usuario: 'Sensor PIR'
        });
      }
      
      // Evento de configuración automática
      if (data.modoAutomatico === true || data.automatizacion?.habilitada === true) {
        eventos_generados.push({
          id: `${posteId}_config_${Date.now() + 3}`,
          posteId,
          posteNombre,
          zona,
          tipo: 'configuracion',
          categoria: 'configuracion',
          descripcion: 'Modo automático activado - Control inteligente habilitado',
          timestamp: new Date(ahora.getTime() - Math.random() * 14400000).toISOString(),
          prioridad: 'media',
          usuario: 'Sistema de Configuración'
        });
      }
      
      // Filtrar por tipo si es necesario
      eventos_generados.forEach(evento => {
        if (filtroTipo === 'todos' || evento.categoria === filtroTipo) {
          // Aplicar filtros de fecha
          const fechaEvento = new Date(evento.timestamp);
          if (fechaEvento >= fechaInicio && fechaEvento <= fechaFin) {
            eventos.push({
              ...evento,
              fecha: formatDate(evento.timestamp)
            });
            
            // Actualizar métricas
            metricasTemp.totalEventos++;
            if (evento.prioridad === 'critica') metricasTemp.eventosCriticos++;
            if (evento.categoria === 'control') metricasTemp.eventosControl++;
            if (evento.categoria === 'conexion') metricasTemp.eventosConexion++;
            if (evento.categoria === 'sensores') metricasTemp.eventosSensores++;
          }
        }
      });
    });
    
    // Ordenar por fecha descendente
    eventos.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Aplicar paginación
    const inicio = (paginaActual - 1) * itemsPorPagina;
    const eventosPaginados = eventos.slice(inicio, inicio + itemsPorPagina);
    
    return {
      eventos: eventosPaginados,
      metricas: metricasTemp,
      totalItems: eventos.length,
      ultimoDocumento: null,
      primerDocumento: null
    };
  } catch (error) {
    console.error("Error al cargar eventos:", error);
    throw error;
  }
};

// Función para cargar estadísticas
export const cargarEstadisticas = async (params) => {
  try {
    console.log('📊 Generando estadísticas...');
    
    const postesQuery = query(collection(db, 'postes'));
    const postesSnapshot = await getDocs(postesQuery);
    
    const estadisticas = [];
    const ahora = new Date();
    
    // Generar estadísticas por zona
    const estadisticasPorZona = {};
    
    postesSnapshot.forEach((doc) => {
      const data = doc.data();
      const zona = data.zona || 'Sin zona';
      
      if (!estadisticasPorZona[zona]) {
        estadisticasPorZona[zona] = {
          zona,
          totalPostes: 0,
          postesOnline: 0,
          postesEncendidos: 0,
          consumoTotal: 0,
          eficienciaPromedio: 0,
          deteccionesPIR: 0
        };
      }
      
      const isOnline = data.online === true || data.estado?.online === true;
      const intensidad = Number(data.control?.intensidad || data.intensidadLED || 0);
      const isEncendido = intensidad > 0;
      const consumo = Number(data.calculados?.potenciaActual || data.consumo || 0);
      const eficiencia = Number(data.calculados?.eficienciaHoy || data.eficiencia || 85);
      const pirDetecciones = Number(data.sensores?.pir?.contadorHoy || 0);
      
      estadisticasPorZona[zona].totalPostes++;
      if (isOnline) estadisticasPorZona[zona].postesOnline++;
      if (isEncendido) estadisticasPorZona[zona].postesEncendidos++;
      estadisticasPorZona[zona].consumoTotal += consumo;
      estadisticasPorZona[zona].eficienciaPromedio += eficiencia;
      estadisticasPorZona[zona].deteccionesPIR += pirDetecciones;
    });
    
    // Convertir a array y calcular promedios
    Object.values(estadisticasPorZona).forEach(stat => {
      if (stat.totalPostes > 0) {
        stat.eficienciaPromedio = stat.eficienciaPromedio / stat.totalPostes;
      }
      
      estadisticas.push({
        id: `stat_${stat.zona}_${Date.now()}`,
        zona: stat.zona,
        fecha: formatDate(ahora),
        totalPostes: stat.totalPostes,
        postesOnline: stat.postesOnline,
        porcentajeOnline: stat.totalPostes > 0 ? Math.round((stat.postesOnline / stat.totalPostes) * 100) : 0,
        postesEncendidos: stat.postesEncendidos,
        porcentajeEncendidos: stat.totalPostes > 0 ? Math.round((stat.postesEncendidos / stat.totalPostes) * 100) : 0,
        consumoTotal: stat.consumoTotal.toFixed(1),
        consumoPromedio: stat.totalPostes > 0 ? (stat.consumoTotal / stat.totalPostes).toFixed(1) : '0.0',
        eficienciaPromedio: stat.eficienciaPromedio.toFixed(1),
        deteccionesPIR: stat.deteccionesPIR
      });
    });
    
    // Aplicar paginación
    const inicio = (params.paginaActual - 1) * params.itemsPorPagina;
    const estadisticasPaginadas = estadisticas.slice(inicio, inicio + params.itemsPorPagina);
    
    return {
      estadisticas: estadisticasPaginadas,
      totalItems: estadisticas.length,
      ultimoDocumento: null,
      primerDocumento: null
    };
  } catch (error) {
    console.error("Error al cargar estadísticas:", error);
    throw error;
  }
};

// Función para cargar datos de consumo
export const cargarConsumos = async (params) => {
  try {
    console.log('⚡ Cargando datos de consumo...');
    
    const postesQuery = query(collection(db, 'postes'));
    const postesSnapshot = await getDocs(postesQuery);
    
    const consumos = [];
    const metricasTemp = {
      consumoTotal: 0,
      consumoPromedio: 0,
      costoTotal: 0,
      eficienciaPromedio: 0,
      ahorroEnergetico: 0
    };
    
    let totalEficiencia = 0;
    let contadorPostes = 0;
    
    postesSnapshot.forEach((doc) => {
      const data = doc.data();
      const posteId = doc.id;
      const posteNombre = data.nombre || `Poste ${posteId.split('_')[1] || posteId}`;
      const zona = data.zona || 'Sin zona';
      
      const consumoActual = Number(data.calculados?.potenciaActual || data.consumo || 0);
      const consumoHoy = Number(data.calculados?.consumoHoy || data.consumoHoy || 0);
      const costoHoy = Number(data.calculados?.costoHoy || data.costoHoy || 0);
      const eficiencia = Number(data.calculados?.eficienciaHoy || data.eficiencia || 85);
      const tiempoEncendido = Number(data.calculados?.tiempoEncendidoHoy || data.tiempoEncendido || 0);
      
      // Filtrar por zona si es necesario
      if (params.filtroZona && params.filtroZona !== 'todas' && zona !== params.filtroZona) {
        return;
      }
      
      consumos.push({
        id: `consumo_${posteId}_${Date.now()}`,
        posteId,
        posteNombre,
        zona,
        fecha: formatDate(new Date()),
        consumoActual: consumoActual.toFixed(1),
        consumoHoy: consumoHoy.toFixed(1),
        costoHoy: costoHoy.toFixed(2),
        eficiencia: eficiencia.toFixed(1),
        tiempoEncendido: `${Math.floor(tiempoEncendido / 60)}h ${tiempoEncendido % 60}m`,
        ahorroEnergetico: ((100 - eficiencia) * consumoHoy / 100).toFixed(1)
      });
      
      // Actualizar métricas
      metricasTemp.consumoTotal += consumoActual;
      metricasTemp.costoTotal += costoHoy;
      totalEficiencia += eficiencia;
      contadorPostes++;
    });
    
    // Calcular promedios
    if (contadorPostes > 0) {
      metricasTemp.consumoPromedio = metricasTemp.consumoTotal / contadorPostes;
      metricasTemp.eficienciaPromedio = totalEficiencia / contadorPostes;
      metricasTemp.ahorroEnergetico = ((100 - metricasTemp.eficienciaPromedio) * metricasTemp.consumoTotal / 100);
    }
    
    // Aplicar paginación
    const inicio = (params.paginaActual - 1) * params.itemsPorPagina;
    const consumosPaginados = consumos.slice(inicio, inicio + params.itemsPorPagina);
    
    return {
      consumos: consumosPaginados,
      metricas: metricasTemp,
      totalItems: consumos.length,
      ultimoDocumento: null,
      primerDocumento: null
    };
  } catch (error) {
    console.error("Error al cargar consumos:", error);
    throw error;
  }
};

// Función para cargar datos de sensores
export const cargarSensores = async (params) => {
  try {
    console.log('🔬 Cargando datos de sensores...');
    
    const postesQuery = query(collection(db, 'postes'));
    const postesSnapshot = await getDocs(postesQuery);
    
    const sensores = [];
    
    postesSnapshot.forEach((doc) => {
      const data = doc.data();
      const posteId = doc.id;
      const posteNombre = data.nombre || `Poste ${posteId.split('_')[1] || posteId}`;
      const zona = data.zona || 'Sin zona';
      
      // Filtrar por zona si es necesario
      if (params.filtroZona && params.filtroZona !== 'todas' && zona !== params.filtroZona) {
        return;
      }
      
      const ldrValor = Number(data.sensores?.ldr?.valor || 0);
      const ldrLux = Number(data.sensores?.ldr?.luxCalculado || 0);
      const pirDetecciones = Number(data.sensores?.pir?.contadorHoy || 0);
      const pirMovimiento = data.sensores?.pir?.movimiento === true;
      const corriente = Number(data.sensores?.acs712?.corriente || 0);
      const voltaje = Number(data.sensores?.acs712?.voltaje || 220);
      
      sensores.push({
        id: `sensor_${posteId}_${Date.now()}`,
        posteId,
        posteNombre,
        zona,
        fecha: formatDate(new Date()),
        ldrValor: ldrValor.toFixed(0),
        ldrLux: ldrLux.toFixed(1),
        ldrEstado: data.sensores?.ldr?.funcionando !== false ? 'Funcionando' : 'Error',
        pirDetecciones: pirDetecciones,
        pirMovimiento: pirMovimiento ? 'Sí' : 'No',
        pirEstado: data.sensores?.pir?.funcionando !== false ? 'Funcionando' : 'Error',
        corriente: corriente.toFixed(2),
        voltaje: voltaje.toFixed(0),
        acs712Estado: data.sensores?.acs712?.funcionando !== false ? 'Funcionando' : 'Error'
      });
    });
    
    // Aplicar paginación
    const inicio = (params.paginaActual - 1) * params.itemsPorPagina;
    const sensoresPaginados = sensores.slice(inicio, inicio + params.itemsPorPagina);
    
    return {
      sensores: sensoresPaginados,
      totalItems: sensores.length,
      ultimoDocumento: null,
      primerDocumento: null
    };
  } catch (error) {
    console.error("Error al cargar sensores:", error);
    throw error;
  }
};

// Función para cargar alertas
export const cargarAlertas = async (params) => {
  try {
    console.log('⚠️ Generando alertas desde datos de postes...');
    
    const postesQuery = query(collection(db, 'postes'));
    const postesSnapshot = await getDocs(postesQuery);
    
    const alertas = [];
    
    postesSnapshot.forEach((doc) => {
      const data = doc.data();
      const posteId = doc.id;
      const posteNombre = data.nombre || `Poste ${posteId.split('_')[1] || posteId}`;
      const zona = data.zona || 'Sin zona';
      
      // Filtrar por zona si es necesario
      if (params.filtroZona && params.filtroZona !== 'todas' && zona !== params.filtroZona) {
        return;
      }
      
      const ahora = new Date();
      const alertas_generadas = [];
      
      // Alerta por desconexión
      const isOnline = data.online === true || data.estado?.online === true;
      if (!isOnline) {
        alertas_generadas.push({
          id: `alerta_offline_${posteId}`,
          posteId,
          posteNombre,
          zona,
          tipo: 'Desconexión',
          descripcion: 'Poste no responde - Posible falla de conexión',
          prioridad: 'critica',
          estado: 'activa',
          timestamp: new Date(ahora.getTime() - Math.random() * 3600000).toISOString()
        });
      }
      
      // Alerta por consumo alto
      const consumo = Number(data.calculados?.potenciaActual || data.consumo || 0);
      if (consumo > 8) {
        alertas_generadas.push({
          id: `alerta_consumo_${posteId}`,
          posteId,
          posteNombre,
          zona,
          tipo: 'Consumo Elevado',
          descripcion: `Consumo anómalo detectado: ${consumo.toFixed(1)}W`,
          prioridad: 'alta',
          estado: 'activa',
          timestamp: new Date(ahora.getTime() - Math.random() * 1800000).toISOString()
        });
      }
      
      // Alerta por sensor PIR
      const pirDetecciones = Number(data.sensores?.pir?.contadorHoy || 0);
      if (pirDetecciones > 50) {
        alertas_generadas.push({
          id: `alerta_pir_${posteId}`,
          posteId,
          posteNombre,
          zona,
          tipo: 'Sensor PIR',
          descripcion: `Actividad inusual: ${pirDetecciones} detecciones hoy`,
          prioridad: 'media',
          estado: 'activa',
          timestamp: new Date(ahora.getTime() - Math.random() * 7200000).toISOString()
        });
      }
      
      // Alerta por eficiencia baja
      const eficiencia = Number(data.calculados?.eficienciaHoy || data.eficiencia || 85);
      if (eficiencia < 70) {
        alertas_generadas.push({
          id: `alerta_eficiencia_${posteId}`,
          posteId,
          posteNombre,
          zona,
          tipo: 'Eficiencia Baja',
          descripcion: `Eficiencia por debajo del umbral: ${eficiencia.toFixed(1)}%`,
          prioridad: 'media',
          estado: 'activa',
          timestamp: new Date(ahora.getTime() - Math.random() * 10800000).toISOString()
        });
      }

      // Alerta por sensor LDR
      const ldrLux = Number(data.sensores?.ldr?.luxCalculado || 0);
      if (ldrLux < 0 || ldrLux > 1000) {
        alertas_generadas.push({
          id: `alerta_ldr_${posteId}`,
          posteId,
          posteNombre,
          zona,
          tipo: 'Sensor LDR',
          descripcion: `Lectura anómala del sensor LDR: ${ldrLux.toFixed(1)} lux`,
          prioridad: 'baja',
          estado: 'activa',
          timestamp: new Date(ahora.getTime() - Math.random() * 14400000).toISOString()
        });
      }
      
      // Filtrar por prioridad si es necesario
      alertas_generadas.forEach(alerta => {
        if (params.filtroPrioridad === 'todas' || alerta.prioridad === params.filtroPrioridad) {
          alertas.push({
            ...alerta,
            fecha: formatDate(alerta.timestamp)
          });
        }
      });
    });
    
    // Ordenar por prioridad y fecha
    const prioridadOrden = { 'critica': 0, 'alta': 1, 'media': 2, 'baja': 3 };
    alertas.sort((a, b) => {
      const prioridadA = prioridadOrden[a.prioridad] || 4;
      const prioridadB = prioridadOrden[b.prioridad] || 4;
      if (prioridadA !== prioridadB) return prioridadA - prioridadB;
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
    
    // Aplicar paginación
    const inicio = (params.paginaActual - 1) * params.itemsPorPagina;
    const alertasPaginadas = alertas.slice(inicio, inicio + params.itemsPorPagina);
    
    return {
      alertas: alertasPaginadas,
      totalItems: alertas.length,
      ultimoDocumento: null,
      primerDocumento: null
    };
  } catch (error) {
    console.error("Error al cargar alertas:", error);
    throw error;
  }
};

// Función auxiliar para generar datos históricos simulados
export const generarDatosHistoricos = (postes, dias = 30) => {
  const historicos = [];
  const ahora = new Date();
  
  for (let i = 0; i < dias; i++) {
    const fecha = new Date(ahora.getTime() - (i * 24 * 60 * 60 * 1000));
    
    let consumoTotal = 0;
    let postesActivos = 0;
    let deteccionesTotal = 0;
    
    postes.forEach(poste => {
      const variacion = 0.8 + (Math.random() * 0.4); // Variación del 80% al 120%
      const consumoBase = parseFloat(poste.consumoActual) || 0;
      const deteccionesBase = poste.sensores?.pir || 0;
      
      consumoTotal += consumoBase * variacion;
      if (poste.estado === 'Online') postesActivos++;
      deteccionesTotal += Math.floor(deteccionesBase * variacion);
    });
    
    historicos.push({
      fecha: fecha.toLocaleDateString('es-ES'),
      consumoTotal: consumoTotal.toFixed(1),
      postesActivos,
      deteccionesTotal,
      eficienciaPromedio: (75 + Math.random() * 20).toFixed(1), // 75-95%
      alertasGeneradas: Math.floor(Math.random() * 5)
    });
  }
  
  return historicos.reverse(); // Más reciente al final
};

// Función para exportar métricas consolidadas
export const obtenerMetricasConsolidadas = async () => {
  try {
    const postesQuery = query(collection(db, 'postes'));
    const postesSnapshot = await getDocs(postesQuery);
    
    const metricas = {
      resumenGeneral: {
        totalDispositivos: 0,
        dispositivosOnline: 0,
        dispositivosEncendidos: 0,
        consumoTotalSistema: 0,
        eficienciaGlobal: 0
      },
      distribucionZonas: {},
      tendencias: {
        consumoPorHora: [],
        deteccionesPorDia: [],
        alertasPorTipo: {}
      }
    };
    
    let sumaEficiencia = 0;
    
    postesSnapshot.forEach((doc) => {
      const data = doc.data();
      const zona = data.zona || 'Sin zona';
      
      // Métricas generales
      metricas.resumenGeneral.totalDispositivos++;
      
      const isOnline = data.online === true || data.estado?.online === true;
      if (isOnline) metricas.resumenGeneral.dispositivosOnline++;
      
      const intensidad = Number(data.control?.intensidad || data.intensidadLED || 0);
      if (intensidad > 0) metricas.resumenGeneral.dispositivosEncendidos++;
      
      const consumo = Number(data.calculados?.potenciaActual || data.consumo || 0);
      metricas.resumenGeneral.consumoTotalSistema += consumo;
      
      const eficiencia = Number(data.calculados?.eficienciaHoy || data.eficiencia || 85);
      sumaEficiencia += eficiencia;
      
      // Distribución por zonas
      if (!metricas.distribucionZonas[zona]) {
        metricas.distribucionZonas[zona] = {
          total: 0,
          online: 0,
          encendidos: 0,
          consumo: 0
        };
      }
      
      metricas.distribucionZonas[zona].total++;
      if (isOnline) metricas.distribucionZonas[zona].online++;
      if (intensidad > 0) metricas.distribucionZonas[zona].encendidos++;
      metricas.distribucionZonas[zona].consumo += consumo;
    });
    
    // Calcular eficiencia global
    if (metricas.resumenGeneral.totalDispositivos > 0) {
      metricas.resumenGeneral.eficienciaGlobal = 
        (sumaEficiencia / metricas.resumenGeneral.totalDispositivos).toFixed(1);
    }
    
    return metricas;
  } catch (error) {
    console.error("Error al obtener métricas consolidadas:", error);
    throw error;
  }
};