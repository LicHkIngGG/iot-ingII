// ⚙️ CONFIGURACIÓN DE EMAIL PARA VIAJE SEGURO - CORREGIDO
// backend/config/email.js

const nodemailer = require('nodemailer');
require('dotenv').config();

/**
 * Configuración del transportador de email usando Gmail
 * @returns {Object} Transportador de Nodemailer configurado
 */
const createEmailTransporter = () => {
  try {
    const transporter = nodemailer.createTransport({  // ← CORREGIDO: era createTransporter
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_SECURE === 'true', // true para 465, false para otros puertos
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      },
      // Configuraciones adicionales para Gmail
      tls: {
        rejectUnauthorized: false
      }
    });

    console.log('✅ Transportador de email configurado correctamente');
    return transporter;
  } catch (error) {
    console.error('❌ Error al configurar transportador de email:', error);
    throw error;
  }
};

/**
 * Verificar la conexión con el servidor de email
 * @param {Object} transporter - Transportador de Nodemailer
 * @returns {Promise<boolean>} True si la conexión es exitosa
 */
const verifyEmailConnection = async (transporter) => {
  try {
    await transporter.verify();
    console.log('✅ Conexión con servidor de email verificada');
    return true;
  } catch (error) {
    console.error('❌ Error en la conexión de email:', error);
    return false;
  }
};

/**
 * Configuración base para emails
 */
const emailConfig = {
  from: {
    name: process.env.COMPANY_NAME || 'Smart Ligth',
    address: process.env.EMAIL_USER
  },
  replyTo: process.env.COMPANY_EMAIL || 'soporte@alto.gov.bo',
  
  // Headers personalizados
  headers: {
    'X-Mailer': 'Smart Light Backend v1.0',
    'X-Priority': '1', // Alta prioridad
    'X-MSMail-Priority': 'High'
  }
};

/**
 * Configuraciones específicas por tipo de email
 */
const emailTypes = {
  WELCOME: {
    subject: 'Bienvenido a Smart Ligth - Credenciales de Acceso',
    priority: 'high'
  },
  PASSWORD_RESET: {
    subject: 'Smart Ligth - Nuevas Credenciales de Acceso',
    priority: 'high'
  },
  NOTIFICATION: {
    subject: 'Smart Ligth - Notificación del Sistema',
    priority: 'normal'
  }
};

/**
 * Validar configuración de email
 * @returns {boolean} True si la configuración es válida
 */
const validateEmailConfig = () => {
  const requiredVars = ['EMAIL_USER', 'EMAIL_PASSWORD'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Variables de entorno faltantes:', missingVars);
    return false;
  }
  
  // Validar formato de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(process.env.EMAIL_USER)) {
    console.error('❌ Formato de EMAIL_USER inválido');
    return false;
  }
  
  console.log('✅ Configuración de email válida');
  return true;
};

/**
 * Obtener configuración de email por tipo
 * @param {string} type - Tipo de email (WELCOME, PASSWORD_RESET, etc.)
 * @returns {Object} Configuración específica del tipo de email
 */
const getEmailTypeConfig = (type) => {
  return emailTypes[type] || emailTypes.NOTIFICATION;
};

/**
 * Log de email enviado para auditoría
 * @param {string} to - Destinatario
 * @param {string} subject - Asunto
 * @param {string} type - Tipo de email
 * @param {boolean} success - Si el envío fue exitoso
 */
const logEmailSent = (to, subject, type, success) => {
  const timestamp = new Date().toISOString();
  const status = success ? '✅ ENVIADO' : '❌ ERROR';
  
  console.log(`[EMAIL LOG] ${timestamp} - ${status} - ${type} - ${to} - ${subject}`);
  
  // Aquí podrías agregar logging a archivo o base de datos
  // ejemplo: fs.appendFileSync('logs/email.log', logEntry);
};

module.exports = {
  createEmailTransporter,
  verifyEmailConnection,
  emailConfig,
  emailTypes,
  validateEmailConfig,
  getEmailTypeConfig,
  logEmailSent
};