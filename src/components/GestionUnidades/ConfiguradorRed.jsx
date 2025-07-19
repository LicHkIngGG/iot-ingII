// src/components/GestionUnidades/components/ConfiguradorRed/ConfiguradorRed.jsx
import React, { useState, useEffect } from 'react';
import { firebaseService } from '../../services/firebaseService';
import { isValidIPFormat, validateNetworkConfig, checkNetworkConnectivity } from '../../utils/deviceDetection';
import { HttpManager } from '../../utils/http';
import './ConfiguradorRed.css';

const ConfiguradorRed = ({ dispositivo, onActualizar }) => {
  const [configuracion, setConfiguracion] = useState({
    puerto: 80,
    timeout: 5000,
    maxReintentos: 5,
    intervaloReconexion: 3000,
    corsEnabled: true,
    pollFrequency: 3000,
    // Eliminamos configuraciones innecesarias de gateway, subnet, dns
    // ya que el ESP32 solo maneja HTTP/CORS
  });

  const [estado, setEstado] = useState('inactivo'); // inactivo, probando, aplicando, completado, error
  const [mensaje, setMensaje] = useState('');
  const [validacion, setValidacion] = useState({ isValid: true, errors: [] });
  const [diagnostico, setDiagnostico] = useState(null);
  const [httpManager, setHttpManager] = useState(null);
  const [configAvanzada, setConfigAvanzada] = useState(false);

  // Cargar configuración inicial
  useEffect(() => {
    if (dispositivo) {
      const config = {
        puerto: dispositivo.red?.puerto || 80,
        timeout: dispositivo.red?.timeout || 5000,
        maxReintentos: dispositivo.red?.maxReintentos || 5,
        intervaloReconexion: dispositivo.red?.intervaloReconexion || 3000,
        corsEnabled: dispositivo.red?.corsEnabled !== false,
        pollFrequency: dispositivo.red?.pollFrequency || 3000
      };
      
      setConfiguracion(config);

      // Crear HTTP Manager optimizado
      if (dispositivo.red?.ip || dispositivo.ip) {
        const ip = dispositivo.red?.ip || dispositivo.ip;
        const manager = new HttpManager(ip, config.puerto);
        setHttpManager(manager);
      }
    }
  }, [dispositivo]);

  // Validar configuración optimizada
  useEffect(() => {
    const errors = [];
    
    if (configuracion.puerto < 1 || configuracion.puerto > 65535) {
      errors.push('Puerto debe estar entre 1 y 65535');
    }
    if (configuracion.timeout < 1000 || configuracion.timeout > 30000) {
      errors.push('Timeout debe estar entre 1000ms y 30000ms');
    }
    if (configuracion.maxReintentos < 1 || configuracion.maxReintentos > 10) {
      errors.push('Máx. reintentos debe estar entre 1 y 10');
    }
    if (configuracion.intervaloReconexion < 1000 || configuracion.intervaloReconexion > 60000) {
      errors.push('Intervalo de reconexión debe estar entre 1000ms y 60000ms');
    }
    if (configuracion.pollFrequency < 1000 || configuracion.pollFrequency > 30000) {
      errors.push('Frecuencia de polling debe estar entre 1000ms y 30000ms');
    }

    setValidacion({
      isValid: errors.length === 0,
      errors
    });
  }, [configuracion]);

  // Test de conexión optimizado para firmware v4.0
  const testConexionOptimizada = async (ip, puerto, timeout = 5000) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const startTime = Date.now();
      
      // Probar endpoint optimizado del firmware v4.0
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
        return {
          success: true,
          data,
          responseTime,
          status: response.status,
          firmwareVersion: data.firmwareVersion || '1.0.0',
          isAdvanced: data.firmwareVersion?.startsWith('4.') || false,
          deviceType: data.tipo || data.deviceType || 'ESP32'
        };
      } else {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          responseTime,
          status: response.status
        };
      }
    } catch (error) {
      let errorMessage = error.message;
      
      if (error.name === 'AbortError') {
        errorMessage = 'Timeout: El dispositivo no respondió a tiempo';
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage = 'Error CORS o conectividad: Verificar configuración';
      }
      
      return {
        success: false,
        error: errorMessage,
        responseTime: null,
        status: null
      };
    }
  };

  // Diagnóstico completo optimizado
  const realizarDiagnosticoCompleto = async () => {
    setEstado('probando');
    setMensaje('🔍 Iniciando diagnóstico avanzado...');
    
    const resultados = {
      timestamp: new Date().toISOString(),
      tests: {},
      deviceInfo: null
    };

    try {
      const deviceIP = dispositivo?.red?.ip || dispositivo?.ip;
      if (!deviceIP) {
        throw new Error('IP del dispositivo no disponible');
      }

      // Test 1: Conectividad básica
      setMensaje('🔍 Probando conectividad básica...');
      const conectividad = await testConexionOptimizada(deviceIP, configuracion.puerto, configuracion.timeout);
      
      resultados.tests.conectividad = {
        name: 'Conectividad HTTP',
        status: conectividad.success ? 'success' : 'error',
        message: conectividad.success 
          ? `Conexión exitosa (${conectividad.responseTime}ms)` 
          : conectividad.error,
        details: conectividad
      };

      if (conectividad.success) {
        resultados.deviceInfo = conectividad.data;

        // Test 2: Endpoints específicos del firmware v4.0
        setMensaje('🔍 Verificando endpoints avanzados...');
        const endpoints = ['/api/device', '/api/sensors', '/api/modes', '/api/metrics'];
        const endpointResults = [];

        for (const endpoint of endpoints) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            
            const response = await fetch(`http://${deviceIP}:${configuracion.puerto}${endpoint}`, {
              method: 'GET',
              mode: 'cors',
              headers: { 'Content-Type': 'application/json' },
              signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            endpointResults.push({ endpoint, status: response.status, success: response.ok });
          } catch (error) {
            endpointResults.push({ endpoint, status: null, success: false, error: error.message });
          }
        }

        const successfulEndpoints = endpointResults.filter(r => r.success).length;
        resultados.tests.endpoints = {
          name: 'Endpoints del Firmware',
          status: successfulEndpoints === endpoints.length ? 'success' : 
                 successfulEndpoints > 0 ? 'warning' : 'error',
          message: `${successfulEndpoints}/${endpoints.length} endpoints disponibles`,
          details: { results: endpointResults, isAdvanced: conectividad.isAdvanced }
        };

        // Test 3: Latencia y estabilidad
        setMensaje('🔍 Midiendo latencia y estabilidad...');
        const latencyTests = [];
        for (let i = 0; i < 5; i++) {
          const start = Date.now();
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);
            
            await fetch(`http://${deviceIP}:${configuracion.puerto}/api/status`, {
              method: 'HEAD',
              mode: 'cors',
              headers: { 'Content-Type': 'application/json' },
              signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            latencyTests.push(Date.now() - start);
          } catch (error) {
            latencyTests.push(null);
          }
          
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        const validLatencies = latencyTests.filter(l => l !== null);
        const avgLatency = validLatencies.length > 0 
          ? Math.round(validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length)
          : null;
        
        const stability = (validLatencies.length / latencyTests.length) * 100;

        resultados.tests.latencia = {
          name: 'Latencia y Estabilidad',
          status: avgLatency && avgLatency < 100 && stability >= 80 ? 'success' : 
                 avgLatency && avgLatency < 300 && stability >= 60 ? 'warning' : 'error',
          message: avgLatency 
            ? `${avgLatency}ms promedio (${stability}% estabilidad)` 
            : 'No se pudo medir',
          details: { tests: latencyTests, average: avgLatency, stability }
        };

        // Test 4: CORS y Headers
        setMensaje('🔍 Verificando configuración CORS...');
        try {
          const response = await fetch(`http://${deviceIP}:${configuracion.puerto}/api/status`, {
            method: 'OPTIONS',
            mode: 'cors'
          });
          
          const corsHeaders = {
            'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
            'access-control-allow-methods': response.headers.get('access-control-allow-methods'),
            'access-control-allow-headers': response.headers.get('access-control-allow-headers')
          };
          
          const corsConfigured = corsHeaders['access-control-allow-origin'] === '*';
          
          resultados.tests.cors = {
            name: 'Configuración CORS',
            status: corsConfigured ? 'success' : 'warning',
            message: corsConfigured ? 'CORS configurado correctamente' : 'CORS limitado o no configurado',
            details: { headers: corsHeaders, configured: corsConfigured }
          };
        } catch (error) {
          resultados.tests.cors = {
            name: 'Configuración CORS',
            status: 'error',
            message: 'No se pudo verificar CORS',
            details: { error: error.message }
          };
        }

        // Test 5: Funcionalidad específica del firmware v4.0
        if (conectividad.isAdvanced) {
          setMensaje('🔍 Probando funciones avanzadas...');
          try {
            const modesResponse = await fetch(`http://${deviceIP}:${configuracion.puerto}/api/modes`, {
              method: 'GET',
              mode: 'cors',
              headers: { 'Content-Type': 'application/json' },
              signal: new AbortController().signal
            });
            
            if (modesResponse.ok) {
              const modesData = await modesResponse.json();
              resultados.tests.advanced = {
                name: 'Funciones Avanzadas v4.0',
                status: 'success',
                message: `${modesData.availableModes?.length || 0} modos disponibles`,
                details: { modes: modesData.availableModes, currentMode: modesData.currentMode }
              };
            }
          } catch (error) {
            resultados.tests.advanced = {
              name: 'Funciones Avanzadas v4.0',
              status: 'warning',
              message: 'Funciones avanzadas limitadas',
              details: { error: error.message }
            };
          }
        }
      }

      // Generar resumen mejorado
      const allTests = Object.values(resultados.tests);
      const successCount = allTests.filter(test => test.status === 'success').length;
      const warningCount = allTests.filter(test => test.status === 'warning').length;
      const totalTests = allTests.length;

      const score = Math.round(((successCount * 100) + (warningCount * 60)) / (totalTests * 100) * 100);

      resultados.resumen = {
        puntuacion: score,
        estado: score >= 90 ? 'excelente' : 
               score >= 70 ? 'bueno' : 
               score >= 50 ? 'regular' : 'malo',
        recomendacion: generarRecomendacionMejorada(resultados.tests, conectividad),
        deviceType: conectividad.deviceType,
        firmwareVersion: conectividad.firmwareVersion,
        isAdvanced: conectividad.isAdvanced
      };

      setDiagnostico(resultados);
      setEstado('completado');
      setMensaje(`✅ Diagnóstico completado - Puntuación: ${score}/100`);

    } catch (error) {
      setEstado('error');
      setMensaje(`❌ Error durante el diagnóstico: ${error.message}`);
    }
    
    setTimeout(() => {
      setEstado('inactivo');
      setMensaje('');
    }, 5000);
  };

  // Generar recomendación mejorada
  const generarRecomendacionMejorada = (tests, deviceInfo) => {
    const problemas = [];
    const sugerencias = [];
    
    if (tests.conectividad?.status === 'error') {
      problemas.push('Sin conectividad HTTP');
      sugerencias.push('Verificar que el dispositivo esté encendido y en la red');
    }
    
    if (tests.latencia?.status === 'error') {
      problemas.push('Latencia alta o conexión inestable');
      sugerencias.push('Revisar calidad de red WiFi o Ethernet');
    }
    
    if (tests.cors?.status !== 'success') {
      problemas.push('CORS no configurado óptimamente');
      sugerencias.push('Actualizar firmware para mejor compatibilidad web');
    }
    
    if (tests.endpoints?.status === 'error') {
      problemas.push('Endpoints no disponibles');
      sugerencias.push('Verificar versión del firmware');
    }
    
    if (!deviceInfo?.isAdvanced) {
      sugerencias.push('Actualizar a firmware v4.0 para funciones avanzadas');
    }
    
    if (problemas.length === 0 && sugerencias.length === 0) {
      return 'Configuración de red óptima. Dispositivo funcionando perfectamente.';
    }
    
    let recomendacion = '';
    if (problemas.length > 0) {
      recomendacion += `Problemas: ${problemas.join(', ')}. `;
    }
    if (sugerencias.length > 0) {
      recomendacion += `Sugerencias: ${sugerencias.join(', ')}.`;
    }
    
    return recomendacion;
  };

  // Aplicar configuración optimizada
  const aplicarConfiguracion = async () => {
    if (!validacion.isValid) {
      setMensaje('❌ Configuración inválida');
      return;
    }

    const confirmar = window.confirm(
      `¿Aplicar nueva configuración de red?\n\n` +
      `Puerto: ${configuracion.puerto}\n` +
      `Timeout: ${configuracion.timeout}ms\n` +
      `Polling: ${configuracion.pollFrequency}ms\n\n` +
      `Esta acción puede afectar la conectividad temporalmente.`
    );

    if (!confirmar) return;

    try {
      setEstado('aplicando');
      setMensaje('📤 Aplicando configuración de red...');

      const deviceIP = dispositivo?.red?.ip || dispositivo?.ip;

      // Primero enviar al ESP32 si hay conexión
      if (httpManager && deviceIP) {
        try {
          const configESP32 = {
            network: {
              puerto: configuracion.puerto,
              timeout: configuracion.timeout,
              maxReintentos: configuracion.maxReintentos,
              intervaloReconexion: configuracion.intervaloReconexion,
              corsEnabled: configuracion.corsEnabled,
              pollFrequency: configuracion.pollFrequency
            }
          };

          const response = await fetch(`http://${deviceIP}:${configuracion.puerto}/api/network`, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(configESP32)
          });

          if (response.ok) {
            console.log('✅ Configuración enviada al ESP32');
          }
        } catch (error) {
          console.warn('⚠️ No se pudo enviar configuración al ESP32:', error);
        }
      }

      // Actualizar en Firebase
      await firebaseService.updateDoc(`postes/${dispositivo.id}`, {
        'red.puerto': configuracion.puerto,
        'red.timeout': configuracion.timeout,
        'red.maxReintentos': configuracion.maxReintentos,
        'red.intervaloReconexion': configuracion.intervaloReconexion,
        'red.corsEnabled': configuracion.corsEnabled,
        'red.pollFrequency': configuracion.pollFrequency,
        'metadatos.ultimaConfiguracion': new Date().toISOString(),
        'metadatos.configuradoPor': 'webapp-v4.0',
        'historial': firebaseService.arrayUnion({
          timestamp: new Date().toISOString(),
          tipo: 'configuracion_red_optimizada',
          descripcion: `Red configurada - Puerto: ${configuracion.puerto}, Timeout: ${configuracion.timeout}ms`,
          usuario: 'webapp-v4.0',
          protocolo: 'HTTP/CORS'
        })
      });

      // Actualizar HTTP Manager
      if (httpManager) {
        httpManager.setPollFrequency(configuracion.pollFrequency);
      }

      setEstado('completado');
      setMensaje('✅ Configuración aplicada exitosamente');

      if (onActualizar) {
        onActualizar();
      }

    } catch (error) {
      setEstado('error');
      setMensaje(`❌ Error aplicando configuración: ${error.message}`);
    }

    setTimeout(() => {
      setEstado('inactivo');
      setMensaje('');
    }, 3000);
  };

  // Optimizar configuración automáticamente
  const optimizarConfiguracion = () => {
    const configOptimizada = { ...configuracion };
    
    // Optimizaciones basadas en latencia conocida
    if (diagnostico?.tests?.latencia?.details?.average) {
      const avgLatency = diagnostico.tests.latencia.details.average;
      
      if (avgLatency > 500) {
        // Red lenta
        configOptimizada.timeout = 10000;
        configOptimizada.maxReintentos = 3;
        configOptimizada.intervaloReconexion = 5000;
        configOptimizada.pollFrequency = 8000;
      } else if (avgLatency < 100) {
        // Red rápida
        configOptimizada.timeout = 3000;
        configOptimizada.maxReintentos = 5;
        configOptimizada.intervaloReconexion = 2000;
        configOptimizada.pollFrequency = 2000;
      } else {
        // Red normal
        configOptimizada.timeout = 5000;
        configOptimizada.maxReintentos = 4;
        configOptimizada.intervaloReconexion = 3000;
        configOptimizada.pollFrequency = 3000;
      }
    } else {
      // Configuración conservadora sin datos
      configOptimizada.timeout = 5000;
      configOptimizada.maxReintentos = 3;
      configOptimizada.intervaloReconexion = 3000;
      configOptimizada.pollFrequency = 5000;
    }

    setConfiguracion(configOptimizada);
    setMensaje('🎯 Configuración optimizada automáticamente');
    setTimeout(() => setMensaje(''), 3000);
  };

  // Resetear a valores por defecto
  const resetearConfiguracion = () => {
    const configDefault = {
      puerto: 80,
      timeout: 5000,
      maxReintentos: 5,
      intervaloReconexion: 3000,
      corsEnabled: true,
      pollFrequency: 3000
    };
    
    setConfiguracion(configDefault);
    setMensaje('🔄 Configuración restablecida a valores por defecto');
    setTimeout(() => setMensaje(''), 2000);
  };

  return (
    <div className="configurador-red">
      <div className="configurador-header">
        <div className="header-info">
          <h3>🌐 Configuración de Red HTTP/CORS</h3>
          <p>Optimiza la conectividad y comunicación con el dispositivo ESP32</p>
        </div>
        
        <div className="header-estado">
          {estado !== 'inactivo' && (
            <div className={`estado-badge ${estado}`}>
              {estado === 'probando' && '🔍 Diagnosticando...'}
              {estado === 'aplicando' && '📤 Aplicando...'}
              {estado === 'completado' && '✅ Completado'}
              {estado === 'error' && '❌ Error'}
            </div>
          )}
        </div>
      </div>

      {/* Información del dispositivo */}
      <div className="info-dispositivo">
        <h4>📱 Estado del Dispositivo</h4>
        <div className="info-grid-optimizada">
          <div className="info-item-principal">
            <span className="info-label">Dirección:</span>
            <span className="info-valor ip-address">
              http://{dispositivo?.red?.ip || dispositivo?.ip || 'N/A'}:{configuracion.puerto}
            </span>
          </div>
          
          <div className="info-item">
            <span className="info-label">Firmware:</span>
            <span className="info-valor">
              {diagnostico?.resumen?.firmwareVersion || dispositivo?.hardware?.firmware || 'N/A'}
              {diagnostico?.resumen?.isAdvanced && <span className="badge-v4">v4.0</span>}
            </span>
          </div>
          
          <div className="info-item">
            <span className="info-label">CORS:</span>
            <span className={`info-valor cors-status ${configuracion.corsEnabled ? 'enabled' : 'disabled'}`}>
              {configuracion.corsEnabled ? '✅ Habilitado' : '❌ Deshabilitado'}
            </span>
          </div>
          
          <div className="info-item">
            <span className="info-label">Estado:</span>
            <span className={`info-valor estado ${dispositivo?.estado?.online ? 'online' : 'offline'}`}>
              {dispositivo?.estado?.online ? '🟢 Online' : '🔴 Offline'}
            </span>
          </div>
        </div>
      </div>

      {/* Configuración principal */}
      <div className="seccion-configuracion">
        <div className="seccion-header">
          <h4>⚙️ Configuración de Conectividad</h4>
          <button 
            className="btn-toggle-avanzada"
            onClick={() => setConfigAvanzada(!configAvanzada)}
          >
            {configAvanzada ? '📖 Básico' : '🔧 Avanzado'}
          </button>
        </div>
        
        <div className="config-form">
          {/* Configuración básica */}
          <div className="form-row">
            <div className="form-group">
              <label>Puerto HTTP:</label>
              <input
                type="number"
                value={configuracion.puerto}
                onChange={(e) => setConfiguracion(prev => ({ ...prev, puerto: parseInt(e.target.value) }))}
                className="input-config"
                min="1"
                max="65535"
              />
              <span className="field-hint">Puerto para comunicación HTTP (estándar: 80)</span>
            </div>

            <div className="form-group">
              <label>Timeout de Conexión:</label>
              <input
                type="number"
                value={configuracion.timeout}
                onChange={(e) => setConfiguracion(prev => ({ ...prev, timeout: parseInt(e.target.value) }))}
                className="input-config"
                min="1000"
                max="30000"
                step="1000"
              />
              <span className="field-hint">Tiempo límite en milisegundos (recomendado: 5000ms)</span>
            </div>
          </div>

          {/* Configuración avanzada */}
          {configAvanzada && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label>Frecuencia de Polling:</label>
                  <input
                    type="number"
                    value={configuracion.pollFrequency}
                    onChange={(e) => setConfiguracion(prev => ({ ...prev, pollFrequency: parseInt(e.target.value) }))}
                    className="input-config"
                    min="1000"
                    max="30000"
                    step="1000"
                  />
                  <span className="field-hint">Intervalo de actualización automática (ms)</span>
                </div>

                <div className="form-group">
                  <label>Máx. Reintentos:</label>
                  <input
                    type="number"
                    value={configuracion.maxReintentos}
                    onChange={(e) => setConfiguracion(prev => ({ ...prev, maxReintentos: parseInt(e.target.value) }))}
                    className="input-config"
                    min="1"
                    max="10"
                  />
                  <span className="field-hint">Intentos de reconexión automática</span>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Intervalo de Reconexión:</label>
                  <input
                    type="number"
                    value={configuracion.intervaloReconexion}
                    onChange={(e) => setConfiguracion(prev => ({ ...prev, intervaloReconexion: parseInt(e.target.value) }))}
                    className="input-config"
                    min="1000"
                    max="60000"
                    step="1000"
                  />
                  <span className="field-hint">Tiempo entre reintentos (ms)</span>
                </div>

                <div className="form-group checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={configuracion.corsEnabled}
                      onChange={(e) => setConfiguracion(prev => ({ ...prev, corsEnabled: e.target.checked }))}
                      className="checkbox-input"
                    />
                    <span className="checkbox-custom"></span>
                    CORS Habilitado
                  </label>
                  <span className="field-hint">Permite conexiones desde navegadores web</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Validación */}
      {!validacion.isValid && (
        <div className="validacion-errores">
          <h5>❌ Errores de Configuración:</h5>
          <ul>
            {validacion.errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Mensaje de estado */}
      {mensaje && (
        <div className="mensaje-estado">
          <span className="mensaje-texto">{mensaje}</span>
        </div>
      )}

      {/* Diagnóstico mejorado */}
      {diagnostico && (
        <div className="diagnostico-resultados">
          <h4>🔍 Diagnóstico de Red</h4>
          
          <div className="diagnostico-resumen">
            <div className="resumen-score">
              <div className={`score-circle ${diagnostico.resumen.estado}`}>
                <span className="score-numero">{diagnostico.resumen.puntuacion}</span>
                <span className="score-label">/ 100</span>
              </div>
              <div className="resumen-info">
                <div className={`estado-general ${diagnostico.resumen.estado}`}>
                  {diagnostico.resumen.estado === 'excelente' && '🟢 Excelente'}
                  {diagnostico.resumen.estado === 'bueno' && '🟡 Bueno'}
                  {diagnostico.resumen.estado === 'regular' && '🟠 Regular'}
                  {diagnostico.resumen.estado === 'malo' && '🔴 Requiere Atención'}
                </div>
                <div className="device-info">
                  {diagnostico.resumen.deviceType} - Firmware {diagnostico.resumen.firmwareVersion}
                  {diagnostico.resumen.isAdvanced && <span className="badge-advanced">v4.0 Avanzado</span>}
                </div>
                <div className="recomendacion">
                  {diagnostico.resumen.recomendacion}
                </div>
              </div>
            </div>
          </div>

          <div className="tests-grid">
            {Object.entries(diagnostico.tests).map(([key, test]) => (
              <div key={key} className={`test-item ${test.status}`}>
                <div className="test-header">
                  <span className={`test-icon ${test.status}`}>
                    {test.status === 'success' && '✅'}
                    {test.status === 'warning' && '⚠️'}
                    {test.status === 'error' && '❌'}
                  </span>
                  <span className="test-name">{test.name}</span>
                </div>
                <div className="test-message">{test.message}</div>
                {test.details && (
                  <div className="test-details">
                    {key === 'latencia' && test.details.average && (
                      <small>Estabilidad: {test.details.stability.toFixed(1)}%</small>
                    )}
                    {key === 'endpoints' && test.details.isAdvanced && (
                      <small>✨ Firmware v4.0 detectado</small>
                    )}
                    {key === 'cors' && test.details.configured && (
                      <small>Headers CORS configurados correctamente</small>
                    )}
                    {key === 'advanced' && test.details.modes && (
                      <small>Modo actual: {test.details.currentMode}</small>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Información adicional del dispositivo */}
          {diagnostico.deviceInfo && (
            <div className="device-info-detallada">
              <h5>📋 Información del Dispositivo</h5>
              <div className="device-details-grid">
                <div className="detail-item">
                  <span className="detail-label">Device ID:</span>
                  <span className="detail-value">{diagnostico.deviceInfo.deviceId}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Uptime:</span>
                  <span className="detail-value">{Math.round(diagnostico.deviceInfo.uptime / 3600)} horas</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Memoria Libre:</span>
                  <span className="detail-value">{Math.round(diagnostico.deviceInfo.freeHeap / 1024)} KB</span>
                </div>
                {diagnostico.deviceInfo.energyMetrics && (
                  <div className="detail-item">
                    <span className="detail-label">Ahorro Energético:</span>
                    <span className="detail-value">{diagnostico.deviceInfo.energyMetrics.savingPercentage}%</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Acciones principales */}
      <div className="acciones-red">
        <div className="acciones-grupo-principal">
          <button 
            className="btn-accion diagnostico"
            onClick={realizarDiagnosticoCompleto}
            disabled={estado !== 'inactivo'}
          >
            🔍 Diagnóstico Completo
          </button>
          
          <button 
            className="btn-accion optimizar"
            onClick={optimizarConfiguracion}
            disabled={estado !== 'inactivo'}
          >
            🎯 Optimizar Automático
          </button>
          
          <button 
            className="btn-accion reset"
            onClick={resetearConfiguracion}
            disabled={estado !== 'inactivo'}
          >
            🔄 Restablecer
          </button>
        </div>

        <button 
          className="btn-accion aplicar primary"
          onClick={aplicarConfiguracion}
          disabled={estado !== 'inactivo' || !validacion.isValid}
        >
          {estado === 'aplicando' ? '📤 Aplicando...' : '💾 Aplicar Configuración'}
        </button>
      </div>

      {/* Quick Actions para configuraciones comunes */}
      <div className="quick-actions">
        <h4>⚡ Configuraciones Rápidas</h4>
        <div className="quick-actions-grid">
          <button 
            className="quick-action-btn"
            onClick={() => setConfiguracion(prev => ({
              ...prev,
              timeout: 3000,
              pollFrequency: 2000,
              maxReintentos: 5
            }))}
            disabled={estado !== 'inactivo'}
          >
            🚀 Red Rápida
            <small>Baja latencia</small>
          </button>
          
          <button 
            className="quick-action-btn"
            onClick={() => setConfiguracion(prev => ({
              ...prev,
              timeout: 5000,
              pollFrequency: 3000,
              maxReintentos: 4
            }))}
            disabled={estado !== 'inactivo'}
          >
            ⚖️ Balanceado
            <small>Uso general</small>
          </button>
          
          <button 
            className="quick-action-btn"
            onClick={() => setConfiguracion(prev => ({
              ...prev,
              timeout: 8000,
              pollFrequency: 5000,
              maxReintentos: 3
            }))}
            disabled={estado !== 'inactivo'}
          >
            🐌 Red Lenta
            <small>Conexión estable</small>
          </button>
          
          <button 
            className="quick-action-btn"
            onClick={() => setConfiguracion(prev => ({
              ...prev,
              timeout: 10000,
              pollFrequency: 8000,
              maxReintentos: 2
            }))}
            disabled={estado !== 'inactivo'}
          >
            🔋 Ahorro Batería
            <small>Menor frecuencia</small>
          </button>
        </div>
      </div>

      {/* Información técnica optimizada */}
      <div className="info-tecnica">
        <h4>📋 Información Técnica</h4>
        <div className="info-grid">
          <div className="info-card">
            <h5>🌐 Protocolo HTTP/CORS</h5>
            <ul>
              <li>HTTP/1.1 con Keep-Alive automático</li>
              <li>CORS ultra-permisivo para navegadores</li>
              <li>Headers minimalistas (solo Content-Type)</li>
              <li>Timeout configurable por solicitud</li>
              <li>Reconexión automática inteligente</li>
              <li>Polling adaptativo según latencia</li>
            </ul>
          </div>

          <div className="info-card">
            <h5>🎯 Recomendaciones de Rendimiento</h5>
            <ul>
              <li><strong>Puerto 80:</strong> Estándar HTTP sin cifrado</li>
              <li><strong>Timeout 3-8s:</strong> Según calidad de red</li>
              <li><strong>Polling 2-5s:</strong> Balance entre tiempo real y recursos</li>
              <li><strong>Reintentos 3-5:</strong> Resilencia sin saturar</li>
              <li><strong>CORS habilitado:</strong> Compatibilidad total con web</li>
              <li><strong>Firmware v4.0:</strong> Funciones avanzadas disponibles</li>
            </ul>
          </div>

          <div className="info-card">
            <h5>🔧 Solución de Problemas</h5>
            <div className="troubleshooting">
              <div className="trouble-item">
                <strong>🔴 Sin conexión:</strong>
                <small>Verificar IP, puerto y que el ESP32 esté encendido</small>
              </div>
              <div className="trouble-item">
                <strong>🟡 Conexión lenta:</strong>
                <small>Aumentar timeout y reducir frecuencia de polling</small>
              </div>
              <div className="trouble-item">
                <strong>⚠️ Errores CORS:</strong>
                <small>Verificar que CORS esté habilitado en el firmware</small>
              </div>
              <div className="trouble-item">
                <strong>📱 Funciones limitadas:</strong>
                <small>Actualizar a firmware v4.0 para capacidades completas</small>
              </div>
            </div>
          </div>

          {/* Estadísticas de la sesión */}
          {diagnostico && (
            <div className="info-card">
              <h5>📊 Estadísticas de la Sesión</h5>
              <div className="stats-grid">
                <div className="stat-item">
                  <span className="stat-label">Última Prueba:</span>
                  <span className="stat-value">
                    {new Date(diagnostico.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Tests Realizados:</span>
                  <span className="stat-value">{Object.keys(diagnostico.tests).length}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Tests Exitosos:</span>
                  <span className="stat-value">
                    {Object.values(diagnostico.tests).filter(t => t.status === 'success').length}
                  </span>
                </div>
                {diagnostico.tests.latencia?.details?.average && (
                  <div className="stat-item">
                    <span className="stat-label">Latencia Promedio:</span>
                    <span className="stat-value">{diagnostico.tests.latencia.details.average}ms</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Historial de cambios recientes */}
      {dispositivo?.historial && (
        <div className="historial-reciente">
          <h4>📚 Historial Reciente</h4>
          <div className="historial-lista">
            {dispositivo.historial
              .filter(h => h.tipo.includes('configuracion_red'))
              .slice(-3)
              .map((evento, index) => (
                <div key={index} className="historial-item">
                  <div className="historial-timestamp">
                    {new Date(evento.timestamp).toLocaleString()}
                  </div>
                  <div className="historial-descripcion">
                    {evento.descripcion}
                  </div>
                  <div className="historial-usuario">
                    por {evento.usuario}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfiguradorRed;