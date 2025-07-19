// 🚀 SERVIDOR PRINCIPAL - BACKEND VIAJE SEGURO
// backend/server.js

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

// Importar configuraciones
const { validateEmailConfig } = require('./config/email');

// Importar rutas
const emailRoutes = require('./routes/email');

// Crear aplicación Express
const app = express();
const PORT = process.env.PORT || 5000;

// ========================================
// MIDDLEWARES GLOBALES
// ========================================

// Seguridad con Helmet
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Logging con Morgan
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// CORS configurado
// 🔧 CONFIGURACIÓN CORS CORREGIDA PARA server.js
// Reemplaza la sección CORS en tu server.js

// CORS configurado - VERSIÓN CORREGIDA
const corsOptions = {
  origin: function (origin, callback) {
    // Permitir requests sin origin (apps móviles, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Lista de orígenes permitidos
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173',  // ← PUERTO VITE AGREGADO
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:5173'   // ← PUERTO VITE AGREGADO
    ];
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      console.log('❌ Origen no permitido por CORS:', origin);
      return callback(new Error('No permitido por política CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'X-API-Key'
  ],
  optionsSuccessStatus: 200 // Para navegadores legacy
};

app.use(cors(corsOptions));

// Middleware adicional para manejar preflight requests
app.options('*', cors(corsOptions));

// Parsear JSON
app.use(express.json({ limit: '10mb' }));

// Parsear URL encoded
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ========================================
// MIDDLEWARE DE VALIDACIÓN INICIAL
// ========================================

// Verificar configuración de email al iniciar
app.use((req, res, next) => {
  // Solo validar en rutas de email
  if (req.path.startsWith('/api/')) {
    if (!validateEmailConfig()) {
      return res.status(500).json({
        success: false,
        message: 'Configuración de email inválida',
        error: 'Verificar variables de entorno EMAIL_USER y EMAIL_PASSWORD'
      });
    }
  }
  next();
});

// ========================================
// RUTAS PRINCIPALES
// ========================================

// Ruta de salud del servidor
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Backend Smart Ligth - API funcionando correctamente',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: [
      'GET  /api/status - Estado del servicio de email',
      'POST /api/enviar-credenciales - Enviar credenciales a nuevo usuario',
      'POST /api/reenviar-credenciales - Reenviar credenciales existente'
    ]
  });
});

// Rutas de API
app.use('/api', emailRoutes);

// ========================================
// MANEJO DE ERRORES
// ========================================

// Ruta no encontrada
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Middleware de manejo de errores globales
app.use((error, req, res, next) => {
  console.error('❌ Error no manejado:', error);

  // Error de sintaxis JSON
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({
      success: false,
      message: 'JSON inválido en la petición',
      error: 'Verificar formato del cuerpo de la petición'
    });
  }

  // Error genérico
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Error interno del servidor',
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// ========================================
// INICIALIZACIÓN DEL SERVIDOR
// ========================================

// Función para inicializar el servidor
const startServer = async () => {
  try {
    // Verificar configuración antes de iniciar
    console.log('🔧 Verificando configuración...');
    
    if (!validateEmailConfig()) {
      throw new Error('Configuración de email inválida');
    }

    // Iniciar servidor
    const server = app.listen(PORT, () => {
      console.log('🚀 ====================================');
      console.log('🚀 BACKEND Smart Ligth INICIADO');
      console.log('🚀 ====================================');
      console.log(`📡 Servidor ejecutándose en puerto: ${PORT}`);
      console.log(`🌐 URL: http://localhost:${PORT}`);
      console.log(`🔧 Entorno: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📧 Email configurado: ${process.env.EMAIL_USER}`);
      console.log(`🌍 CORS habilitado para: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
      console.log('🚀 ====================================');
      
      // Endpoints disponibles
      console.log('📋 ENDPOINTS DISPONIBLES:');
      console.log('   GET  / - Información del servidor');
      console.log('   GET  /api/status - Estado del servicio');
      console.log('   POST /api/enviar-credenciales');
      console.log('   POST /api/reenviar-credenciales');
      if (process.env.NODE_ENV !== 'production') {
        console.log('   GET  /api/test-email - Prueba de email (dev)');
      }
      console.log('🚀 ====================================');
    });

    // Manejo graceful de cierre del servidor
    process.on('SIGTERM', () => {
      console.log('📴 Cerrando servidor...');
      server.close(() => {
        console.log('✅ Servidor cerrado correctamente');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('📴 Cerrando servidor...');
      server.close(() => {
        console.log('✅ Servidor cerrado correctamente');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Error al iniciar servidor:', error);
    process.exit(1);
  }
};

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  console.error('❌ Error no capturado:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesa rechazada no manejada:', reason);
  process.exit(1);
});

// Iniciar servidor
startServer();

module.exports = app;