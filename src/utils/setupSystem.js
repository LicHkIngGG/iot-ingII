// utils/setupSystem.js - Script para configurar el sistema completo
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';

// Función para verificar si un usuario ya existe
const usuarioExiste = async (email) => {
  try {
    const q = query(collection(db, 'usuarios'), where('email', '==', email));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error verificando usuario:', error);
    return false;
  }
};

// Función para crear usuarios de prueba
export const crearUsuariosPrueba = async () => {
  const auth = getAuth();
  
  const usuariosPrueba = [
    {
      email: 'roberto.sea@alto.gov.bo',
      password: '123456',
      nombre: 'Roberto Sea Maldonado',
      rol: 'administrador',
      activo: true
    },
    {
      email: 'jose.rojas@alto.gov.bo',
      password: '123456',
      nombre: 'José Aldair Rojas',
      rol: 'operador',
      activo: true
    }
  ];

  console.log('🔄 Creando usuarios de prueba...');

  for (const userData of usuariosPrueba) {
    try {
      // Verificar si el usuario ya existe en Firestore
      const existe = await usuarioExiste(userData.email);
      if (existe) {
        console.log(`⚠️  Usuario ya existe en Firestore: ${userData.email}`);
        continue;
      }

      // Crear usuario en Firebase Authentication
      let userCredential;
      try {
        userCredential = await createUserWithEmailAndPassword(
          auth, 
          userData.email, 
          userData.password
        );
        console.log(`✅ Usuario creado en Auth: ${userData.email}`);
      } catch (authError) {
        if (authError.code === 'auth/email-already-in-use') {
          console.log(`⚠️  Usuario ya existe en Auth: ${userData.email}`);
          // Continuar para crear en Firestore si no existe
        } else {
          console.error(`❌ Error creando usuario en Auth ${userData.email}:`, authError);
          continue;
        }
      }
      
      // Datos para Firestore
      const firestoreData = {
        nombre: userData.nombre,
        email: userData.email,
        rol: userData.rol,
        activo: userData.activo,
        uid: userCredential?.user?.uid || 'temp-uid',
        requiereCambioPassword: false, // Para pruebas
        fechaCreacion: new Date().toISOString(),
        fechaActualizacion: new Date().toISOString(),
        accionesRealizadas: 0,
        ultimoAcceso: serverTimestamp()
      };
      
      // Guardar en Firestore
      await addDoc(collection(db, 'usuarios'), firestoreData);
      console.log(`✅ Usuario guardado en Firestore: ${userData.email}`);
      
    } catch (error) {
      console.error(`❌ Error general creando ${userData.email}:`, error);
    }
  }
  
  console.log('✅ Proceso de creación de usuarios completado');
};

// Función para crear datos de ejemplo del sistema
export const crearDatosSistema = async () => {
  try {
    console.log('🔄 Creando datos del sistema...');
    
    // Verificar si ya existen postes
    const postesSnapshot = await getDocs(collection(db, 'postes'));
    if (!postesSnapshot.empty) {
      console.log('⚠️  Los datos del sistema ya existen');
      return;
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
        zona: 'Norte',
        fechaCreacion: serverTimestamp(),
        fechaUltimaActualizacion: serverTimestamp()
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
        fechaCreacion: serverTimestamp(),
        fechaUltimaActualizacion: serverTimestamp()
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
        fechaCreacion: serverTimestamp(),
        fechaUltimaActualizacion: serverTimestamp()
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
        fechaCreacion: serverTimestamp(),
        fechaUltimaActualizacion: serverTimestamp()
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
        fechaCreacion: serverTimestamp(),
        fechaUltimaActualizacion: serverTimestamp()
      }
    ];

    // Crear alertas de ejemplo
    const alertas = [
      {
        tipo: 'consumo',
        mensaje: 'Consumo anormal detectado',
        posteId: 'Poste 003',
        severidad: 'high',
        detalles: 'Consumo 67% superior al promedio',
        timestamp: serverTimestamp(),
        leida: false
      },
      {
        tipo: 'comunicacion',
        mensaje: 'Sin comunicación',
        posteId: 'Poste 005',
        severidad: 'critical',
        detalles: 'No responde desde hace 15 minutos',
        timestamp: serverTimestamp(),
        leida: false
      },
      {
        tipo: 'voltaje',
        mensaje: 'Voltaje bajo detectado',
        posteId: 'Poste 003',
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
        posteId: 'Poste 002',
        timestamp: serverTimestamp(),
        detalles: 'Encendido por sensor LDR'
      },
      {
        evento: 'Configuración PIR actualizada',
        tipo: 'config',
        posteId: 'Poste 001',
        timestamp: serverTimestamp(),
        detalles: 'Sensibilidad cambiada a media'
      },
      {
        evento: 'Poste 005 desconectado',
        tipo: 'error',
        posteId: 'Poste 005',
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
    console.log('📊 Creando postes...');
    for (const poste of postes) {
      await addDoc(collection(db, 'postes'), poste);
    }

    console.log('🚨 Creando alertas...');
    for (const alerta of alertas) {
      await addDoc(collection(db, 'alertas'), alerta);
    }

    console.log('📅 Creando eventos...');
    for (const evento of eventos) {
      await addDoc(collection(db, 'eventos'), evento);
    }

    console.log('✅ Datos del sistema creados exitosamente');
    return true;
  } catch (error) {
    console.error('❌ Error creando datos del sistema:', error);
    return false;
  }
};

// Función para configurar todo el sistema
export const configurarSistemaCompleto = async () => {
  try {
    console.log('🚀 Iniciando configuración completa del sistema...');
    
    // 1. Crear usuarios de prueba
    await crearUsuariosPrueba();
    
    // 2. Crear datos del sistema
    await crearDatosSistema();
    
    // 3. Marcar como inicializado
    localStorage.setItem('dataInitialized', 'true');
    
    console.log('🎉 Sistema configurado exitosamente');
    console.log('📋 Credenciales de prueba:');
    console.log('   Admin: roberto.sea@alto.gov.bo / 123456');
    console.log('   Operador: jose.rojas@alto.gov.bo / 123456');
    
    return true;
  } catch (error) {
    console.error('❌ Error en configuración completa:', error);
    return false;
  }
};

// Función para limpiar todos los datos (útil para desarrollo)
export const limpiarDatos = async () => {
  try {
    console.log('🧹 Limpiando datos del sistema...');
    
    const collections = ['usuarios', 'postes', 'alertas', 'eventos', 'logs'];
    
    for (const collectionName of collections) {
      const querySnapshot = await getDocs(collection(db, collectionName));
      const deletePromises = querySnapshot.docs.map(doc => doc.ref.delete());
      await Promise.all(deletePromises);
      console.log(`🗑️  Colección ${collectionName} limpiada`);
    }
    
    localStorage.removeItem('dataInitialized');
    console.log('✅ Datos limpiados exitosamente');
    
    return true;
  } catch (error) {
    console.error('❌ Error limpiando datos:', error);
    return false;
  }
};

// Exportar funciones
export default {
  crearUsuariosPrueba,
  crearDatosSistema,
  configurarSistemaCompleto,
  limpiarDatos
};