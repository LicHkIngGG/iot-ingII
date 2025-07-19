// src/components/MonitoreoControl/components/EstadisticasPanel/EstadisticasPanel.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import './EstadisticasPanel.css';

// ===== FUNCIONES AUXILIARES (DECLARADAS PRIMERO) =====
const getEmptyStats = () => ({
  dispositivos: {
    total: 0,
    online: 0,
    offline: 0,
    encendidos: 0,
    apagados: 0,
    automatico: 0,
    manual: 0,
    activos: 0,
    deshabilitados: 0,
    conSensores: 0
  },
  consumo: {
    total: 0,
    promedio: 0,
    maximo: 0,
    minimo: 0,
    totalHoy: 0,
    costoHoy: 0,
    proyeccionMes: 0,
    eficienciaEnergetica: 0
  },
  operacion: {
    encendidosHoy: 0,
    promedioEncendidos: 0,
    maximoEncendidos: 0,
    tiempoTotalEncendido: 0,
    horasPromedioEncendido: 0,
    intensidadPromedio: 0
  },
  sensores: {
    pirDetecciones: 0,
    luxPromedio: 0,
    corrientePromedio: 0,
    sensoresFuncionando: 0,
    sensoresTotal: 0,
    porcentajeFuncionando: 0
  },
  eficiencia: {
    general: 0,
    factorUtilizacion: 0,
    ahorroEnergia: 0,
    optimizacionAutomatica: 0,
    distribucionCarga: 0
  },
  red: {
    latenciaPromedio: 0,
    timeouts: 0,
    reconexiones: 0,
    disponibilidad: 0,
    calidad: 0
  },
  zonas: {}
});

const calculateEnergyEfficiency = (stats) => {
  const idealConsumption = stats.dispositivos.total * 5; // 5W por poste ideal
  const actualConsumption = stats.consumo.total;
  return actualConsumption > 0 ? Math.min(100, (idealConsumption / actualConsumption) * 100) : 100;
};

const calculateEnergySavings = (stats, totalPostes) => {
  const maxConsumption = totalPostes * 8; // 8W máximo por poste
  const actualConsumption = stats.consumo.totalHoy;
  return Math.max(0, ((maxConsumption - actualConsumption) / maxConsumption) * 100);
};

const calculateLoadDistribution = (stats) => {
  const zonasStats = Object.values(stats.zonas);
  if (zonasStats.length === 0) return 100;
  
  const consumos = zonasStats.map(z => z.consumo);
  if (consumos.length === 0) return 100;
  
  const promedio = consumos.reduce((a, b) => a + b, 0) / consumos.length;
  if (promedio === 0) return 100;
  
  const desviacion = Math.sqrt(consumos.reduce((sum, c) => sum + Math.pow(c - promedio, 2), 0) / consumos.length);
  
  return Math.max(0, 100 - (desviacion / promedio) * 100);
};

const calculateNetworkQuality = (stats) => {
  const latencyScore = Math.max(0, 100 - (stats.red.latenciaPromedio / 10));
  const timeoutScore = Math.max(0, 100 - (stats.red.timeouts * 5));
  const reconnectionScore = Math.max(0, 100 - (stats.red.reconexiones * 2));
  
  return (latencyScore + timeoutScore + reconnectionScore) / 3;
};

const formatearNumero = (numero, decimales = 1) => {
  if (typeof numero !== 'number' || isNaN(numero)) return '0';
  
  if (numero >= 1000000) {
    return (numero / 1000000).toFixed(decimales) + 'M';
  } else if (numero >= 1000) {
    return (numero / 1000).toFixed(decimales) + 'K';
  } else {
    return numero.toFixed(decimales);
  }
};

const obtenerColorPorcentaje = (porcentaje) => {
  if (porcentaje >= 80) return '#10b981'; // Verde
  if (porcentaje >= 60) return '#f59e0b'; // Amarillo
  if (porcentaje >= 40) return '#f97316'; // Naranja
  return '#ef4444'; // Rojo
};

const obtenerClasePorcentaje = (porcentaje) => {
  if (porcentaje >= 80) return 'excelente';
  if (porcentaje >= 60) return 'bueno';
  if (porcentaje >= 40) return 'regular';
  return 'malo';
};

