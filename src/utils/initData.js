// utils/initData.js - Archivo temporal para inicializar datos
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export const initializeExampleData = async () => {
  try {
    console.log('Inicializando datos de ejemplo...');
    
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
        zona: 'Norte',
        fechaCreacion: serverTimestamp()
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
        zona: 'Norte',
        fechaCreacion: serverTimestamp()
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
        zona: 'Centro',
        fechaCreacion: serverTimestamp()
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
        zona: 'Sur',
        fechaCreacion: serverTimestamp()
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
        zona: 'Sur',
        fechaCreacion: serverTimestamp()
      }
    ];

    // Crear alertas de ejemplo
    const alertas = [
      {
        tipo: 'consumo',
        mensaje: 'Consumo anormal detectado',
        posteId: 'poste003',
        severidad: 'high',
        detalles: 'Consumo 67% superior al promedio',
        timestamp: serverTimestamp(),
        leida: false
      },
      {
        tipo: 'comunicacion',
        mensaje: 'Sin comunicación',
        posteId: 'poste005',
        severidad: 'critical',
        detalles: 'No responde desde hace 15 minutos',
        timestamp: serverTimestamp(),
        leida: false
      },
      {
        tipo: 'voltaje',
        mensaje: 'Voltaje bajo detectado',
        posteId: 'poste003',
        severidad: 'medium',
        detalles: 'Voltaje: 215V (Normal: 220V)',
        timestamp: serverTimestamp(),
        leida: false
      }
    ];

    // Crear eventos de ejemplo
    const eventos = [
      {
        evento: 'Poste 002 encendido automático',
        tipo: 'auto',
        posteId: 'poste002',
        timestamp: serverTimestamp(),
        detalles: 'Encendido por sensor LDR'
      },
      {
        evento: 'Configuración PIR actualizada',
        tipo: 'config',
        posteId: 'poste001',
        timestamp: serverTimestamp(),
        detalles: 'Sensibilidad cambiada a media'
      },
      {
        evento: 'Poste 005 desconectado',
        tipo: 'error',
        posteId: 'poste005',
        timestamp: serverTimestamp(),
        detalles: 'Pérdida de comunicación'
      },
      {
        evento: 'Modo nocturno activado',
        tipo: 'sistema',
        timestamp: serverTimestamp(),
        detalles: 'Activación automática a las 18:00'
      }
    ];

    // Insertar datos en Firestore
    for (const poste of postes) {
      await addDoc(collection(db, 'postes'), poste);
    }

    for (const alerta of alertas) {
      await addDoc(collection(db, 'alertas'), alerta);
    }

    for (const evento of eventos) {
      await addDoc(collection(db, 'eventos'), evento);
    }

    console.log('Datos de ejemplo creados exitosamente');
    return true;
  } catch (error) {
    console.error('Error creando datos de ejemplo:', error);
    return false;
  }
};