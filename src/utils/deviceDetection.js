// src/components/GestionUnidades/utils/deviceDetection.js

/**
 * Utilidades para detección y validación de dispositivos ESP32
 */

// Validar formato de IP
export const isValidIPFormat = (ip) => {
  const ipRegex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = ip.match(ipRegex);
  
  if (!match) return false;
  
  // Verificar que cada octeto esté en el rango 0-255
  for (let i = 1; i <= 4; i++) {
    const octet = parseInt(match[i]);
    if (octet < 0 || octet > 255) return false;
  }
  
  return true;
};

// Probar conexión con ESP32
export const testESP32Connection = async (ip, puerto = 80, timeout = 3000) => {
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(`http://${ip}:${puerto}/api/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'User-Agent': 'GestionUnidades/1.0'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    if (response.ok) {
      const data = await response.json();
      
      // Verificar si es realmente un ESP32 válido
      const isValidESP32 = validateESP32Response(data);
      
      if (isValidESP32) {
        return {
          success: true,
          ip,
          puerto,
          data,
          responseTime,
          timestamp: new Date().toISOString()
        };
      } else {
        throw new Error('Respuesta no válida de ESP32');
      }
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
  } catch (error) {
    return {
      success: false,
      ip,
      puerto,
      error: error.message,
      responseTime: Date.now() - startTime,
      timestamp: new Date().toISOString()
    };
  }
};

// Validar respuesta de ESP32
export const validateESP32Response = (data) => {
  // Verificar que tenga las propiedades básicas de un ESP32
  const requiredFields = ['deviceId', 'ip'];
  const optionalFields = ['ledIntensity', 'uptime', 'sensors', 'linkStatus'];
  
  // Debe tener al menos los campos requeridos
  const hasRequiredFields = requiredFields.some(field => data.hasOwnProperty(field));
  
  // Debe tener al menos uno de los campos opcionales
  const hasOptionalFields = optionalFields.some(field => data.hasOwnProperty(field));
  
  // Verificar que no sea una respuesta genérica de servidor web
  const isNotGenericServer = !data.hasOwnProperty('server') || 
                           data.deviceId || 
                           data.type === 'sensorData';
  
  return hasRequiredFields && hasOptionalFields && isNotGenericServer;
};

// Detectar ESP32 en rango de IPs
export const detectESP32InRange = async (baseIP, startRange, endRange, options = {}) => {
  const {
    timeout = 2000,
    concurrency = 15,
    ports = [80, 8080],
    onProgress = () => {},
    onDeviceFound = () => {},
    onError = () => {}
  } = options;
  
  const totalIPs = endRange - startRange + 1;
  let processed = 0;
  const foundDevices = [];
  
  try {
    // Función para probar una IP específica
    const testSingleIP = async (ipNumber) => {
      const ip = baseIP + ipNumber;
      
      for (const port of ports) {
        try {
          const result = await testESP32Connection(ip, port, timeout);
          
          if (result.success) {
            const device = {
              ...result,
              detectedAt: new Date().toISOString(),
              networkInfo: {
                latency: result.responseTime,
                port: port,
                protocol: 'HTTP'
              }
            };
            
            foundDevices.push(device);
            onDeviceFound(device);
            return device;
          }
        } catch (error) {
          onError({ ip, port, error: error.message });
        }
      }
      
      return null;
    };
    
    // Procesar en lotes para no saturar la red
    for (let i = startRange; i <= endRange; i += concurrency) {
      const batchEnd = Math.min(i + concurrency - 1, endRange);
      const batch = [];
      
      // Crear promesas para el lote actual
      for (let j = i; j <= batchEnd; j++) {
        batch.push(testSingleIP(j));
      }
      
      // Ejecutar lote en paralelo
      const results = await Promise.allSettled(batch);
      
      // Actualizar progreso
      results.forEach(() => {
        processed++;
        onProgress({
          processed,
          total: totalIPs,
          percentage: Math.round((processed / totalIPs) * 100),
          found: foundDevices.length
        });
      });
      
      // Pequeña pausa entre lotes
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return {
      success: true,
      devicesFound: foundDevices,
      totalScanned: totalIPs,
      duration: Date.now() - Date.now() // Se calcularía correctamente en implementación real
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
      devicesFound: foundDevices,
      totalScanned: processed
    };
  }
};

// Generar configuración de red automática
export const generateNetworkConfig = (baseIP, existingDevices = []) => {
  const usedIPs = existingDevices.map(device => {
    const parts = device.ip.split('.');
    return parseInt(parts[3]);
  });
  
  // Encontrar la primera IP disponible
  let newIPSuffix = 101;
  while (usedIPs.includes(newIPSuffix) && newIPSuffix <= 200) {
    newIPSuffix++;
  }
  
  if (newIPSuffix > 200) {
    throw new Error('No hay IPs disponibles en el rango configurado');
  }
  
  return {
    ip: baseIP + newIPSuffix,
    puerto: 80,
    gateway: baseIP + '1',
    subnet: '255.255.255.0',
    dns: '8.8.8.8',
    timeout: 5000
  };
};

// Verificar conectividad de red
export const checkNetworkConnectivity = async (targetIP, timeout = 3000) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    // Intentar hacer ping básico (usando una petición HTTP simple)
    const response = await fetch(`http://${targetIP}`, {
      method: 'HEAD',
      signal: controller.signal,
      mode: 'no-cors' // Para evitar problemas de CORS
    });
    
    clearTimeout(timeoutId);
    return { reachable: true, responseTime: Date.now() };
    
  } catch (error) {
    return { 
      reachable: false, 
      error: error.message,
      responseTime: null 
    };
  }
};

