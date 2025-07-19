// src/components/GestionUnidades/components/AsistenteConfiguracion/AsistenteConfiguracion.jsx
import React, { useState, useEffect } from 'react';
import { firebaseService } from '../../services/firebaseService';
import { detectESP32InRange, testESP32Connection, createDeviceProfile } from '../../utils/deviceDetection';
import { HttpManager } from '../../utils/http';
import './AsistenteConfiguracion.css';
import PasoIdentificacionConMapa from './PasoIdentificacionConMapa';

const AsistenteConfiguracion = ({ onCerrar, onCompletar }) => {
  const [pasoActual, setPasoActual] = useState(1);
  const [datosDispositivo, setDatosDispositivo] = useState({});
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [progreso, setProgreso] = useState(0);
  const [progresoDeteccion, setProgresoDeteccion] = useState(0);

  const pasos = [
    { numero: 1, titulo: 'Detección', icono: '🔍', descripcion: 'Buscar dispositivo ESP32' },
    { numero: 2, titulo: 'Identificación', icono: '🏷️', descripcion: 'Configurar información y ubicación' },
    { numero: 3, titulo: 'Sensores', icono: '🔬', descripcion: 'Configurar sensores detectados' },
    { numero: 4, titulo: 'Automatización', icono: '🤖', descripcion: 'Configurar modos inteligentes' },
    { numero: 5, titulo: 'Confirmación', icono: '✅', descripcion: 'Revisar y guardar' }
  ];

  // Estado para cada paso
  const [deteccion, setDeteccion] = useState({
    metodo: 'automatico',
    rangoIP: { base: '192.168.1.', inicio: 100, fin: 200 },
    ipManual: '',
    dispositivosEncontrados: [],
    dispositivoSeleccionado: null
  });

  const [identificacion, setIdentificacion] = useState({
    nombre: '',
    ubicacion: '',
    zona: '',
    descripcion: '',
    coordenadas: null
  });

  const [configuracionSensores, setConfiguracionSensores] = useState({
    ldr: { 
      habilitado: true, 
      thresholdDaylight: 400,
      thresholdTwilight: 200, 
      thresholdNight: 100,
      calibrationFactor: 1.0
    },
    pir: { 
      habilitado: true, 
      sensitivity: 2,
      activationTime: 45,
      extendedTime: 180
    },
    acs712: { 
      habilitado: true, 
      modelo: '20A', 
      maxAlert: 20.0,
      is5A: false
    }
  });

  const [configuracionAutomatizacion, setConfiguracionAutomatizacion] = useState({
    enabled: true,
    operatingMode: 4, // AUTO_SMART por defecto
    energySaving: {
      enabled: true,
      nightDimming: true,
      motionOnlyMode: false,
      nightDimmingPercent: 40
    },
    smartLDR: {
      enabled: true,
      adaptiveThresholds: true
    },
    smartPIR: {
      enabled: true,
      extendedDetection: true,
      intensityBoost: true
    },
    adaptiveLearning: true
  });

  // Calcular progreso
  useEffect(() => {
    const nuevoProgreso = (pasoActual / pasos.length) * 100;
    setProgreso(nuevoProgreso);
  }, [pasoActual]);

  // FUNCIÓN AUXILIAR: Test de conexión optimizado para nuevo firmware
  const testESP32ConnectionCORS = async (ip, puerto = 80, timeout = 5000) => {
    try {
      console.log(`🧪 Probando conexión CORS a ${ip}:${puerto}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const startTime = Date.now();
      
      // Probar primero endpoint de status avanzado
      const response = await fetch(`http://${ip}:${puerto}/api/status`, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        const data = await response.json();
        
        // Verificar si es nuestro firmware v4.0
        const firmwareVersion = data.firmwareVersion || '1.0.0';
        const deviceType = data.tipo || data.deviceType || 'ESP32';
        
        return {
          success: true,
          data: data,
          responseTime: responseTime,
          status: response.status,
          ip: ip,
          puerto: puerto,
          isAdvancedFirmware: firmwareVersion.startsWith('4.'),
          deviceType: deviceType
        };
      } else {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          responseTime: responseTime,
          status: response.status,
          ip: ip,
          puerto: puerto
        };
      }
    } catch (error) {
      let errorMessage = error.message;
      
      if (error.name === 'AbortError') {
        errorMessage = 'Timeout: El ESP32 no respondió a tiempo';
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage = 'Error CORS o conectividad: Verificar ESP32 y configuración';
      }
      
      return {
        success: false,
        error: errorMessage,
        responseTime: null,
        status: null,
        ip: ip,
        puerto: puerto
      };
    }
  };

  // FUNCIÓN: Detección automática con progreso visual
  const detectESP32InRangeCORS = async (baseIP, startRange, endRange, callbacks = {}) => {
    const { onProgress, onDeviceFound } = callbacks;
    const devicesFound = [];
    const total = endRange - startRange + 1;
    let completed = 0;
    
    console.log(`🔍 Iniciando escaneo CORS: ${baseIP}${startRange}-${endRange}`);
    
    // Procesar en lotes optimizados
    const batchSize = 8; // Aumentado para mejor rendimiento
    for (let start = startRange; start <= endRange; start += batchSize) {
      const batch = [];
      const end = Math.min(start + batchSize - 1, endRange);
      
      // Crear promesas para el lote actual
      for (let i = start; i <= end; i++) {
        const testIP = baseIP + i;
        batch.push(
          testESP32ConnectionCORS(testIP, 80, 2500) // Timeout reducido
            .then(result => {
              completed++;
              const percentage = Math.round((completed / total) * 100);
              
              setProgresoDeteccion(percentage);
              
              if (onProgress) {
                onProgress({
                  current: completed,
                  total: total,
                  percentage: percentage,
                  ip: testIP
                });
              }
              
              if (result.success) {
                console.log(`✅ ESP32 encontrado en ${testIP} - Firmware: ${result.data?.firmwareVersion || 'Unknown'}`);
                devicesFound.push(result);
                
                if (onDeviceFound) {
                  onDeviceFound(result);
                }
              }
              
              return result;
            })
            .catch(error => {
              completed++;
              const percentage = Math.round((completed / total) * 100);
              
              setProgresoDeteccion(percentage);
              
              if (onProgress) {
                onProgress({
                  current: completed,
                  total: total,
                  percentage: percentage,
                  ip: testIP,
                  error: error.message
                });
              }
              
              return { success: false, ip: testIP, error: error.message };
            })
        );
      }
      
      // Esperar a que termine el lote actual
      await Promise.all(batch);
      
      // Pausa más corta entre lotes
      if (end < endRange) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    
    return {
      success: true,
      devicesFound: devicesFound,
      totalScanned: total,
      foundCount: devicesFound.length
    };
  };

  // PASO 1: Detección de dispositivo MEJORADO
  const renderPasoDeteccion = () => (
    <div className="paso-contenido">
      <div className="paso-header">
        <h3>🔍 Detectar Dispositivo ESP32</h3>
        <p>Encuentra tu dispositivo de luminaria inteligente en la red local</p>
      </div>

      <div className="metodo-selector">
        <div className="radio-group">
          <label className="radio-label">
            <input
              type="radio"
              name="metodo"
              value="automatico"
              checked={deteccion.metodo === 'automatico'}
              onChange={(e) => setDeteccion(prev => ({ ...prev, metodo: e.target.value }))}
            />
            <span className="radio-custom"></span>
            <div className="radio-info">
              <strong>🔍 Detección Automática</strong>
              <p>Escanea automáticamente la red buscando dispositivos compatibles</p>
              <small>Recomendado para la mayoría de casos</small>
            </div>
          </label>

          <label className="radio-label">
            <input
              type="radio"
              name="metodo"
              value="manual"
              checked={deteccion.metodo === 'manual'}
              onChange={(e) => setDeteccion(prev => ({ ...prev, metodo: e.target.value }))}
            />
            <span className="radio-custom"></span>
            <div className="radio-info">
              <strong>🎯 IP Manual</strong>
              <p>Introduce la IP si ya conoces la dirección del dispositivo</p>
              <small>Para configuraciones avanzadas</small>
            </div>
          </label>
        </div>
      </div>

      {deteccion.metodo === 'automatico' && (
        <div className="config-automatica">
          <h4>⚙️ Configuración de Escaneo</h4>
          <div className="config-grid">
            <div className="config-item">
              <label>Rango de IP a escanear:</label>
              <div className="ip-range-input">
                <input
                  type="text"
                  value={deteccion.rangoIP.base}
                  onChange={(e) => setDeteccion(prev => ({
                    ...prev,
                    rangoIP: { ...prev.rangoIP, base: e.target.value }
                  }))}
                  className="input-ip-base"
                  placeholder="192.168.1."
                />
                <input
                  type="number"
                  value={deteccion.rangoIP.inicio}
                  onChange={(e) => setDeteccion(prev => ({
                    ...prev,
                    rangoIP: { ...prev.rangoIP, inicio: parseInt(e.target.value) }
                  }))}
                  className="input-range"
                  min="1"
                  max="254"
                />
                <span>-</span>
                <input
                  type="number"
                  value={deteccion.rangoIP.fin}
                  onChange={(e) => setDeteccion(prev => ({
                    ...prev,
                    rangoIP: { ...prev.rangoIP, fin: parseInt(e.target.value) }
                  }))}
                  className="input-range"
                  min="1"
                  max="254"
                />
              </div>
              <small>Se escaneará desde {deteccion.rangoIP.base}{deteccion.rangoIP.inicio} hasta {deteccion.rangoIP.base}{deteccion.rangoIP.fin}</small>
            </div>
          </div>

          {cargando && (
            <div className="progreso-escaneo">
              <div className="progreso-header">
                <span>🔄 Escaneando red...</span>
                <span>{progresoDeteccion}%</span>
              </div>
              <div className="progreso-barra-escaneo">
                <div 
                  className="progreso-fill-escaneo"
                  style={{ width: `${progresoDeteccion}%` }}
                ></div>
              </div>
              <small>Probando {deteccion.rangoIP.base}{Math.floor(progresoDeteccion * (deteccion.rangoIP.fin - deteccion.rangoIP.inicio + 1) / 100) + deteccion.rangoIP.inicio}</small>
            </div>
          )}

          <button
            className="btn-detectar primary"
            onClick={iniciarDeteccionAutomatica}
            disabled={cargando}
          >
            {cargando ? '🔄 Escaneando...' : '🔍 Iniciar Escaneo Automático'}
          </button>
        </div>
      )}

      {deteccion.metodo === 'manual' && (
        <div className="config-manual">
          <h4>🎯 Dirección IP Manual</h4>
          <div className="ip-manual-input">
            <input
              type="text"
              placeholder="192.168.1.101"
              value={deteccion.ipManual}
              onChange={(e) => setDeteccion(prev => ({ ...prev, ipManual: e.target.value }))}
              className="input-ip-manual"
              pattern="^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$"
            />
            <button
              className="btn-probar"
              onClick={probarIPManual}
              disabled={cargando || !deteccion.ipManual}
            >
              {cargando ? '🔄' : '🎯'} Probar Conexión
            </button>
          </div>
          <small>Introduce la dirección IP exacta del dispositivo ESP32</small>
        </div>
      )}

      {/* Dispositivos encontrados MEJORADO */}
      {deteccion.dispositivosEncontrados.length > 0 && (
        <div className="dispositivos-encontrados">
          <h4>📱 Dispositivos Encontrados ({deteccion.dispositivosEncontrados.length})</h4>
          <div className="dispositivos-lista">
            {deteccion.dispositivosEncontrados.map((dispositivo, index) => (
              <div
                key={index}
                className={`dispositivo-item ${deteccion.dispositivoSeleccionado?.ip === dispositivo.ip ? 'seleccionado' : ''}`}
                onClick={() => seleccionarDispositivo(dispositivo)}
              >
                <div className="dispositivo-info">
                  <div className="dispositivo-header">
                    <span className="dispositivo-icon">
                      {dispositivo.isAdvancedFirmware ? '🌟' : '📱'}
                    </span>
                    <div className="dispositivo-detalles-header">
                      <span className="dispositivo-id">
                        {dispositivo.data?.deviceId || `ESP32_${dispositivo.ip.replace(/\./g, '')}`}
                      </span>
                      {dispositivo.isAdvancedFirmware && (
                        <span className="badge-advanced">v4.0 Inteligente</span>
                      )}
                    </div>
                  </div>
                  <div className="dispositivo-detalles">
                    <div className="detalle-fila">
                      <span className="detalle-label">IP:</span>
                      <span className="detalle-valor">{dispositivo.ip}:{dispositivo.puerto}</span>
                    </div>
                    <div className="detalle-fila">
                      <span className="detalle-label">Firmware:</span>
                      <span className="detalle-valor">v{dispositivo.data?.firmwareVersion || '1.0.0'}</span>
                    </div>
                    <div className="detalle-fila">
                      <span className="detalle-label">Tipo:</span>
                      <span className="detalle-valor">{dispositivo.deviceType}</span>
                    </div>
                    <div className="detalle-fila">
                      <span className="detalle-label">Respuesta:</span>
                      <span className="detalle-valor">{dispositivo.responseTime}ms</span>
                    </div>
                    {dispositivo.data?.configured && (
                      <div className="detalle-fila">
                        <span className="detalle-label">Estado:</span>
                        <span className="detalle-valor estado-configurado">
                          {dispositivo.data.configured ? '✅ Configurado' : '⚠️ Sin configurar'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                {deteccion.dispositivoSeleccionado?.ip === dispositivo.ip && (
                  <div className="seleccionado-check">✅</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="error-message">
          <span className="error-icon">❌</span>
          <div className="error-content">
            <strong>Error de detección</strong>
            <p>{error}</p>
          </div>
        </div>
      )}
    </div>
  );

  // PASO 2: Identificación con mapa (sin cambios, ya está optimizado)
  const renderPasoIdentificacion = () => (
    <PasoIdentificacionConMapa
      datosDispositivo={datosDispositivo}
      identificacion={identificacion}
      setIdentificacion={setIdentificacion}
      onUbicacionConfirmada={(ubicacion) => {
        console.log('🎯 Ubicación confirmada desde mapa:', ubicacion);
      }}
    />
  );

  // PASO 3: Configuración de Sensores MEJORADO
  const renderPasoSensores = () => (
    <div className="paso-contenido">
      <div className="paso-header">
        <h3>🔬 Configuración de Sensores</h3>
        <p>Ajusta los sensores detectados automáticamente en tu dispositivo</p>
      </div>

      {/* Mostrar sensores detectados */}
      {datosDispositivo.sensores && (
        <div className="sensores-detectados">
          <h4>✅ Sensores Detectados Automáticamente</h4>
          <div className="sensores-detectados-lista">
            {datosDispositivo.sensores.ldr && (
              <div className="sensor-detectado">
                <span className="sensor-icon">💡</span>
                <span>LDR (Sensor de Luz) - {datosDispositivo.sensores.ldr.model || 'Fotoresistor'}</span>
              </div>
            )}
            {datosDispositivo.sensores.pir && (
              <div className="sensor-detectado">
                <span className="sensor-icon">👁️</span>
                <span>PIR (Sensor de Movimiento) - {datosDispositivo.sensores.pir.model || 'HC-SR501'}</span>
              </div>
            )}
            {datosDispositivo.sensores.acs712 && (
              <div className="sensor-detectado">
                <span className="sensor-icon">⚡</span>
                <span>ACS712 (Sensor de Corriente) - {datosDispositivo.sensores.acs712.model || 'ACS712-20A'}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="sensores-config">
        {/* LDR MEJORADO */}
        <div className="sensor-group">
          <div className="sensor-header">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={configuracionSensores.ldr.habilitado}
                onChange={(e) => setConfiguracionSensores(prev => ({
                  ...prev,
                  ldr: { ...prev.ldr, habilitado: e.target.checked }
                }))}
              />
              <span className="checkbox-custom"></span>
              <div className="sensor-titulo-info">
                <span className="sensor-titulo">💡 Sensor LDR (Luminosidad)</span>
                <small>Detecta la luz ambiente para encendido/apagado automático</small>
              </div>
            </label>
          </div>
          
          {configuracionSensores.ldr.habilitado && (
            <div className="sensor-config">
              <div className="config-row">
                <div className="config-item">
                  <label>Umbral Día (no encender)</label>
                  <input
                    type="number"
                    value={configuracionSensores.ldr.thresholdDaylight}
                    onChange={(e) => setConfiguracionSensores(prev => ({
                      ...prev,
                      ldr: { ...prev.ldr, thresholdDaylight: parseInt(e.target.value) }
                    }))}
                    className="input-config"
                    min="0"
                    max="1000"
                  />
                  <small>Lux mínimos para considerar "día"</small>
                </div>
                <div className="config-item">
                  <label>Umbral Crepúsculo (dimmer)</label>
                  <input
                    type="number"
                    value={configuracionSensores.ldr.thresholdTwilight}
                    onChange={(e) => setConfiguracionSensores(prev => ({
                      ...prev,
                      ldr: { ...prev.ldr, thresholdTwilight: parseInt(e.target.value) }
                    }))}
                    className="input-config"
                    min="0"
                    max="1000"
                  />
                  <small>Lux para encendido atenuado</small>
                </div>
                <div className="config-item">
                  <label>Umbral Noche (completo)</label>
                  <input
                    type="number"
                    value={configuracionSensores.ldr.thresholdNight}
                    onChange={(e) => setConfiguracionSensores(prev => ({
                      ...prev,
                      ldr: { ...prev.ldr, thresholdNight: parseInt(e.target.value) }
                    }))}
                    className="input-config"
                    min="0"
                    max="1000"
                  />
                  <small>Lux para encendido completo</small>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* PIR MEJORADO */}
        <div className="sensor-group">
          <div className="sensor-header">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={configuracionSensores.pir.habilitado}
                onChange={(e) => setConfiguracionSensores(prev => ({
                  ...prev,
                  pir: { ...prev.pir, habilitado: e.target.checked }
                }))}
              />
              <span className="checkbox-custom"></span>
              <div className="sensor-titulo-info">
                <span className="sensor-titulo">👁️ Sensor PIR (Movimiento)</span>
                <small>Detecta presencia para encendido inteligente</small>
              </div>
            </label>
          </div>
          
          {configuracionSensores.pir.habilitado && (
            <div className="sensor-config">
              <div className="config-row">
                <div className="config-item">
                  <label>Sensibilidad</label>
                  <select
                    value={configuracionSensores.pir.sensitivity}
                    onChange={(e) => setConfiguracionSensores(prev => ({
                      ...prev,
                      pir: { ...prev.pir, sensitivity: parseInt(e.target.value) }
                    }))}
                    className="select-config"
                  >
                    <option value={1}>Baja</option>
                    <option value={2}>Media</option>
                    <option value={3}>Alta</option>
                  </select>
                  <small>Nivel de sensibilidad del sensor</small>
                </div>
                <div className="config-item">
                  <label>Tiempo Activación (seg)</label>
                  <input
                    type="number"
                    value={configuracionSensores.pir.activationTime}
                    onChange={(e) => setConfiguracionSensores(prev => ({
                      ...prev,
                      pir: { ...prev.pir, activationTime: parseInt(e.target.value) }
                    }))}
                    className="input-config"
                    min="5"
                    max="300"
                  />
                  <small>Tiempo base de encendido</small>
                </div>
                <div className="config-item">
                  <label>Tiempo Extendido (seg)</label>
                  <input
                    type="number"
                    value={configuracionSensores.pir.extendedTime}
                    onChange={(e) => setConfiguracionSensores(prev => ({
                      ...prev,
                      pir: { ...prev.pir, extendedTime: parseInt(e.target.value) }
                    }))}
                    className="input-config"
                    min="60"
                    max="600"
                  />
                  <small>Tiempo si hay actividad continua</small>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ACS712 MEJORADO */}
        <div className="sensor-group">
          <div className="sensor-header">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={configuracionSensores.acs712.habilitado}
                onChange={(e) => setConfiguracionSensores(prev => ({
                  ...prev,
                  acs712: { ...prev.acs712, habilitado: e.target.checked }
                }))}
              />
              <span className="checkbox-custom"></span>
              <div className="sensor-titulo-info">
                <span className="sensor-titulo">⚡ Sensor ACS712 (Corriente)</span>
                <small>Monitorea el consumo energético en tiempo real</small>
              </div>
            </label>
          </div>
          
          {configuracionSensores.acs712.habilitado && (
            <div className="sensor-config">
              <div className="config-row">
                <div className="config-item">
                  <label>Modelo Detectado</label>
                  <select
                    value={configuracionSensores.acs712.modelo}
                    onChange={(e) => {
                      const modelo = e.target.value;
                      setConfiguracionSensores(prev => ({
                        ...prev,
                        acs712: { 
                          ...prev.acs712, 
                          modelo: modelo,
                          is5A: modelo === '5A',
                          maxAlert: modelo === '5A' ? 5.0 : (modelo === '20A' ? 20.0 : 30.0)
                        }
                      }));
                    }}
                    className="select-config"
                  >
                    <option value="5A">ACS712-5A (hasta 5A)</option>
                    <option value="20A">ACS712-20A (hasta 20A)</option>
                    <option value="30A">ACS712-30A (hasta 30A)</option>
                  </select>
                  <small>Modelo auto-detectado del sensor</small>
                </div>
                <div className="config-item">
                  <label>Alerta Máxima (A)</label>
                  <input
                    type="number"
                    value={configuracionSensores.acs712.maxAlert}
                    onChange={(e) => setConfiguracionSensores(prev => ({
                      ...prev,
                      acs712: { ...prev.acs712, maxAlert: parseFloat(e.target.value) }
                    }))}
                    className="input-config"
                    min="0.1"
                    max={configuracionSensores.acs712.modelo === '5A' ? '5' : (configuracionSensores.acs712.modelo === '20A' ? '20' : '30')}
                    step="0.1"
                  />
                  <small>Corriente máxima antes de alerta</small>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // PASO 4: Configuración de Automatización NUEVO
  const renderPasoAutomatizacion = () => (
    <div className="paso-contenido">
      <div className="paso-header">
        <h3>🤖 Configuración de Automatización Inteligente</h3>
        <p>Configura los modos inteligentes y funciones de ahorro energético</p>
      </div>

      <div className="automatizacion-config">
        {/* Modo de Operación */}
        <div className="config-group">
          <h4>⚡ Modo de Operación</h4>
          <div className="modos-grid">
            {[
              { id: 1, name: 'Solo PIR', desc: 'Máximo ahorro - solo movimiento', saving: '85%', icon: '👁️' },
              { id: 2, name: 'Solo LDR', desc: 'Ahorro medio - solo luz', saving: '60%', icon: '💡' },
              { id: 3, name: 'Combinado', desc: 'LDR + PIR balanceado', saving: '70%', icon: '🔄' },
              { id: 4, name: 'Inteligente', desc: 'IA adaptativa (recomendado)', saving: '75%', icon: '🧠' },
              { id: 5, name: 'Manual', desc: 'Control manual completo', saving: '0%', icon: '🎛️' },
              { id: 6, name: 'Horarios', desc: 'Basado en programación', saving: '65%', icon: '⏰' }
            ].map(modo => (
              <div
                key={modo.id}
                className={`modo-card ${configuracionAutomatizacion.operatingMode === modo.id ? 'selected' : ''}`}
                onClick={() => setConfiguracionAutomatizacion(prev => ({
                  ...prev,
                  operatingMode: modo.id
                }))}
              >
                <div className="modo-icon">{modo.icon}</div>
                <div className="modo-info">
                  <strong>{modo.name}</strong>
                  <p>{modo.desc}</p>
                  <span className="modo-saving">Ahorro: {modo.saving}</span>
                </div>
                {configuracionAutomatizacion.operatingMode === modo.id && (
                  <div className="modo-selected">✅</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Configuraciones de Ahorro Energético */}
        <div className="config-group">
          <h4>🌱 Ahorro Energético</h4>
          <div className="ahorro-config">
            <label className="switch-label">
              <input
                type="checkbox"
                checked={configuracionAutomatizacion.energySaving.enabled}
                onChange={(e) => setConfiguracionAutomatizacion(prev => ({
                  ...prev,
                  energySaving: { ...prev.energySaving, enabled: e.target.checked }
                }))}
              />
              <span className="switch-slider"></span>
              <div className="switch-info">
                <strong>Activar Ahorro Energético</strong>
                <small>Optimizaciones automáticas para reducir consumo</small>
              </div>
            </label>

            {configuracionAutomatizacion.energySaving.enabled && (
              <div className="ahorro-options">
                <label className="switch-label">
                  <input
                    type="checkbox"
                    checked={configuracionAutomatizacion.energySaving.nightDimming}
                    onChange={(e) => setConfiguracionAutomatizacion(prev => ({
                      ...prev,
                      energySaving: { ...prev.energySaving, nightDimming: e.target.checked }
                    }))}
                  />
                  <span className="switch-slider"></span>
                  <div className="switch-info">
                    <strong>Atenuación Nocturna</strong>
                    <small>Reduce intensidad automáticamente de 23:00 a 05:00</small>
                  </div>
                </label>

                <label className="switch-label">
                  <input
                    type="checkbox"
                    checked={configuracionAutomatizacion.energySaving.motionOnlyMode}
                    onChange={(e) => setConfiguracionAutomatizacion(prev => ({
                      ...prev,
                      energySaving: { ...prev.energySaving, motionOnlyMode: e.target.checked }
                    }))}
                  />
                  <span className="switch-slider"></span>
                  <div className="switch-info">
                    <strong>Modo Solo Movimiento</strong>
                    <small>Solo enciende cuando detecta presencia (máximo ahorro)</small>
                  </div>
                </label>

                {configuracionAutomatizacion.energySaving.nightDimming && (
                  <div className="config-item">
                    <label>Porcentaje de Atenuación Nocturna</label>
                    <input
                      type="range"
                      min="20"
                      max="80"
                      value={configuracionAutomatizacion.energySaving.nightDimmingPercent}
                      onChange={(e) => setConfiguracionAutomatizacion(prev => ({
                        ...prev,
                        energySaving: { ...prev.energySaving, nightDimmingPercent: parseInt(e.target.value) }
                      }))}
                      className="range-input"
                    />
                    <span className="range-value">{configuracionAutomatizacion.energySaving.nightDimmingPercent}%</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Configuraciones Inteligentes */}
        <div className="config-group">
          <h4>🧠 Funciones Inteligentes</h4>
          <div className="inteligente-config">
            <label className="switch-label">
              <input
                type="checkbox"
                checked={configuracionAutomatizacion.adaptiveLearning}
                onChange={(e) => setConfiguracionAutomatizacion(prev => ({
                  ...prev,
                  adaptiveLearning: e.target.checked
                }))}
              />
              <span className="switch-slider"></span>
              <div className="switch-info">
                <strong>Aprendizaje Adaptativo</strong>
                <small>El sistema aprende patrones de uso y optimiza automáticamente</small>
              </div>
            </label>

            <label className="switch-label">
              <input
                type="checkbox"
                checked={configuracionAutomatizacion.smartLDR.adaptiveThresholds}
                onChange={(e) => setConfiguracionAutomatizacion(prev => ({
                  ...prev,
                  smartLDR: { ...prev.smartLDR, adaptiveThresholds: e.target.checked }
                }))}
              />
              <span className="switch-slider"></span>
              <div className="switch-info">
                <strong>Umbrales LDR Adaptativos</strong>
                <small>Ajusta automáticamente los umbrales de luz según condiciones</small>
              </div>
            </label>

            <label className="switch-label">
              <input
                type="checkbox"
                checked={configuracionAutomatizacion.smartPIR.extendedDetection}
                onChange={(e) => setConfiguracionAutomatizacion(prev => ({
                  ...prev,
                  smartPIR: { ...prev.smartPIR, extendedDetection: e.target.checked }
                }))}
              />
              <span className="switch-slider"></span>
              <div className="switch-info">
                <strong>Detección PIR Extendida</strong>
                <small>Extiende tiempo de encendido si detecta actividad continua</small>
              </div>
            </label>

            <label className="switch-label">
              <input
                type="checkbox"
                checked={configuracionAutomatizacion.smartPIR.intensityBoost}
                onChange={(e) => setConfiguracionAutomatizacion(prev => ({
                  ...prev,
                  smartPIR: { ...prev.smartPIR, intensityBoost: e.target.checked }
                }))}
              />
              <span className="switch-slider"></span>
              <div className="switch-info">
                <strong>Boost de Intensidad PIR</strong>
                <small>Aumenta intensidad al 100% cuando detecta movimiento</small>
              </div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  // PASO 5: Confirmación MEJORADO
  const renderPasoConfirmacion = () => (
    <div className="paso-contenido">
      <div className="paso-header">
        <h3>✅ Confirmar Configuración</h3>
        <p>Revisa toda la configuración antes de aplicarla al dispositivo</p>
      </div>

      <div className="confirmacion-resumen">
        {/* Dispositivo */}
        <div className="resumen-seccion">
          <h4>📱 Dispositivo Detectado</h4>
          <div className="resumen-grid">
            <div className="resumen-item">
              <span className="resumen-label">ID del Dispositivo:</span>
              <span className="resumen-valor">{datosDispositivo.deviceId}</span>
            </div>
            <div className="resumen-item">
              <span className="resumen-label">IP:</span>
              <span className="resumen-valor">{datosDispositivo.ip}:{datosDispositivo.puerto}</span>
            </div>
            <div className="resumen-item">
              <span className="resumen-label">Firmware:</span>
              <span className="resumen-valor">v{datosDispositivo.firmwareVersion}</span>
            </div>
            <div className="resumen-item">
              <span className="resumen-label">Tipo:</span>
              <span className="resumen-valor">{datosDispositivo.hardware}</span>
            </div>
          </div>
        </div>

        {/* Identificación */}
        <div className="resumen-seccion">
          <h4>🏷️ Identificación</h4>
          <div className="resumen-grid">
            <div className="resumen-item">
              <span className="resumen-label">Nombre:</span>
              <span className="resumen-valor">{identificacion.nombre}</span>
            </div>
            <div className="resumen-item">
              <span className="resumen-label">Ubicación:</span>
              <span className="resumen-valor">{identificacion.ubicacion}</span>
            </div>
            <div className="resumen-item">
              <span className="resumen-label">Zona:</span>
              <span className="resumen-valor">{identificacion.zona || 'Sin asignar'}</span>
            </div>
            {identificacion.coordenadas && (
              <div className="resumen-item">
                <span className="resumen-label">Coordenadas:</span>
                <span className="resumen-valor">
                  {identificacion.coordenadas.lat.toFixed(6)}, {identificacion.coordenadas.lng.toFixed(6)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Sensores */}
        <div className="resumen-seccion">
          <h4>🔬 Configuración de Sensores</h4>
          <div className="sensores-resumen-grid">
            <div className={`sensor-resumen-card ${configuracionSensores.ldr.habilitado ? 'habilitado' : 'deshabilitado'}`}>
              <div className="sensor-resumen-header">
                <span className="sensor-icon">💡</span>
                <strong>LDR (Luminosidad)</strong>
              </div>
              <div className="sensor-resumen-estado">
                {configuracionSensores.ldr.habilitado ? '✅ Habilitado' : '❌ Deshabilitado'}
              </div>
              {configuracionSensores.ldr.habilitado && (
                <div className="sensor-resumen-config">
                  <small>Día: {configuracionSensores.ldr.thresholdDaylight} lux</small>
                  <small>Crepúsculo: {configuracionSensores.ldr.thresholdTwilight} lux</small>
                  <small>Noche: {configuracionSensores.ldr.thresholdNight} lux</small>
                </div>
              )}
            </div>

            <div className={`sensor-resumen-card ${configuracionSensores.pir.habilitado ? 'habilitado' : 'deshabilitado'}`}>
              <div className="sensor-resumen-header">
                <span className="sensor-icon">👁️</span>
                <strong>PIR (Movimiento)</strong>
              </div>
              <div className="sensor-resumen-estado">
                {configuracionSensores.pir.habilitado ? '✅ Habilitado' : '❌ Deshabilitado'}
              </div>
              {configuracionSensores.pir.habilitado && (
                <div className="sensor-resumen-config">
                  <small>Sensibilidad: {configuracionSensores.pir.sensitivity}</small>
                  <small>Activación: {configuracionSensores.pir.activationTime}s</small>
                  <small>Extendido: {configuracionSensores.pir.extendedTime}s</small>
                </div>
              )}
            </div>

            <div className={`sensor-resumen-card ${configuracionSensores.acs712.habilitado ? 'habilitado' : 'deshabilitado'}`}>
              <div className="sensor-resumen-header">
                <span className="sensor-icon">⚡</span>
                <strong>ACS712 (Corriente)</strong>
              </div>
              <div className="sensor-resumen-estado">
                {configuracionSensores.acs712.habilitado ? '✅ Habilitado' : '❌ Deshabilitado'}
              </div>
              {configuracionSensores.acs712.habilitado && (
                <div className="sensor-resumen-config">
                  <small>Modelo: ACS712-{configuracionSensores.acs712.modelo}</small>
                  <small>Alerta: {configuracionSensores.acs712.maxAlert}A</small>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Automatización */}
        <div className="resumen-seccion">
          <h4>🤖 Automatización Inteligente</h4>
          <div className="automatizacion-resumen">
            <div className="resumen-item-destacado">
              <span className="resumen-label">Modo de Operación:</span>
              <span className="resumen-valor">
                {['Apagado', 'Solo PIR', 'Solo LDR', 'Combinado', 'Inteligente', 'Manual', 'Horarios'][configuracionAutomatizacion.operatingMode]}
              </span>
            </div>
            <div className="caracteristicas-habilitadas">
              {configuracionAutomatizacion.energySaving.enabled && (
                <span className="caracteristica-badge">🌱 Ahorro Energético</span>
              )}
              {configuracionAutomatizacion.energySaving.nightDimming && (
                <span className="caracteristica-badge">🌙 Atenuación Nocturna</span>
              )}
              {configuracionAutomatizacion.adaptiveLearning && (
                <span className="caracteristica-badge">🧠 Aprendizaje Adaptativo</span>
              )}
              {configuracionAutomatizacion.smartLDR.adaptiveThresholds && (
                <span className="caracteristica-badge">💡 Umbrales Adaptativos</span>
              )}
              {configuracionAutomatizacion.smartPIR.extendedDetection && (
                <span className="caracteristica-badge">👁️ Detección Extendida</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="confirmacion-advertencia">
        <div className="advertencia-content">
          <span className="advertencia-icon">⚠️</span>
          <div>
            <strong>Importante - Proceso de Configuración:</strong>
            <ul>
              <li>Se enviará toda la configuración al dispositivo ESP32</li>
              <li>Los datos se guardarán automáticamente en Firebase</li>
              <li>El dispositivo se reiniciará para aplicar cambios</li>
              <li>El proceso puede tomar entre 30-60 segundos</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  // Funciones del asistente MEJORADAS

  const iniciarDeteccionAutomatica = async () => {
    setCargando(true);
    setError('');
    setProgresoDeteccion(0);
    
    try {
      console.log('🔍 Iniciando detección automática optimizada...');
      
      const dispositivos = await detectESP32InRangeCORS(
        deteccion.rangoIP.base,
        deteccion.rangoIP.inicio,
        deteccion.rangoIP.fin,
        {
          onProgress: (info) => {
            console.log(`Progreso: ${info.percentage}% - Probando ${info.ip}`);
          },
          onDeviceFound: (dispositivo) => {
            console.log('✅ Dispositivo encontrado:', dispositivo.ip, 'Firmware:', dispositivo.data?.firmwareVersion);
          }
        }
      );

      if (dispositivos.success && dispositivos.devicesFound.length > 0) {
        setDeteccion(prev => ({
          ...prev,
          dispositivosEncontrados: dispositivos.devicesFound
        }));
        console.log(`🎉 Escaneo completado: ${dispositivos.foundCount} dispositivos encontrados`);
        
        // Auto-seleccionar si solo hay uno
        if (dispositivos.devicesFound.length === 1) {
          seleccionarDispositivo(dispositivos.devicesFound[0]);
        }
      } else {
        setError('No se encontraron dispositivos ESP32 en el rango especificado. Verifica que el dispositivo esté encendido y conectado a la red.');
      }
    } catch (error) {
      console.error('❌ Error durante la detección:', error);
      setError(`Error durante la detección: ${error.message}`);
    } finally {
      setCargando(false);
      setProgresoDeteccion(0);
    }
  };

  const probarIPManual = async () => {
    setCargando(true);
    setError('');
    
    try {
      console.log(`🎯 Probando IP manual: ${deteccion.ipManual}`);
      
      const resultado = await testESP32ConnectionCORS(deteccion.ipManual, 80, 8000);
      
      if (resultado.success) {
        const dispositivo = {
          ip: deteccion.ipManual,
          puerto: 80,
          data: resultado.data,
          responseTime: resultado.responseTime,
          isAdvancedFirmware: resultado.isAdvancedFirmware,
          deviceType: resultado.deviceType
        };
        
        setDeteccion(prev => ({
          ...prev,
          dispositivosEncontrados: [dispositivo]
        }));
        
        seleccionarDispositivo(dispositivo);
        console.log('✅ Conexión manual exitosa');
      } else {
        setError(`No se pudo conectar con ${deteccion.ipManual}: ${resultado.error}`);
      }
    } catch (error) {
      console.error('❌ Error probando IP manual:', error);
      setError(`Error probando IP: ${error.message}`);
    } finally {
      setCargando(false);
    }
  };

  const seleccionarDispositivo = (dispositivo) => {
    console.log('📱 Seleccionando dispositivo:', dispositivo.ip);
    
    setDeteccion(prev => ({
      ...prev,
      dispositivoSeleccionado: dispositivo
    }));
    
    // Extraer información más completa del dispositivo
    const deviceData = dispositivo.data || {};
    
    setDatosDispositivo({
      ip: dispositivo.ip,
      puerto: dispositivo.puerto,
      deviceId: deviceData.deviceId || `LUM_${dispositivo.ip.replace(/\./g, '')}`,
      firmwareVersion: deviceData.firmwareVersion || '1.0.0',
      hardware: deviceData.hardware?.model || 'ESP32-WROOM-32',
      sensores: {
        ldr: deviceData.capabilities?.ldr ? { model: 'Fotoresistor-5k', autoDetected: true } : null,
        pir: deviceData.capabilities?.pir ? { model: 'HC-SR501', autoDetected: true } : null,
        acs712: deviceData.capabilities?.acs712 ? { model: 'ACS712-20A', autoDetected: true } : null
      },
      isAdvancedFirmware: dispositivo.isAdvancedFirmware,
      configured: deviceData.configured || false
    });

    // Auto-rellenar campos de identificación
    setIdentificacion(prev => ({
      ...prev,
      nombre: deviceData.deviceName || `Poste Villa Adela ${dispositivo.ip.split('.').pop()}`,
      zona: deviceData.zona || ''
    }));

    // Configurar sensores basado en capacidades detectadas
    if (deviceData.capabilities) {
      setConfiguracionSensores(prev => ({
        ...prev,
        ldr: {
          ...prev.ldr,
          habilitado: !!deviceData.capabilities.ldr
        },
        pir: {
          ...prev.pir,
          habilitado: !!deviceData.capabilities.pir
        },
        acs712: {
          ...prev.acs712,
          habilitado: !!deviceData.capabilities.acs712
        }
      }));
    }
  };

  const avanzarPaso = () => {
    if (pasoActual < pasos.length) {
      // Validaciones por paso
      if (pasoActual === 1 && !deteccion.dispositivoSeleccionado) {
        setError('Debes seleccionar un dispositivo para continuar');
        return;
      }
      
      if (pasoActual === 2 && (!identificacion.nombre || !identificacion.ubicacion)) {
        setError('Debes completar el nombre y ubicación del dispositivo');
        return;
      }

      setError('');
      setPasoActual(prev => prev + 1);
    }
  };

  const retrocederPaso = () => {
    if (pasoActual > 1) {
      setError('');
      setPasoActual(prev => prev - 1);
    }
  };

  const completarConfiguracion = async () => {
    setCargando(true);
    setError('');

    try {
      console.log('💾 Iniciando proceso de configuración final optimizado...');
      
      // Generar ID único más descriptivo
      const timestamp = Date.now();
      const deviceSuffix = datosDispositivo.deviceId.slice(-4);
      const deviceId = `POSTE_${deviceSuffix}_${timestamp}`;
      
      // Preparar configuración completa para el ESP32
      const configESP32 = {
        deviceName: identificacion.nombre,
        zona: identificacion.zona,
        ubicacion: identificacion.ubicacion,
        coordenadas: identificacion.coordenadas,
        markConfigured: true,
        sensores: {
          ldr: configuracionSensores.ldr,
          pir: configuracionSensores.pir,
          acs712: configuracionSensores.acs712
        },
        automation: configuracionAutomatizacion
      };

      // Enviar configuración al ESP32 primero
      console.log('📡 Enviando configuración al ESP32...');
      const httpManager = new HttpManager(datosDispositivo.ip, datosDispositivo.puerto);
      
      // Configurar dispositivo
      const configResponse = await fetch(`http://${datosDispositivo.ip}:${datosDispositivo.puerto}/api/configure`, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configESP32)
      });

      if (!configResponse.ok) {
        throw new Error(`Error configurando ESP32: HTTP ${configResponse.status}`);
      }

      const configResult = await configResponse.json();
      console.log('✅ ESP32 configurado:', configResult);

      // Configurar sensores si es firmware avanzado
      if (datosDispositivo.isAdvancedFirmware) {
        console.log('🔬 Configurando sensores avanzados...');
        const sensorsResponse = await fetch(`http://${datosDispositivo.ip}:${datosDispositivo.puerto}/api/sensors/config`, {
          method: 'POST',
          mode: 'cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(configuracionSensores)
        });

        if (sensorsResponse.ok) {
          console.log('✅ Sensores configurados');
        }

        // Configurar automatización
        console.log('🤖 Configurando automatización...');
        const autoResponse = await fetch(`http://${datosDispositivo.ip}:${datosDispositivo.puerto}/api/automation`, {
          method: 'POST',
          mode: 'cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(configuracionAutomatizacion)
        });

        if (autoResponse.ok) {
          console.log('✅ Automatización configurada');
        }
      }

      // Preparar datos completos para Firebase
      const dispositivoCompleto = {
        id: deviceId,
        deviceId: datosDispositivo.deviceId,
        nombre: identificacion.nombre,
        ubicacion: identificacion.ubicacion,
        zona: identificacion.zona,
        descripcion: identificacion.descripcion,
        coordenadas: identificacion.coordenadas,
        red: {
          ip: datosDispositivo.ip,
          puerto: datosDispositivo.puerto,
          protocolo: 'HTTP/1.1'
        },
        hardware: {
          tipo: datosDispositivo.hardware,
          firmware: datosDispositivo.firmwareVersion,
          isAdvanced: datosDispositivo.isAdvancedFirmware
        },
        sensores: {
          ldr: configuracionSensores.ldr,
          pir: configuracionSensores.pir,
          acs712: configuracionSensores.acs712
        },
        automatizacion: configuracionAutomatizacion,
        estado: {
          online: true,
          configurado: true,
          ultimaConexion: new Date().toISOString()
        },
        fechaCreacion: new Date().toISOString(),
        fechaActualizacion: new Date().toISOString()
      };

      // Guardar en Firebase
      console.log('🔥 Guardando en Firebase...');
      await firebaseService.createInitialPoste(deviceId);
      await firebaseService.updateDoc(`postes/${deviceId}`, dispositivoCompleto);

      console.log('✅ Configuración completada exitosamente');

      // Completar proceso
      if (onCompletar) {
        onCompletar(dispositivoCompleto);
      }

      if (onCerrar) {
        onCerrar();
      }

    } catch (error) {
      console.error('❌ Error guardando configuración:', error);
      setError(`Error guardando configuración: ${error.message}`);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="asistente-overlay">
      <div className="asistente-modal">
        <div className="asistente-header">
          <h2>🧙‍♂️ Asistente de Configuración Inteligente v4.0</h2>
          <button className="btn-cerrar" onClick={onCerrar}>✕</button>
        </div>

        {/* Progreso */}
        <div className="progreso-container">
          <div className="progreso-barra">
            <div 
              className="progreso-fill"
              style={{ width: `${progreso}%` }}
            ></div>
          </div>
          <div className="progreso-pasos">
            {pasos.map((paso) => (
              <div 
                key={paso.numero}
                className={`paso-indicator ${pasoActual >= paso.numero ? 'completado' : ''} ${pasoActual === paso.numero ? 'activo' : ''}`}
              >
                <div className="paso-numero">{paso.icono}</div>
                <div className="paso-info">
                  <div className="paso-titulo">{paso.titulo}</div>
                  <div className="paso-descripcion">{paso.descripcion}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contenido del paso actual */}
        <div className="asistente-contenido">
          {pasoActual === 1 && renderPasoDeteccion()}
          {pasoActual === 2 && renderPasoIdentificacion()}
          {pasoActual === 3 && renderPasoSensores()}
          {pasoActual === 4 && renderPasoAutomatizacion()}
          {pasoActual === 5 && renderPasoConfirmacion()}
        </div>

        {/* Navegación */}
        <div className="asistente-navegacion">
          <button 
            className="btn-navegacion secondary"
            onClick={retrocederPaso}
            disabled={pasoActual === 1 || cargando}
          >
            ← Anterior
          </button>

          <div className="navegacion-info">
            Paso {pasoActual} de {pasos.length}
            {datosDispositivo.isAdvancedFirmware && (
              <span className="firmware-badge">⚡ Firmware v4.0</span>
            )}
          </div>

          {pasoActual < pasos.length ? (
            <button 
              className="btn-navegacion primary"
              onClick={avanzarPaso}
              disabled={cargando}
            >
              Siguiente →
            </button>
          ) : (
            <button 
              className="btn-navegacion success"
              onClick={completarConfiguracion}
              disabled={cargando}
            >
              {cargando ? '💾 Configurando...' : '✅ Aplicar Configuración'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AsistenteConfiguracion;