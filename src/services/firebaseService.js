// services/firebaseService.js
import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  getDoc,
  setDoc
} from 'firebase/firestore';
import { db } from '../utils/firebase'

class FirebaseService {
  // Métodos para Usuarios
  async getUsuarios() {
    const querySnapshot = await getDocs(collection(db, 'usuarios'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async createUsuario(userData) {
    const docRef = await addDoc(collection(db, 'usuarios'), {
      ...userData,
      fechaCreacion: serverTimestamp(),
      activo: true
    });
    return docRef.id;
  }

  async updateUsuario(id, userData) {
    const docRef = doc(db, 'usuarios', id);
    await updateDoc(docRef, {
      ...userData,
      fechaActualizacion: serverTimestamp()
    });
  }

  async deleteUsuario(id) {
    await deleteDoc(doc(db, 'usuarios', id));
  }

  // Métodos para Postes
  async getPostes() {
    const querySnapshot = await getDocs(collection(db, 'postes'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async createPoste(posteData) {
    const docRef = await addDoc(collection(db, 'postes'), {
      ...posteData,
      fechaCreacion: serverTimestamp(),
      estado: 'offline',
      encendido: false
    });
    return docRef.id;
  }

  async updatePoste(id, posteData) {
    const docRef = doc(db, 'postes', id);
    await updateDoc(docRef, {
      ...posteData,
      fechaActualizacion: serverTimestamp()
    });
  }

  async deletePoste(id) {
    await deleteDoc(doc(db, 'postes', id));
  }

  // Métodos para Monitoreo en tiempo real
  subscribeToPostes(callback) {
    const q = query(collection(db, 'postes'), orderBy('nombre'));
    return onSnapshot(q, (snapshot) => {
      const postes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(postes);
    });
  }

  // Métodos para Alertas
  async getAlertas() {
    const q = query(collection(db, 'alertas'), orderBy('timestamp', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async createAlerta(alertaData) {
    const docRef = await addDoc(collection(db, 'alertas'), {
      ...alertaData,
      timestamp: serverTimestamp(),
      leida: false
    });
    return docRef.id;
  }

  async markAlertaAsRead(id) {
    const docRef = doc(db, 'alertas', id);
    await updateDoc(docRef, {
      leida: true,
      fechaLectura: serverTimestamp()
    });
  }

  // Métodos para Eventos
  async getEventos() {
    const q = query(collection(db, 'eventos'), orderBy('timestamp', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async createEvento(eventoData) {
    const docRef = await addDoc(collection(db, 'eventos'), {
      ...eventoData,
      timestamp: serverTimestamp()
    });
    return docRef.id;
  }

  // Métodos para Configuración de Sensores (CORREGIDO)
  async getConfiguracionSensores() {
    const querySnapshot = await getDocs(collection(db, 'configuracionSensores'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async updateConfiguracionSensor(posteId, config) {
    const docRef = doc(db, 'configuracionSensores', posteId);
    
    // Usar setDoc con merge: true para crear el documento si no existe
    await setDoc(docRef, {
      ...config,
      fechaActualizacion: serverTimestamp()
    }, { merge: true });
  }

  // Método alternativo más robusto para configuración de sensores
  async updateConfiguracionSensorRobust(posteId, config) {
    const docRef = doc(db, 'configuracionSensores', posteId);
    
    try {
      // Intentar verificar si el documento existe
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        // El documento existe, actualizar
        await updateDoc(docRef, {
          ...config,
          fechaActualizacion: serverTimestamp()
        });
      } else {
        // El documento no existe, crear
        await setDoc(docRef, {
          ...config,
          fechaCreacion: serverTimestamp(),
          fechaActualizacion: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error al actualizar configuración:', error);
      // Como fallback, usar setDoc con merge
      await setDoc(docRef, {
        ...config,
        fechaActualizacion: serverTimestamp()
      }, { merge: true });
    }
  }

  // Métodos para Reportes
  async getReporteConsumo(fechaInicio, fechaFin) {
    const q = query(
      collection(db, 'reportesConsumo'),
      where('fecha', '>=', fechaInicio),
      where('fecha', '<=', fechaFin),
      orderBy('fecha')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async createReporteConsumo(reporteData) {
    const docRef = await addDoc(collection(db, 'reportesConsumo'), {
      ...reporteData,
      timestamp: serverTimestamp()
    });
    return docRef.id;
  }

  // Métodos para Control de Luminarias
  async controlLuminaria(posteId, accion, valor = null) {
    const docRef = doc(db, 'postes', posteId);
    const updateData = {
      fechaUltimaAccion: serverTimestamp()
    };

    switch (accion) {
      case 'encender':
        updateData.encendido = true;
        updateData.intensidad = valor || 100;
        break;
      case 'apagar':
        updateData.encendido = false;
        updateData.intensidad = 0;
        break;
      case 'dimmer':
        updateData.intensidad = valor;
        break;
    }

    await updateDoc(docRef, updateData);
    
    // Crear evento
    await this.createEvento({
      posteId,
      accion,
      valor,
      tipo: 'control',
      usuario: 'sistema' // Se puede cambiar por el usuario actual
    });
  }

  // Métodos para Control Grupal
  async controlGrupoLuminarias(posteIds, accion, valor = null) {
    const promises = posteIds.map(posteId => 
      this.controlLuminaria(posteId, accion, valor)
    );
    await Promise.all(promises);
  }

  // Inicializar datos de ejemplo (CORREGIDO)
  async initializeExampleData() {
    try {
      // Verificar si ya existen datos para evitar duplicados
      const existingPostes = await this.getPostes();
      if (existingPostes.length > 0) {
        console.log('Los datos ya están inicializados');
        return;
      }

      // Crear usuarios de ejemplo
      const usuarios = [
        {
          nombre: 'Roberto Sea Maldonado',
          email: 'roberto.sea@alto.gov.bo',
          rol: 'administrador',
          activo: true
        },
        {
          nombre: 'José Aldair Rojas',
          email: 'jose.rojas@alto.gov.bo',
          rol: 'operador',
          activo: true
        }
      ];

      for (const usuario of usuarios) {
        await this.createUsuario(usuario);
      }

      // Crear postes de ejemplo
      const postes = [
        {
          nombre: 'Poste 001',
          ubicacion: 'Av. Principal 123, Villa Adela',
          estado: 'online',
          encendido: true,
          intensidad: 80,
          consumoActual: 245,
          voltaje: 220,
          corriente: 1.11,
          tipoLED: '60W',
          coordenadas: { lat: -16.5000, lng: -68.1500 },
          zona: 'Norte'
        },
        {
          nombre: 'Poste 002',
          ubicacion: 'Calle Murillo 456, Villa Adela',
          estado: 'online',
          encendido: true,
          intensidad: 100,
          consumoActual: 298,
          voltaje: 218,
          corriente: 1.36,
          tipoLED: '60W',
          coordenadas: { lat: -16.5010, lng: -68.1510 },
          zona: 'Norte'
        },
        {
          nombre: 'Poste 003',
          ubicacion: 'Plaza Central, Villa Adela',
          estado: 'warning',
          encendido: true,
          intensidad: 75,
          consumoActual: 410,
          voltaje: 215,
          corriente: 1.91,
          tipoLED: '60W',
          coordenadas: { lat: -16.5020, lng: -68.1520 },
          zona: 'Centro'
        },
        {
          nombre: 'Poste 004',
          ubicacion: 'Av. Secundaria 789, Villa Adela',
          estado: 'online',
          encendido: false,
          intensidad: 0,
          consumoActual: 0,
          voltaje: 222,
          corriente: 0,
          tipoLED: '60W',
          coordenadas: { lat: -16.5030, lng: -68.1530 },
          zona: 'Sur'
        },
        {
          nombre: 'Poste 005',
          ubicacion: 'Calle Los Andes, Villa Adela',
          estado: 'offline',
          encendido: false,
          intensidad: 0,
          consumoActual: 0,
          voltaje: 0,
          corriente: 0,
          tipoLED: '60W',
          coordenadas: { lat: -16.5040, lng: -68.1540 },
          zona: 'Sur'
        }
      ];

      // Crear postes y guardar sus IDs
      const posteIds = [];
      for (const poste of postes) {
        const posteId = await this.createPoste(poste);
        posteIds.push(posteId);
      }

      // Crear alertas de ejemplo usando IDs reales
      const alertas = [
        {
          tipo: 'consumo',
          mensaje: 'Consumo anormal detectado',
          posteId: posteIds[2], // Poste 003
          severidad: 'high',
          detalles: 'Consumo 67% superior al promedio'
        },
        {
          tipo: 'comunicacion',
          mensaje: 'Sin comunicación',
          posteId: posteIds[4], // Poste 005
          severidad: 'critical',
          detalles: 'No responde desde hace 15 minutos'
        },
        {
          tipo: 'voltaje',
          mensaje: 'Voltaje bajo detectado',
          posteId: posteIds[2], // Poste 003
          severidad: 'medium',
          detalles: 'Voltaje: 215V (Normal: 220V)'
        }
      ];

      for (const alerta of alertas) {
        await this.createAlerta(alerta);
      }

      // Crear configuración de sensores de ejemplo usando IDs reales
      const configuraciones = [
        {
          posteId: posteIds[0], // Poste 001
          ldr: {
            umbralEncendido: 100,
            umbralApagado: 300,
            calibracion: 1.0
          },
          pir: {
            sensibilidad: 'media',
            tiempoActivacion: 30,
            rangoDeteccion: 5
          },
          automatizacion: {
            autoEncendido: true,
            autoApagado: true,
            dimmerNocturno: true,
            dimmerHora: '22:00',
            dimmerIntensidad: 50
          }
        },
        {
          posteId: posteIds[1], // Poste 002
          ldr: {
            umbralEncendido: 120,
            umbralApagado: 280,
            calibracion: 1.1
          },
          pir: {
            sensibilidad: 'alta',
            tiempoActivacion: 45,
            rangoDeteccion: 8
          },
          automatizacion: {
            autoEncendido: true,
            autoApagado: true,
            dimmerNocturno: false,
            dimmerHora: '23:00',
            dimmerIntensidad: 60
          }
        }
      ];

      for (const config of configuraciones) {
        await this.updateConfiguracionSensor(config.posteId, config);
      }

      // Crear algunos eventos de ejemplo
      const eventos = [
        {
          posteId: posteIds[0],
          accion: 'encender',
          valor: 100,
          tipo: 'automatico',
          usuario: 'sistema'
        },
        {
          posteId: posteIds[1],
          accion: 'dimmer',
          valor: 80,
          tipo: 'manual',
          usuario: 'roberto.sea@alto.gov.bo'
        }
      ];

      for (const evento of eventos) {
        await this.createEvento(evento);
      }

      console.log('Datos de ejemplo inicializados correctamente');
    } catch (error) {
      console.error('Error al inicializar datos:', error);
      throw error;
    }
  }

  // Método para limpiar todos los datos (útil para desarrollo)
  async clearAllData() {
    try {
      const collections = ['usuarios', 'postes', 'alertas', 'eventos', 'configuracionSensores', 'reportesConsumo'];
      
      for (const collectionName of collections) {
        const querySnapshot = await getDocs(collection(db, collectionName));
        const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
      }
      
      console.log('Todos los datos han sido eliminados');
    } catch (error) {
      console.error('Error al limpiar datos:', error);
      throw error;
    }
  }
}

export default new FirebaseService();