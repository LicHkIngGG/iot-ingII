// src/components/GestionUnidades/components/DetectorDispositivos/DetectorDispositivos.jsx
import React, { useState, useEffect } from 'react';
import { isValidIPFormat, testESP32Connection } from '../../utils/deviceDetection';
import './DetectorDispositivos.css';

const DetectorDispositivos = ({ onDispositivoEncontrado, onVolver }) => {
  const [estado, setEstado] = useState('inactivo'); // inactivo, escaneando, completado, error
  const [progreso, setProgreso] = useState(0);
  const [dispositivosEncontrados, setDispositivosEncontrados] = useState([]);
  const [rangoIP, setRangoIP] = useState({
    base: '192.168.1.',
    inicio: 100,
    fin: 200
  });
  const [configuracion, setConfiguracion] = useState({
    timeout: 2000,
    concurrencia: 15,
    incluirPuertos: [80, 8080],
    validarEndpoints: true
  });
  const [dispositivoSeleccionado, setDispositivoSeleccionado] = useState(null);
  const [mostrarConfiguracion, setMostrarConfiguracion] = useState(false);
  const [log, setLog] = useState([]);

  // Agregar entrada al log
  const agregarLog = (mensaje, tipo = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLog(prev => [...prev, { timestamp, mensaje, tipo }]);
  };

  // Función principal de detección
 // Continuación del componente DetectorDispositivos.jsx

const iniciarDeteccion = async () => {
  setEstado('escaneando');
  setProgreso(0);
  setDispositivosEncontrados([]);
  setLog([]);
  
  agregarLog('🔍 Iniciando detección de dispositivos ESP32...', 'info');
  agregarLog(`📡 Rango: ${rangoIP.base}${rangoIP.inicio}-${rangoIP.fin}`, 'info');
  
  const totalIPs = rangoIP.fin - rangoIP.inicio + 1;
  let procesadas = 0;
  const encontrados = [];
  
  try {
    // Función para probar una IP específica
    const probarIP = async (ipNumber) => {
      const ip = rangoIP.base + ipNumber;
      
      for (const puerto of configuracion.incluirPuertos) {
        try {
          const resultado = await testESP32Connection(ip, puerto, configuracion.timeout);
          
          if (resultado.success) {
            const dispositivo = {
              ip,
              puerto,
              deviceId: resultado.data.deviceId || `ESP32_${ip.replace(/\./g, '_')}`,
              nombre: resultado.data.deviceName || `Dispositivo ${ip}`,
              firmwareVersion: resultado.data.firmwareVersion || 'Desconocida',
              uptime: resultado.data.uptime || 0,
              hardware: resultado.data.hardware || 'ESP32',
              timestamp: new Date().toISOString(),
              estado: resultado.data.linkStatus || 'connected',
              sensores: resultado.data.sensors || {},
              ultimaRespuesta: resultado.responseTime
            };
            
            encontrados.push(dispositivo);
            agregarLog(`✅ ESP32 encontrado en ${ip}:${puerto} - ${dispositivo.deviceId}`, 'success');
            
            return dispositivo;
          }
        } catch (error) {
          // Error silencioso para cada intento
        }
      }
      
      return null;
    };
    
    // Procesar IPs en lotes
    for (let i = rangoIP.inicio; i <= rangoIP.fin; i += configuracion.concurrencia) {
      const lote = [];
      const finLote = Math.min(i + configuracion.concurrencia - 1, rangoIP.fin);
      
      agregarLog(`🧪 Probando IPs ${rangoIP.base}${i} - ${rangoIP.base}${finLote}...`, 'info');
      
      // Crear promesas para el lote actual
      for (let j = i; j <= finLote; j++) {
        lote.push(probarIP(j));
      }
      
      // Ejecutar lote en paralelo
      const resultados = await Promise.allSettled(lote);
      
      // Procesar resultados
      resultados.forEach((resultado, index) => {
        if (resultado.status === 'fulfilled' && resultado.value) {
          // Ya se agregó al log en probarIP
        }
        procesadas++;
        setProgreso(Math.round((procesadas / totalIPs) * 100));
      });
      
      // Actualizar dispositivos encontrados
      setDispositivosEncontrados([...encontrados]);
      
      // Pequeña pausa para no saturar la red
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (encontrados.length > 0) {
      setEstado('completado');
      agregarLog(`🎉 Detección completada: ${encontrados.length} dispositivo(s) encontrado(s)`, 'success');
    } else {
      setEstado('error');
      agregarLog('❌ No se encontraron dispositivos ESP32 en el rango especificado', 'error');
      agregarLog('💡 Verifica que los dispositivos estén encendidos y conectados a la red', 'warning');
    }
    
  } catch (error) {
    setEstado('error');
    agregarLog(`❌ Error durante la detección: ${error.message}`, 'error');
  }
};

// Función para probar IP manual
const probarIPManual = async (ip) => {
  if (!isValidIPFormat(ip)) {
    agregarLog(`❌ Formato de IP inválido: ${ip}`, 'error');
    return;
  }
  
  agregarLog(`🔍 Probando IP manual: ${ip}...`, 'info');
  
  for (const puerto of configuracion.incluirPuertos) {
    try {
      const resultado = await testESP32Connection(ip, puerto, configuracion.timeout);
      
      if (resultado.success) {
        const dispositivo = {
          ip,
          puerto,
          deviceId: resultado.data.deviceId || `ESP32_${ip.replace(/\./g, '_')}`,
          nombre: resultado.data.deviceName || `Dispositivo ${ip}`,
          firmwareVersion: resultado.data.firmwareVersion || 'Desconocida',
          uptime: resultado.data.uptime || 0,
          hardware: resultado.data.hardware || 'ESP32',
          timestamp: new Date().toISOString(),
          estado: resultado.data.linkStatus || 'connected',
          sensores: resultado.data.sensors || {},
          ultimaRespuesta: resultado.responseTime
        };
        
        setDispositivosEncontrados(prev => {
          const existe = prev.find(d => d.ip === ip && d.puerto === puerto);
          if (existe) return prev;
          return [...prev, dispositivo];
        });
        
        agregarLog(`✅ Dispositivo encontrado en ${ip}:${puerto}`, 'success');
        return;
      }
    } catch (error) {
      // Continuar con siguiente puerto
    }
  }
  
  agregarLog(`❌ No se encontró dispositivo ESP32 en ${ip}`, 'error');
};

// Handler para seleccionar dispositivo
const handleSeleccionarDispositivo = (dispositivo) => {
  setDispositivoSeleccionado(dispositivo);
  agregarLog(`📋 Dispositivo seleccionado: ${dispositivo.deviceId} (${dispositivo.ip})`, 'info');
};

// Handler para confirmar selección
const handleConfirmarSeleccion = () => {
  if (dispositivoSeleccionado) {
    onDispositivoEncontrado(dispositivoSeleccionado);
  }
};

return (
  <div className="detector-dispositivos">
    <div className="detector-header">
      <button className="btn-volver" onClick={onVolver}>
        ← Volver
      </button>
      <div className="header-info">
        <h2>🔍 Detector de Dispositivos ESP32</h2>
        <p>Escanea la red en busca de dispositivos ESP32 + WIZnet disponibles</p>
      </div>
    </div>

    <div className="detector-contenido">
      {/* Panel de configuración */}
      <div className="panel-configuracion">
        <div className="config-header">
          <h3>⚙️ Configuración de Detección</h3>
          <button 
            className="btn-toggle-config"
            onClick={() => setMostrarConfiguracion(!mostrarConfiguracion)}
          >
            {mostrarConfiguracion ? 'Ocultar' : 'Mostrar'} Configuración
          </button>
        </div>

        {mostrarConfiguracion && (
          <div className="config-form">
            <div className="config-grupo">
              <label>Rango de IP:</label>
              <div className="ip-range-container">
                <input
                  type="text"
                  value={rangoIP.base}
                  onChange={(e) => setRangoIP({...rangoIP, base: e.target.value})}
                  className="input-ip-base"
                />
                <input
                  type="number"
                  value={rangoIP.inicio}
                  onChange={(e) => setRangoIP({...rangoIP, inicio: parseInt(e.target.value)})}
                  className="input-range"
                  min="1"
                  max="254"
                />
                <span className="range-separator">-</span>
                <input
                  type="number"
                  value={rangoIP.fin}
                  onChange={(e) => setRangoIP({...rangoIP, fin: parseInt(e.target.value)})}
                  className="input-range"
                  min="1"
                  max="254"
                />
              </div>
            </div>

            <div className="config-grupo">
              <label>Timeout (ms):</label>
              <input
                type="number"
                value={configuracion.timeout}
                onChange={(e) => setConfiguracion({...configuracion, timeout: parseInt(e.target.value)})}
                className="input-config"
                min="1000"
                max="10000"
                step="500"
              />
            </div>

            <div className="config-grupo">
              <label>Concurrencia:</label>
              <input
                type="number"
                value={configuracion.concurrencia}
                onChange={(e) => setConfiguracion({...configuracion, concurrencia: parseInt(e.target.value)})}
                className="input-config"
                min="5"
                max="50"
              />
            </div>

            <div className="config-grupo">
              <label>Puertos a probar:</label>
              <div className="puertos-container">
                {configuracion.incluirPuertos.map((puerto, index) => (
                  <span key={index} className="puerto-badge">{puerto}</span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Panel de control */}
      <div className="panel-control">
        <div className="controles-principales">
          <button
            className="btn-detectar primary"
            onClick={iniciarDeteccion}
            disabled={estado === 'escaneando'}
          >
            {estado === 'escaneando' ? (
              <>🔄 Escaneando... {progreso}%</>
            ) : (
              <>🔍 Iniciar Detección Automática</>
            )}
          </button>

          <div className="ip-manual-container">
            <input
              type="text"
              placeholder="192.168.1.101"
              className="input-ip-manual"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  probarIPManual(e.target.value);
                  e.target.value = '';
                }
              }}
            />
            <button
              className="btn-probar-manual"
              onClick={(e) => {
                const input = e.target.previousElementSibling;
                probarIPManual(input.value);
                input.value = '';
              }}
            >
              🎯 Probar IP Manual
            </button>
          </div>
        </div>

        {/* Barra de progreso */}
        {estado === 'escaneando' && (
          <div className="progreso-container">
            <div className="progreso-barra">
              <div 
                className="progreso-fill"
                style={{ width: `${progreso}%` }}
              ></div>
            </div>
            <span className="progreso-texto">{progreso}% completado</span>
          </div>
        )}
      </div>

      {/* Resultados */}
      <div className="panel-resultados">
        <div className="resultados-header">
          <h3>📋 Dispositivos Encontrados ({dispositivosEncontrados.length})</h3>
          {dispositivosEncontrados.length > 0 && (
            <span className="dispositivos-badge">{dispositivosEncontrados.length} encontrados</span>
          )}
        </div>

        {dispositivosEncontrados.length > 0 ? (
          <div className="dispositivos-grid">
            {dispositivosEncontrados.map((dispositivo, index) => (
              <div
                key={`${dispositivo.ip}-${dispositivo.puerto}`}
                className={`dispositivo-card ${dispositivoSeleccionado?.ip === dispositivo.ip ? 'seleccionado' : ''}`}
                onClick={() => handleSeleccionarDispositivo(dispositivo)}
              >
                <div className="dispositivo-header">
                  <div className="dispositivo-icon">📱</div>
                  <div className="dispositivo-estado">
                    <span className={`estado-badge ${dispositivo.estado}`}>
                      {dispositivo.estado === 'connected' ? '🟢 Online' : '🟡 Detectado'}
                    </span>
                  </div>
                </div>

                <div className="dispositivo-info">
                  <h4>{dispositivo.nombre}</h4>
                  <p className="device-id">{dispositivo.deviceId}</p>
                  <div className="dispositivo-detalles">
                    <div className="detalle-item">
                      <span className="detalle-label">IP:</span>
                      <span className="detalle-valor">{dispositivo.ip}:{dispositivo.puerto}</span>
                    </div>
                    <div className="detalle-item">
                      <span className="detalle-label">Firmware:</span>
                      <span className="detalle-valor">{dispositivo.firmwareVersion}</span>
                    </div>
                    <div className="detalle-item">
                      <span className="detalle-label">Uptime:</span>
                      <span className="detalle-valor">{Math.floor(dispositivo.uptime / 60)}m</span>
                    </div>
                    <div className="detalle-item">
                      <span className="detalle-label">Respuesta:</span>
                      <span className="detalle-valor">{dispositivo.ultimaRespuesta}ms</span>
                    </div>
                  </div>
                </div>

                {dispositivoSeleccionado?.ip === dispositivo.ip && (
                  <div className="dispositivo-acciones">
                    <button
                      className="btn-configurar"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleConfirmarSeleccion();
                      }}
                    >
                      ⚙️ Configurar Dispositivo
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="no-dispositivos">
            {estado === 'inactivo' && (
              <div className="mensaje-inicial">
                <p>🔍 Haz clic en "Iniciar Detección" para buscar dispositivos ESP32</p>
                <p>📝 También puedes probar una IP específica en el campo manual</p>
              </div>
            )}
            {estado === 'escaneando' && (
              <div className="mensaje-escaneando">
                <p>🔄 Escaneando red... Por favor espera</p>
              </div>
            )}
            {estado === 'error' && (
              <div className="mensaje-error">
                <p>❌ No se encontraron dispositivos</p>
                <p>💡 Verifica la configuración de red y que los dispositivos estén encendidos</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Log de actividad */}
      <div className="panel-log">
        <h3>📝 Log de Actividad</h3>
        <div className="log-container">
          {log.length > 0 ? (
            log.slice(-20).map((entrada, index) => (
              <div key={index} className={`log-entry ${entrada.tipo}`}>
                <span className="log-timestamp">{entrada.timestamp}</span>
                <span className="log-mensaje">{entrada.mensaje}</span>
              </div>
            ))
          ) : (
            <div className="log-vacio">
              <p>📋 El log de actividad aparecerá aquí</p>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
);
};

export default DetectorDispositivos;