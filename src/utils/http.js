// src/utils/http.js - HTTP Manager para ESP32 + WIZnet - VERSIÓN CORREGIDA CORS
export class HttpManager {
  constructor(ip, port = 80) {
    this.ip = ip;
    this.port = port;
    this.baseUrl = `http://${ip}:${port}`;
    this.isConnected = false;
    this.callbacks = {
      onConnect: [],
      onDisconnect: [],
      onMessage: [],
      onError: []
    };
    this.pollInterval = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectTimeout = null;
    this.pollFrequency = 3000; // 3 segundos
  }

  // MÉTODO PRINCIPAL: Fetch con configuración CORS corregida
  getFetchOptions(method = 'GET', body = null) {
    const options = {
      method: method,
      mode: 'cors',              // ← CORS explícito
      cache: 'no-cache',         // ← Evitar cache
      credentials: 'omit',       // ← Sin credenciales
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
        // NO añadir Cache-Control u otros headers que puedan causar preflight
      },
      redirect: 'follow',
      referrerPolicy: 'no-referrer'
    };

    if (body) {
      options.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    return options;
  }

  async connect() {
    try {
      console.log(`🔄 Conectando a ${this.baseUrl}`);
     
      // Probar conexión con timeout y configuración CORS corregida
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
     
      const response = await fetch(`${this.baseUrl}/api/status`, {
        ...this.getFetchOptions('GET'),  // ← USAR CONFIGURACIÓN CORREGIDA
        signal: controller.signal
      });
     
      clearTimeout(timeoutId);
     
      if (response.ok) {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        console.log(`✅ HTTP conectado a ${this.baseUrl}`);
        this.callbacks.onConnect.forEach(cb => cb());
       
        // Obtener estado inicial
        const data = await response.json();
        this.callbacks.onMessage.forEach(cb => cb(data));
       
        // Iniciar polling
        this.startPolling();
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Error conectando HTTP:', error);
      
      // Mejorar manejo de errores CORS
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        const corsError = new Error(`Error CORS: El ESP32 en ${this.ip}:${this.port} no permite conexiones desde el navegador. Verificar configuración CORS del ESP32.`);
        this.callbacks.onError.forEach(cb => cb(corsError));
      } else {
        this.callbacks.onError.forEach(cb => cb(error));
      }
      
      this.handleReconnect();
      return false;
    }
  }

  startPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
   
    console.log(`📡 Iniciando polling cada ${this.pollFrequency}ms`);
   
