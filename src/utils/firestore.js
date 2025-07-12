// src/utils/firestore.js
import { db } from './firebase';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  onSnapshot, 
  serverTimestamp,
  collection,
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore';

export class FirestoreManager {
  constructor() {
    this.listeners = new Map();
  }

  // ========== MÉTODOS DE VERIFICACIÓN ==========
  
  // Verificar si existe documento
  async checkPosteExists(posteId) {
    try {
      const posteRef = doc(db, 'postes', posteId);
      const docSnap = await getDoc(posteRef);
      const exists = docSnap.exists();
      console.log(`🔍 Verificando ${posteId}: ${exists ? 'Existe' : 'No existe'}`);
      return exists;
    } catch (error) {
      console.error('❌ Error verificando documento:', error);
      return false;
    }
  }

  // ========== MÉTODOS DE CREACIÓN ==========
  
  // Crear documento inicial del poste
  async createInitialPoste(posteId) {
    try {
      const posteRef = doc(db, 'postes', posteId);
      
      const initialData = {
        // IDENTIFICACIÓN Y UBICACIÓN
        id: posteId,
        nombre: `Poste Villa Adela Norte ${posteId}`,
        ubicacion: 'Calle Murillo 456, Villa Adela',
        zona: 'Norte',
        coordenadas: {
          lat: -16.501234,
          lng: -68.151234
        },
        
        // CONFIGURACIÓN DE HARDWARE
        hardware: {
          modelo: 'ESP32-WROOM-32',
          numeroSerie: `ESP32-${posteId}`,
          tipoLED: '60W',
          versionFirmware: '1.0.0',
          fechaInstalacion: serverTimestamp()
        },
        
        // CONFIGURACIÓN DE RED
        red: {
          ip: '192.168.1.101',
          puerto: 81,
          gateway: '192.168.1.1',
          subnet: '255.255.255.0',
          dns: '8.8.8.8',
          timeout: 5000,
          intervaloEnvio: 30,
          mac: 'AA:BB:CC:DD:EE:01'
        },
        
        // ESTADOS EN TIEMPO REAL
        estado: {
          online: false,
          encendido: false,
          ultimaActualizacion: serverTimestamp(),
          ultimaConexion: serverTimestamp(),
          uptime: 0,
          reconexiones: 0
        },
        
        // DATOS DE SENSORES EN TIEMPO REAL (iniciales)
        sensores: {
          ldr: {
            valorRaw: 0,
            luxCalculado: 0,
            timestamp: serverTimestamp(),
            funcionando: true
          },
          pir: {
            movimiento: false,
            ultimaDeteccion: serverTimestamp(),
            contadorHoy: 0,
            contadorTotal: 0,
            funcionando: true
          },
          acs712: {
            valorRaw: 0,
            corriente: 0,
            timestamp: serverTimestamp(),
            funcionando: true
          }
        },
        
        // DATOS CALCULADOS
        calculados: {
          potenciaActual: 0,
          consumoHoy: 0,
          costoHoy: 0,
          tiempoEncendidoHoy: 0,
          encendidosHoy: 0,
          eficienciaHoy: 0
        },
        
        // CONFIGURACIÓN DE SENSORES
        configuracion: {
          ldr: {
            habilitado: true,
            umbralEncendido: 100,
            umbralApagado: 300,
            factorCalibracion: 1.0,
            filtroRuido: 5
          },
          pir: {
            habilitado: true,
            sensibilidad: 'media',
            tiempoActivacion: 30,
            rangoDeteccion: 5,
            retardoLectura: 2
          },
          acs712: {
            habilitado: true,
            modelo: '20A',
            voltajeReferencia: 2.5,
            sensibilidad: 100,
            filtroPromedio: 10,
            alertaMaxima: 20
          },
          intervalos: {
            lecturaRapida: 1000,
            lecturaNormal: 5000,
            envioWebApp: 30000
          }
        },
        
        // AUTOMATIZACIÓN Y HORARIOS
        automatizacion: {
          habilitada: true,
          modo: 'manual', // Para la prueba empezamos en manual
          reglas: {
            ldrAutomatico: false,
            pirAutomatico: false,
            horarioFijo: false,
            sobreescribirManual: false
          },
          horarios: {
            habilitado: false,
            encendidoForzado: '18:00',
            apagadoForzado: '06:00',
            dimmerNocturno: {
              habilitado: false,
              hora: '22:00',
              intensidad: 60
            }
          }
        },
        
        // CONTROL MANUAL
        control: {
          modoManual: true,
          intensidadLED: 0,
          ultimoComando: {
            accion: 'inicializacion',
            timestamp: serverTimestamp(),
            usuario: 'sistema',
            razon: 'creacion_inicial'
          }
        },
        
        // CONFIGURACIÓN DE ALERTAS
        alertas: {
          habilitadas: true,
          tipos: {
            desconexion: true,
            sensorFalla: true,
            consumoAnormal: true,
            voltajeBajo: true
          },
          umbrales: {
            tiempoDesconexion: 300,
            consumoMaximo: 400,
            voltajeMinimo: 200
          }
        },
        
        // METADATOS Y AUDITORÍA
        metadatos: {
          fechaCreacion: serverTimestamp(),
          creadoPor: 'sistema',
          ultimaActualizacion: serverTimestamp(),
          configuradoPor: 'sistema',
          numeroConfiguraciones: 1
        },
        
        // HISTORIAL DE CAMBIOS (inicialmente vacío)
        historial: []
      };
      
      await setDoc(posteRef, initialData);
      console.log(`✅ Documento inicial creado para ${posteId}`);
      return true;
    } catch (error) {
      console.error('❌ Error creando documento inicial:', error);
      return false;
    }
  }