// ===== COMPONENTE PRINCIPAL =====
const EstadisticasPanel = ({ 
  filtroZona = null 
}) => {
  // ===== ESTADOS PRINCIPALES =====
  const [periodoEstadisticas, setPeriodoEstadisticas] = useState('hoy');
  const [tipoGrafico, setTipoGrafico] = useState('consumo');
  const [vistaExpandida, setVistaExpandida] = useState(false);
  const [cargandoEstadisticas, setCargandoEstadisticas] = useState(true);
  const [postesData, setPostesData] = useState([]);
  const [error, setError] = useState(null);

  // ===== CARGAR DATOS DE FIREBASE =====
// ===== CARGAR DATOS DE FIREBASE (FUNCIÓN CORREGIDA) =====
useEffect(() => {
  setCargandoEstadisticas(true);
  setError(null);

  const unsubscribe = onSnapshot(
    collection(db, 'postes'),
    (snapshot) => {
      try {
        const postesArray = [];
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          const posteId = doc.id;
          
          console.log('Datos raw de Firebase para', posteId, ':', data);
          
          // Detectar estado online - revisar múltiples campos posibles
          const isOnline = data.online === true || 
                          data.estado?.online === true || 
                          data.conectado === true ||
                          data.activo === true ||
                          (data.ultimaConexion && 
                           new Date() - new Date(data.ultimaConexion) < 300000); // 5 minutos
          
          // Detectar estado encendido - revisar múltiples campos posibles
          const isEncendido = data.encendido === true ||
                             data.estado?.encendido === true ||
                             data.ledEncendido === true ||
                             data.ledState === true ||
                             data.ledStatus === 'ON' ||
                             (data.intensidadLED && data.intensidadLED > 0) ||
                             (data.intensidad && data.intensidad > 0) ||
                             data.luz === true;
          
          // Extraer información básica del poste
          const posteInfo = {
            id: posteId,
            nombre: data.nombre || `Poste ${posteId.split('_')[1] || posteId}`,
            ubicacion: data.ubicacion || 'Ubicación no especificada',
            zona: data.zona || 'Villa Adela Norte',
            
            // Estado actual del dispositivo - CORREGIDO
            estado: {
              online: isOnline,
              encendido: isEncendido,
              activo: data.activo !== false,
              deshabilitado: data.deshabilitado === true,
              ultimaConexion: data.ultimaConexion || new Date().toISOString()
            },
            
            // Datos calculados y métricas
            calculados: {
              potenciaActual: Number(data.potenciaActual || data.consumoActual || data.potencia || 0),
              consumoHoy: Number(data.consumoHoy || data.consumo || 0),
              costoHoy: Number(data.costoHoy || data.costo || 0),
              encendidosHoy: Number(data.encendidosHoy || data.contadorEncendidos || 0),
              tiempoEncendidoHoy: Number(data.tiempoEncendidoHoy || data.tiempoEncendido || 0),
              intensidadLED: Number(data.intensidadLED || data.intensidad || data.brillo || 0),
              eficienciaHoy: Number(data.eficienciaHoy || 85),
              voltaje: Number(data.voltaje || 220),
              corriente: Number(data.corriente || 0)
            },
            
            // Sensores - mejorada la detección
            sensores: {
              ldr: {
                funcionando: data.sensores?.ldr?.funcionando !== false,
                valor: Number(data.sensores?.ldr?.valor || data.ldr || data.valorLDR || 500),
                luxCalculado: Number(data.sensores?.ldr?.luxCalculado || data.luxCalculado || data.lux || 200)
              },
              pir: {
                funcionando: data.sensores?.pir?.funcionando !== false,
                detecciones: Number(data.sensores?.pir?.detecciones || data.pirDetecciones || data.movimiento || 0),
                contadorHoy: Number(data.sensores?.pir?.contadorHoy || data.pirContadorHoy || data.deteccionesHoy || 0)
              },
              acs712: {
                funcionando: data.sensores?.acs712?.funcionando !== false,
                corriente: Number(data.sensores?.acs712?.corriente || data.corriente || data.amperaje || 0),
                voltaje: Number(data.sensores?.acs712?.voltaje || data.voltaje || 220)
              }
            },
            
            // Automatización
            automatizacion: {
              habilitada: data.automatizacion?.habilitada === true || 
                         data.modoAutomatico === true || 
                         data.autoMode === true,
              programaciones: data.automatizacion?.programaciones || [],
              sensoresActivos: data.automatizacion?.sensoresActivos !== false
            },
            
            // Red y conectividad
            red: {
              ip: data.red?.ip || data.ip || '192.168.1.100',
              mac: data.red?.mac || data.mac || '00:00:00:00:00:00',
              rssi: Number(data.red?.rssi || data.rssi || data.wifi || -50),
              latencia: Number(data.red?.latencia || data.latencia || data.ping || Math.random() * 100),
              timeouts: Number(data.red?.timeouts || data.timeouts || 0),
              reconexiones: Number(data.red?.reconexiones || data.reconexiones || 0)
            },
            
            // Hardware
            hardware: {
              version: data.hardware?.version || data.version || '4.0',
              firmware: data.hardware?.firmware || data.firmware || '4.0.1',
              uptime: Number(data.hardware?.uptime || data.uptime || 0),
              freeHeap: Number(data.hardware?.freeHeap || data.freeHeap || 50000),
              temperatura: Number(data.hardware?.temperatura || data.temperatura || data.temp || 25)
            },
            
            // Alertas
            alertas: {
              habilitadas: data.alertas?.habilitadas !== false,
              tipos: {
                consumoAnormal: data.alertas?.tipos?.consumoAnormal !== false,
                desconexion: data.alertas?.tipos?.desconexion !== false,
                sensorFalla: data.alertas?.tipos?.sensorFalla !== false,
                timeoutHTTP: data.alertas?.tipos?.timeoutHTTP !== false,
                voltajeBajo: data.alertas?.tipos?.voltajeBajo !== false
              },
              umbrales: {
                consumoMaximo: Number(data.alertas?.umbrales?.consumoMaximo || 400),
                tiempoDesconexion: Number(data.alertas?.umbrales?.tiempoDesconexion || 300),
                timeoutHTTP: Number(data.alertas?.umbrales?.timeoutHTTP || 10000),
                voltajeMinimo: Number(data.alertas?.umbrales?.voltajeMinimo || 200)
              }
            },
            
            // Timestamp de los datos
            timestamp: data.timestamp || new Date().toISOString(),
            ultimaActualizacion: data.ultimaActualizacion || new Date().toISOString()
          };
          
          console.log('Poste procesado:', {
            id: posteId,
            online: posteInfo.estado.online,
            encendido: posteInfo.estado.encendido,
            intensidad: posteInfo.calculados.intensidadLED
          });
          
          postesArray.push(posteInfo);
        });
        
        console.log('Total de postes cargados:', postesArray.length);
        console.log('Estados de postes:', postesArray.map(p => ({
          id: p.id,
          online: p.estado.online,
          encendido: p.estado.encendido
        })));
        
        setPostesData(postesArray);
        setCargandoEstadisticas(false);
        
      } catch (err) {
        console.error('Error procesando datos de Firebase:', err);
        setError('Error al procesar los datos');
        setCargandoEstadisticas(false);
      }
    },
    (err) => {
      console.error('Error conectando a Firebase:', err);
      setError('Error de conexión con Firebase');
      setCargandoEstadisticas(false);
    }
  );

  return () => unsubscribe();
}, []);

  // ===== FILTRAR POSTES POR ZONA =====
  const postesFiltrados = useMemo(() => {
    if (!filtroZona || filtroZona === 'todas') {
      return postesData;
    }
    return postesData.filter(poste => poste.zona === filtroZona);
  }, [postesData, filtroZona]);

  // ===== CÁLCULO DE ESTADÍSTICAS OPTIMIZADO =====
