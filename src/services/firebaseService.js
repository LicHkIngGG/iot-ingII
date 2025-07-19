// src/services/firebaseService.js - VERSIÓN COMPLETA CORREGIDA
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
  writeBatch,
  arrayUnion
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

  // ========== MÉTODOS DE ACTUALIZACIÓN - CORREGIDOS ==========
  
  async updateDoc(docPath, data) {
    try {
      const docRef = doc(db, ...docPath.split('/'));
      await updateDoc(docRef, data);
      console.log(`✅ Documento actualizado: ${docPath}`);
      return true;
    } catch (error) {
      console.error(`❌ Error actualizando ${docPath}:`, error);
      return false;
    }
  },

  // ========== MÉTODOS DE DESHABILITAR/HABILITAR (NO ELIMINAR) ==========
  
  async disablePoste(posteId, razon = 'Deshabilitado por usuario') {
    try {
      const posteRef = doc(db, 'postes', posteId);
      const exists = await this.checkPosteExists(posteId);
      
      if (!exists) {
        console.error(`❌ Poste ${posteId} no existe`);
        return false;
      }
      
      const updateData = {
        'estado.activo': false,
        'estado.deshabilitado': true,
        'estado.fechaDeshabilitacion': serverTimestamp(),
        'estado.razonDeshabilitacion': razon,
        'control.modoManual': true,
        'control.intensidadLED': 0,
        'automatizacion.habilitada': false,
        'metadatos.ultimaActualizacion': serverTimestamp(),
        'historial': arrayUnion({
          timestamp: new Date().toISOString(),
          tipo: 'deshabilitacion',
          descripcion: `Poste deshabilitado: ${razon}`,
          usuario: 'sistema',
          protocolo: 'HTTP'
        })
      };
      
      await updateDoc(posteRef, updateData);
      console.log(`🔒 Poste ${posteId} deshabilitado: ${razon}`);
      return true;
    } catch (error) {
      console.error(`❌ Error deshabilitando poste ${posteId}:`, error);
      return false;
    }
  },

  async enablePoste(posteId, razon = 'Rehabilitado por usuario') {
    try {
      const posteRef = doc(db, 'postes', posteId);
      const exists = await this.checkPosteExists(posteId);
      
      if (!exists) {
        console.error(`❌ Poste ${posteId} no existe`);
        return false;
      }
      
      const updateData = {
        'estado.activo': true,
        'estado.deshabilitado': false,
        'estado.fechaRehabilitacion': serverTimestamp(),
        'estado.razonRehabilitacion': razon,
        'metadatos.ultimaActualizacion': serverTimestamp(),
        'historial': arrayUnion({
          timestamp: new Date().toISOString(),
          tipo: 'rehabilitacion',
          descripcion: `Poste rehabilitado: ${razon}`,
          usuario: 'sistema',
          protocolo: 'HTTP'
        })
      };
      
      await updateDoc(posteRef, updateData);
      console.log(`🔓 Poste ${posteId} rehabilitado: ${razon}`);
      return true;
    } catch (error) {
      console.error(`❌ Error rehabilitando poste ${posteId}:`, error);
      return false;
    }
  },

  async disableUser(email, razon = 'Deshabilitado por administrador') {
    try {
      const q = query(collection(db, 'usuarios'), where('email', '==', email));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        console.error(`❌ Usuario ${email} no encontrado`);
        return false;
      }
      
      const userDoc = querySnapshot.docs[0];
      const userRef = doc(db, 'usuarios', userDoc.id);
      
      const updateData = {
        activo: false,
        fechaDeshabilitacion: serverTimestamp(),
        razonDeshabilitacion: razon,
        ultimaActualizacion: serverTimestamp()
      };
      
      await updateDoc(userRef, updateData);
      console.log(`🔒 Usuario ${email} deshabilitado: ${razon}`);
      return true;
    } catch (error) {
      console.error(`❌ Error deshabilitando usuario ${email}:`, error);
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
          versionFirmware: '2.1.1',
          fechaInstalacion: serverTimestamp(),
          protocolo: 'HTTP'
        },
        
        // CONFIGURACIÓN DE RED - ACTUALIZADA PARA HTTP
        red: {
          ip: `192.168.1.${100 + (parseInt(posteId.replace('POSTE_', '')) || Math.floor(Math.random() * 50))}`,
          puerto: 80,
          gateway: '192.168.1.1',
          subnet: '255.255.255.0',
          dns: '8.8.8.8',
          timeout: 5000,
          intervaloEnvio: 3000,
          mac: `AA:BB:CC:DD:EE:${(parseInt(posteId.replace('POSTE_', '')) + 10 || 60).toString(16).padStart(2, '0').toUpperCase()}`,
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
          activo: true, // ← NUEVO: Estado activo/deshabilitado
          deshabilitado: false, // ← NUEVO
          ultimaActualizacion: serverTimestamp(),
          ultimaConexion: serverTimestamp(),
          uptime: 0,
          reconexiones: 0,
          protocoloConexion: 'HTTP'
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
          intensidadLED: 0,
          potenciaActual: 0,
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
            lecturaNormal: 3000,
            envioWebApp: 3000
          }
        },
        
        // AUTOMATIZACIÓN Y HORARIOS
        automatizacion: {
          habilitada: true,
          modo: 'manual',
          reglas: {
            ldrAutomatico: false,
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
          modoManual: true,
          intensidadLED: 0,
          ultimoComando: {
            accion: 'inicializacion',
            timestamp: serverTimestamp(),
            usuario: 'sistema',
            razon: 'creacion_inicial',
            protocolo: 'HTTP'
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
            timeoutHTTP: true
          },
          umbrales: {
            tiempoDesconexion: 300,
            consumoMaximo: 400,
            voltajeMinimo: 200,
            timeoutHTTP: 10000
          }
        },
        
        // METADATOS Y AUDITORÍA
        metadatos: {
          fechaCreacion: serverTimestamp(),
          creadoPor: 'sistema',
          ultimaActualizacion: serverTimestamp(),
          configuradoPor: 'sistema',
          numeroConfiguraciones: 1,
          protocoloVersion: 'HTTP/1.1',
          compatibilidad: 'WIZnet-W5500'
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
          protocoloPreferido: 'HTTP'
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

  // ========== INICIALIZACIÓN DE DATOS ==========
  
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

      // 2. Crear configuración global del sistema
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
            protocoloPrincipal: 'HTTP'
          },
          red: {
            rangoIPInicio: '192.168.1.100',
            rangoIPFin: '192.168.1.200',
            puertoBase: 80,
            timeoutGlobal: 5000,
            protocoloComunicacion: 'HTTP/1.1',
            polling: {
              habilitado: true,
              intervalo: 3000,
              timeout: 5000,
              reintentos: 5
            }
          },
          automatizacion: {
            habilitadaGlobal: false,
            modoDefecto: 'manual',
            horarioVerano: {
              inicioVerano: '2025-10-01',
              finVerano: '2025-03-31',
              ajusteHorario: 1
            },
            configuracionNocturna: {
              habilitada: false,
              horaInicio: '22:00',
              intensidadReducida: 60
            }
          },
          estadisticas: {
            dispositivos: {
              total: 5,
              online: 0,
              offline: 5,
              activos: 5,
              deshabilitados: 0,
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

      // 3. Resto de configuraciones
      await this.createGroupsAndUsers();
      await this.createAdditionalConfigurations();
      
      console.log('🎉 Inicialización de datos HTTP completada exitosamente');
      return true;
      
    } catch (error) {
      console.error('❌ Error inicializando datos HTTP:', error);
      return false;
    }
  },

  // ========== MÉTODOS DE ACTUALIZACIÓN ==========
  
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
            modoAutomatico: false,
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
      // Configuración de alertas globales
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
          timeoutHTTP: {
            habilitada: true,
            timeout: 10000,
            reintentos: 5,
            nivel: 'advertencia'
          },
          errorHTTP: {
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
      
      // Configuración de reportes
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
          protocolos: true
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
      
      // Configuración específica HTTP
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

  async getActivePostes() {
    try {
      const postesRef = collection(db, 'postes');
      const q = query(postesRef, where('estado.activo', '==', true));
      const snapshot = await getDocs(q);
      const postes = [];
      
      snapshot.forEach((doc) => {
        postes.push({ id: doc.id, ...doc.data() });
      });
      
      return postes;
    } catch (error) {
      console.error('❌ Error obteniendo postes activos:', error);
      return [];
    }
  },

  async getDisabledPostes() {
    try {
      const postesRef = collection(db, 'postes');
      const q = query(postesRef, where('estado.deshabilitado', '==', true));
      const snapshot = await getDocs(q);
      const postes = [];
      
      snapshot.forEach((doc) => {
        postes.push({ id: doc.id, ...doc.data() });
      });
      
      return postes;
    } catch (error) {
      console.error('❌ Error obteniendo postes deshabilitados:', error);
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

  async getPosteById(posteId) {
    try {
      const posteRef = doc(db, 'postes', posteId);
      const docSnap = await getDoc(posteRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      } else {
        console.log(`❌ Poste ${posteId} no encontrado`);
        return null;
      }
    } catch (error) {
      console.error(`❌ Error obteniendo poste ${posteId}:`, error);
      return null;
    }
  },

  async getGroupsWithPostes() {
    try {
      const gruposRef = collection(db, 'grupos');
      const snapshot = await getDocs(gruposRef);
      const grupos = [];
      
      snapshot.forEach((doc) => {
        grupos.push({ id: doc.id, ...doc.data() });
      });
      
      return grupos;
    } catch (error) {
      console.error('❌ Error obteniendo grupos:', error);
      return [];
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
  },

  async updateSensorData(posteId, sensorData) {
    try {
      const posteRef = doc(db, 'postes', posteId);
      const updateData = {
        'metadatos.ultimaActualizacion': serverTimestamp()
      };
      
      // Actualizar datos de LDR
      if (sensorData.ldr) {
        updateData['sensores.ldr.valorRaw'] = sensorData.ldr.raw || 0;
        updateData['sensores.ldr.luxCalculado'] = sensorData.ldr.lux || 0;
        updateData['sensores.ldr.timestamp'] = new Date().toISOString();
        updateData['sensores.ldr.funcionando'] = sensorData.ldr.functioning !== false;
      }
      
      // Actualizar datos de PIR
      if (sensorData.pir) {
        updateData['sensores.pir.movimiento'] = sensorData.pir.detection || false;
        updateData['sensores.pir.contadorHoy'] = sensorData.pir.counterToday || 0;
        updateData['sensores.pir.contadorTotal'] = sensorData.pir.counterTotal || 0;
        updateData['sensores.pir.funcionando'] = sensorData.pir.functioning !== false;
        
        if (sensorData.pir.lastDetection) {
          updateData['sensores.pir.ultimaDeteccion'] = sensorData.pir.lastDetection;
        }
      }
      
      // Actualizar datos de ACS712
      if (sensorData.acs712) {
        updateData['sensores.acs712.valorRaw'] = sensorData.acs712.raw || 0;
        updateData['sensores.acs712.corriente'] = sensorData.acs712.current || 0;
        updateData['sensores.acs712.timestamp'] = new Date().toISOString();
        updateData['sensores.acs712.funcionando'] = sensorData.acs712.functioning !== false;
      }
      
      await updateDoc(posteRef, updateData);
      console.log(`🔬 Datos de sensores actualizados para ${posteId}`);
      return true;
    } catch (error) {
      console.error('❌ Error actualizando datos de sensores:', error);
      return false;
    }
  },

  async updateCalculatedData(posteId, calculatedData) {
    try {
      const posteRef = doc(db, 'postes', posteId);
      const updateData = {
        'metadatos.ultimaActualizacion': serverTimestamp()
      };
      
      if (calculatedData.consumption) {
        updateData['calculados.consumoHoy'] = calculatedData.consumption;
      }
      
      if (calculatedData.cost) {
        updateData['calculados.costoHoy'] = calculatedData.cost;
      }
      
      if (calculatedData.timeOn) {
        updateData['calculados.tiempoEncendidoHoy'] = calculatedData.timeOn;
      }
      
      if (calculatedData.switches) {
        updateData['calculados.encendidosHoy'] = calculatedData.switches;
      }
      
      if (calculatedData.efficiency) {
        updateData['calculados.eficienciaHoy'] = calculatedData.efficiency;
      }
      
      if (calculatedData.power) {
        updateData['calculados.potenciaActual'] = calculatedData.power;
      }
      
      await updateDoc(posteRef, updateData);
      console.log(`📊 Datos calculados actualizados para ${posteId}`);
      return true;
    } catch (error) {
      console.error('❌ Error actualizando datos calculados:', error);
      return false;
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
        activos: postes.filter(p => p.estado?.activo !== false).length,
        deshabilitados: postes.filter(p => p.estado?.deshabilitado === true).length,
        online: postes.filter(p => p.estado?.online === true).length,
        offline: postes.filter(p => p.estado?.online !== true).length,
        encendidos: postes.filter(p => p.estado?.encendido === true).length,
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

  async updateSystemStats() {
    try {
      const stats = await this.getSystemStats();
      
      if (stats) {
        const sistemaRef = doc(db, 'sistema', 'configuracion');
        await updateDoc(sistemaRef, {
          'estadisticas.dispositivos': {
            total: stats.total,
            activos: stats.activos,
            deshabilitados: stats.deshabilitados,
            online: stats.online,
            offline: stats.offline,
            alertas: 0, // Se calculará en función de alertas reales
            mantenimiento: 0 // Se calculará en función de estado de mantenimiento
          },
          'estadisticas.consumo': {
            totalHoy: stats.consumoTotal,
            costoHoy: stats.costoTotal,
            eficienciaPromedio: stats.eficienciaPromedio
          },
          'estadisticas.ultimaActualizacion': serverTimestamp()
        });
        
        console.log('📊 Estadísticas del sistema actualizadas');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Error actualizando estadísticas del sistema:', error);
      return false;
    }
  },

  // ========== MÉTODOS DE SUSCRIPCIÓN (REAL-TIME) ==========
  
  subscribeToPostes(callback) {
    try {
      const postesRef = collection(db, 'postes');
      const q = query(postesRef, orderBy('metadatos.ultimaActualizacion', 'desc'));
      
      return onSnapshot(q, (snapshot) => {
        const postes = [];
        snapshot.forEach((doc) => {
          postes.push({ id: doc.id, ...doc.data() });
        });
        
        callback(postes);
      }, (error) => {
        console.error('❌ Error en suscripción a postes:', error);
        callback([]);
      });
    } catch (error) {
      console.error('❌ Error configurando suscripción a postes:', error);
      return () => {}; // Función vacía para desuscribir
    }
  },

  subscribeToPoste(posteId, callback) {
    try {
      const posteRef = doc(db, 'postes', posteId);
      
      return onSnapshot(posteRef, (doc) => {
        if (doc.exists()) {
          callback({ id: doc.id, ...doc.data() });
        } else {
          callback(null);
        }
      }, (error) => {
        console.error(`❌ Error en suscripción a poste ${posteId}:`, error);
        callback(null);
      });
    } catch (error) {
      console.error(`❌ Error configurando suscripción a poste ${posteId}:`, error);
      return () => {}; // Función vacía para desuscribir
    }
  },

  subscribeToSystemConfig(callback) {
    try {
      const sistemaRef = doc(db, 'sistema', 'configuracion');
      
      return onSnapshot(sistemaRef, (doc) => {
        if (doc.exists()) {
          callback(doc.data());
        } else {
          callback(null);
        }
      }, (error) => {
        console.error('❌ Error en suscripción a configuración del sistema:', error);
        callback(null);
      });
    } catch (error) {
      console.error('❌ Error configurando suscripción a configuración del sistema:', error);
      return () => {}; // Función vacía para desuscribir
    }
  },

  // ========== MÉTODOS DE MANTENIMIENTO ==========
  
  async performMaintenance() {
    try {
      console.log('🔧 Iniciando rutina de mantenimiento...');
      
      // 1. Actualizar estadísticas del sistema
      await this.updateSystemStats();
      
      // 2. Limpiar historial antiguo (más de 30 días)
      const postes = await this.getAllPostes();
      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() - 30);
      
      for (const poste of postes) {
        if (poste.historial && poste.historial.length > 100) {
          // Mantener solo los últimos 100 registros
          const historialReciente = poste.historial
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 100);
          
          await this.updateDoc(`postes/${poste.id}`, {
            historial: historialReciente
          });
        }
      }
      
      // 3. Actualizar próxima fecha de mantenimiento
      const sistemaRef = doc(db, 'sistema', 'configuracion');
      await updateDoc(sistemaRef, {
        'mantenimiento.ultimaRevision': serverTimestamp(),
        'mantenimiento.proximaRevision': new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });
      
      console.log('✅ Rutina de mantenimiento completada');
      return true;
    } catch (error) {
      console.error('❌ Error en rutina de mantenimiento:', error);
      return false;
    }
  },

  // ========== MÉTODOS DE BÚSQUEDA Y FILTRADO ==========
  
  async searchPostes(searchTerm) {
    try {
      const postes = await this.getAllPostes();
      
      const filteredPostes = postes.filter(poste => {
        const searchLower = searchTerm.toLowerCase();
        return (
          poste.nombre?.toLowerCase().includes(searchLower) ||
          poste.id?.toLowerCase().includes(searchLower) ||
          poste.ubicacion?.toLowerCase().includes(searchLower) ||
          poste.zona?.toLowerCase().includes(searchLower) ||
          poste.red?.ip?.includes(searchTerm)
        );
      });
      
      return filteredPostes;
    } catch (error) {
      console.error('❌ Error buscando postes:', error);
      return [];
    }
  },

  async getPostesByZone(zona) {
    try {
      const postesRef = collection(db, 'postes');
      const q = query(postesRef, where('zona', '==', zona));
      const snapshot = await getDocs(q);
      const postes = [];
      
      snapshot.forEach((doc) => {
        postes.push({ id: doc.id, ...doc.data() });
      });
      
      return postes;
    } catch (error) {
      console.error(`❌ Error obteniendo postes de zona ${zona}:`, error);
      return [];
    }
  },

  async getOnlinePostes() {
    try {
      const postesRef = collection(db, 'postes');
      const q = query(postesRef, where('estado.online', '==', true));
      const snapshot = await getDocs(q);
      const postes = [];
      
      snapshot.forEach((doc) => {
        postes.push({ id: doc.id, ...doc.data() });
      });
      
      return postes;
    } catch (error) {
      console.error('❌ Error obteniendo postes online:', error);
      return [];
    }
  },

  async getOfflinePostes() {
    try {
      const postesRef = collection(db, 'postes');
      const q = query(postesRef, where('estado.online', '==', false));
      const snapshot = await getDocs(q);
      const postes = [];
      
      snapshot.forEach((doc) => {
        postes.push({ id: doc.id, ...doc.data() });
      });
      
      return postes;
    } catch (error) {
      console.error('❌ Error obteniendo postes offline:', error);
      return [];
    }
  }
};