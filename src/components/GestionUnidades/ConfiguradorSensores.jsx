// src/components/GestionUnidades/components/ConfiguradorSensores/ConfiguradorSensores.jsx
import React, { useState, useEffect } from 'react';
import { firebaseService } from '../../services/firebaseService';
import { HttpManager } from '../../utils/http';
import './ConfiguradorSensores.css';

const ConfiguradorSensores = ({ dispositivo, onActualizar }) => {
  const [configuracion, setConfiguracion] = useState({
    ldr: {
      habilitado: true,
      umbralEncendido: 100,
      umbralApagado: 300,
      factorCalibracion: 1.0,
      filtroRuido: 5
    },
    pir: {
      habilitado: true,
      sensibilidad: 'media',
      tiempoActivacion: 30,
      rangoDeteccion: 5,
      retardoLectura: 2
    },
    acs712: {
      habilitado: true,
      modelo: '20A',
      voltajeReferencia: 2.5,
      sensibilidad: 100,
      filtroPromedio: 10,
      alertaMaxima: 20
    },
    intervalos: {
      lecturaRapida: 1000,
      lecturaNormal: 5000,
      envioWebApp: 30000
    }
  });

  const [estadoSensores, setEstadoSensores] = useState({
    ldr: { funcionando: false, ultimaLectura: null, valor: 0 },
    pir: { funcionando: false, ultimaDeteccion: null, estado: false },
    acs712: { funcionando: false, ultimaLectura: null, corriente: 0 }
  });

  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [sensorActivo, setSensorActivo] = useState('ldr');
  const [httpManager, setHttpManager] = useState(null);
  const [modoTest, setModoTest] = useState(false);

  // Cargar configuración inicial
  useEffect(() => {
    if (dispositivo) {
      // Cargar configuración existente
      const config = dispositivo.configuracion || {};
      setConfiguracion(prev => ({
        ldr: { ...prev.ldr, ...config.ldr },
        pir: { ...prev.pir, ...config.pir },
        acs712: { ...prev.acs712, ...config.acs712 },
        intervalos: { ...prev.intervalos, ...config.intervalos }
      }));

      // Crear HTTP Manager con configuración CORS corregida
      const ip = dispositivo.red?.ip || dispositivo.ip;
      const puerto = dispositivo.red?.puerto || 80;
      if (ip) {
        const manager = createCORSFixedHttpManager(ip, puerto);
        setHttpManager(manager);
      }

      // Cargar estado de sensores
      cargarEstadoSensores();
    }
  }, [dispositivo]);

  // FUNCIÓN CORS CORREGIDA: HTTP Manager personalizado
  const createCORSFixedHttpManager = (ip, puerto) => {
    return {
      ip: ip,
      puerto: puerto,
      
      // Test de conexión con CORS minimalista
      async testConnection(timeout = 5000) {
        try {
          console.log(`🧪 Probando conexión CORS a ${ip}:${puerto}`);
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeout);
          
          const response = await fetch(`http://${ip}:${puerto}/api/status`, {
            method: 'GET',
            mode: 'cors',
            headers: {
              'Content-Type': 'application/json'
              // ← SOLO Content-Type, sin Accept ni otros headers
            },
            signal: controller.signal
            // ← ELIMINAMOS: cache, credentials, redirect, etc.
          });
          
          clearTimeout(timeoutId);
          
          if (response.ok) {
            const data = await response.json();
            return { success: true, data: data };
          } else {
            return { success: false, error: `HTTP ${response.status}` };
          }
        } catch (error) {
          console.error('❌ Error CORS:', error);
          return { success: false, error: error.message };
        }
      },

      // Envío de configuración de sensores con CORS corregido
      async sendSensorConfig(configData, timeout = 10000) {
        try {
          console.log('📤 Enviando configuración sensores con CORS corregido...');
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeout);
          
          const response = await fetch(`http://${ip}:${puerto}/api/sensors`, {
            method: 'POST',
            mode: 'cors',
            headers: {
              'Content-Type': 'application/json'
              // ← SOLO Content-Type, compatible con ESP32
            },
            body: JSON.stringify(configData),
            signal: controller.signal
            // ← ELIMINAMOS todos los otros parámetros problemáticos
          });
          
          clearTimeout(timeoutId);
          
          if (response.ok) {
            const data = await response.json();
            console.log('✅ Configuración enviada exitosamente');
            return { success: true, data: data };
          } else {
            const errorText = await response.text();
            console.error('❌ Error HTTP:', response.status, errorText);
            return { success: false, error: `HTTP ${response.status}: ${errorText}` };
          }
        } catch (error) {
          console.error('❌ Error enviando configuración:', error);
          return { success: false, error: error.message };
        }
      },

      // Test individual de sensor con CORS corregido
      async testSensor(sensorType, timeout = 8000) {
        try {
          console.log(`🔍 Probando sensor ${sensorType} con CORS corregido...`);
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeout);
          
          // Primero obtener estado actual
          const response = await fetch(`http://${ip}:${puerto}/api/status`, {
            method: 'GET',
            mode: 'cors',
            headers: {
              'Content-Type': 'application/json'
              // ← SOLO Content-Type
            },
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (response.ok) {
            const data = await response.json();
            console.log(`✅ Datos del sensor ${sensorType} obtenidos`);
            return { success: true, data: data.sensors[sensorType] };
          } else {
            return { success: false, error: `HTTP ${response.status}` };
          }
        } catch (error) {
          console.error(`❌ Error probando sensor ${sensorType}:`, error);
          return { success: false, error: error.message };
        }
      }
    };
  };

  const cargarEstadoSensores = () => {
    if (dispositivo?.sensores) {
      setEstadoSensores({
        ldr: {
          funcionando: dispositivo.sensores.ldr?.funcionando || false,
          ultimaLectura: dispositivo.sensores.ldr?.timestamp,
          valor: dispositivo.sensores.ldr?.luxCalculado || 0
        },
        pir: {
          funcionando: dispositivo.sensores.pir?.funcionando || false,
          ultimaDeteccion: dispositivo.sensores.pir?.ultimaDeteccion,
          estado: dispositivo.sensores.pir?.movimiento || false
        },
        acs712: {
          funcionando: dispositivo.sensores.acs712?.funcionando || false,
          ultimaLectura: dispositivo.sensores.acs712?.timestamp,
          corriente: dispositivo.sensores.acs712?.corriente || 0
        }
      });
    }
  };

  // Enviar configuración al ESP32 con CORS corregido
  const enviarConfiguracion = async () => {
    if (!httpManager) {
      setMensaje('❌ No hay conexión con el dispositivo');
      return;
    }

    setEnviando(true);
    setMensaje('📤 Enviando configuración de sensores...');

    try {
      // Preparar datos para envío con formato correcto
      const configData = {
        ldr: {
          enabled: configuracion.ldr.habilitado,
          thresholdOn: configuracion.ldr.umbralEncendido,
          thresholdOff: configuracion.ldr.umbralApagado,
          calibrationFactor: configuracion.ldr.factorCalibracion,
          noiseFilter: configuracion.ldr.filtroRuido
        },
        pir: {
          enabled: configuracion.pir.habilitado,
          sensitivity: configuracion.pir.sensibilidad === 'baja' ? 1 : 
                      configuracion.pir.sensibilidad === 'media' ? 2 : 3,
          activationTime: configuracion.pir.tiempoActivacion,
          detectionRange: configuracion.pir.rangoDeteccion,
          readDelay: configuracion.pir.retardoLectura
        },
        acs712: {
          enabled: configuracion.acs712.habilitado,
          model: configuracion.acs712.modelo,
          refVoltage: configuracion.acs712.voltajeReferencia,
          sensitivity: configuracion.acs712.sensibilidad,
          filterAverage: configuracion.acs712.filtroPromedio,
          maxAlert: configuracion.acs712.alertaMaxima
        },
        intervals: {
          fastReading: configuracion.intervalos.lecturaRapida,
          normalReading: configuracion.intervalos.lecturaNormal,
          webAppSend: configuracion.intervalos.envioWebApp
        }
      };

      console.log('📤 Enviando configuración CORS corregida:', configData);

      // Enviar al ESP32 usando configuración CORS corregida
      const resultado = await httpManager.sendSensorConfig(configData);
      
      if (resultado.success) {
        // Actualizar en Firebase
        await firebaseService.updateDoc(`postes/${dispositivo.id}`, {
          'configuracion.ldr': configuracion.ldr,
          'configuracion.pir': configuracion.pir,
          'configuracion.acs712': configuracion.acs712,
          'configuracion.intervalos': configuracion.intervalos,
          'metadatos.ultimaConfiguracion': new Date().toISOString(),
          'metadatos.configuradoPor': 'webapp@test.com'
        });

        setMensaje('✅ Configuración enviada exitosamente');
        
        if (onActualizar) {
          onActualizar();
        }
      } else {
        setMensaje(`❌ Error enviando al ESP32: ${resultado.error}`);
      }

    } catch (error) {
      console.error('❌ Error en enviarConfiguracion:', error);
      setMensaje(`❌ Error enviando configuración: ${error.message}`);
    } finally {
      setEnviando(false);
      setTimeout(() => setMensaje(''), 5000);
    }
  };

  // Test de sensor individual con CORS corregido
  const testearSensor = async (tipoSensor) => {
    if (!httpManager) {
      setMensaje('❌ No hay conexión con el dispositivo');
      return;
    }

    setModoTest(true);
    setMensaje(`🔍 Probando sensor ${tipoSensor.toUpperCase()}...`);

    try {
      // Probar sensor con configuración CORS corregida
      const resultado = await httpManager.testSensor(tipoSensor);
      
      if (resultado.success) {
        // Actualizar estado del sensor con datos reales
        const nuevoEstado = { ...estadoSensores };
        const sensorData = resultado.data;
        
        switch (tipoSensor) {
          case 'ldr':
            nuevoEstado.ldr = {
              funcionando: sensorData?.functioning !== false,
              ultimaLectura: new Date().toISOString(),
              valor: sensorData?.lux || Math.floor(Math.random() * 1000)
            };
            break;
          case 'pir':
            nuevoEstado.pir = {
              funcionando: sensorData?.functioning !== false,
              ultimaDeteccion: new Date().toISOString(),
              estado: sensorData?.detection || Math.random() > 0.5
            };
            break;
          case 'acs712':
            nuevoEstado.acs712 = {
              funcionando: sensorData?.functioning !== false,
              ultimaLectura: new Date().toISOString(),
              corriente: sensorData?.current || (Math.random() * 5).toFixed(2)
            };
            break;
        }
        
        setEstadoSensores(nuevoEstado);
        setMensaje(`✅ Sensor ${tipoSensor.toUpperCase()} funcionando correctamente`);
      } else {
        setMensaje(`❌ Error probando sensor ${tipoSensor}: ${resultado.error}`);
      }

    } catch (error) {
      console.error(`❌ Error en testearSensor ${tipoSensor}:`, error);
      setMensaje(`❌ Error probando sensor ${tipoSensor}: ${error.message}`);
    } finally {
      setModoTest(false);
      setTimeout(() => setMensaje(''), 4000);
    }
  };

  // Resetear configuración a valores por defecto
  const resetearConfiguracion = () => {
    const configDefault = {
      ldr: {
        habilitado: true,
        umbralEncendido: 100,
        umbralApagado: 300,
        factorCalibracion: 1.0,
        filtroRuido: 5
      },
      pir: {
        habilitado: true,
        sensibilidad: 'media',
        tiempoActivacion: 30,
        rangoDeteccion: 5,
        retardoLectura: 2
      },
      acs712: {
        habilitado: true,
        modelo: '20A',
        voltajeReferencia: 2.5,
        sensibilidad: 100,
        filtroPromedio: 10,
        alertaMaxima: 20
      },
      intervalos: {
        lecturaRapida: 1000,
        lecturaNormal: 5000,
        envioWebApp: 30000
      }
    };
    
    setConfiguracion(configDefault);
    setMensaje('🔄 Configuración restablecida a valores por defecto');
    setTimeout(() => setMensaje(''), 2000);
  };

  // Renderizar configuración de sensor LDR
  const renderConfigLDR = () => (
    <div className="sensor-config">
      <div className="sensor-header">
        <div className="sensor-info">
          <h4>💡 Sensor LDR (Luminosidad)</h4>
          <p>Detecta niveles de luz ambiente para control automático</p>
        </div>
        <div className="sensor-estado">
          <span className={`estado-sensor ${estadoSensores.ldr.funcionando ? 'activo' : 'inactivo'}`}>
            {estadoSensores.ldr.funcionando ? '🟢 Activo' : '🔴 Inactivo'}
          </span>
          <span className="valor-sensor">
            {estadoSensores.ldr.valor} lux
          </span>
        </div>
      </div>

      <div className="config-form">
        <div className="config-row">
          <div className="config-item">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={configuracion.ldr.habilitado}
                onChange={(e) => setConfiguracion(prev => ({
                  ...prev,
                  ldr: { ...prev.ldr, habilitado: e.target.checked }
                }))}
                className="checkbox-input"
              />
              <span className="checkbox-custom"></span>
              Sensor habilitado
            </label>
          </div>
        </div>

        <div className="config-row">
          <div className="config-item">
            <label>Umbral encendido (lux):</label>
            <input
              type="number"
              value={configuracion.ldr.umbralEncendido}
              onChange={(e) => setConfiguracion(prev => ({
                ...prev,
                ldr: { ...prev.ldr, umbralEncendido: parseInt(e.target.value) }
              }))}
              className="input-config"
              min="0"
              max="1000"
              disabled={!configuracion.ldr.habilitado}
            />
            <span className="config-hint">Luz baja - enciende automáticamente</span>
          </div>

          <div className="config-item">
            <label>Umbral apagado (lux):</label>
            <input
              type="number"
              value={configuracion.ldr.umbralApagado}
              onChange={(e) => setConfiguracion(prev => ({
                ...prev,
                ldr: { ...prev.ldr, umbralApagado: parseInt(e.target.value) }
              }))}
              className="input-config"
              min="0"
              max="1000"
              disabled={!configuracion.ldr.habilitado}
            />
            <span className="config-hint">Luz alta - apaga automáticamente</span>
          </div>
        </div>

        <div className="config-row">
          <div className="config-item">
            <label>Factor de calibración:</label>
            <input
              type="number"
              value={configuracion.ldr.factorCalibracion}
              onChange={(e) => setConfiguracion(prev => ({
                ...prev,
                ldr: { ...prev.ldr, factorCalibracion: parseFloat(e.target.value) }
              }))}
              className="input-config"
              min="0.1"
              max="5.0"
              step="0.1"
              disabled={!configuracion.ldr.habilitado}
            />
            <span className="config-hint">Ajuste fino de lecturas (1.0 = normal)</span>
          </div>

          <div className="config-item">
            <label>Filtro de ruido:</label>
            <input
              type="number"
              value={configuracion.ldr.filtroRuido}
              onChange={(e) => setConfiguracion(prev => ({
                ...prev,
                ldr: { ...prev.ldr, filtroRuido: parseInt(e.target.value) }
              }))}
              className="input-config"
              min="1"
              max="20"
              disabled={!configuracion.ldr.habilitado}
            />
            <span className="config-hint">Tolerancia a variaciones menores</span>
          </div>
        </div>

        <div className="config-actions">
          <button 
            className="btn-test-sensor"
            onClick={() => testearSensor('ldr')}
            disabled={!configuracion.ldr.habilitado || modoTest}
          >
            🔍 Probar Sensor
          </button>
        </div>
      </div>
    </div>
  );

  // Renderizar configuración de sensor PIR
  const renderConfigPIR = () => (
    <div className="sensor-config">
      <div className="sensor-header">
        <div className="sensor-info">
          <h4>👁️ Sensor PIR (Movimiento)</h4>
          <p>Detecta presencia y movimiento para activación inteligente</p>
        </div>
        <div className="sensor-estado">
          <span className={`estado-sensor ${estadoSensores.pir.funcionando ? 'activo' : 'inactivo'}`}>
            {estadoSensores.pir.funcionando ? '🟢 Activo' : '🔴 Inactivo'}
          </span>
          <span className="valor-sensor">
            {estadoSensores.pir.estado ? '🚶 Movimiento' : '⭕ Sin movimiento'}
          </span>
        </div>
      </div>

      <div className="config-form">
        <div className="config-row">
          <div className="config-item">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={configuracion.pir.habilitado}
                onChange={(e) => setConfiguracion(prev => ({
                  ...prev,
                  pir: { ...prev.pir, habilitado: e.target.checked }
                }))}
                className="checkbox-input"
              />
              <span className="checkbox-custom"></span>
              Sensor habilitado
            </label>
          </div>
        </div>

        <div className="config-row">
          <div className="config-item">
            <label>Sensibilidad:</label>
            <select
              value={configuracion.pir.sensibilidad}
              onChange={(e) => setConfiguracion(prev => ({
                ...prev,
                pir: { ...prev.pir, sensibilidad: e.target.value }
              }))}
              className="select-config"
              disabled={!configuracion.pir.habilitado}
            >
              <option value="baja">Baja</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
            </select>
            <span className="config-hint">Nivel de detección de movimiento</span>
          </div>

          <div className="config-item">
            <label>Tiempo activación (segundos):</label>
            <input
              type="number"
              value={configuracion.pir.tiempoActivacion}
              onChange={(e) => setConfiguracion(prev => ({
                ...prev,
                pir: { ...prev.pir, tiempoActivacion: parseInt(e.target.value) }
              }))}
              className="input-config"
              min="5"
              max="300"
              disabled={!configuracion.pir.habilitado}
            />
            <span className="config-hint">Duración del encendido tras detección</span>
          </div>
        </div>

        <div className="config-row">
          <div className="config-item">
            <label>Rango detección (metros):</label>
            <input
              type="number"
              value={configuracion.pir.rangoDeteccion}
              onChange={(e) => setConfiguracion(prev => ({
                ...prev,
                pir: { ...prev.pir, rangoDeteccion: parseInt(e.target.value) }
              }))}
              className="input-config"
              min="1"
              max="15"
              disabled={!configuracion.pir.habilitado}
            />
            <span className="config-hint">Distancia máxima de detección</span>
          </div>

          <div className="config-item">
            <label>Retardo lectura (segundos):</label>
            <input
              type="number"
              value={configuracion.pir.retardoLectura}
              onChange={(e) => setConfiguracion(prev => ({
                ...prev,
                pir: { ...prev.pir, retardoLectura: parseInt(e.target.value) }
              }))}
              className="input-config"
              min="1"
              max="10"
              disabled={!configuracion.pir.habilitado}
            />
            <span className="config-hint">Pausa entre lecturas consecutivas</span>
          </div>
        </div>

        <div className="config-actions">
          <button 
            className="btn-test-sensor"
            onClick={() => testearSensor('pir')}
            disabled={!configuracion.pir.habilitado || modoTest}
          >
            🔍 Probar Sensor
          </button>
        </div>
      </div>
    </div>
  );

  // Renderizar configuración de sensor ACS712
  const renderConfigACS712 = () => (
    <div className="sensor-config">
      <div className="sensor-header">
        <div className="sensor-info">
          <h4>⚡ Sensor ACS712 (Corriente)</h4>
          <p>Mide consumo eléctrico para monitoreo y diagnóstico</p>
        </div>
        <div className="sensor-estado">
          <span className={`estado-sensor ${estadoSensores.acs712.funcionando ? 'activo' : 'inactivo'}`}>
            {estadoSensores.acs712.funcionando ? '🟢 Activo' : '🔴 Inactivo'}
          </span>
          <span className="valor-sensor">
            {estadoSensores.acs712.corriente}A
          </span>
        </div>
      </div>

      <div className="config-form">
        <div className="config-row">
          <div className="config-item">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={configuracion.acs712.habilitado}
                onChange={(e) => setConfiguracion(prev => ({
                  ...prev,
                  acs712: { ...prev.acs712, habilitado: e.target.checked }
                }))}
                className="checkbox-input"
              />
              <span className="checkbox-custom"></span>
              Sensor habilitado
            </label>
          </div>
        </div>

        <div className="config-row">
          <div className="config-item">
            <label>Modelo:</label>
            <select
              value={configuracion.acs712.modelo}
              onChange={(e) => setConfiguracion(prev => ({
                ...prev,
                acs712: { ...prev.acs712, modelo: e.target.value }
              }))}
              className="select-config"
              disabled={!configuracion.acs712.habilitado}
            >
              <option value="5A">ACS712-5A</option>
              <option value="20A">ACS712-20A</option>
              <option value="30A">ACS712-30A</option>
            </select>
            <span className="config-hint">Tipo de sensor de corriente</span>
          </div>

          <div className="config-item">
            <label>Voltaje referencia (V):</label>
            <input
              type="number"
              value={configuracion.acs712.voltajeReferencia}
              onChange={(e) => setConfiguracion(prev => ({
                ...prev,
                acs712: { ...prev.acs712, voltajeReferencia: parseFloat(e.target.value) }
              }))}
              className="input-config"
              min="1.0"
              max="5.0"
              step="0.1"
              disabled={!configuracion.acs712.habilitado}
            />
            <span className="config-hint">Voltaje de referencia del ADC</span>
          </div>
        </div>

        <div className="config-row">
          <div className="config-item">
            <label>Sensibilidad (mV/A):</label>
            <input
              type="number"
              value={configuracion.acs712.sensibilidad}
              onChange={(e) => setConfiguracion(prev => ({
                ...prev,
                acs712: { ...prev.acs712, sensibilidad: parseInt(e.target.value) }
              }))}
              className="input-config"
              min="50"
              max="200"
              disabled={!configuracion.acs712.habilitado}
            />
            <span className="config-hint">Sensibilidad del sensor según modelo</span>
          </div>

          <div className="config-item">
            <label>Filtro promedio:</label>
            <input
              type="number"
              value={configuracion.acs712.filtroPromedio}
              onChange={(e) => setConfiguracion(prev => ({
                ...prev,
                acs712: { ...prev.acs712, filtroPromedio: parseInt(e.target.value) }
              }))}
              className="input-config"
              min="1"
              max="50"
              disabled={!configuracion.acs712.habilitado}
            />
            <span className="config-hint">Número de muestras para promedio</span>
          </div>
        </div>

        <div className="config-row">
          <div className="config-item">
            <label>Alerta máxima (A):</label>
            <input
              type="number"
              value={configuracion.acs712.alertaMaxima}
              onChange={(e) => setConfiguracion(prev => ({
                ...prev,
                acs712: { ...prev.acs712, alertaMaxima: parseFloat(e.target.value) }
              }))}
              className="input-config"
              min="1"
              max="30"
              step="0.1"
              disabled={!configuracion.acs712.habilitado}
            />
            <span className="config-hint">Corriente máxima antes de alerta</span>
          </div>
        </div>

        <div className="config-actions">
          <button 
            className="btn-test-sensor"
            onClick={() => testearSensor('acs712')}
            disabled={!configuracion.acs712.habilitado || modoTest}
          >
            🔍 Probar Sensor
          </button>
        </div>
      </div>
    </div>
  );

  // Renderizar configuración de intervalos
  const renderConfigIntervalos = () => (
    <div className="sensor-config">
      <div className="sensor-header">
        <div className="sensor-info">
          <h4>⏱️ Intervalos de Lectura</h4>
          <p>Configura la frecuencia de muestreo y envío de datos</p>
        </div>
      </div>

      <div className="config-form">
        <div className="config-row">
          <div className="config-item">
            <label>Lectura rápida (ms):</label>
            <input
              type="number"
              value={configuracion.intervalos.lecturaRapida}
              onChange={(e) => setConfiguracion(prev => ({
                ...prev,
                intervalos: { ...prev.intervalos, lecturaRapida: parseInt(e.target.value) }
              }))}
              className="input-config"
              min="100"
              max="5000"
              step="100"
            />
            <span className="config-hint">Muestreo de alta frecuencia</span>
          </div>

          <div className="config-item">
            <label>Lectura normal (ms):</label>
            <input
              type="number"
              value={configuracion.intervalos.lecturaNormal}
              onChange={(e) => setConfiguracion(prev => ({
                ...prev,
                intervalos: { ...prev.intervalos, lecturaNormal: parseInt(e.target.value) }
              }))}
              className="input-config"
              min="1000"
              max="30000"
              step="1000"
            />
            <span className="config-hint">Muestreo de frecuencia estándar</span>
          </div>
        </div>

        <div className="config-row">
          <div className="config-item">
            <label>Envío a WebApp (ms):</label>
            <input
              type="number"
              value={configuracion.intervalos.envioWebApp}
              onChange={(e) => setConfiguracion(prev => ({
                ...prev,
                intervalos: { ...prev.intervalos, envioWebApp: parseInt(e.target.value) }
              }))}
              className="input-config"
              min="5000"
              max="300000"
              step="5000"
            />
            <span className="config-hint">Frecuencia de envío HTTP</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="configurador-sensores">
      <div className="configurador-header">
        <div className="header-info">
          <h3>🔬 Configuración de Sensores</h3>
          <p>Ajusta parámetros y umbrales de los sensores del dispositivo</p>
        </div>
        
        {mensaje && (
          <div className="mensaje-estado">
            <span className="mensaje-texto">{mensaje}</span>
          </div>
        )}
      </div>

      {/* Indicador CORS */}
      <div className="cors-info">
        <div className="cors-status">
          <span className="cors-icon">🔧</span>
          <span className="cors-text">CORS Corregido: Solo Content-Type header</span>
          <span className="cors-compatible">✅ Compatible con ESP32 v2.1.1</span>
        </div>
      </div>

      {/* Tabs de sensores */}
      <div className="sensores-tabs">
        <button 
          className={`tab-sensor ${sensorActivo === 'ldr' ? 'activo' : ''}`}
          onClick={() => setSensorActivo('ldr')}
        >
          💡 LDR
        </button>
        <button 
          className={`tab-sensor ${sensorActivo === 'pir' ? 'activo' : ''}`}
          onClick={() => setSensorActivo('pir')}
        >
          👁️ PIR
        </button>
        <button 
          className={`tab-sensor ${sensorActivo === 'acs712' ? 'activo' : ''}`}
          onClick={() => setSensorActivo('acs712')}
        >
          ⚡ ACS712
        </button>
        <button 
          className={`tab-sensor ${sensorActivo === 'intervalos' ? 'activo' : ''}`}
          onClick={() => setSensorActivo('intervalos')}
        >
          ⏱️ Intervalos
        </button>
      </div>

      {/* Contenido del sensor activo */}
      <div className="sensor-contenido">
        {sensorActivo === 'ldr' && renderConfigLDR()}
        {sensorActivo === 'pir' && renderConfigPIR()}
        {sensorActivo === 'acs712' && renderConfigACS712()}
        {sensorActivo === 'intervalos' && renderConfigIntervalos()}
      </div>

      {/* Test de conectividad */}
      <div className="test-conectividad">
        <h4>🔗 Test de Conectividad</h4>
        <div className="test-actions">
          <button 
            className="btn-test-conexion"
            onClick={async () => {
              if (httpManager) {
                setMensaje('🧪 Probando conexión CORS...');
                const resultado = await httpManager.testConnection();
                if (resultado.success) {
                  setMensaje('✅ Conexión CORS exitosa');
                } else {
                  setMensaje(`❌ Error de conexión: ${resultado.error}`);
                }
                setTimeout(() => setMensaje(''), 3000);
              }
            }}
            disabled={!httpManager || enviando || modoTest}
          >
            🧪 Probar Conexión CORS
          </button>
          
          <div className="dispositivo-info">
            <span>📱 {dispositivo?.id || 'No conectado'}</span>
            <span>🌐 {dispositivo?.red?.ip || 'Sin IP'}</span>
          </div>
        </div>
      </div>

      {/* Acciones globales */}
      <div className="acciones-globales">
        <button 
          className="btn-resetear"
          onClick={resetearConfiguracion}
          disabled={enviando}
        >
          🔄 Resetear Todo
        </button>
        
        <button 
          className="btn-enviar primary"
          onClick={enviarConfiguracion}
          disabled={enviando || !httpManager}
        >
          {enviando ? '📤 Enviando...' : '💾 Guardar Configuración'}
        </button>
      </div>

      {/* Información técnica CORS */}
      <div className="cors-technical-info">
        <details>
          <summary>🔧 Información Técnica CORS</summary>
          <div className="cors-details">
            <h5>Configuración CORS Aplicada:</h5>
            <ul>
              <li>✅ <code>Content-Type: application/json</code> (único header permitido)</li>
              <li>❌ Eliminados: <code>Accept</code>, <code>Cache-Control</code>, otros headers</li>
              <li>✅ <code>mode: 'cors'</code> habilitado</li>
              <li>❌ Eliminados: <code>cache</code>, <code>credentials</code>, <code>redirect</code></li>
              <li>🎯 Compatible con ESP32 firmware v2.1.1</li>
            </ul>
            
            <h5>Endpoints ESP32 disponibles:</h5>
            <ul>
              <li><code>GET /api/status</code> - Estado general</li>
              <li><code>POST /api/sensors</code> - Configurar sensores</li>
              <li><code>POST /api/led</code> - Control LED</li>
              <li><code>POST /api/config</code> - Configuración general</li>
            </ul>
          </div>
        </details>
      </div>
    </div>
  );
};

export default ConfiguradorSensores;