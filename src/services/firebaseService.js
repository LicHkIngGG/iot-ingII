// src/services/firebaseService.js - Actualizado para HTTP
import { db } from '../utils/firebase';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  onSnapshot,
  serverTimestamp,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';

export const firebaseService = {
  
  // ========== MÉTODOS DE VERIFICACIÓN ==========
  
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
  },

  async checkUserExists(email) {
    try {
      const q = query(collection(db, 'usuarios'), where('email', '==', email));
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('❌ Error verificando usuario:', error);
      return false;
    }
  },

  // ========== MÉTODOS DE CREACIÓN ==========
  
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
          lat: -16.501234 + (Math.random() * 0.01),
          lng: -68.151234 + (Math.random() * 0.01)
        },
        
        // CONFIGURACIÓN DE HARDWARE
        hardware: {
          modelo: 'ESP32-WROOM-32',
          numeroSerie: `ESP32-${posteId}-${Date.now()}`,
          tipoLED: '60W',
          versionFirmware: '1.0.0',
          fechaInstalacion: serverTimestamp(),
          protocolo: 'HTTP' // NUEVO: Especificar protocolo
        },
        
        // CONFIGURACIÓN DE RED - ACTUALIZADA PARA HTTP
        red: {
          ip: `192.168.1.${100 + parseInt(posteId.replace('POSTE_', ''))}`,
          puerto: 80, // CAMBIO: Puerto HTTP en lugar de WebSocket
          gateway: '192.168.1.1',
          subnet: '255.255.255.0',
          dns: '8.8.8.8',
          timeout: 5000,
          intervaloEnvio: 3000, // CAMBIO: Polling HTTP cada 3s
          mac: `AA:BB:CC:DD:EE:${(parseInt(posteId.replace('POSTE_', '')) + 10).toString(16).padStart(2, '0').toUpperCase()}`,
          protocolo: 'HTTP/1.1',
          endpoints: {
            status: '/api/status',
            control: '/api/led',
            config: '/api/config'
          }
        },
        
        // ESTADOS EN TIEMPO REAL
        estado: {
          online: false,
          encendido: false,
          ultimaActualizacion: serverTimestamp(),
          ultimaConexion: serverTimestamp(),
          uptime: 0,
          reconexiones: 0,
          protocoloConexion: 'HTTP' // NUEVO
        },
        
        // DATOS DE SENSORES EN TIEMPO REAL
        sensores: {
          ldr: {
            valorRaw: Math.floor(Math.random() * 1024),
            luxCalculado: Math.floor(Math.random() * 500),
            timestamp: new Date().toISOString(),
            funcionando: true
          },
          pir: {
            movimiento: Math.random() > 0.8,
            ultimaDeteccion: new Date().toISOString(),
            contadorHoy: Math.floor(Math.random() * 100),
            contadorTotal: Math.floor(Math.random() * 5000),
            funcionando: true
          },
          acs712: {
            valorRaw: 520 + Math.floor(Math.random() * 20),
            corriente: Math.random() * 2,
            timestamp: new Date().toISOString(),
            funcionando: true
          }
        },
        
        // DATOS CALCULADOS
        calculados: {
          potenciaActual: Math.random() * 300,
          consumoHoy: Math.random() * 10,
          costoHoy: Math.random() * 8,
          tiempoEncendidoHoy: Math.floor(Math.random() * 720),
          encendidosHoy: Math.floor(Math.random() * 5),
          eficienciaHoy: 75 + Math.random() * 25
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
            lecturaNormal: 3000, // CAMBIO: Adaptado para HTTP
            envioWebApp: 3000 // CAMBIO: Polling HTTP
          }
        },
        
        // AUTOMATIZACIÓN Y HORARIOS
        automatizacion: {
          habilitada: true,
          modo: 'manual', // Para HTTP empezamos en manual
          reglas: {
            ldrAutomatico: false, // Deshabilitado para pruebas HTTP
            pirAutomatico: false,
            horarioFijo: false,
            sobreescribirManual: true
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
          modoManual: true, // CAMBIO: Activado para HTTP
          intensidadLED: 0,
          ultimoComando: {
            accion: 'inicializacion',
            timestamp: serverTimestamp(),
            usuario: 'sistema',
            razon: 'creacion_inicial',
            protocolo: 'HTTP' // NUEVO
          }
        },
        
        // CONFIGURACIÓN DE ALERTAS
        alertas: {
          habilitadas: true,
          tipos: {
            desconexion: true,
            sensorFalla: true,
            consumoAnormal: true,
            voltajeBajo: true,
            timeoutHTTP: true // NUEVO: Alerta específica HTTP
          },
          umbrales: {
            tiempoDesconexion: 300,
            consumoMaximo: 400,
            voltajeMinimo: 200,
            timeoutHTTP: 10000 // NUEVO: Timeout HTTP en ms
          }
        },
        
        // METADATOS Y AUDITORÍA
        metadatos: {
          fechaCreacion: serverTimestamp(),
          creadoPor: 'sistema',
          ultimaActualizacion: serverTimestamp(),
          configuradoPor: 'sistema',
          numeroConfiguraciones: 1,
          protocoloVersion: 'HTTP/1.1', // NUEVO
          compatibilidad: 'WIZnet-W5500' // NUEVO
        },
        
        // HISTORIAL DE CAMBIOS
        historial: [
          {
            timestamp: new Date().toISOString(),
            tipo: 'creacion',
            descripcion: 'Poste creado con protocolo HTTP',
            usuario: 'sistema',
            protocolo: 'HTTP'
          }
        ]
      };
      
      await setDoc(posteRef, initialData);
      console.log(`✅ Poste ${posteId} creado con configuración HTTP`);
      return true;
    } catch (error) {
      console.error(`❌ Error creando poste ${posteId}:`, error);
      return false;
    }
  },

  async createUser(userData) {
    try {
      const userRef = doc(collection(db, 'usuarios'));
      const newUser = {
        email: userData.email,
        nombre: userData.nombre || 'Usuario',
        apellido: userData.apellido || 'Nuevo',
        rol: userData.rol || 'operador',
        activo: true,
        fechaCreacion: serverTimestamp(),
        ultimoAcceso: null,
        configuraciones: {
          notificaciones: true,
          tema: 'claro',
          idioma: 'es',
          protocoloPreferido: 'HTTP' // NUEVO
        }
      };
      
      await setDoc(userRef, newUser);
      console.log(`✅ Usuario ${userData.email} creado`);
      return true;
    } catch (error) {
      console.error('❌ Error creando usuario:', error);
      return false;
    }
  },

  // ========== INICIALIZACIÓN DE DATOS - ACTUALIZADA PARA HTTP ==========
  
  async initializeExampleData() {
    try {
      console.log('🔄 Inicializando datos de ejemplo del sistema HTTP...');
      
      // 1. Verificar si ya existen postes
      const postesRef = collection(db, 'postes');
      const postesSnapshot = await getDocs(postesRef);
      
      if (postesSnapshot.empty) {
        console.log('📝 No hay postes, creando datos de ejemplo HTTP...');
        
        // Crear postes de ejemplo con configuración HTTP
        const postesEjemplo = ['POSTE_001', 'POSTE_002', 'POSTE_003', 'POSTE_004', 'POSTE_005'];
        
        for (const posteId of postesEjemplo) {
          await this.createInitialPoste(posteId);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        console.log(`✅ ${postesEjemplo.length} postes HTTP creados`);
        
      } else {
        console.log(`ℹ️ Ya existen ${postesSnapshot.size} postes en el sistema`);
      }

      // 2. Crear configuración global del sistema - ACTUALIZADA PARA HTTP
      const sistemaRef = doc(db, 'sistema', 'configuracion');
      const sistemaSnapshot = await getDoc(sistemaRef);
      
      if (!sistemaSnapshot.exists()) {
        const sistemaData = {
          general: {
            timezone: 'America/La_Paz',
            moneda: 'BOB',
            tarifaElectrica: 0.80,
            voltajeNominal: 220,
            sistemaHorario24: true,
            nombreSistema: 'Sistema de Alumbrado Público El Alto',
            version: '1.0.0',
            protocoloPrincipal: 'HTTP' // NUEVO
          },
          red: {
            rangoIPInicio: '192.168.1.100',
            rangoIPFin: '192.168.1.200',
            puertoBase: 80, // CAMBIO: Puerto HTTP
            timeoutGlobal: 5000,
            protocoloComunicacion: 'HTTP/1.1', // CAMBIO
            polling: {
              habilitado: true,
              intervalo: 3000,
              timeout: 5000,
              reintentos: 5
            }
          },
          automatizacion: {
            habilitadaGlobal: false, // CAMBIO: Deshabilitado para HTTP
            modoDefecto: 'manual', // CAMBIO: Manual para HTTP
            horarioVerano: {
              inicioVerano: '2025-10-01',
              finVerano: '2025-03-31',
              ajusteHorario: 1
            },
            configuracionNocturna: {
              habilitada: false, // CAMBIO: Deshabilitado para pruebas
              horaInicio: '22:00',
              intensidadReducida: 60
            }
          },
          estadisticas: {
            dispositivos: {
              total: 5,
              online: 0,
              offline: 5,
              alertas: 0,
              mantenimiento: 0
            },
            consumo: {
              totalHoy: 0,
              costoHoy: 0,
              eficienciaPromedio: 85
            },
            protocolo: {
              tipo: 'HTTP',
              version: '1.1',
              puerto: 80,
              ssl: false
            },
            ultimaActualizacion: serverTimestamp()
          },
          mantenimiento: {
            ultimaRevision: serverTimestamp(),
            proximaRevision: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            intervaloDias: 30
          }
        };
        
        await setDoc(sistemaRef, sistemaData);
        console.log('⚙️ Configuración del sistema HTTP creada');
      } else {
        console.log('ℹ️ Configuración del sistema ya existe');
      }

      // 3. Resto de configuraciones (grupos, usuarios, etc.)
      await this.createGroupsAndUsers();
      await this.createAdditionalConfigurations();
      
      console.log('🎉 Inicialización de datos HTTP completada exitosamente');
      return true;
      
    } catch (error) {
      console.error('❌ Error inicializando datos HTTP:', error);
      return false;
    }
  },

  // ========== MÉTODOS DE ACTUALIZACIÓN - ACTUALIZADOS PARA HTTP ==========
  
  async updatePosteData(posteId, data) {
    try {
      const exists = await this.checkPosteExists(posteId);
      
      if (!exists) {
        console.log(`📝 Poste ${posteId} no existe, creando...`);
        await this.createInitialPoste(posteId);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      const posteRef = doc(db, 'postes', posteId);
      const updateData = {
        'estado.online': data.linkStatus === 'connected',
        'estado.encendido': data.ledState || false,
        'estado.ultimaActualizacion': serverTimestamp(),
        'estado.uptime': data.uptime || 0,
        'estado.protocoloConexion': 'HTTP',
        'calculados.intensidadLED': data.ledIntensity || 0,
        'calculados.potenciaActual': (data.ledIntensity || 0) * 0.235,
        'red.ip': data.ip || '192.168.1.101',
        'red.ultimaRespuesta': serverTimestamp(),
        'sensores.acs712.corriente': (data.ledIntensity || 0) * 0.02,
        'sensores.acs712.timestamp': new Date().toISOString(),
        'control.intensidadLED': data.ledIntensity || 0,
        'metadatos.ultimaActualizacion': serverTimestamp()
      };
      
      // Si hay datos de sensores adicionales
      if (data.sensors) {
        if (data.sensors.ldr) updateData['sensores.ldr.valorRaw'] = data.sensors.ldr;
        if (data.sensors.pir !== undefined) updateData['sensores.pir.movimiento'] = data.sensors.pir;
        if (data.sensors.current) updateData['sensores.acs712.corriente'] = data.sensors.current;
      }
      
      await updateDoc(posteRef, updateData);
      console.log(`💾 Datos HTTP actualizados para ${posteId}`);
      return true;
    } catch (error) {
      console.error('❌ Error actualizando datos HTTP:', error);
      return false;
    }
  },

  async updateLEDIntensity(posteId, intensity) {
    try {
      const exists = await this.checkPosteExists(posteId);
      
      if (!exists) {
        console.log(`📝 Poste ${posteId} no existe, creando...`);
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
          razon: 'control_manual',
          protocolo: 'HTTP',
          intensidad: intensity
        },
        'metadatos.ultimaActualizacion': serverTimestamp()
      };
      
      await updateDoc(posteRef, updateData);
      console.log(`💡 Intensidad LED HTTP actualizada: ${intensity}`);
      return true;
    } catch (error) {
      console.error('❌ Error actualizando intensidad HTTP:', error);
      return false;
    }
  },

  async updateNetworkConfig(posteId, networkConfig) {
    try {
      const exists = await this.checkPosteExists(posteId);
      
      if (!exists) {
        console.log(`📝 Poste ${posteId} no existe, creando...`);
        await this.createInitialPoste(posteId);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      const posteRef = doc(db, 'postes', posteId);
      
      const updateData = {
        'red.ip': networkConfig.ip,
        'red.puerto': networkConfig.puerto || 80,
        'red.timeout': networkConfig.timeout || 5000,
        'red.protocolo': 'HTTP/1.1',
        'red.ultimaActualizacion': serverTimestamp(),
        'control.ultimoComando': {
          accion: 'configuracion_red',
          timestamp: serverTimestamp(),
          usuario: 'webapp@test.com',
          razon: 'cambio_ip',
          protocolo: 'HTTP',
          nuevaIP: networkConfig.ip
        },
        'metadatos.ultimaActualizacion': serverTimestamp(),
        'metadatos.numeroConfiguraciones': serverTimestamp()
      };
      
      await updateDoc(posteRef, updateData);
      console.log('🌐 Configuración de red HTTP actualizada');
      return true;
    } catch (error) {
      console.error('❌ Error actualizando configuración HTTP:', error);
      return false;
    }
  },

  // ========== MÉTODOS AUXILIARES ==========
  
  async createGroupsAndUsers() {
    // Crear grupos de control
    const gruposRef = collection(db, 'grupos');
    const gruposSnapshot = await getDocs(gruposRef);
    
    if (gruposSnapshot.empty) {
     const grupos = {
       zona_norte: {
         id: 'zona_norte',
         nombre: 'Zona Norte Villa Adela',
         descripcion: 'Postes de la zona norte del distrito',
         postes: ['POSTE_001', 'POSTE_002'],
         configuracionGrupal: {
           habilitada: true,
           horarioSincronizado: true,
           configuracionUnificada: false,
           intensidadGrupal: 100,
           modoAutomatico: false, // CAMBIO: Manual para HTTP
           protocolo: 'HTTP'
         },
         ubicacion: {
           centro: { lat: -16.501234, lng: -68.151234 },
           radio: 500
         },
         metadatos: {
           fechaCreacion: serverTimestamp(),
           creadoPor: 'sistema',
           activo: true
         }
       },
       zona_sur: {
         id: 'zona_sur',
         nombre: 'Zona Sur Villa Adela',
         descripcion: 'Postes de la zona sur del distrito',
         postes: ['POSTE_003', 'POSTE_004'],
         configuracionGrupal: {
           habilitada: true,
           horarioSincronizado: true,
           configuracionUnificada: false,
           intensidadGrupal: 100,
           modoAutomatico: false,
           protocolo: 'HTTP'
         },
         ubicacion: {
           centro: { lat: -16.505234, lng: -68.155234 },
           radio: 500
         },
         metadatos: {
           fechaCreacion: serverTimestamp(),
           creadoPor: 'sistema',
           activo: true
         }
       },
       zona_central: {
         id: 'zona_central',
         nombre: 'Zona Central',
         descripcion: 'Postes de la zona central',
         postes: ['POSTE_005'],
         configuracionGrupal: {
           habilitada: true,
           horarioSincronizado: true,
           configuracionUnificada: false,
           intensidadGrupal: 100,
           modoAutomatico: false,
           protocolo: 'HTTP'
         },
         ubicacion: {
           centro: { lat: -16.503234, lng: -68.153234 },
           radio: 300
         },
         metadatos: {
           fechaCreacion: serverTimestamp(),
           creadoPor: 'sistema',
           activo: true
         }
       },
       todos: {
         id: 'todos',
         nombre: 'Todos los Postes',
         descripcion: 'Grupo que incluye todos los postes del sistema',
         postes: ['POSTE_001', 'POSTE_002', 'POSTE_003', 'POSTE_004', 'POSTE_005'],
         configuracionGrupal: {
           habilitada: true,
           horarioSincronizado: true,
           configuracionUnificada: true,
           intensidadGrupal: 100,
           modoAutomatico: false,
           protocolo: 'HTTP'
         },
         ubicacion: {
           centro: { lat: -16.503234, lng: -68.153234 },
           radio: 1000
         },
         metadatos: {
           fechaCreacion: serverTimestamp(),
           creadoPor: 'sistema',
           activo: true
         }
       }
     };
     
     for (const [grupoId, grupoData] of Object.entries(grupos)) {
       await setDoc(doc(gruposRef, grupoId), grupoData);
       console.log(`👥 Grupo HTTP ${grupoId} creado`);
     }
     
     console.log('✅ Grupos de control HTTP creados');
   } else {
     console.log(`ℹ️ Ya existen ${gruposSnapshot.size} grupos en el sistema`);
   }

   // Crear usuarios de ejemplo
   const usuariosRef = collection(db, 'usuarios');
   const usuariosSnapshot = await getDocs(usuariosRef);
   
   if (usuariosSnapshot.empty) {
     const usuariosEjemplo = [
       {
         email: 'admin@elalto.gov.bo',
         nombre: 'Administrador',
         apellido: 'Sistema',
         rol: 'administrador',
         activo: true
       },
       {
         email: 'operador@elalto.gov.bo',
         nombre: 'Operador',
         apellido: 'Principal',
         rol: 'operador',
         activo: true
       },
       {
         email: 'jose.rojas@alto.gov.bo',
         nombre: 'José',
         apellido: 'Rojas',
         rol: 'administrador',
         activo: true
       }
     ];
     
     for (const userData of usuariosEjemplo) {
       await this.createUser(userData);
     }
     
     console.log('👥 Usuarios de ejemplo HTTP creados');
   } else {
     console.log(`ℹ️ Ya existen ${usuariosSnapshot.size} usuarios en el sistema`);
   }
 },

 async createAdditionalConfigurations() {
   try {
     // Configuración de alertas globales - ACTUALIZADA PARA HTTP
     const alertasRef = doc(db, 'configuracion', 'alertas');
     const alertasData = {
       tipos: {
         desconexion: {
           habilitada: true,
           timeout: 300,
           nivel: 'critico'
         },
         consumoAnormal: {
           habilitada: true,
           umbralAlto: 400,
           umbralBajo: 10,
           nivel: 'advertencia'
         },
         fallasSensor: {
           habilitada: true,
           intentosReconexion: 3,
           nivel: 'error'
         },
         timeoutHTTP: { // NUEVO: Alerta específica HTTP
           habilitada: true,
           timeout: 10000,
           reintentos: 5,
           nivel: 'advertencia'
         },
         errorHTTP: { // NUEVO
           habilitada: true,
           codigosError: [404, 500, 503],
           nivel: 'error'
         }
       },
       notificaciones: {
         email: true,
         sms: false,
         webhook: false
       },
       destinatarios: [
         'admin@elalto.gov.bo',
         'operador@elalto.gov.bo'
       ],
       protocolos: {
         HTTP: {
           habilitado: true,
           timeout: 10000,
           reintentos: 5
         }
       }
     };
     
     await setDoc(alertasRef, alertasData);
     
     // Configuración de reportes - ACTUALIZADA
     const reportesRef = doc(db, 'configuracion', 'reportes');
     const reportesData = {
       automaticos: {
         diario: {
           habilitado: true,
           hora: '08:00',
           destinatarios: ['admin@elalto.gov.bo']
         },
         semanal: {
           habilitado: true,
           dia: 'lunes',
           hora: '09:00',
           destinatarios: ['admin@elalto.gov.bo']
         },
         mensual: {
           habilitado: true,
           dia: 1,
           hora: '10:00',
           destinatarios: ['admin@elalto.gov.bo']
         }
       },
       formatos: ['PDF', 'Excel', 'JSON'],
       incluir: {
         consumo: true,
         estadisticas: true,
         alertas: true,
         mantenimiento: true,
         protocolos: true // NUEVO
       },
       protocolos: {
         HTTP: {
           incluirTimeouts: true,
           incluirErrores: true,
           incluirLatencia: true
         }
       }
     };
     
     await setDoc(reportesRef, reportesData);
     
     // Configuración específica HTTP - NUEVA
     const httpConfigRef = doc(db, 'configuracion', 'http');
     const httpConfigData = {
       servidor: {
         puerto: 80,
         timeout: 10000,
         keepAlive: true,
         maxConexiones: 10
       },
       polling: {
         intervalo: 3000,
         timeout: 5000,
         reintentos: 5,
         backoff: 1.5
       },
       endpoints: {
         status: '/api/status',
         control: '/api/led',
         config: '/api/config',
         info: '/api/info'
       },
       headers: {
         'Content-Type': 'application/json',
         'Cache-Control': 'no-cache',
         'User-Agent': 'AlumbradoPublico/1.0'
       },
       seguridad: {
         cors: true,
         rateLimiting: false,
         authentication: false
       }
     };
     
     await setDoc(httpConfigRef, httpConfigData);
     
     console.log('📋 Configuraciones HTTP adicionales creadas');
   } catch (error) {
     console.error('❌ Error creando configuraciones HTTP:', error);
   }
 },

 // ========== MÉTODOS DE LECTURA ==========
 
 async getAllPostes() {
   try {
     const postesRef = collection(db, 'postes');
     const snapshot = await getDocs(postesRef);
     const postes = [];
     
     snapshot.forEach((doc) => {
       postes.push({ id: doc.id, ...doc.data() });
     });
     
     return postes;
   } catch (error) {
     console.error('❌ Error obteniendo postes:', error);
     return [];
   }
 },

 async getSystemConfig() {
   try {
     const sistemaRef = doc(db, 'sistema', 'configuracion');
     const docSnap = await getDoc(sistemaRef);
     
     if (docSnap.exists()) {
       return docSnap.data();
     } else {
       console.log('❌ Configuración del sistema no encontrada');
       return null;
     }
   } catch (error) {
     console.error('❌ Error obteniendo configuración:', error);
     return null;
   }
 },

 async getHTTPConfig() {
   try {
     const httpRef = doc(db, 'configuracion', 'http');
     const docSnap = await getDoc(httpRef);
     
     if (docSnap.exists()) {
       return docSnap.data();
     } else {
       console.log('❌ Configuración HTTP no encontrada');
       return null;
     }
   } catch (error) {
     console.error('❌ Error obteniendo configuración HTTP:', error);
     return null;
   }
 },

 // ========== MÉTODOS DE UTILIDAD ==========
 
 async clearTestData() {
   try {
     console.log('🧹 Iniciando limpieza de datos de prueba HTTP...');
     
     const batch = writeBatch(db);
     
     const postesRef = collection(db, 'postes');
     const postesSnapshot = await getDocs(postesRef);
     
     postesSnapshot.forEach((doc) => {
       batch.delete(doc.ref);
     });
     
     const gruposRef = collection(db, 'grupos');
     const gruposSnapshot = await getDocs(gruposRef);
     
     gruposSnapshot.forEach((doc) => {
       batch.delete(doc.ref);
     });
     
     await batch.commit();
     console.log('✅ Datos de prueba HTTP eliminados');
     return true;
   } catch (error) {
     console.error('❌ Error limpiando datos HTTP:', error);
     return false;
   }
 },

 async getSystemStats() {
   try {
     const postes = await this.getAllPostes();
     
     const stats = {
       total: postes.length,
       online: postes.filter(p => p.estado?.online).length,
       offline: postes.filter(p => !p.estado?.online).length,
       encendidos: postes.filter(p => p.estado?.encendido).length,
       consumoTotal: postes.reduce((sum, p) => sum + (p.calculados?.consumoHoy || 0), 0),
       costoTotal: postes.reduce((sum, p) => sum + (p.calculados?.costoHoy || 0), 0),
       eficienciaPromedio: postes.length > 0 ? 
         postes.reduce((sum, p) => sum + (p.calculados?.eficienciaHoy || 0), 0) / postes.length : 0,
       protocolo: {
         tipo: 'HTTP',
         version: '1.1',
         puerto: 80,
         postesHTTP: postes.filter(p => p.hardware?.protocolo === 'HTTP').length
       }
     };
     
     return stats;
   } catch (error) {
     console.error('❌ Error obteniendo estadísticas HTTP:', error);
     return null;
   }
 },

 // ========== MÉTODOS ESPECÍFICOS PARA HTTP ==========
 
 async logHTTPError(posteId, error) {
   try {
     const posteRef = doc(db, 'postes', posteId);
     const errorLog = {
       timestamp: serverTimestamp(),
       tipo: 'error_http',
       error: error.message || 'Error desconocido',
       codigo: error.status || 'N/A',
       protocolo: 'HTTP'
     };
     
     await updateDoc(posteRef, {
       'historial': arrayUnion(errorLog),
       'estado.ultimoError': errorLog,
       'metadatos.ultimaActualizacion': serverTimestamp()
     });
     
     console.log(`📝 Error HTTP registrado para ${posteId}:`, error);
   } catch (error) {
     console.error('❌ Error registrando error HTTP:', error);
   }
 },

 async updateConnectionStats(posteId, stats) {
   try {
     const posteRef = doc(db, 'postes', posteId);
     
     await updateDoc(posteRef, {
       'red.estadisticas': {
         ...stats,
         ultimaActualizacion: serverTimestamp()
       },
       'metadatos.ultimaActualizacion': serverTimestamp()
     });
     
   } catch (error) {
     console.error('❌ Error actualizando estadísticas de conexión:', error);
   }
 }
};