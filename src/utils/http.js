// src/utils/http.js - HTTP Manager para ESP32 + WIZnet
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

  async connect() {
    try {
      console.log(`🔄 Conectando a ${this.baseUrl}`);
      
      // Probar conexión con timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${this.baseUrl}/api/status`, {
        signal: controller.signal,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
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
      this.callbacks.onError.forEach(cb => cb(error));
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
          signal: controller.signal,
          headers: {
            'Cache-Control': 'no-cache'
          }
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
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ intensity: parseInt(intensity) }),
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
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ip: newIP })
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

  // Método para probar conectividad
  async testConnection() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      
      const response = await fetch(`${this.baseUrl}/api/status`, {
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
      const response = await fetch(`${this.baseUrl}/api/info`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('❌ Error obteniendo info del dispositivo:', error);
    }
    return null;
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
      this.startPolling(); // Reiniciar con nueva frecuencia
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