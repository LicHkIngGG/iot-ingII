// 🛣️ RUTAS PARA ENVÍO DE EMAILS - VIAJE SEGURO
// backend/routes/email.js

const express = require('express');
const router = express.Router();

// Importar configuraciones y templates
const {
  createEmailTransporter,
  verifyEmailConnection,
  emailConfig,
  getEmailTypeConfig,
  logEmailSent
} = require('../config/email');

const {
  getWelcomeEmailTemplate,
  getWelcomeEmailTextTemplate
} = require('../templates/emailTemplate');

// Crear transportador una sola vez
let transporter = null;

// Inicializar transportador
const initializeTransporter = async () => {
  try {
    if (!transporter) {
      transporter = createEmailTransporter();
      const isConnected = await verifyEmailConnection(transporter);
      
      if (!isConnected) {
        throw new Error('No se pudo conectar con el servidor de email');
      }
    }
    return transporter;
  } catch (error) {
    console.error('❌ Error al inicializar transportador:', error);
    throw error;
  }
};

// Middleware para validar datos de email
const validateEmailData = (req, res, next) => {
  const { destinatario, nombreCompleto, emailCorporativo, passwordTemporal } = req.body;

  // Validar campos requeridos
  if (!destinatario || !nombreCompleto || !emailCorporativo || !passwordTemporal) {
    return res.status(400).json({
      success: false,
      message: 'Faltan datos requeridos',
      missingFields: {
        destinatario: !destinatario,
        nombreCompleto: !nombreCompleto,
        emailCorporativo: !emailCorporativo,
        passwordTemporal: !passwordTemporal
      }
    });
  }

  // Validar formato de emails
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(destinatario)) {
    return res.status(400).json({
      success: false,
      message: 'El correo personal tiene un formato inválido'
    });
  }

  if (!emailRegex.test(emailCorporativo)) {
    return res.status(400).json({
      success: false,
      message: 'El correo corporativo tiene un formato inválido'
    });
  }

  // Validar longitud de contraseña
  if (passwordTemporal.length < 8) {
    return res.status(400).json({
      success: false,
      message: 'La contraseña debe tener al menos 8 caracteres'
    });
  }

  next();
};

// 📧 RUTA: Enviar credenciales a nuevo usuario
router.post('/enviar-credenciales', validateEmailData, async (req, res) => {
  try {
    const {
      destinatario,
      nombreCompleto,
      emailCorporativo,
      passwordTemporal,
      tipo = 'Administrador'
    } = req.body;

    console.log(`📤 Iniciando envío de credenciales a: ${destinatario}`);

    // Inicializar transportador
    const emailTransporter = await initializeTransporter();

    // Obtener configuración del tipo de email
    const typeConfig = getEmailTypeConfig('WELCOME');

    // Preparar datos para el template
    const templateData = {
      nombreCompleto,
      emailCorporativo,
      passwordTemporal,
      tipo
    };

    // Configurar opciones del email
    const mailOptions = {
      from: emailConfig.from,
      to: destinatario,
      replyTo: emailConfig.replyTo,
      subject: typeConfig.subject,
      headers: emailConfig.headers,
      html: getWelcomeEmailTemplate(templateData),
      text: getWelcomeEmailTextTemplate(templateData), // Fallback texto plano
      priority: typeConfig.priority,
      
      // Configuraciones adicionales
      attachDataUrls: true, // Para imágenes embebidas
      encoding: 'utf8'
    };

    // Enviar email
    const result = await emailTransporter.sendMail(mailOptions);

    // Log del envío exitoso
    logEmailSent(destinatario, typeConfig.subject, 'WELCOME', true);

    console.log(`✅ Credenciales enviadas exitosamente a: ${destinatario}`);
    console.log(`📧 Message ID: ${result.messageId}`);
    
    res.status(200).json({
      success: true,
      message: 'Credenciales enviadas exitosamente',
      data: {
        messageId: result.messageId,
        destinatario: destinatario,
        usuario: nombreCompleto,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error al enviar credenciales:', error);

    // Log del error
    logEmailSent(req.body.destinatario || 'unknown', 'WELCOME_ERROR', 'WELCOME', false);

    // Respuesta de error
    res.status(500).json({
      success: false,
      message: 'Error al enviar las credenciales por correo',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno del servidor',
      timestamp: new Date().toISOString()
    });
  }
});

// 🔄 RUTA: Reenviar credenciales a usuario existente
router.post('/reenviar-credenciales', validateEmailData, async (req, res) => {
  try {
    const {
      destinatario,
      nombreCompleto,
      emailCorporativo,
      passwordTemporal,
      tipo = 'Administrador'
    } = req.body;

    console.log(`🔄 Iniciando reenvío de credenciales a: ${destinatario}`);

    // Inicializar transportador
    const emailTransporter = await initializeTransporter();

    // Obtener configuración del tipo de email
    const typeConfig = getEmailTypeConfig('PASSWORD_RESET');

    // Preparar datos para el template
    const templateData = {
      nombreCompleto,
      emailCorporativo,
      passwordTemporal,
      tipo
    };

    // Configurar opciones del email
    const mailOptions = {
      from: emailConfig.from,
      to: destinatario,
      replyTo: emailConfig.replyTo,
      subject: typeConfig.subject,
      headers: {
        ...emailConfig.headers,
        'X-Email-Type': 'RESEND'
      },
      html: getWelcomeEmailTemplate(templateData),
      text: getWelcomeEmailTextTemplate(templateData),
      priority: typeConfig.priority
    };

    // Enviar email
    const result = await emailTransporter.sendMail(mailOptions);

    // Log del envío exitoso
    logEmailSent(destinatario, typeConfig.subject, 'PASSWORD_RESET', true);

    console.log(`✅ Credenciales reenviadas exitosamente a: ${destinatario}`);
    console.log(`📧 Message ID: ${result.messageId}`);

    res.status(200).json({
      success: true,
      message: 'Credenciales reenviadas exitosamente',
      data: {
        messageId: result.messageId,
        destinatario: destinatario,
        usuario: nombreCompleto,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error al reenviar credenciales:', error);

    // Log del error
    logEmailSent(req.body.destinatario || 'unknown', 'RESEND_ERROR', 'PASSWORD_RESET', false);

    res.status(500).json({
      success: false,
      message: 'Error al reenviar las credenciales por correo',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno del servidor',
      timestamp: new Date().toISOString()
    });
  }
});

// 🧪 RUTA: Probar configuración de email (solo para desarrollo)
router.get('/test-email', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      success: false,
      message: 'Endpoint no disponible en producción'
    });
  }

  try {
    const emailTransporter = await initializeTransporter();
    
    res.status(200).json({
      success: true,
      message: 'Configuración de email válida',
      config: {
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        user: process.env.EMAIL_USER,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error en la configuración de email',
      error: error.message
    });
  }
});

// 📊 RUTA: Estado del servicio de email
router.get('/status', async (req, res) => {
  try {
    const emailTransporter = await initializeTransporter();
    
    res.status(200).json({
      success: true,
      message: 'Servicio de email operativo',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      info: {
        provider: 'Gmail SMTP',
        port: process.env.EMAIL_PORT,
        secure: process.env.EMAIL_SECURE === 'true'
      }
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Servicio de email no disponible',
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Middleware de manejo de errores para las rutas
router.use((error, req, res, next) => {
  console.error('❌ Error en ruta de email:', error);
  
  res.status(500).json({
    success: false,
    message: 'Error interno en el servicio de email',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;