const estadisticasCalculadas = useMemo(() => {
  console.log('Calculando estadísticas para:', postesFiltrados.length, 'postes');
  
  if (postesFiltrados.length === 0) return getEmptyStats();

  const stats = {
    dispositivos: {
      total: postesFiltrados.length,
      online: 0,
      offline: 0,
      encendidos: 0,
      apagados: 0,
      automatico: 0,
      manual: 0,
      activos: 0,
      deshabilitados: 0,
      conSensores: 0
    },
    consumo: {
      total: 0,
      promedio: 0,
      maximo: 0,
      minimo: Infinity,
      totalHoy: 0,
      costoHoy: 0,
      proyeccionMes: 0,
      eficienciaEnergetica: 0
    },
    operacion: {
      encendidosHoy: 0,
      promedioEncendidos: 0,
      maximoEncendidos: 0,
      tiempoTotalEncendido: 0,
      horasPromedioEncendido: 0,
      intensidadPromedio: 0
    },
    sensores: {
      pirDetecciones: 0,
      luxPromedio: 0,
      corrientePromedio: 0,
      sensoresFuncionando: 0,
      sensoresTotal: 0,
      porcentajeFuncionando: 0
    },
    eficiencia: {
      general: 0,
      factorUtilizacion: 0,
      ahorroEnergia: 0,
      optimizacionAutomatica: 0,
      distribucionCarga: 0
    },
    red: {
      latenciaPromedio: 0,
      timeouts: 0,
      reconexiones: 0,
      disponibilidad: 0,
      calidad: 0
    },
    zonas: {}
  };

  // Procesar cada poste
  postesFiltrados.forEach(poste => {
    console.log(`Procesando poste ${poste.id}:`, {
      online: poste.estado.online,
      encendido: poste.estado.encendido,
      automatico: poste.automatizacion.habilitada
    });

    // Agregar zona si no existe
    if (poste.zona && !stats.zonas[poste.zona]) {
      stats.zonas[poste.zona] = {
        total: 0,
        online: 0,
        encendidos: 0,
        consumo: 0
      };
    }

    // Estadísticas de dispositivos - CORREGIDO
    if (poste.estado.online === true) {
      stats.dispositivos.online++;
      if (poste.zona) stats.zonas[poste.zona].online++;
      console.log(`Poste ${poste.id} contado como ONLINE`);
    } else {
      stats.dispositivos.offline++;
      console.log(`Poste ${poste.id} contado como OFFLINE`);
    }

    if (poste.estado.encendido === true) {
      stats.dispositivos.encendidos++;
      if (poste.zona) stats.zonas[poste.zona].encendidos++;
      console.log(`Poste ${poste.id} contado como ENCENDIDO`);
    } else {
      stats.dispositivos.apagados++;
      console.log(`Poste ${poste.id} contado como APAGADO`);
    }

    if (poste.automatizacion.habilitada === true) {
      stats.dispositivos.automatico++;
      console.log(`Poste ${poste.id} contado como AUTOMÁTICO`);
    } else {
      stats.dispositivos.manual++;
      console.log(`Poste ${poste.id} contado como MANUAL`);
    }

    if (poste.estado.activo === true && poste.estado.deshabilitado !== true) {
      stats.dispositivos.activos++;
    } else {
      stats.dispositivos.deshabilitados++;
    }

    // Contar sensores activos en el poste
    let sensoresEnPoste = 0;
    let sensoresFuncionandoEnPoste = 0;

    if (poste.sensores.ldr) {
      sensoresEnPoste++;
      if (poste.sensores.ldr.funcionando) sensoresFuncionandoEnPoste++;
    }
    if (poste.sensores.pir) {
      sensoresEnPoste++;
      if (poste.sensores.pir.funcionando) sensoresFuncionandoEnPoste++;
    }
    if (poste.sensores.acs712) {
      sensoresEnPoste++;
      if (poste.sensores.acs712.funcionando) sensoresFuncionandoEnPoste++;
    }

    if (sensoresEnPoste > 0) stats.dispositivos.conSensores++;
    stats.sensores.sensoresTotal += sensoresEnPoste;
    stats.sensores.sensoresFuncionando += sensoresFuncionandoEnPoste;

    // Estadísticas de consumo
    const potenciaActual = poste.calculados.potenciaActual || 0;
    const consumoHoy = poste.calculados.consumoHoy || 0;
    const costoHoy = poste.calculados.costoHoy || 0;

    stats.consumo.total += potenciaActual;
    stats.consumo.totalHoy += consumoHoy;
    stats.consumo.costoHoy += costoHoy;
    
    if (poste.zona) stats.zonas[poste.zona].consumo += potenciaActual;

    if (potenciaActual > stats.consumo.maximo) {
      stats.consumo.maximo = potenciaActual;
    }
    if (potenciaActual < stats.consumo.minimo && potenciaActual > 0) {
      stats.consumo.minimo = potenciaActual;
    }

    // Estadísticas de operación
    const encendidosHoy = poste.calculados.encendidosHoy || 0;
    const tiempoEncendidoHoy = poste.calculados.tiempoEncendidoHoy || 0;
    const intensidadLED = poste.calculados.intensidadLED || 0;

    stats.operacion.encendidosHoy += encendidosHoy;
    stats.operacion.tiempoTotalEncendido += tiempoEncendidoHoy;
    stats.operacion.intensidadPromedio += intensidadLED;

    if (encendidosHoy > stats.operacion.maximoEncendidos) {
      stats.operacion.maximoEncendidos = encendidosHoy;
    }

    // Estadísticas de sensores
    if (poste.sensores.pir?.contadorHoy) {
      stats.sensores.pirDetecciones += poste.sensores.pir.contadorHoy;
    }
    if (poste.sensores.ldr?.luxCalculado) {
      stats.sensores.luxPromedio += poste.sensores.ldr.luxCalculado;
    }
    if (poste.sensores.acs712?.corriente) {
      stats.sensores.corrientePromedio += poste.sensores.acs712.corriente;
    }

    // Estadísticas de eficiencia
    const eficienciaPoste = poste.calculados.eficienciaHoy || 0;
    stats.eficiencia.general += eficienciaPoste;

    // Estadísticas de red
    if (poste.red.latencia) stats.red.latenciaPromedio += poste.red.latencia;
    if (poste.red.timeouts) stats.red.timeouts += poste.red.timeouts;
    if (poste.red.reconexiones) stats.red.reconexiones += poste.red.reconexiones;

    // Actualizar totales por zona
    if (poste.zona) {
      stats.zonas[poste.zona].total++;
    }
  });

  // Calcular promedios y valores finales
  const totalPostes = postesFiltrados.length;
  if (totalPostes > 0) {
    // Consumo
    stats.consumo.promedio = stats.consumo.total / totalPostes;
    stats.consumo.proyeccionMes = stats.consumo.totalHoy * 30;
    stats.consumo.eficienciaEnergetica = calculateEnergyEfficiency(stats);

    // Operación
    stats.operacion.promedioEncendidos = stats.operacion.encendidosHoy / totalPostes;
    stats.operacion.horasPromedioEncendido = stats.operacion.tiempoTotalEncendido / totalPostes / 60;
    stats.operacion.intensidadPromedio = stats.operacion.intensidadPromedio / totalPostes;

    // Sensores
    if (stats.sensores.sensoresTotal > 0) {
      stats.sensores.luxPromedio = stats.sensores.luxPromedio / totalPostes;
      stats.sensores.corrientePromedio = stats.sensores.corrientePromedio / totalPostes;
      stats.sensores.porcentajeFuncionando = (stats.sensores.sensoresFuncionando / stats.sensores.sensoresTotal) * 100;
    }

    // Eficiencia
    stats.eficiencia.general = stats.eficiencia.general / totalPostes;
    stats.eficiencia.factorUtilizacion = (stats.dispositivos.encendidos / totalPostes) * 100;
    stats.eficiencia.ahorroEnergia = calculateEnergySavings(stats, totalPostes);
    stats.eficiencia.optimizacionAutomatica = (stats.dispositivos.automatico / totalPostes) * 100;
    stats.eficiencia.distribucionCarga = calculateLoadDistribution(stats);

    // Red
    stats.red.latenciaPromedio = stats.red.latenciaPromedio / totalPostes;
    stats.red.disponibilidad = (stats.dispositivos.online / totalPostes) * 100;
    stats.red.calidad = calculateNetworkQuality(stats);
  }

  // Corregir valor mínimo
  if (stats.consumo.minimo === Infinity) stats.consumo.minimo = 0;

  console.log('Estadísticas finales calculadas:', {
    total: stats.dispositivos.total,
    online: stats.dispositivos.online,
    encendidos: stats.dispositivos.encendidos,
    automatico: stats.dispositivos.automatico
  });

  return stats;
}, [postesFiltrados, periodoEstadisticas]);

  // ===== COMPONENTES DE RENDERIZADO =====
  const EstadisticaCard = ({ icono, valor, total, label, porcentaje, destacado = false, tooltip }) => (
    <div className={`estadistica-card ${destacado ? 'destacado' : ''}`} title={tooltip}>
      <div className="estadistica-icono">{icono}</div>
      <div className="estadistica-contenido">
        <div className="estadistica-valores">
          <span className="estadistica-numero">{valor}</span>
          {total && <span className="estadistica-total">/{total}</span>}
        </div>
        <div className="estadistica-label">{label}</div>
        {porcentaje !== undefined && (
          <div className={`estadistica-porcentaje ${obtenerClasePorcentaje(porcentaje)}`}>
            {Math.round(porcentaje)}%
          </div>
        )}
      </div>
    </div>
  );

  const CirculoProgreso = ({ porcentaje, titulo, valor, unidad, color }) => (
    <div className="circulo-progreso">
      <svg className="circulo-svg" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="45"
          stroke="#e5e7eb"
          strokeWidth="6"
          fill="transparent"
        />
        <circle
          cx="50"
          cy="50"
          r="45"
          stroke={color || obtenerColorPorcentaje(porcentaje)}
          strokeWidth="6"
          fill="transparent"
          strokeDasharray={`${2 * Math.PI * 45}`}
          strokeDashoffset={`${2 * Math.PI * 45 * (1 - porcentaje / 100)}`}
          transform="rotate(-90 50 50)"
          className="circulo-progreso-fill"
        />
      </svg>
      <div className="circulo-contenido">
        <div className="circulo-valor">{valor}{unidad}</div>
        <div className="circulo-titulo">{titulo}</div>
      </div>
    </div>
  );

  const BarraComparativa = ({ postes, tipoGrafico }) => {
    const datos = postes.map(poste => {
      return {
        id: poste.id,
        nombre: poste.nombre.replace(/^Poste\s+/i, ''),
        consumo: poste.calculados.consumoHoy || 0,
        encendidos: poste.calculados.encendidosHoy || 0,
        eficiencia: poste.calculados.eficienciaHoy || 0,
        intensidad: poste.calculados.intensidadLED || 0,
        online: poste.estado.online || false
      };
    });

    const valorMaximo = Math.max(...datos.map(d => {
      switch (tipoGrafico) {
        case 'consumo': return d.consumo;
        case 'encendidos': return d.encendidos;
        case 'eficiencia': return d.eficiencia;
        case 'intensidad': return d.intensidad;
        default: return d.consumo;
      }
    })) || 1;

    const obtenerConfig = () => {
      switch (tipoGrafico) {
        case 'consumo':
          return { unidad: 'kWh', color: '#ef4444', decimales: 2 };
        case 'encendidos':
          return { unidad: '', color: '#f59e0b', decimales: 0 };
        case 'eficiencia':
          return { unidad: '%', color: '#10b981', decimales: 1 };
        case 'intensidad':
          return { unidad: '', color: '#8b5cf6', decimales: 0 };
        default:
          return { unidad: '', color: '#6b7280', decimales: 1 };
      }
    };

    const config = obtenerConfig();

    return (
      <div className="barras-comparativas">
        {datos.map((poste) => {
          const valor = poste[tipoGrafico] || 0;
          const porcentaje = valorMaximo > 0 ? (valor / valorMaximo) * 100 : 0;

          return (
            <div key={poste.id} className={`barra-item ${!poste.online ? 'offline' : ''}`}>
              <div className="barra-info">
                <span className="barra-nombre" title={poste.nombre}>
                  {poste.nombre}
                </span>
                <span className={`barra-estado ${poste.online ? 'online' : 'offline'}`}>
                  {poste.online ? '🟢' : '🔴'}
                </span>
              </div>
              <div className="barra-contenedor">
                <div
                  className="barra-progreso"
                  style={{
                    width: `${porcentaje}%`,
                    backgroundColor: config.color
                  }}
                >
                  <div className="barra-brillo"></div>
                </div>
              </div>
              <div className="barra-valor">
                {valor.toFixed(config.decimales)}{config.unidad}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ===== RENDER PRINCIPAL =====
  if (error) {
    return (
      <div className="estadisticas-panel">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <div className="error-message">
            <h3>Error al cargar estadísticas</h3>
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
    <div className="estadisticas-panel">
      {/* Header del panel */}
      <div className="panel-header">
        <div className="header-titulo">
          <h3>📊 Panel de Estadísticas</h3>
          <p>Datos en tiempo real desde Firebase • {postesFiltrados.length} dispositivos</p>
        </div>
        
        <div className="header-controles">
          <div className="periodo-selector">
            <button
              className={`btn-periodo ${periodoEstadisticas === 'hoy' ? 'activo' : ''}`}
              onClick={() => setPeriodoEstadisticas('hoy')}
            >
              <span className="btn-icono">📅</span>
              Hoy
            </button>
            <button
              className={`btn-periodo ${periodoEstadisticas === 'semana' ? 'activo' : ''}`}
              onClick={() => setPeriodoEstadisticas('semana')}
            >
              <span className="btn-icono">📈</span>
              Semana
            </button>
            <button
              className={`btn-periodo ${periodoEstadisticas === 'mes' ? 'activo' : ''}`}
              onClick={() => setPeriodoEstadisticas('mes')}
            >
              <span className="btn-icono">📊</span>
              Mes
            </button>
          </div>

          <button
            className={`btn-expandir ${vistaExpandida ? 'activo' : ''}`}
            onClick={() => setVistaExpandida(!vistaExpandida)}
            title={vistaExpandida ? 'Vista compacta' : 'Vista expandida'}
          >
            {vistaExpandida ? '🔽' : '🔼'}
          </button>
        </div>
      </div>

      {/* Indicador de carga */}
      {cargandoEstadisticas && (
        <div className="loading-container">
          <div className="loading-spinner">🔄</div>
          <span>Cargando datos desde Firebase...</span>
        </div>
      )}

      {/* Resumen rápido */}
      <div className="resumen-rapido">
        <EstadisticaCard
          icono="📱"
          valor={estadisticasCalculadas.dispositivos.online}
          total={estadisticasCalculadas.dispositivos.total}
          label="Dispositivos Online"
          porcentaje={estadisticasCalculadas.red.disponibilidad}
          destacado={true}
        />
        <EstadisticaCard
          icono="💡"
          valor={estadisticasCalculadas.dispositivos.encendidos}
          total={estadisticasCalculadas.dispositivos.total}
          label="Dispositivos Encendidos"
          porcentaje={estadisticasCalculadas.eficiencia.factorUtilizacion}
        />
        <EstadisticaCard
          icono="⚡"
          valor={formatearNumero(estadisticasCalculadas.consumo.totalHoy, 2)}
          label="Consumo Total Hoy (kWh)"
          destacado={true}
        />
        <EstadisticaCard
          icono="💰"
          valor={`Bs. ${formatearNumero(estadisticasCalculadas.consumo.costoHoy, 2)}`}
          label="Costo Hoy"
        />
        <EstadisticaCard
          icono="🔬"
          valor={estadisticasCalculadas.sensores.sensoresFuncionando}
          total={estadisticasCalculadas.sensores.sensoresTotal}
          label="Sensores Funcionando"
          porcentaje={estadisticasCalculadas.sensores.porcentajeFuncionando}
        />
      </div>

      {/* Métricas de eficiencia */}
      <div className="metricas-eficiencia">
        <h4>📈 Métricas de Eficiencia</h4>
        <div className="eficiencia-grid">
          <CirculoProgreso
            porcentaje={estadisticasCalculadas.eficiencia.general}
            titulo="Eficiencia General"
            valor={Math.round(estadisticasCalculadas.eficiencia.general)}
            unidad="%"
          />
          <CirculoProgreso
            porcentaje={estadisticasCalculadas.eficiencia.ahorroEnergia}
            titulo="Ahorro Energético"
            valor={Math.round(estadisticasCalculadas.eficiencia.ahorroEnergia)}
            unidad="%"
            color="#10b981"
          />
          <CirculoProgreso
            porcentaje={estadisticasCalculadas.eficiencia.optimizacionAutomatica}
            titulo="Automatización"
            valor={Math.round(estadisticasCalculadas.eficiencia.optimizacionAutomatica)}
            unidad="%"
            color="#8b5cf6"
          />
          <CirculoProgreso
            porcentaje={estadisticasCalculadas.red.calidad}
            titulo="Calidad de Red"
            valor={Math.round(estadisticasCalculadas.red.calidad)}
            unidad="%"
            color="#06b6d4"
          />
        </div>
      </div>

      {/* Vista expandida con más detalles */}
      {vistaExpandida && (
        <div className="vista-expandida">
          {/* Estadísticas detalladas */}
          <div className="estadisticas-detalladas">
            {/* Consumo detallado */}
            <div className="seccion-detalle">
              <h4>⚡ Consumo Energético Detallado</h4>
              <div className="detalles-grid">
                <div className="detalle-item">
                  <span className="detalle-label">Promedio por dispositivo:</span>
                  <span className="detalle-valor">{formatearNumero(estadisticasCalculadas.consumo.promedio, 1)}W</span>
                </div>
                <div className="detalle-item">
                  <span className="detalle-label">Consumo máximo:</span>
                  <span className="detalle-valor">{formatearNumero(estadisticasCalculadas.consumo.maximo, 1)}W</span>
                </div>
                <div className="detalle-item">
                  <span className="detalle-label">Consumo mínimo:</span>
                  <span className="detalle-valor">{formatearNumero(estadisticasCalculadas.consumo.minimo, 1)}W</span>
                </div>
                <div className="detalle-item">
                  <span className="detalle-label">Proyección mensual:</span>
                  <span className="detalle-valor">{formatearNumero(estadisticasCalculadas.consumo.proyeccionMes, 1)}kWh</span>
                </div>
              </div>
            </div>

            {/* Operación detallada */}
            <div className="seccion-detalle">
              <h4>🔄 Estadísticas de Operación</h4>
              <div className="detalles-grid">
                <div className="detalle-item">
                  <span className="detalle-label">Encendidos totales hoy:</span>
                  <span className="detalle-valor">{estadisticasCalculadas.operacion.encendidosHoy}</span>
                </div>
                <div className="detalle-item">
                  <span className="detalle-label">Promedio por dispositivo:</span>
                  <span className="detalle-valor">{formatearNumero(estadisticasCalculadas.operacion.promedioEncendidos, 1)}</span>
                </div>
                <div className="detalle-item">
                  <span className="detalle-label">Tiempo promedio encendido:</span>
                  <span className="detalle-valor">{formatearNumero(estadisticasCalculadas.operacion.horasPromedioEncendido, 1)}h</span>
                </div>
                <div className="detalle-item">
                  <span className="detalle-label">Intensidad promedio:</span>
                  <span className="detalle-valor">{Math.round(estadisticasCalculadas.operacion.intensidadPromedio)}/255</span>
                </div>
              </div>
            </div>

            {/* Sensores detallados */}
            <div className="seccion-detalle">
              <h4>🔬 Estadísticas de Sensores</h4>
              <div className="detalles-grid">
                <div className="detalle-item">
                  <span className="detalle-label">Detecciones PIR hoy:</span>
                  <span className="detalle-valor">{estadisticasCalculadas.sensores.pirDetecciones}</span>
                </div>
                <div className="detalle-item">
                  <span className="detalle-label">Luminosidad promedio:</span>
                  <span className="detalle-valor">{formatearNumero(estadisticasCalculadas.sensores.luxPromedio, 1)} lux</span>
                </div>
                <div className="detalle-item">
                  <span className="detalle-label">Corriente promedio:</span>
                  <span className="detalle-valor">{formatearNumero(estadisticasCalculadas.sensores.corrientePromedio, 2)}A</span>
                </div>
                <div className="detalle-item">
                  <span className="detalle-label">Dispositivos con sensores:</span>
                  <span className="detalle-valor">{estadisticasCalculadas.dispositivos.conSensores}/{estadisticasCalculadas.dispositivos.total}</span>
                </div>
              </div>
            </div>

            {/* Red detallada */}
            <div className="seccion-detalle">
              <h4>🌐 Estadísticas de Red</h4>
              <div className="detalles-grid">
                <div className="detalle-item">
                  <span className="detalle-label">Latencia promedio:</span>
                  <span className="detalle-valor">{Math.round(estadisticasCalculadas.red.latenciaPromedio)}ms</span>
                </div>
                <div className="detalle-item">
                  <span className="detalle-label">Timeouts registrados:</span>
                  <span className="detalle-valor">{estadisticasCalculadas.red.timeouts}</span>
                </div>
                <div className="detalle-item">
                  <span className="detalle-label">Reconexiones:</span>
                  <span className="detalle-valor">{estadisticasCalculadas.red.reconexiones}</span>
                </div>
                <div className="detalle-item">
                  <span className="detalle-label">Disponibilidad de red:</span>
                  <span className="detalle-valor">{formatearNumero(estadisticasCalculadas.red.disponibilidad, 1)}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Estadísticas por zona */}
          {Object.keys(estadisticasCalculadas.zonas).length > 0 && (
            <div className="estadisticas-zonas">
              <h4>📍 Estadísticas por Zona</h4>
              <div className="zonas-grid">
                {Object.entries(estadisticasCalculadas.zonas).map(([zona, datos]) => (
                  <div key={zona} className="zona-card">
                    <div className="zona-header">
                      <h5>📍 {zona}</h5>
                      <span className="zona-total">{datos.total} dispositivos</span>
                    </div>
                    <div className="zona-stats">
                      <div className="zona-stat">
                        <span className="zona-stat-label">Online:</span>
                        <span className="zona-stat-valor">{datos.online}/{datos.total}</span>
                        <span className="zona-stat-porcentaje">
                          ({Math.round((datos.online / datos.total) * 100)}%)
                        </span>
                      </div>
                      <div className="zona-stat">
                        <span className="zona-stat-label">Encendidos:</span>
                        <span className="zona-stat-valor">{datos.encendidos}/{datos.total}</span>
                        <span className="zona-stat-porcentaje">
                          ({Math.round((datos.encendidos / datos.total) * 100)}%)
                        </span>
                      </div>
                      <div className="zona-stat">
                        <span className="zona-stat-label">Consumo:</span>
                        <span className="zona-stat-valor">{formatearNumero(datos.consumo, 1)}W</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Información de los postes reales */}
          <div className="postes-info">
            <h4>📋 Dispositivos Detectados desde Firebase</h4>
            <div className="postes-lista">
              {postesData.slice(0, 5).map(poste => (
                <div key={poste.id} className="poste-info-card">
                  <div className="poste-info-header">
                    <span className="poste-info-nombre">{poste.nombre}</span>
                    <span className={`poste-info-estado ${poste.estado.online ? 'online' : 'offline'}`}>
                      {poste.estado.online ? '🟢 Online' : '🔴 Offline'}
                    </span>
                  </div>
                  <div className="poste-info-datos">
                    <span className="poste-info-id">ID: {poste.id}</span>
                    <span className="poste-info-ip">IP: {poste.red.ip}</span>
                    <span className="poste-info-zona">Zona: {poste.zona}</span>
                  </div>
                </div>
              ))}
              {postesData.length > 5 && (
                <div className="mas-dispositivos">
                  ... y {postesData.length - 5} dispositivos más
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Gráfico comparativo */}
      <div className="grafico-comparativo">
        <div className="grafico-header">
          <h4>📊 Comparativo por Dispositivo</h4>
          <div className="grafico-controles">
            <button
              className={`btn-grafico ${tipoGrafico === 'consumo' ? 'activo' : ''}`}
              onClick={() => setTipoGrafico('consumo')}
            >
              <span className="btn-icono">⚡</span>
              Consumo
            </button>
            <button
              className={`btn-grafico ${tipoGrafico === 'encendidos' ? 'activo' : ''}`}
              onClick={() => setTipoGrafico('encendidos')}
            >
              <span className="btn-icono">🔄</span>
              Encendidos
            </button>
            <button
              className={`btn-grafico ${tipoGrafico === 'eficiencia' ? 'activo' : ''}`}
              onClick={() => setTipoGrafico('eficiencia')}
            >
              <span className="btn-icono">📈</span>
              Eficiencia
            </button>
            <button
              className={`btn-grafico ${tipoGrafico === 'intensidad' ? 'activo' : ''}`}
              onClick={() => setTipoGrafico('intensidad')}
            >
              <span className="btn-icono">💡</span>
              Intensidad
            </button>
          </div>
        </div>
        
        {postesFiltrados.length > 0 ? (
          <BarraComparativa postes={postesFiltrados} tipoGrafico={tipoGrafico} />
        ) : (
          <div className="sin-datos">
            <div className="sin-datos-icono">📊</div>
            <p>No hay datos disponibles para mostrar</p>
          </div>
        )}
      </div>

      {/* Footer informativo */}
      <div className="panel-footer">
        <div className="footer-info">
          <div className="info-item">
            <span className="info-icono">📍</span>
            <span className="info-texto">
              {filtroZona ? `Zona: ${filtroZona}` : 'Todas las zonas'} • 
              {postesFiltrados.length} dispositivos monitoreados
            </span>
          </div>
          
          <div className="info-item">
            <span className="info-icono">🕐</span>
            <span className="info-texto">
              Actualizado: {new Date().toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              })}
            </span>
          </div>
          
          <div className="info-item">
            <span className="info-icono">🔥</span>
            <span className="info-texto">
              Firebase: Conectado • Tiempo real: Activo
            </span>
          </div>

          <div className="info-item">
            <span className="info-icono">📊</span>
            <span className="info-texto">
              Período: {periodoEstadisticas.charAt(0).toUpperCase() + periodoEstadisticas.slice(1)} • 
              Calidad de datos: {Math.round(estadisticasCalculadas.red.calidad)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EstadisticasPanel;