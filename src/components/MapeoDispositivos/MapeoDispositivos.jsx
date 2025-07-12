// src/components/MapeoDispositivos/MapeoDispositivos.jsx
import React, { useState, useEffect } from 'react';
import { FirestoreManager } from '../../utils/firestore';

// HTTP Manager Class con cambio de IP
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
      onIPChanged: [] // NUEVO: Callback para cambio de IP
    };
    this.pollInterval = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
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
    }, 3000); // Cada 3 segundos
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
        
        // Notificar cambio inmediatamente
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

  // NUEVA FUNCIÓN: Cambiar IP en el ESP32
  async changeIPOnDevice(newIP) {
    try {
      console.log(`🌐 Enviando comando cambio IP: ${this.ip} → ${newIP}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // Más tiempo para cambio IP
      
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
          // Desconectar inmediatamente
          this.disconnect();
          
          // Actualizar IP local
          this.ip = newIP;
          this.baseUrl = `http://${newIP}:${this.port}`;
          
          // Notificar que la IP cambió
          this.callbacks.onIPChanged.forEach(cb => cb(newIP));
          
          console.log(`🔄 Esperando reinicio del ESP32... Nueva URL: ${this.baseUrl}`);
          
          // Intentar reconectar después de un tiempo
          setTimeout(() => {
            console.log('🔄 Intentando reconectar con nueva IP...');
            this.connect();
          }, 5000); // Esperar 5 segundos
          
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
  onIPChanged(callback) { this.callbacks.onIPChanged.push(callback); } // NUEVO

  // Cambiar IP localmente (sin enviar comando)
  changeIP(newIP) {
    this.ip = newIP;
    this.baseUrl = `http://${newIP}:${this.port}`;
    this.disconnect();
  }
}

function MapeoDispositivos() {
  const [espIP, setEspIP] = useState('192.168.1.101');
  const [ledIntensity, setLedIntensity] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [deviceData, setDeviceData] = useState({});
  const [status, setStatus] = useState('Desconectado');
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [changingIP, setChangingIP] = useState(false); // NUEVO: Estado cambio IP
  const [ipChangeStatus, setIpChangeStatus] = useState(''); // NUEVO: Status cambio IP
  
  // Managers
  const [httpManager, setHttpManager] = useState(null);
  const [firestoreManager] = useState(new FirestoreManager());

  useEffect(() => {
    // Inicializar HTTP Manager
    const http = new HttpManager(espIP);
    
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
      
      // Guardar en Firebase automáticamente
      if (data.type === 'sensorData' || data.deviceId) {
        firestoreManager.savePosteData('POSTE_001', data);
      }
    });
    
    http.onError((error) => {
      setStatus('⚠️ Error de conexión');
      setLoading(false);
      console.error('❌ Error HTTP:', error);
    });

    // NUEVO: Callback para cambio de IP
    http.onIPChanged((newIP) => {
      console.log(`🌐 IP cambiada exitosamente a: ${newIP}`);
      setEspIP(newIP);
      setIpChangeStatus(`✅ IP cambiada a ${newIP} - Reconectando...`);
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
  }, [espIP]);

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
      // Actualizar también en Firebase
      firestoreManager.updateLEDIntensity('POSTE_001', newIntensity);
    } else {
      console.warn('⚠️ No se pudo enviar comando');
    }
  };

  // NUEVA FUNCIÓN: Cambiar IP con comando al ESP32
  const changeIPOnESP32 = async () => {
    if (!espIP.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) {
      alert('⚠️ Formato de IP inválido');
      return;
    }

    if (!httpManager || !isConnected) {
      alert('⚠️ No hay conexión con el ESP32');
      return;
    }

    // Confirmar cambio
    const confirm = window.confirm(
      `¿Cambiar IP del ESP32 de ${httpManager.ip} a ${espIP}?\n\n` +
      `El dispositivo se reiniciará y puede tardar unos segundos en estar disponible.`
    );

    if (!confirm) return;

    try {
      setChangingIP(true);
      setIpChangeStatus('🔄 Enviando comando al ESP32...');
      setStatus('🌐 Cambiando IP...');

      // Enviar comando al ESP32
      const result = await httpManager.changeIPOnDevice(espIP);
      
      console.log('🎉 Resultado cambio IP:', result);
      
      // Actualizar Firebase
      firestoreManager.updateNetworkConfig('POSTE_001', {
        ip: espIP,
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
    if (!espIP.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) {
      alert('⚠️ Formato de IP inválido');
      return;
    }

    if (httpManager) {
      // Solo actualizar Firebase (sin enviar comando)
      firestoreManager.updateNetworkConfig('POSTE_001', {
        ip: espIP,
        puerto: 80,
        timeout: 5000
      });
      
      // Cambiar IP local en el manager
      httpManager.changeIP(espIP);
      
      console.log(`📝 IP local actualizada a: ${espIP}`);
    }
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
        {/* NUEVO: Status cambio IP */}
        {ipChangeStatus && (
          <div style={styles.ipChangeStatus}>
            {ipChangeStatus}
          </div>
        )}
      </div>

      {/* Configuración IP ACTUALIZADA */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>🌐 Configuración de Red</h3>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Dirección IP del ESP32:</label>
          <input
            type="text"
            value={espIP}
            onChange={(e) => setEspIP(e.target.value)}
            placeholder="192.168.1.101"
            style={styles.input}
            disabled={changingIP} // Deshabilitar durante cambio
          />
          <button 
            onClick={saveNewIP} 
            style={styles.primaryButton}
            disabled={changingIP}
          >
            💾 Guardar IP Local
          </button>
        </div>
        
        {/* NUEVO: Botón específico para cambiar IP en ESP32 */}
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
          <strong>URL:</strong> http://{espIP}:80 | 
          <strong> API:</strong> http://{espIP}:80/api/status
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
           onClick={() => window.open(`http://${espIP}`, '_blank')}
           style={styles.testButton}
           disabled={!isConnected || changingIP}
         >
           🌐 Abrir Página Web del ESP32
         </button>
         <button 
           onClick={() => {
             fetch(`http://${espIP}/api/status`)
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

// Estilos actualizados con nuevos elementos
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
 // NUEVO: Estilo para status de cambio IP
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
 // NUEVO: Grupo específico para cambio de IP
 ipChangeGroup: {
   marginBottom: '15px',
   textAlign: 'center'
 },
 // NUEVO: Botón específico para cambio de IP
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
 // NUEVO: Texto de ayuda para cambio de IP
 ipChangeHelp: {
   display: 'block',
   fontSize: '12px',
   color: '#6c757d',
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