// Obtener información de red local
export const getLocalNetworkInfo = () => {
  try {
    // Intentar detectar la red local (limitado en navegadores)
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    return {
      type: connection?.type || 'unknown',
      effectiveType: connection?.effectiveType || 'unknown',
      downlink: connection?.downlink || null,
      rtt: connection?.rtt || null,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      type: 'unknown',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

// Crear perfil de dispositivo
export const createDeviceProfile = (deviceData, networkInfo = {}) => {
  return {
    // Información básica
    id: deviceData.deviceId || `ESP32_${deviceData.ip?.replace(/\./g, '_')}`,
    nombre: deviceData.deviceName || `Dispositivo ${deviceData.ip}`,
    tipo: 'ESP32-WROOM-32',
    
    // Red
    red: {
      ip: deviceData.ip,
      puerto: networkInfo.port || 80,
      protocolo: 'HTTP/1.1',
      latencia: networkInfo.latency || 0,
      ultimaRespuesta: new Date().toISOString()
    },
    
    // Hardware
    hardware: {
      modelo: deviceData.hardware || 'ESP32-WROOM-32',
      firmware: deviceData.firmwareVersion || 'Desconocida',
      numeroSerie: `ESP32-${Date.now()}`,
      fechaDeteccion: new Date().toISOString()
    },
    
    // Estado
    estado: {
      online: true,
      detectado: true,
      configurado: false,
      uptime: deviceData.uptime || 0
    },
    
    // Sensores detectados
    sensores: {
      detectados: Object.keys(deviceData.sensors || {}),
      funcionando: true,
      ultimaLectura: new Date().toISOString()
    },
    
    // Metadatos
    metadatos: {
      fechaCreacion: new Date().toISOString(),
      creadoPor: 'detector_automatico',
      version: '1.0.0',
      protocolo: 'HTTP'
    }
  };
};

// Validar configuración de red
export const validateNetworkConfig = (config) => {
  const errors = [];
  
  // Validar IP
  if (!config.ip || !isValidIPFormat(config.ip)) {
    errors.push('IP inválida');
  }
  
  // Validar puerto
  if (!config.puerto || config.puerto < 1 || config.puerto > 65535) {
    errors.push('Puerto inválido (1-65535)');
  }
  
  // Continuación de validateNetworkConfig
  // Validar gateway
  if (config.gateway && !isValidIPFormat(config.gateway)) {
    errors.push('Gateway inválido');
  }
  
  // Validar subnet
  if (config.subnet && !isValidIPFormat(config.subnet)) {
    errors.push('Máscara de subred inválida');
  }
  
  // Validar DNS
  if (config.dns && !isValidIPFormat(config.dns)) {
    errors.push('DNS inválido');
  }
  
  // Validar timeout
  if (config.timeout && (config.timeout < 1000 || config.timeout > 30000)) {
    errors.push('Timeout inválido (1000-30000ms)');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Generar rango de IPs inteligente
export const generateSmartIPRange = (knownDevices = []) => {
  // Analizar IPs conocidas para determinar el mejor rango
  if (knownDevices.length === 0) {
    return {
      base: '192.168.1.',
      inicio: 100,
      fin: 200,
      sugerencia: 'Rango estándar para dispositivos IoT'
    };
  }
  
  // Extraer información de red de dispositivos conocidos
  const networks = knownDevices.map(device => {
    const parts = device.ip?.split('.') || ['192', '168', '1', '101'];
    return {
      base: `${parts[0]}.${parts[1]}.${parts[2]}.`,
      lastOctet: parseInt(parts[3])
    };
  });
  
  // Encontrar la red más común
  const networkCount = {};
  networks.forEach(net => {
    networkCount[net.base] = (networkCount[net.base] || 0) + 1;
  });
  
  const mostCommonNetwork = Object.keys(networkCount).reduce((a, b) => 
    networkCount[a] > networkCount[b] ? a : b
  );
  
  // Determinar rango basado en dispositivos existentes
  const devicesInNetwork = networks.filter(net => net.base === mostCommonNetwork);
  const usedOctets = devicesInNetwork.map(net => net.lastOctet);
  
  const minUsed = Math.min(...usedOctets);
  const maxUsed = Math.max(...usedOctets);
  
  return {
    base: mostCommonNetwork,
    inicio: Math.max(100, minUsed - 10),
    fin: Math.min(200, maxUsed + 10),
    sugerencia: `Rango optimizado basado en ${knownDevices.length} dispositivos conocidos`
  };
};

// Diagnóstico de conectividad
export const diagnosePDeviceConnectivity = async (ip, puerto = 80) => {
  const results = {
    ip,
    puerto,
    timestamp: new Date().toISOString(),
    tests: {}
  };
  
  try {
    // Test 1: Conectividad básica
    console.log(`🔍 Diagnosticando conectividad para ${ip}:${puerto}...`);
    
    const pingResult = await checkNetworkConnectivity(ip, 3000);
    results.tests.ping = {
      name: 'Conectividad de Red',
      status: pingResult.reachable ? 'success' : 'error',
      message: pingResult.reachable ? 'Red alcanzable' : `Error: ${pingResult.error}`,
      responseTime: pingResult.responseTime
    };
    
    // Test 2: Puerto HTTP
    try {
      const portTest = await testESP32Connection(ip, puerto, 5000);
      results.tests.http = {
        name: 'Puerto HTTP',
        status: portTest.success ? 'success' : 'error',
        message: portTest.success ? 'Puerto accesible' : `Error: ${portTest.error}`,
        responseTime: portTest.responseTime
      };
      
      if (portTest.success) {
        results.deviceData = portTest.data;
      }
    } catch (error) {
      results.tests.http = {
        name: 'Puerto HTTP',
        status: 'error',
        message: `Error de conexión: ${error.message}`,
        responseTime: null
      };
    }
    
    // Test 3: Validación de endpoints
    if (results.tests.http?.status === 'success') {
      const endpoints = ['/api/status', '/api/info', '/'];
      results.tests.endpoints = {};
      
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(`http://${ip}:${puerto}${endpoint}`, {
            method: 'GET',
            timeout: 3000
          });
          
          results.tests.endpoints[endpoint] = {
            status: response.ok ? 'success' : 'warning',
            code: response.status,
            message: response.ok ? 'Disponible' : `HTTP ${response.status}`
          };
        } catch (error) {
          results.tests.endpoints[endpoint] = {
            status: 'error',
            message: error.message
          };
        }
      }
    }
    
    // Resumen general
    const allTests = [
      results.tests.ping,
      results.tests.http,
      ...Object.values(results.tests.endpoints || {})
    ];
    
    const successCount = allTests.filter(test => test.status === 'success').length;
    const totalTests = allTests.length;
    
    results.summary = {
      overall: successCount === totalTests ? 'success' : 
               successCount > 0 ? 'warning' : 'error',
      successRate: Math.round((successCount / totalTests) * 100),
      recommendation: generateConnectivityRecommendation(results)
    };
    
  } catch (error) {
    results.error = error.message;
    results.summary = {
      overall: 'error',
      successRate: 0,
      recommendation: 'Error general en el diagnóstico'
    };
  }
  
  return results;
};

// Generar recomendación basada en diagnóstico
const generateConnectivityRecommendation = (results) => {
  const { ping, http, endpoints } = results.tests;
  
  if (!ping || ping.status === 'error') {
    return 'Verificar conectividad de red. El dispositivo no es alcanzable.';
  }
  
  if (!http || http.status === 'error') {
    return 'Red alcanzable pero puerto HTTP no responde. Verificar que el dispositivo esté encendido.';
  }
  
  if (endpoints && Object.values(endpoints).some(ep => ep.status === 'error')) {
    return 'Dispositivo conectado pero algunos endpoints no están disponibles. Verificar firmware.';
  }
  
  return 'Dispositivo totalmente funcional y accesible.';
};

// Configuración avanzada de detección
export const createAdvancedDetectionConfig = (options = {}) => {
  return {
    // Configuración de red
    network: {
      baseIP: options.baseIP || '192.168.1.',
      startRange: options.startRange || 100,
      endRange: options.endRange || 200,
      ports: options.ports || [80, 8080, 3000],
      timeout: options.timeout || 3000
    },
    
    // Configuración de rendimiento
    performance: {
      concurrency: options.concurrency || 15,
      batchSize: options.batchSize || 10,
      delayBetweenBatches: options.delayBetweenBatches || 100,
      retries: options.retries || 2
    },
    
    // Configuración de validación
    validation: {
      validateResponse: options.validateResponse !== false,
      requiredFields: options.requiredFields || ['deviceId'],
      optionalFields: options.optionalFields || ['sensors', 'uptime'],
      skipGenericServers: options.skipGenericServers !== false
    },
    
    // Configuración de callbacks
    callbacks: {
      onProgress: options.onProgress || (() => {}),
      onDeviceFound: options.onDeviceFound || (() => {}),
      onError: options.onError || (() => {}),
      onBatchComplete: options.onBatchComplete || (() => {})
    }
  };
};

// Exportar configuraciones predeterminadas
export const DEFAULT_DETECTION_CONFIG = {
  FAST: createAdvancedDetectionConfig({
    timeout: 1500,
    concurrency: 20,
    ports: [80]
  }),
  
  THOROUGH: createAdvancedDetectionConfig({
    timeout: 5000,
    concurrency: 10,
    ports: [80, 8080, 3000, 8000],
    retries: 3
  }),
  
  CONSERVATIVE: createAdvancedDetectionConfig({
    timeout: 3000,
    concurrency: 5,
    ports: [80, 8080],
    delayBetweenBatches: 500
  })
};

// Utilidades de logging
export const createDetectionLogger = (enableConsole = true) => {
  const logs = [];
  
  return {
    log: (message, type = 'info') => {
      const entry = {
        timestamp: new Date().toISOString(),
        type,
        message
      };
      
      logs.push(entry);
      
      if (enableConsole) {
        const emoji = {
          info: 'ℹ️',
          success: '✅',
          warning: '⚠️',
          error: '❌'
        };
        
        console.log(`${emoji[type] || 'ℹ️'} ${message}`);
      }
      
      return entry;
    },
    
    getLogs: () => [...logs],
    
    clearLogs: () => {
      logs.length = 0;
    },
    
    getLogsByType: (type) => logs.filter(log => log.type === type)
  };
};

// Exportar todas las utilidades
export default {
  isValidIPFormat,
  testESP32Connection,
  validateESP32Response,
  detectESP32InRange,
  generateNetworkConfig,
  checkNetworkConnectivity,
  getLocalNetworkInfo,
  createDeviceProfile,
  validateNetworkConfig,
  generateSmartIPRange,
  diagnosePDeviceConnectivity,
  createAdvancedDetectionConfig,
  createDetectionLogger,
  DEFAULT_DETECTION_CONFIG
};