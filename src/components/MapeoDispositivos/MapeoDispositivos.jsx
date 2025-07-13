// src/components/MapeoDispositivos/MapeoDispositivos.jsx - VERSIÓN FINAL FUNCIONAL
import React, { useState, useEffect } from 'react';
import { FirestoreManager } from '../../utils/firestore';

// HTTP Manager Class con cambio de IP corregido
class HttpManager {
  constructor(ip, port = 80) {
    this.ip = ip;
    this.port = port;
    this.baseUrl = `http://${ip}:${port}`;
    this.isConnected = false;
    this.callbacks = {
      onConnect: [],
      onDisconnect: [],
      onMessage: [],
      onError: [],
      onIPChanged: []
    };
    this.pollInterval = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  async connect() {
    try {
      console.log(`🔄 Conectando a ${this.baseUrl}`);
      
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
        
        const data = await response.json();
        this.callbacks.onMessage.forEach(cb => cb(data));
        
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
    
    this.pollInterval = setInterval(async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const response = await fetch(`${this.baseUrl}/api/status`, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          this.callbacks.onMessage.forEach(cb => cb(data));
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        console.error('❌ Error en polling:', error);
        this.disconnect();
        this.handleReconnect();
      }
    }, 3000);
  }

  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Reintentando conexión... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect();
      }, 3000);
    } else {
      console.error('❌ Máximo número de reintentos alcanzado');
    }
  }

  disconnect() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.isConnected = false;
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
        
        if (result.success) {
          this.callbacks.onMessage.forEach(cb => cb(result));
        }
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Error controlando LED:', error);
      return false;
    }
  }

  // Función para cambiar IP en el ESP32
  async changeIPOnDevice(newIP) {
    try {
      console.log(`🌐 Enviando comando cambio IP: ${this.ip} → ${newIP}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(`${this.baseUrl}/api/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ip: newIP }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Comando IP enviado:', result);
        
        if (result.success) {
          this.disconnect();
          
          this.ip = newIP;
          this.baseUrl = `http://${newIP}:${this.port}`;
          
          this.callbacks.onIPChanged.forEach(cb => cb(newIP));
          
          console.log(`🔄 Esperando reinicio del ESP32... Nueva URL: ${this.baseUrl}`);
          
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

  // Métodos de callback
  onConnect(callback) { this.callbacks.onConnect.push(callback); }
  onDisconnect(callback) { this.callbacks.onDisconnect.push(callback); }
  onMessage(callback) { this.callbacks.onMessage.push(callback); }
  onError(callback) { this.callbacks.onError.push(callback); }
  onIPChanged(callback) { this.callbacks.onIPChanged.push(callback); }

  changeIP(newIP) {
    this.ip = newIP;
    this.baseUrl = `http://${newIP}:${this.port}`;
    this.disconnect();
  }
}

function MapeoDispositivos() {
  const [currentIP, setCurrentIP] = useState('192.168.1.101'); // IP ACTUAL del ESP32
  const [newIP, setNewIP] = useState('192.168.1.101'); // IP DESEADA (input)
  const [ledIntensity, setLedIntensity] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [deviceData, setDeviceData] = useState({});
  const [status, setStatus] = useState('Desconectado');
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [changingIP, setChangingIP] = useState(false);
  const [ipChangeStatus, setIpChangeStatus] = useState('');
  
  // Managers
  const [httpManager, setHttpManager] = useState(null);
  const [firestoreManager] = useState(new FirestoreManager());

  useEffect(() => {
    // Inicializar HTTP Manager con la IP ACTUAL
    const http = new HttpManager(currentIP);
    
    // Configurar callbacks
    http.onConnect(() => {
      setIsConnected(true);
      setStatus('✅ Conectado');
      setLoading(false);
      setChangingIP(false);
      setIpChangeStatus('');
    });
    
    http.onDisconnect(() => {
      setIsConnected(false);
      setStatus('❌ Desconectado');
      setLoading(false);
    });
    
    http.onMessage((data) => {
      console.log('📨 Datos recibidos:', data);
      setDeviceData(data);
      setLastUpdate(new Date());
      
      if (data.ledIntensity !== undefined) {
        setLedIntensity(data.ledIntensity);
      }
      
      if (data.type === 'sensorData' || data.deviceId) {
        firestoreManager.savePosteData('POSTE_001', data);
      }
    });
    
    http.onError((error) => {
      setStatus('⚠️ Error de conexión');
      setLoading(false);
      console.error('❌ Error HTTP:', error);
    });

    // Callback para cambio de IP exitoso
    http.onIPChanged((changedIP) => {
      console.log(`🌐 IP cambiada exitosamente a: ${changedIP}`);
      setCurrentIP(changedIP); // Actualizar IP actual
      setNewIP(changedIP); // Sincronizar input
      setIpChangeStatus(`✅ IP cambiada a ${changedIP} - Reconectando...`);
    });
    
    setHttpManager(http);
    
    // Escuchar cambios en Firebase
    const unsubscribe = firestoreManager.listenToPoste('POSTE_001', (data) => {
      console.log('📱 Cambio en Firebase:', data);
    });
    
    return () => {
      if (http) {
        http.disconnect();
      }
      unsubscribe();
      firestoreManager.stopAllListeners();
    };
  }, [currentIP]); // Cambiar dependencia a currentIP
// Agregar al componente MapeoDispositivos después de useEffect

// Función para detectar IP actual del ESP32
// Función para detectar IP actual del ESP32 - VERSIÓN OPTIMIZADA
const detectESP32IP = async () => {
  setLoading(true);
  setStatus('🔍 Detectando IP del ESP32...');
  
  // Configuración del rango de IPs a probar
  const baseIP = '192.168.1.'; // Base de la red
  const startRange = 100;      // IP inicial: 192.168.1.100
  const endRange = 200;        // IP final: 192.168.1.200
  const timeoutMs = 1500;      // Timeout por IP (1.5 segundos)
  const maxConcurrent = 10;    // Máximo de pruebas simultáneas
  
  console.log(`🔍 Buscando ESP32 en rango ${baseIP}${startRange}-${endRange}...`);
  
  // Función para probar una IP específica
  const testSingleIP = async (ipNumber) => {
    const testIP = baseIP + ipNumber;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      const response = await fetch(`http://${testIP}/api/status`, {
        signal: controller.signal,
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        
        // Verificar que es nuestro ESP32
        if (data.deviceId === 'POSTE_001' || 
            data.type === 'sensorData' || 
            data.ip || 
            data.ledIntensity !== undefined) {
          
          console.log(`✅ ESP32 encontrado en ${testIP}!`, data);
          return { ip: testIP, data };
        }
      }
    } catch (error) {
      // Ignorar errores silenciosamente
    }
    
    return null;
  };
  
  // Función para procesar IPs en lotes (para no saturar la red)
  const processInBatches = async () => {
    for (let start = startRange; start <= endRange; start += maxConcurrent) {
      const end = Math.min(start + maxConcurrent - 1, endRange);
      const currentBatch = [];
      
      // Crear promesas para el lote actual
      for (let i = start; i <= end; i++) {
        currentBatch.push(testSingleIP(i));
      }
      
      console.log(`🧪 Probando lote: ${baseIP}${start}-${end}...`);
      setStatus(`🔍 Probando IPs ${baseIP}${start}-${end}...`);
      
      // Ejecutar lote en paralelo
      const results = await Promise.allSettled(currentBatch);
      
      // Verificar si alguna IP del lote funcionó
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          const { ip, data } = result.value;
          
          console.log(`🎉 ESP32 detectado en ${ip}!`);
          
          // Actualizar IPs
          setCurrentIP(ip);
          setNewIP(ip);
          setStatus(`✅ ESP32 detectado en ${ip}`);
          setLoading(false);
          
          // Conectar automáticamente
          setTimeout(() => {
            connectHttp();
          }, 1000);
          
          return ip;
        }
      }
      
      // Pequeña pausa entre lotes para no saturar
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return null;
  };
  
  // Ejecutar detección
  const foundIP = await processInBatches();
  
  if (!foundIP) {
    // No encontrado en todo el rango
    setStatus(`❌ ESP32 no encontrado en rango ${baseIP}${startRange}-${endRange}`);
    setLoading(false);
    
    alert(
      `❌ ESP32 no encontrado en el rango ${baseIP}${startRange}-${endRange}\n\n` +
      `Verifica que:\n` +
      `• El ESP32 esté encendido\n` +
      `• Esté conectado a la misma red WiFi\n` +
      `• Su IP esté en el rango configurado\n\n` +
      `¿Quieres probar una IP específica manualmente?`
    );
    
    // Opción manual como fallback
    const userIP = prompt(
      'Introduce la IP del ESP32 manualmente:',
      currentIP
    );
    
    if (userIP && userIP.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) {
      setCurrentIP(userIP);
      setNewIP(userIP);
      setTimeout(() => connectHttp(), 500);
    }
  }
  
  return foundIP;
};

// Función mejorada para conectar con detección automática
const connectWithDetection = async () => {
  const detectedIP = await detectESP32IP();
  if (!detectedIP) {
    // Si no se detecta, preguntar al usuario
    const userIP = prompt(
      'No se pudo detectar automáticamente el ESP32.\n\n' +
      '¿Cuál es la IP actual del ESP32?',
      currentIP
    );
    
    if (userIP && userIP.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) {
      setCurrentIP(userIP);
      setNewIP(userIP);
      setTimeout(() => connectHttp(), 500);
    }
  }
};
  // Conectar HTTP
  const connectHttp = async () => {
    if (httpManager) {
      setLoading(true);
      setStatus('🔄 Conectando...');
      await httpManager.connect();
    }
  };

  // Controlar intensidad LED
  const controlLED = async (intensity) => {
    const newIntensity = parseInt(intensity);
    
    if (httpManager && await httpManager.setLED(newIntensity)) {
      setLedIntensity(newIntensity);
      firestoreManager.updateLEDIntensity('POSTE_001', newIntensity);
    } else {
      console.warn('⚠️ No se pudo enviar comando');
    }
  };

  // FUNCIÓN CORREGIDA: Cambiar IP en ESP32
  const changeIPOnESP32 = async () => {
    if (!newIP.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) {
      alert('⚠️ Formato de IP inválido');
      return;
    }

    if (!httpManager || !isConnected) {
      alert('⚠️ No hay conexión con el ESP32');
      return;
    }

    if (currentIP === newIP) {
      alert('ℹ️ La IP nueva es igual a la actual');
      return;
    }

    const confirm = window.confirm(
      `¿Cambiar IP del ESP32?\n\n` +
      `IP Actual: ${currentIP}\n` +
      `IP Nueva: ${newIP}\n\n` +
      `El dispositivo se reiniciará y puede tardar unos segundos en estar disponible.`
    );

    if (!confirm) return;

    try {
      setChangingIP(true);
      setIpChangeStatus('🔄 Enviando comando al ESP32...');
      setStatus('🌐 Cambiando IP...');

      console.log(`🌐 Enviando comando desde ${currentIP} para cambiar a ${newIP}`);

      // CLAVE: Enviar comando a la IP ACTUAL, no a la nueva
      const result = await httpManager.changeIPOnDevice(newIP);
      
      console.log('🎉 Resultado cambio IP:', result);
      
      // Actualizar Firebase
      firestoreManager.updateNetworkConfig('POSTE_001', {
        ip: newIP,
        puerto: 80,
        timeout: 5000
      });

      setIpChangeStatus('⏰ ESP32 reiniciando... Esperando conexión...');

    } catch (error) {
      console.error('❌ Error cambiando IP:', error);
      setIpChangeStatus('❌ Error: ' + error.message);
      setChangingIP(false);
      alert('❌ Error cambiando IP: ' + error.message);
    }
  };

  // Guardar nueva IP (solo local, sin enviar comando)
  const saveNewIP = () => {
    if (!newIP.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) {
      alert('⚠️ Formato de IP inválido');
      return;
    }

    firestoreManager.updateNetworkConfig('POSTE_001', {
      ip: newIP,
      puerto: 80,
      timeout: 5000
    });
    
    console.log(`📝 IP deseada guardada: ${newIP} (no enviada al ESP32)`);
    alert(`📝 IP guardada localmente: ${newIP}\n\nPara aplicar al ESP32, usa "Cambiar IP en ESP32"`);
  };

  // Funciones de control rápido
  const quickControl = (intensity) => {
    controlLED(intensity);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>🚨 Control LED ESP32 - HTTP + WIZnet</h1>
        <div style={{
          ...styles.statusCard,
          backgroundColor: isConnected ? '#d4edda' : '#f8d7da',
          color: isConnected ? '#155724' : '#721c24'
        }}>
          <strong>Estado: {status}</strong>
          {loading && <span style={styles.spinner}>⏳</span>}
        </div>
        {lastUpdate && (
          <div style={styles.lastUpdate}>
            Última actualización: {lastUpdate.toLocaleTimeString()}
          </div>
        )}
        {ipChangeStatus && (
          <div style={styles.ipChangeStatus}>
            {ipChangeStatus}
          </div>
        )}
      </div>

      {/* Configuración IP CORREGIDA */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>🌐 Configuración de Red</h3>
        
        <div style={styles.inputGroup}>
          <label style={styles.label}>IP Actual del ESP32:</label>
          <input
            type="text"
            value={currentIP}
            readOnly
            style={{...styles.input, backgroundColor: '#e9ecef'}}
          />
          <span style={styles.currentIPLabel}>🔗 Conectado aquí</span>
        </div>
        
        <div style={styles.inputGroup}>
          <label style={styles.label}>Nueva IP deseada:</label>
          <input
            type="text"
            value={newIP}
            onChange={(e) => setNewIP(e.target.value)}
            placeholder="192.168.1.150"
            style={styles.input}
            disabled={changingIP}
          />
          <button 
            onClick={saveNewIP} 
            style={styles.primaryButton}
            disabled={changingIP}
          >
            💾 Guardar IP Local
          </button>
        </div>
        <div style={styles.ipChangeGroup}>
  <button 
    onClick={detectESP32IP}
    disabled={loading || changingIP}
    style={{
      ...styles.detectButton,
      opacity: (loading || changingIP) ? 0.6 : 1
    }}
  >
    {loading ? '🔍 Detectando...' : '🔍 Detectar IP del ESP32'}
  </button>
  <small style={styles.ipChangeHelp}>
    🔍 Busca automáticamente el ESP32 en IPs comunes
  </small>
</div>

<button 
  onClick={connectWithDetection}
  disabled={loading || changingIP}
  style={{
    ...styles.connectButton,
    opacity: (loading || changingIP) ? 0.6 : 1
  }}
>
  {loading ? '🔄 Conectando...' : '🔌 Detectar y Conectar ESP32'}
</button>
        {/* Botón específico para cambiar IP en ESP32 */}
        <div style={styles.ipChangeGroup}>
          <button 
            onClick={changeIPOnESP32}
            disabled={!isConnected || changingIP}
            style={{
              ...styles.changeIPButton,
              opacity: (!isConnected || changingIP) ? 0.6 : 1
            }}
          >
            {changingIP ? '🔄 Cambiando IP...' : '🌐 Cambiar IP en ESP32'}
          </button>
          <small style={styles.ipChangeHelp}>
            ⚠️ Esto enviará el comando al ESP32 y lo reiniciará con la nueva IP
          </small>
        </div>
        
        <button 
          onClick={connectHttp}
          disabled={loading || changingIP}
          style={{
            ...styles.connectButton,
            opacity: (loading || changingIP) ? 0.6 : 1
          }}
        >
          {loading ? '🔄 Conectando...' : '🔌 Conectar ESP32'}
        </button>
        
        <div style={styles.urlInfo}>
          <strong>URL Actual:</strong> http://{currentIP}:80 | 
          <strong> API:</strong> http://{currentIP}:80/api/status
          {newIP !== currentIP && (
            <div style={styles.newIPInfo}>
              <strong>Nueva URL:</strong> http://{newIP}:80 (después del cambio)
            </div>
          )}
        </div>
      </div>

      {/* Control de LED */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>💡 Control de Intensidad LED</h3>
        
        <div style={styles.intensityDisplay}>
          <span style={styles.intensityLabel}>Intensidad Actual:</span>
          <span style={styles.intensityValue}>{ledIntensity}</span>
          <span style={styles.intensityPercent}>({Math.round((ledIntensity/255)*100)}%)</span>
        </div>
        
        <input
          type="range"
          min="0"
          max="255"
          value={ledIntensity}
          onChange={(e) => controlLED(e.target.value)}
          style={styles.slider}
          disabled={!isConnected || changingIP}
        />
        
        <div style={styles.quickControls}>
          <button 
            onClick={() => quickControl(0)} 
            style={{...styles.controlButton, backgroundColor: '#dc3545'}}
            disabled={!isConnected || changingIP}
          >
            🌑 Apagar
          </button>
          <button 
            onClick={() => quickControl(64)} 
            style={styles.controlButton}
            disabled={!isConnected || changingIP}
          >
            🌘 25%
          </button>
          <button 
            onClick={() => quickControl(128)} 
            style={styles.controlButton}
            disabled={!isConnected || changingIP}
          >
            🌗 50%
          </button>
          <button 
            onClick={() => quickControl(191)} 
            style={styles.controlButton}
            disabled={!isConnected || changingIP}
          >
            🌖 75%
          </button>
          <button 
           onClick={() => quickControl(255)} 
           style={{...styles.controlButton, backgroundColor: '#28a745'}}
           disabled={!isConnected || changingIP}
         >
           🌕 Máximo
         </button>
       </div>
     </div>

     {/* Datos del dispositivo */}
     {Object.keys(deviceData).length > 0 && (
       <div style={styles.section}>
         <h3 style={styles.sectionTitle}>📊 Datos del Dispositivo</h3>
         <div style={styles.dataGrid}>
           <div style={styles.dataItem}>
             <strong>🏷️ Device ID:</strong> {deviceData.deviceId}
           </div>
           <div style={styles.dataItem}>
             <strong>🌐 IP:</strong> {deviceData.ip}
           </div>
           <div style={styles.dataItem}>
             <strong>🔌 Estado LED:</strong> 
             <span style={{color: deviceData.ledState ? '#28a745' : '#dc3545'}}>
               {deviceData.ledState ? ' ✅ Encendido' : ' ❌ Apagado'}
             </span>
           </div>
           <div style={styles.dataItem}>
             <strong>💡 Intensidad:</strong> {deviceData.ledIntensity}/255
           </div>
           <div style={styles.dataItem}>
             <strong>⏱️ Uptime:</strong> {Math.floor((deviceData.uptime || 0)/60)}m {(deviceData.uptime || 0)%60}s
           </div>
           <div style={styles.dataItem}>
             <strong>💾 Memoria libre:</strong> {deviceData.freeHeap} bytes
           </div>
           <div style={styles.dataItem}>
             <strong>🔗 Link Status:</strong> 
             <span style={{color: deviceData.linkStatus === 'connected' ? '#28a745' : '#dc3545'}}>
               {deviceData.linkStatus === 'connected' ? ' ✅ Conectado' : ' ❌ Desconectado'}
             </span>
           </div>
           <div style={styles.dataItem}>
             <strong>⏰ Timestamp:</strong> {deviceData.timestamp ? new Date(deviceData.timestamp).toLocaleTimeString() : 'N/A'}
           </div>
         </div>
         
         {/* Sensores adicionales */}
         {deviceData.sensors && (
           <div style={styles.sensorsGrid}>
             <h4 style={styles.sensorsTitle}>🔬 Sensores</h4>
             <div style={styles.sensorItem}>
               <strong>💡 LDR:</strong> {deviceData.sensors.ldr || 'N/A'}
             </div>
             <div style={styles.sensorItem}>
               <strong>👁️ PIR:</strong> {deviceData.sensors.pir ? '🟢 Movimiento' : '🔴 Sin movimiento'}
             </div>
             <div style={styles.sensorItem}>
               <strong>⚡ Corriente:</strong> {deviceData.sensors.current ? deviceData.sensors.current.toFixed(2) + 'A' : 'N/A'}
             </div>
           </div>
         )}
       </div>
     )}

     {/* Panel de pruebas */}
     <div style={styles.section}>
       <h3 style={styles.sectionTitle}>🧪 Panel de Pruebas</h3>
       <div style={styles.testPanel}>
         <button 
           onClick={() => window.open(`http://${currentIP}`, '_blank')}
           style={styles.testButton}
           disabled={!isConnected || changingIP}
         >
           🌐 Abrir Página Web del ESP32
         </button>
         <button 
           onClick={() => {
             fetch(`http://${currentIP}/api/status`)
               .then(res => res.json())
               .then(data => {
                 console.log('Test API Response:', data);
                 alert('API Test OK: ' + JSON.stringify(data, null, 2));
               })
               .catch(err => {
                 console.error('Test API Error:', err);
                 alert('API Test Error: ' + err.message);
               });
           }}
           style={styles.testButton}
           disabled={changingIP}
         >
           🔧 Test API
         </button>
         <button 
           onClick={() => {
             const pattern = [0, 255, 0, 255, 0];
             let i = 0;
             const interval = setInterval(() => {
               if (i >= pattern.length) {
                 clearInterval(interval);
                 return;
               }
               controlLED(pattern[i]);
               i++;
             }, 500);
           }}
           style={styles.testButton}
           disabled={!isConnected || changingIP}
         >
           ✨ Test Parpadeo
         </button>
       </div>
     </div>

     {/* Footer con información */}
     <div style={styles.footer}>
       <p style={styles.footerText}>
         🔧 Proyecto: ESP32 + WIZnet W5500 + React + Firebase<br/>
         📡 Protocolo: HTTP REST API | 💾 Firebase: Tiempo real<br/>
         🌐 Puerto: 80 | ⚡ Polling: 3s | 🌐 Cambio IP: Automático
       </p>
     </div>
   </div>
 );
}

// Estilos completos
const styles = {
 container: {
   padding: '20px',
   maxWidth: '900px',
   margin: '0 auto',
   fontFamily: 'Arial, sans-serif',
   backgroundColor: '#f8f9fa'
 },
 header: {
   textAlign: 'center',
   marginBottom: '30px'
 },
 title: {
   color: '#343a40',
   marginBottom: '15px',
   fontSize: '26px'
 },
 statusCard: {
   padding: '12px 20px',
   borderRadius: '8px',
   display: 'inline-block',
   fontSize: '16px',
   fontWeight: 'bold',
   marginBottom: '10px'
 },
 lastUpdate: {
   fontSize: '12px',
   color: '#6c757d',
   fontStyle: 'italic'
 },
 ipChangeStatus: {
   fontSize: '14px',
   color: '#856404',
   backgroundColor: '#fff3cd',
   border: '1px solid #ffeaa7',
   borderRadius: '4px',
   padding: '8px 12px',
   marginTop: '10px',
   display: 'inline-block'
 },
 spinner: {
   marginLeft: '10px',
   animation: 'spin 1s linear infinite'
 },
 section: {
   backgroundColor: 'white',
   padding: '20px',
   borderRadius: '10px',
   marginBottom: '20px',
   boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
 },
 sectionTitle: {
   color: '#495057',
   marginBottom: '15px',
   borderBottom: '2px solid #e9ecef',
   paddingBottom: '8px'
 },
 inputGroup: {
   display: 'flex',
   alignItems: 'center',
   gap: '10px',
   marginBottom: '15px',
   flexWrap: 'wrap'
 },
 ipChangeGroup: {
   marginBottom: '15px',
   textAlign: 'center'
 },
 detectButton: {
  padding: '10px 20px',
  backgroundColor: '#6f42c1',
  color: 'white',
  border: 'none',
  borderRadius: '5px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: 'bold',
  marginBottom: '10px'
},
 changeIPButton: {
   padding: '12px 24px',
   backgroundColor: '#fd7e14',
   color: 'white',
   border: 'none',
   borderRadius: '5px',
   cursor: 'pointer',
   fontSize: '16px',
   fontWeight: 'bold',
   marginBottom: '5px'
 },
 ipChangeHelp: {
   display: 'block',
   fontSize: '12px',
   color: '#6c757d',
   fontStyle: 'italic'
 },
 currentIPLabel: {
   fontSize: '12px',
   color: '#28a745',
   fontWeight: 'bold',
   marginLeft: '10px'
 },
 newIPInfo: {
   fontSize: '11px',
   color: '#fd7e14',
   marginTop: '5px',
   fontStyle: 'italic'
 },
 label: {
   fontWeight: 'bold',
   minWidth: '140px'
 },
 input: {
   padding: '8px 12px',
   border: '2px solid #ced4da',
   borderRadius: '5px',
   fontSize: '14px',
   minWidth: '150px'
 },
 primaryButton: {
   padding: '8px 16px',
   backgroundColor: '#007bff',
   color: 'white',
   border: 'none',
   borderRadius: '5px',
   cursor: 'pointer',
   fontWeight: 'bold'
 },
 connectButton: {
   padding: '12px 24px',
   backgroundColor: '#28a745',
   color: 'white',
   border: 'none',
   borderRadius: '5px',
   cursor: 'pointer',
   fontSize: '16px',
   fontWeight: 'bold',
   width: '100%',
   marginBottom: '10px'
 },
 urlInfo: {
   fontSize: '12px',
   color: '#6c757d',
   textAlign: 'center',
   fontFamily: 'monospace'
 },
 intensityDisplay: {
   textAlign: 'center',
   marginBottom: '15px',
   fontSize: '18px'
 },
 intensityLabel: {
   fontWeight: 'bold',
   marginRight: '10px'
 },
 intensityValue: {
   fontSize: '28px',
   fontWeight: 'bold',
   color: '#007bff',
   marginRight: '10px'
 },
 intensityPercent: {
   color: '#6c757d',
   fontSize: '16px'
 },
 slider: {
   width: '100%',
   height: '10px',
   borderRadius: '5px',
   backgroundColor: '#ddd',
   outline: 'none',
   marginBottom: '20px'
 },
 quickControls: {
   display: 'flex',
   gap: '8px',
   flexWrap: 'wrap',
   justifyContent: 'center'
 },
 controlButton: {
   padding: '10px 15px',
   backgroundColor: '#6c757d',
   color: 'white',
   border: 'none',
   borderRadius: '5px',
   cursor: 'pointer',
   fontSize: '14px',
   fontWeight: 'bold',
   minWidth: '80px'
 },
 dataGrid: {
   display: 'grid',
   gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
   gap: '12px',
   marginBottom: '20px'
 },
 dataItem: {
   padding: '10px',
   backgroundColor: '#f8f9fa',
   borderRadius: '5px',
   fontSize: '14px',
   border: '1px solid #e9ecef'
 },
 sensorsGrid: {
  backgroundColor: '#e8f4f8',
  padding: '15px',
  borderRadius: '8px',
  border: '1px solid #bee5eb'
},
sensorsTitle: {
  margin: '0 0 10px 0',
  color: '#0c5460'
},
sensorItem: {
  display: 'inline-block',
  margin: '5px 15px 5px 0',
  fontSize: '14px'
},
testPanel: {
  display: 'flex',
  gap: '10px',
  flexWrap: 'wrap',
  justifyContent: 'center'
},
testButton: {
  padding: '10px 15px',
  backgroundColor: '#17a2b8',
  color: 'white',
  border: 'none',
  borderRadius: '5px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: 'bold'
},
footer: {
  textAlign: 'center',
  marginTop: '30px',
  padding: '15px',
  backgroundColor: '#e9ecef',
  borderRadius: '5px'
},
footerText: {
  color: '#6c757d',
  fontSize: '12px',
  margin: 0,
  lineHeight: '1.4'
}
};

export default MapeoDispositivos;