  // ========== MÉTODOS DE ACTUALIZACIÓN ==========
  
  // Guardar/actualizar datos completos del poste
  async savePosteData(posteId, data) {
    try {
      // Verificar si existe el documento
      const exists = await this.checkPosteExists(posteId);
      
      if (!exists) {
        console.log(`📝 Documento ${posteId} no existe, creando...`);
        const created = await this.createInitialPoste(posteId);
        if (!created) {
          console.error('❌ No se pudo crear el documento inicial');
          return false;
        }
        // Esperar un momento para que se propague
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Actualizar con datos reales del ESP32
      const posteRef = doc(db, 'postes', posteId);
      
      const updateData = {
        // Estados en tiempo real
        'estado.online': data.linkStatus === 'connected',
        'estado.encendido': data.ledState || false,
        'estado.ultimaActualizacion': serverTimestamp(),
        'estado.uptime': data.uptime || 0,
        
        // Datos calculados
        'calculados.intensidadLED': data.ledIntensity || 0,
        'calculados.potenciaActual': (data.ledIntensity || 0) * 0.235,
        
        // Configuración de red
        'red.ip': data.ip || '192.168.1.101',
        
        // Sensores simulados
        'sensores.acs712.corriente': (data.ledIntensity || 0) * 0.02,
        'sensores.acs712.timestamp': new Date().toISOString(),
        
        // Control
        'control.intensidadLED': data.ledIntensity || 0,
        
        // Metadatos
        'metadatos.ultimaActualizacion': serverTimestamp()
      };
      
      await updateDoc(posteRef, updateData);
      console.log(`💾 Datos actualizados para ${posteId}`);
      return true;
      
    } catch (error) {
      console.error('❌ Error guardando en Firebase:', error);
      return false;
    }
  }

  // Actualizar solo intensidad LED
  async updateLEDIntensity(posteId, intensity) {
    try {
      const exists = await this.checkPosteExists(posteId);
      
      if (!exists) {
        console.log(`📝 Documento ${posteId} no existe, creando...`);
        await this.createInitialPoste(posteId);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      const posteRef = doc(db, 'postes', posteId);
      
      const updateData = {
        'calculados.intensidadLED': intensity,
        'calculados.potenciaActual': intensity * 0.235,
        'control.intensidadLED': intensity,
        'estado.encendido': intensity > 0,
        'estado.ultimaActualizacion': serverTimestamp(),
        'sensores.acs712.corriente': intensity * 0.02,
        'sensores.acs712.timestamp': new Date().toISOString(),
        'control.ultimoComando': {
          accion: 'control_intensidad',
          timestamp: serverTimestamp(),
          usuario: 'webapp@test.com',
          razon: 'control_manual'
        },
        'metadatos.ultimaActualizacion': serverTimestamp()
      };
      
      await updateDoc(posteRef, updateData);
      console.log(`💡 Intensidad LED actualizada: ${intensity}`);
      return true;
    } catch (error) {
      console.error('❌ Error actualizando intensidad:', error);
      return false;
    }
  }

  // Actualizar configuración de red
  async updateNetworkConfig(posteId, networkConfig) {
    try {
      const exists = await this.checkPosteExists(posteId);
      
      if (!exists) {
        console.log(`📝 Documento ${posteId} no existe, creando...`);
        await this.createInitialPoste(posteId);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      const posteRef = doc(db, 'postes', posteId);
      
      const updateData = {
        'red.ip': networkConfig.ip,
        'red.puerto': networkConfig.puerto || 81,
        'red.timeout': networkConfig.timeout || 5000,
        'red.ultimaActualizacion': serverTimestamp(),
        'control.ultimoComando': {
          accion: 'configuracion_red',
          timestamp: serverTimestamp(),
          usuario: 'webapp@test.com',
          razon: 'cambio_ip'
        },
        'metadatos.ultimaActualizacion': serverTimestamp(),
        'metadatos.numeroConfiguraciones': serverTimestamp() // Incrementar contador
      };
      
      await updateDoc(posteRef, updateData);
      console.log('🌐 Configuración de red actualizada');
      return true;
    } catch (error) {
      console.error('❌ Error actualizando configuración:', error);
      return false;
    }
  }

  // ========== MÉTODOS DE LECTURA ==========
  
  // Obtener datos de un poste
  async getPosteData(posteId) {
    try {
      const posteRef = doc(db, 'postes', posteId);
      const docSnap = await getDoc(posteRef);
      
      if (docSnap.exists()) {
        console.log(`📖 Datos obtenidos para ${posteId}`);
        return docSnap.data();
      } else {
        console.log(`❌ Poste ${posteId} no encontrado`);
        return null;
      }
    } catch (error) {
      console.error('❌ Error obteniendo datos:', error);
      return null;
    }
  }

  // ========== MÉTODOS DE ESCUCHA EN TIEMPO REAL ==========
  
  // Escuchar cambios en tiempo real
  listenToPoste(posteId, callback) {
    const posteRef = doc(db, 'postes', posteId);
    
    const unsubscribe = onSnapshot(posteRef, (doc) => {
      if (doc.exists()) {
        console.log('📱 Cambio en Firebase detectado para', posteId);
        callback(doc.data());
      } else {
        console.log(`❌ Documento ${posteId} no encontrado`);
        // Intentar crear documento si no existe
        this.createInitialPoste(posteId).then(() => {
          console.log('✅ Documento creado después de no encontrarlo');
        });
      }
    }, (error) => {
      console.error('❌ Error escuchando cambios:', error);
    });

    this.listeners.set(posteId, unsubscribe);
    return unsubscribe;
  }

  // Escuchar múltiples postes
  listenToAllPostes(callback) {
    const postesRef = collection(db, 'postes');
    
    const unsubscribe = onSnapshot(postesRef, (snapshot) => {
      const postes = [];
      snapshot.forEach((doc) => {
        postes.push({ id: doc.id, ...doc.data() });
      });
      console.log(`📱 Cambios detectados en ${postes.length} postes`);
      callback(postes);
    }, (error) => {
      console.error('❌ Error escuchando todos los postes:', error);
    });

    this.listeners.set('all_postes', unsubscribe);
    return unsubscribe;
  }

  // ========== MÉTODOS DE LIMPIEZA ==========
  
  // Limpiar listener específico
  stopListening(posteId) {
    const unsubscribe = this.listeners.get(posteId);
    if (unsubscribe) {
      unsubscribe();
      this.listeners.delete(posteId);
      console.log(`🛑 Listener detenido para ${posteId}`);
    }
  }

  // Limpiar todos los listeners
  stopAllListeners() {
    console.log(`🛑 Deteniendo ${this.listeners.size} listeners`);
    this.listeners.forEach((unsubscribe, key) => {
      unsubscribe();
      console.log(`🛑 Listener detenido: ${key}`);
    });
    this.listeners.clear();
  }

  // ========== MÉTODOS DE UTILIDAD ==========
  
  // Obtener estadísticas del sistema
  async getSystemStats() {
    try {
      const postesRef = collection(db, 'postes');
      const snapshot = await getDocs(postesRef);
      
      let online = 0;
      let total = 0;
      let totalConsumo = 0;
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        total++;
        if (data.estado?.online) online++;
        totalConsumo += data.calculados?.consumoHoy || 0;
      });
      
      return {
        total,
        online,
        offline: total - online,
        consumoTotal: totalConsumo,
        eficienciaPromedio: total > 0 ? (online / total) * 100 : 0
      };
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      return null;
    }
  }

  // Limpiar datos antiguos (mantenimiento)
  async cleanupOldData(days = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      console.log(`🧹 Iniciando limpieza de datos anteriores a ${cutoffDate.toISOString()}`);
      
      // Aquí puedes implementar lógica de limpieza según tus necesidades
      // Por ejemplo, limpiar historial antiguo, logs, etc.
      
      return true;
    } catch (error) {
      console.error('❌ Error en limpieza:', error);
      return false;
    }
  }
}