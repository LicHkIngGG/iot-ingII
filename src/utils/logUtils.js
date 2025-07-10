// src/utils/logUtils.js
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Registra una acción en los logs del sistema
 * @param {string} usuarioId - ID del usuario
 * @param {string} email - Email del usuario
 * @param {string} accion - Tipo de acción realizada
 * @param {string} detalles - Descripción de la acción
 * @param {string} modulo - Módulo del sistema donde se realizó la acción
 * @param {string} resultado - Resultado de la acción (exitoso, fallido, etc.)
 * @returns {Promise<string|null>} - ID del log creado o null en caso de error
 */
export const registrarLog = async (usuarioId, email, accion, detalles, modulo, resultado = 'exitoso') => {
  try {
    // Crear el objeto de log
    const logData = {
      usuarioId,
      email,
      accion,
      detalles,
      modulo,
      resultado,
      fecha: serverTimestamp(),
      dispositivo: navigator.userAgent || 'Desconocido'
    };
    
    // Añadir a la colección de logs
    const docRef = await addDoc(collection(db, 'logs'), logData);
    console.log('Log registrado correctamente:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error al registrar log:', error);
    return null;
  }
};

/**
 * Registra una acción administrativa y actualiza las estadísticas del administrador
 * @param {string} usuarioId - ID del administrador
 * @param {string} email - Email del administrador
 * @param {string} accion - Tipo de acción realizada
 * @param {string} detalles - Descripción de la acción
 * @param {string} modulo - Módulo del sistema donde se realizó la acción
 * @param {string} resultado - Resultado de la acción (exitoso, fallido, etc.)
 * @returns {Promise<boolean>} - True si se registró correctamente, false en caso contrario
 */
export const registrarAccionAdmin = async (usuarioId, email, accion, detalles, modulo, resultado = 'exitoso') => {
  try {
    // 1. Registrar la acción en logs
    const logId = await registrarLog(usuarioId, email, accion, detalles, modulo, resultado);
    
    // 2. Actualizar contador de acciones del administrador si la acción fue exitosa
    if (resultado === 'exitoso') {
      const adminRef = doc(db, 'usuarios', usuarioId);
      const adminDoc = await getDoc(adminRef);
      
      if (adminDoc.exists()) {
        await updateDoc(adminRef, {
          accionesRealizadas: increment(1),
          ultimoAcceso: serverTimestamp()
        });
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error al registrar acción administrativa:', error);
    return false;
  }
};