    this.pollInterval = setInterval(async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
       
        const response = await fetch(`${this.baseUrl}/api/status`, {
          ...this.getFetchOptions('GET'),  // ← USAR CONFIGURACIÓN CORREGIDA
          signal: controller.signal
          // NO añadir headers adicionales como Cache-Control
        });
       
        clearTimeout(timeoutId);
       
        if (response.ok) {
          const data = await response.json();
          this.callbacks.onMessage.forEach(cb => cb(data));
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        console.error('❌ Error en polling:', error.name, error.message);
        this.disconnect();
        this.handleReconnect();
      }
    }, this.pollFrequency);
  }

  handleReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Reintentando conexión... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
     
      this.reconnectTimeout = setTimeout(() => {
        this.connect();
      }, 3000);
    } else {
      console.error('❌ Máximo número de reintentos alcanzado');
      this.callbacks.onError.forEach(cb => cb(new Error('Max reconnect attempts reached')));
    }
  }

  disconnect() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
   
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
   
    this.isConnected = false;
    console.log('❌ HTTP desconectado');
    this.callbacks.onDisconnect.forEach(cb => cb());
  }

  async setLED(intensity) {
    try {
      console.log(`💡 Enviando comando LED: ${intensity}`);
     
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
     
      const response = await fetch(`${this.baseUrl}/api/led`, {
        ...this.getFetchOptions('POST', { intensity: parseInt(intensity) }),  // ← USAR CONFIGURACIÓN CORREGIDA
        signal: controller.signal
      });
     
      clearTimeout(timeoutId);
     
      if (response.ok) {
        const result = await response.json();
        console.log('✅ LED actualizado:', result);
       
        // Notificar cambio inmediatamente
        if (result.success) {
          this.callbacks.onMessage.forEach(cb => cb(result));
        }
       
        return true;
      } else {
        const errorText = await response.text();
        console.error('❌ Error HTTP:', response.status, errorText);
        return false;
      }
    } catch (error) {
      console.error('❌ Error controlando LED:', error);
      return false;
    }
  }

  async getLEDState() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
     
      const response = await fetch(`${this.baseUrl}/api/status`, {
        ...this.getFetchOptions('GET'),  // ← USAR CONFIGURACIÓN CORREGIDA
        signal: controller.signal
      });
     
      clearTimeout(timeoutId);
     
      if (response.ok) {
        const data = await response.json();
        return data;
      }
      return null;
    } catch (error) {
      console.error('❌ Error obteniendo estado LED:', error);
      return null;
    }
  }

  async configIP(newIP) {
    // Para ESP32, esto podría requerir reinicio
    console.log(`🔧 Configuración IP solicitada: ${newIP}`);
   
    try {
      const response = await fetch(`${this.baseUrl}/api/config`, {
        ...this.getFetchOptions('POST', { ip: newIP })  // ← USAR CONFIGURACIÓN CORREGIDA
      });
     
      if (response.ok) {
        console.log('✅ IP configurada (puede requerir reinicio)');
        return true;
      }
    } catch (error) {
      console.error('❌ Error configurando IP:', error);
    }
   
    return false;
  }

  // NUEVO MÉTODO: Cambiar IP en ESP32 (como en MapeoDispositivos)
  async changeIPOnDevice(newIP) {
    try {
      console.log(`🌐 Enviando comando cambio IP: ${this.ip} → ${newIP}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(`${this.baseUrl}/api/config`, {
        ...this.getFetchOptions('POST', { ip: newIP }),  // ← USAR CONFIGURACIÓN CORREGIDA
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Comando IP enviado:', result);
        
        if (result.success) {
          this.disconnect();
          
          // Actualizar IP local
          this.ip = newIP;
          this.baseUrl = `http://${newIP}:${this.port}`;
          
          console.log(`🔄 Esperando reinicio del ESP32... Nueva URL: ${this.baseUrl}`);
          
          // Intentar reconectar después del reinicio
          setTimeout(() => {
            console.log('🔄 Intentando reconectar con nueva IP...');
            this.connect();
          }, 5000);
          
          return result;
        }
      }
      
      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      console.error('❌ Error cambiando IP:', error);
      throw error;
    }
  }

  // Método para probar conectividad
  async testConnection() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
     
      const response = await fetch(`${this.baseUrl}/api/status`, {
        ...this.getFetchOptions('GET'),  // ← USAR CONFIGURACIÓN CORREGIDA
        signal: controller.signal
      });
     
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  // Método para obtener información del dispositivo
  async getDeviceInfo() {
    try {
      const response = await fetch(`${this.baseUrl}/api/info`, {
        ...this.getFetchOptions('GET')  // ← USAR CONFIGURACIÓN CORREGIDA
      });
      
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('❌ Error obteniendo info del dispositivo:', error);
    }
    return null;
  }

  // NUEVO MÉTODO: Probar conectividad con detalles de error
  async testConnectionDetailed() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const startTime = Date.now();
      
      const response = await fetch(`${this.baseUrl}/api/status`, {
        ...this.getFetchOptions('GET'),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          data: data,
          responseTime: responseTime,
          status: response.status
        };
      } else {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          responseTime: responseTime,
          status: response.status
        };
      }
    } catch (error) {
      let errorMessage = error.message;
      
      if (error.name === 'AbortError') {
        errorMessage = 'Timeout: El ESP32 no respondió a tiempo';
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage = 'Error de conectividad o CORS: Verificar ESP32 y configuración de red';
      }
      
      return {
        success: false,
        error: errorMessage,
        responseTime: null,
        status: null
      };
    }
  }

  // Métodos de callback (compatibilidad con WebSocket API)
  onConnect(callback) {
    this.callbacks.onConnect.push(callback);
  }
 
  onDisconnect(callback) {
    this.callbacks.onDisconnect.push(callback);
  }
 
  onMessage(callback) {
    this.callbacks.onMessage.push(callback);
  }
 
  onError(callback) {
    this.callbacks.onError.push(callback);
  }

  // Cambiar IP y reconectar
  changeIP(newIP) {
    console.log(`🔄 Cambiando IP de ${this.ip} a ${newIP}`);
    this.ip = newIP;
    this.baseUrl = `http://${newIP}:${this.port}`;
    this.disconnect();
   
    // Esperar un momento antes de reconectar
    setTimeout(() => {
      this.connect();
    }, 1000);
  }

  // Cambiar frecuencia de polling
  setPollFrequency(ms) {
    this.pollFrequency = ms;
    if (this.isConnected) {
      this.startPolling();
    }
  }

  // Obtener estado de conexión
  getConnectionStatus() {
    return {
      connected: this.isConnected,
      ip: this.ip,
      port: this.port,
      url: this.baseUrl,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      pollFrequency: this.pollFrequency
    };
  }

  // Limpiar recursos
  destroy() {
    this.disconnect();
    this.callbacks = {
      onConnect: [],
      onDisconnect: [],
      onMessage: [],
      onError: []
    };
  }
}