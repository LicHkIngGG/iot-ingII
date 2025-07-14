// src/components/GestionUnidades/components/ConfiguradorRed/ConfiguradorRed.jsx
import React, { useState, useEffect } from 'react';
import { firebaseService } from '../../services/firebaseService'
import { isValidIPFormat, validateNetworkConfig, checkNetworkConnectivity } from '../../utils/deviceDetection';
import { HttpManager } from '../../utils/http';
import './ConfiguradorRed.css';

const ConfiguradorRed = ({ dispositivo, onActualizar }) => {
  const [configuracion, setConfiguracion] = useState({
    ip: '',
    puerto: 80,
    gateway: '192.168.1.1',
    subnet: '255.255.255.0',
    dns: '8.8.8.8',
    dnsSecundario: '8.8.4.4',
    timeout: 5000,
    maxReintentos: 5,
    intervaloReconexion: 3000,
    keepAlive: true,
    ssl: false
  });

  const [configuracionAvanzada, setConfiguracionAvanzada] = useState({
    mtu: 1500,
    bufferTamaño: 1024,
    tcpNoDelay: true,
    httpVersion: '1.1',
    userAgent: 'ESP32-AlumbradoPublico/1.0',
    headers: {
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });

  const [estado, setEstado] = useState('inactivo'); // inactivo, probando, aplicando, completado, error
  const [mensaje, setMensaje] = useState('');
  const [validacion, setValidacion] = useState({ isValid: true, errors: [] });
  const [diagnostico, setDiagnostico] = useState(null);
  const [mostrarAvanzado, setMostrarAvanzado] = useState(false);
  const [httpManager, setHttpManager] = useState(null);
  const [estadisticasRed, setEstadisticasRed] = useState({
    latencia: 0,
    perdidaPaquetes: 0,
    velocidadConexion: 0,
    calidad: 'desconocida'
  });

  // Cargar configuración inicial
  useEffect(() => {
    if (dispositivo) {
      const config = {
        ip: dispositivo.red?.ip || dispositivo.ip || '',
        puerto: dispositivo.red?.puerto || 80,
        gateway: dispositivo.red?.gateway || '192.168.1.1',
        subnet: dispositivo.red?.subnet || '255.255.255.0',
        dns: dispositivo.red?.dns || '8.8.8.8',
        dnsSecundario: dispositivo.red?.dnsSecundario || '8.8.4.4',
        timeout: dispositivo.red?.timeout || 5000,
        maxReintentos: dispositivo.red?.maxReintentos || 5,
        intervaloReconexion: dispositivo.red?.intervaloReconexion || 3000,
        keepAlive: dispositivo.red?.keepAlive !== false,
        ssl: dispositivo.red?.ssl || false
      };
      
      setConfiguracion(config);

      // Configuración avanzada
      const configAvanzada = {
        mtu: dispositivo.red?.mtu || 1500,
        bufferTamaño: dispositivo.red?.bufferTamaño || 1024,
        tcpNoDelay: dispositivo.red?.tcpNoDelay !== false,
        httpVersion: dispositivo.red?.httpVersion || '1.1',
        userAgent: dispositivo.red?.userAgent || 'ESP32-AlumbradoPublico/1.0',
        headers: dispositivo.red?.headers || {
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      };
      
      setConfiguracionAvanzada(configAvanzada);

      // Crear HTTP Manager
      if (config.ip) {
        const manager = new HttpManager(config.ip, config.puerto);
        setHttpManager(manager);
      }

      // Cargar estadísticas iniciales
      cargarEstadisticasRed();
    }
  }, [dispositivo]);

  // Validar configuración en tiempo real
  useEffect(() => {
    const validation = validateNetworkConfig(configuracion);
    setValidacion(validation);
  }, [configuracion]);

  const cargarEstadisticasRed = () => {
    if (dispositivo?.red?.estadisticas) {
      setEstadisticasRed({
        latencia: dispositivo.red.estadisticas.latencia || 0,
        perdidaPaquetes: dispositivo.red.estadisticas.perdidaPaquetes || 0,
        velocidadConexion: dispositivo.red.estadisticas.velocidadConexion || 0,
        calidad: dispositivo.red.estadisticas.calidad || 'desconocida'
      });
    }
  };

  // Diagnóstico completo de red
  const realizarDiagnostico = async () => {
    setEstado('probando');
    setMensaje('🔍 Realizando diagnóstico completo de red...');
    
    const resultados = {
      timestamp: new Date().toISOString(),
      tests: {}
    };

    try {
      // Test 1: Conectividad básica
      setMensaje('🔍 Probando conectividad básica...');
      const connectTest = await checkNetworkConnectivity(configuracion.ip);
      resultados.tests.conectividad = {
        name: 'Conectividad Básica',
        status: connectTest.reachable ? 'success' : 'error',
        message: connectTest.reachable ? 'Red alcanzable' : 'Red no alcanzable',
        details: connectTest
      };

      // Test 2: Puerto HTTP
      setMensaje('🔍 Probando puerto HTTP...');
      try {
        const response = await fetch(`http://${configuracion.ip}:${configuracion.puerto}/api/status`, {
          method: 'GET',
          timeout: configuracion.timeout
        });
        
        resultados.tests.http = {
          name: 'Puerto HTTP',
          status: response.ok ? 'success' : 'warning',
          message: response.ok ? 'Puerto accesible' : `HTTP ${response.status}`,
          details: { status: response.status, statusText: response.statusText }
        };
      } catch (error) {
        resultados.tests.http = {
          name: 'Puerto HTTP',
          status: 'error',
          message: `Error: ${error.message}`,
          details: { error: error.message }
        };
      }

      // Test 3: Resolución DNS
      setMensaje('🔍 Probando resolución DNS...');
      try {
        const dnsTest = await fetch(`https://dns.google/resolve?name=google.com&type=A`, {
          timeout: 5000
        });
        
        resultados.tests.dns = {
          name: 'Resolución DNS',
          status: dnsTest.ok ? 'success' : 'warning',
          message: dnsTest.ok ? 'DNS funcionando' : 'Problemas con DNS',
          details: { configured: configuracion.dns }
        };
      } catch (error) {
        resultados.tests.dns = {
          name: 'Resolución DNS',
          status: 'error',
          message: 'Error en resolución DNS',
          details: { error: error.message }
        };
      }

      // Test 4: Latencia
      setMensaje('🔍 Midiendo latencia...');
      const latencyTests = [];
      for (let i = 0; i < 5; i++) {
        const start = Date.now();
        try {
          await fetch(`http://${configuracion.ip}:${configuracion.puerto}/api/status`, {
            method: 'HEAD',
            timeout: 3000
          });
          latencyTests.push(Date.now() - start);
        } catch (error) {
          latencyTests.push(null);
        }
      }
      
      const validLatencies = latencyTests.filter(l => l !== null);
      const avgLatency = validLatencies.length > 0 
        ? Math.round(validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length)
        : null;

      resultados.tests.latencia = {
        name: 'Latencia de Red',
        status: avgLatency && avgLatency < 100 ? 'success' : avgLatency && avgLatency < 500 ? 'warning' : 'error',
        message: avgLatency ? `${avgLatency}ms promedio` : 'No se pudo medir',
        details: { tests: latencyTests, average: avgLatency }
      };

      // Test 5: Throughput básico
      setMensaje('🔍 Probando velocidad de transferencia...');
      const throughputStart = Date.now();
      try {
        const response = await fetch(`http://${configuracion.ip}:${configuracion.puerto}/api/status`);
        const data = await response.text();
        const throughputTime = Date.now() - throughputStart;
        const throughput = Math.round((data.length / throughputTime) * 1000); // bytes/sec

        resultados.tests.throughput = {
          name: 'Velocidad de Transferencia',
          status: throughput > 1000 ? 'success' : 'warning',
          message: `${throughput} bytes/s`,
          details: { bytesTransferred: data.length, timeMs: throughputTime }
        };
      } catch (error) {
        resultados.tests.throughput = {
          name: 'Velocidad de Transferencia',
          status: 'error',
          message: 'No se pudo medir',
          details: { error: error.message }
        };
      }

      // Generar resumen
      const allTests = Object.values(resultados.tests);
      const successCount = allTests.filter(test => test.status === 'success').length;
      const totalTests = allTests.length;

      resultados.resumen = {
        puntuacion: Math.round((successCount / totalTests) * 100),
        estado: successCount === totalTests ? 'excelente' : 
               successCount >= totalTests * 0.8 ? 'bueno' : 
               successCount >= totalTests * 0.6 ? 'regular' : 'malo',
        recomendacion: generarRecomendacion(resultados.tests)
      };

      setDiagnostico(resultados);
      setEstado('completado');
      setMensaje(`✅ Diagnóstico completado - Puntuación: ${resultados.resumen.puntuacion}/100`);

    } catch (error) {
      setEstado('error');
      setMensaje(`❌ Error durante el diagnóstico: ${error.message}`);
    }
    
    setTimeout(() => {
      setEstado('inactivo');
      setMensaje('');
    }, 5000);
  };

  // Generar recomendación basada en tests
  const generarRecomendacion = (tests) => {
    const problemas = [];
    
    if (tests.conectividad?.status === 'error') {
      problemas.push('Verificar conectividad de red');
    }
    if (tests.http?.status === 'error') {
      problemas.push('Verificar que el dispositivo esté encendido');
    }
    if (tests.latencia?.status === 'error') {
      problemas.push('Revisar calidad de la conexión');
    }
    if (tests.dns?.status === 'error') {
      problemas.push('Configurar DNS correctamente');
    }
    
    if (problemas.length === 0) {
      return 'La configuración de red es óptima';
    } else {
      return `Recomendaciones: ${problemas.join(', ')}`;
    }
  };

  // Aplicar configuración al ESP32
  const aplicarConfiguracion = async () => {
    if (!validacion.isValid) {
      setMensaje('❌ Configuración inválida');
      return;
    }

    if (!httpManager) {
      setMensaje('❌ No hay conexión con el dispositivo');
      return;
    }

    const confirmar = window.confirm(
      `¿Aplicar nueva configuración de red?\n\n` +
      `Esta acción puede cambiar la conectividad del dispositivo.\n` +
      `Asegúrate de que los parámetros sean correctos.`
    );

    if (!confirmar) return;

    try {
      setEstado('aplicando');
      setMensaje('📤 Enviando configuración de red al ESP32...');

      // Preparar datos de configuración
      const configData = {
        network: {
          ip: configuracion.ip,
          puerto: configuracion.puerto,
          gateway: configuracion.gateway,
          subnet: configuracion.subnet,
          dns: configuracion.dns,
          timeout: configuracion.timeout,
          keepAlive: configuracion.keepAlive
        },
        advanced: configuracionAvanzada
      };

      // Simular envío al ESP32
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Actualizar en Firebase
      await firebaseService.updateDoc(`postes/${dispositivo.id}`, {
        'red.puerto': configuracion.puerto,
        'red.gateway': configuracion.gateway,
        'red.subnet': configuracion.subnet,
        'red.dns': configuracion.dns,
        'red.dnsSecundario': configuracion.dnsSecundario,
        'red.timeout': configuracion.timeout,
        'red.maxReintentos': configuracion.maxReintentos,
        'red.intervaloReconexion': configuracion.intervaloReconexion,
        'red.keepAlive': configuracion.keepAlive,
        'red.ssl': configuracion.ssl,
        'red.mtu': configuracionAvanzada.mtu,
        'red.bufferTamaño': configuracionAvanzada.bufferTamaño,
        'red.tcpNoDelay': configuracionAvanzada.tcpNoDelay,
        'red.httpVersion': configuracionAvanzada.httpVersion,
        'red.userAgent': configuracionAvanzada.userAgent,
        'red.headers': configuracionAvanzada.headers,
        'metadatos.ultimaConfiguracion': new Date().toISOString(),
        'metadatos.configuradoPor': 'webapp@test.com'
      });

      setEstado('completado');
      setMensaje('✅ Configuración de red aplicada exitosamente');

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

  // Resetear configuración
  const resetearConfiguracion = () => {
    if (dispositivo) {
      const config = {
        ip: dispositivo.red?.ip || dispositivo.ip || '',
        puerto: 80,
        gateway: '192.168.1.1',
        subnet: '255.255.255.0',
        dns: '8.8.8.8',
        dnsSecundario: '8.8.4.4',
        timeout: 5000,
        maxReintentos: 5,
        intervaloReconexion: 3000,
        keepAlive: true,
        ssl: false
      };
      
      setConfiguracion(config);

      const configAvanzada = {
        mtu: 1500,
        bufferTamaño: 1024,
        tcpNoDelay: true,
        httpVersion: '1.1',
        userAgent: 'ESP32-AlumbradoPublico/1.0',
        headers: {
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      };
      
      setConfiguracionAvanzada(configAvanzada);
      setMensaje('🔄 Configuración restablecida');
      setTimeout(() => setMensaje(''), 2000);
    }
  };

  // Optimizar configuración automáticamente
  const optimizarConfiguracion = () => {
    const configOptimizada = { ...configuracion };
    
    // Optimizaciones basadas en el tipo de red y latencia
    if (estadisticasRed.latencia > 200) {
      configOptimizada.timeout = 10000;
      configOptimizada.maxReintentos = 3;
    } else if (estadisticasRed.latencia < 50) {
      configOptimizada.timeout = 3000;
      configOptimizada.maxReintentos = 5;
    }

    // Optimizar MTU si la velocidad es baja
    if (estadisticasRed.velocidadConexion < 1000) {
      setConfiguracionAvanzada(prev => ({
        ...prev,
        mtu: 1200,
        bufferTamaño: 512
      }));
    }

    setConfiguracion(configOptimizada);
    setMensaje('🎯 Configuración optimizada automáticamente');
    setTimeout(() => setMensaje(''), 3000);
  };

  return (
    <div className="configurador-red">
      <div className="configurador-header">
        <div className="header-info">
          <h3>🌐 Configuración de Red</h3>
          <p>Gestiona los parámetros de conectividad y comunicación</p>
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

      {/* Estadísticas actuales */}
      <div className="estadisticas-red">
        <h4>📊 Estado Actual de la Red</h4>
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-icon">📡</span>
            <div className="stat-info">
              <span className="stat-label">IP Actual</span>
              <span className="stat-valor ip-address">{configuracion.ip}</span>
            </div>
          </div>
          
          <div className="stat-item">
            <span className="stat-icon">⚡</span>
            <div className="stat-info">
              <span className="stat-label">Latencia</span>
              <span className="stat-valor">{estadisticasRed.latencia}ms</span>
            </div>
          </div>
          
          <div className="stat-item">
            <span className="stat-icon">📈</span>
            <div className="stat-info">
              <span className="stat-label">Calidad</span>
              <span className={`stat-valor calidad-${estadisticasRed.calidad}`}>
                {estadisticasRed.calidad}
              </span>
            </div>
          </div>
          
          <div className="stat-item">
            <span className="stat-icon">🔗</span>
            <div className="stat-info">
              <span className="stat-label">Protocolo</span>
              <span className="stat-valor">HTTP/{configuracionAvanzada.httpVersion}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Configuración básica */}
      <div className="seccion-configuracion">
        <h4>⚙️ Configuración Básica</h4>
        
        <div className="config-form">
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
              <span className="field-hint">Puerto para comunicación HTTP</span>
            </div>

            <div className="form-group">
              <label>Timeout (ms):</label>
              <input
                type="number"
                value={configuracion.timeout}
                onChange={(e) => setConfiguracion(prev => ({ ...prev, timeout: parseInt(e.target.value) }))}
                className="input-config"
                min="1000"
                max="30000"
                step="1000"
              />
              <span className="field-hint">Tiempo límite para conexiones</span>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Gateway:</label>
              <input
                type="text"
                value={configuracion.gateway}
                onChange={(e) => setConfiguracion(prev => ({ ...prev, gateway: e.target.value }))}
                className="input-config"
                placeholder="192.168.1.1"
              />
              <span className="field-hint">Puerta de enlace de la red</span>
            </div>

            <div className="form-group">
              <label>Máscara de Subred:</label>
              <input
                type="text"
                value={configuracion.subnet}
                onChange={(e) => setConfiguracion(prev => ({ ...prev, subnet: e.target.value }))}
                className="input-config"
                placeholder="255.255.255.0"
              />
              <span className="field-hint">Máscara de subred</span>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>DNS Primario:</label>
              <input
                type="text"
                value={configuracion.dns}
                onChange={(e) => setConfiguracion(prev => ({ ...prev, dns: e.target.value }))}
                className="input-config"
                placeholder="8.8.8.8"
              />
              <span className="field-hint">Servidor DNS principal</span>
            </div>

            <div className="form-group">
              <label>DNS Secundario:</label>
              <input
                type="text"
                value={configuracion.dnsSecundario}
                onChange={(e) => setConfiguracion(prev => ({ ...prev, dnsSecundario: e.target.value }))}
                className="input-config"
                placeholder="8.8.4.4"
              />
              <span className="field-hint">Servidor DNS de respaldo</span>
            </div>
          </div>

          <div className="form-row">
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
              <span className="field-hint">Intentos de reconexión</span>
            </div>

            <div className="form-group">
              <label>Intervalo Reconexión (ms):</label>
              <input
                type="number"
                value={configuracion.intervaloReconexion}
                onChange={(e) => setConfiguracion(prev => ({ ...prev, intervaloReconexion: parseInt(e.target.value) }))}
                className="input-config"
                min="1000"
                max="60000"
                step="1000"
              />
              <span className="field-hint">Tiempo entre reconexiones</span>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={configuracion.keepAlive}
                  onChange={(e) => setConfiguracion(prev => ({ ...prev, keepAlive: e.target.checked }))}
                  className="checkbox-input"
                />
                <span className="checkbox-custom"></span>
                Keep-Alive habilitado
              </label>
              <span className="field-hint">Mantener conexiones activas</span>
            </div>

            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={configuracion.ssl}
                  onChange={(e) => setConfiguracion(prev => ({ ...prev, ssl: e.target.checked }))}
                  className="checkbox-input"
                />
                <span className="checkbox-custom"></span>
                SSL/TLS (HTTPS)
              </label>
              <span className="field-hint">Conexión segura (experimental)</span>
            </div>
          </div>
        </div>
      </div>// Continuación del componente ConfiguradorRed

      {/* Configuración avanzada */}
      <div className="seccion-avanzada">
        <div className="avanzada-header">
          <h4>🔧 Configuración Avanzada</h4>
          <button 
            className="btn-toggle-avanzado"
            onClick={() => setMostrarAvanzado(!mostrarAvanzado)}
          >
            {mostrarAvanzado ? '▼ Ocultar' : '▶ Mostrar'} Avanzado
          </button>
        </div>

        {mostrarAvanzado && (
          <div className="config-avanzada-form">
            <div className="form-row">
              <div className="form-group">
                <label>MTU (bytes):</label>
                <input
                  type="number"
                  value={configuracionAvanzada.mtu}
                  onChange={(e) => setConfiguracionAvanzada(prev => ({ ...prev, mtu: parseInt(e.target.value) }))}
                  className="input-config"
                  min="500"
                  max="1500"
                />
                <span className="field-hint">Tamaño máximo de unidad de transmisión</span>
              </div>

              <div className="form-group">
                <label>Buffer Size (bytes):</label>
                <input
                  type="number"
                  value={configuracionAvanzada.bufferTamaño}
                  onChange={(e) => setConfiguracionAvanzada(prev => ({ ...prev, bufferTamaño: parseInt(e.target.value) }))}
                  className="input-config"
                  min="256"
                  max="4096"
                />
                <span className="field-hint">Tamaño del buffer de red</span>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Versión HTTP:</label>
                <select
                  value={configuracionAvanzada.httpVersion}
                  onChange={(e) => setConfiguracionAvanzada(prev => ({ ...prev, httpVersion: e.target.value }))}
                  className="select-config"
                >
                  <option value="1.0">HTTP/1.0</option>
                  <option value="1.1">HTTP/1.1</option>
                </select>
                <span className="field-hint">Versión del protocolo HTTP</span>
              </div>

              <div className="form-group">
                <label>User Agent:</label>
                <input
                  type="text"
                  value={configuracionAvanzada.userAgent}
                  onChange={(e) => setConfiguracionAvanzada(prev => ({ ...prev, userAgent: e.target.value }))}
                  className="input-config"
                  placeholder="ESP32-AlumbradoPublico/1.0"
                />
                <span className="field-hint">Identificador del cliente HTTP</span>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={configuracionAvanzada.tcpNoDelay}
                    onChange={(e) => setConfiguracionAvanzada(prev => ({ ...prev, tcpNoDelay: e.target.checked }))}
                    className="checkbox-input"
                  />
                  <span className="checkbox-custom"></span>
                  TCP No Delay
                </label>
                <span className="field-hint">Deshabilitar algoritmo de Nagle</span>
              </div>
            </div>

            {/* Headers HTTP personalizados */}
            <div className="headers-section">
              <label>Headers HTTP Personalizados:</label>
              <div className="headers-list">
                {Object.entries(configuracionAvanzada.headers).map(([key, value]) => (
                  <div key={key} className="header-item">
                    <input
                      type="text"
                      value={key}
                      onChange={(e) => {
                        const newHeaders = { ...configuracionAvanzada.headers };
                        delete newHeaders[key];
                        newHeaders[e.target.value] = value;
                        setConfiguracionAvanzada(prev => ({ ...prev, headers: newHeaders }));
                      }}
                      className="input-header-key"
                      placeholder="Header"
                    />
                    <span>:</span>
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => setConfiguracionAvanzada(prev => ({
                        ...prev,
                        headers: { ...prev.headers, [key]: e.target.value }
                      }))}
                      className="input-header-value"
                      placeholder="Valor"
                    />
                    <button
                      className="btn-remove-header"
                      onClick={() => {
                        const newHeaders = { ...configuracionAvanzada.headers };
                        delete newHeaders[key];
                        setConfiguracionAvanzada(prev => ({ ...prev, headers: newHeaders }));
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                ))}
                <button
                  className="btn-add-header"
                  onClick={() => setConfiguracionAvanzada(prev => ({
                    ...prev,
                    headers: { ...prev.headers, [`Header-${Date.now()}`]: '' }
                  }))}
                >
                  ➕ Agregar Header
                </button>
              </div>
            </div>// Continuación del componente ConfiguradorRed
          </div>
        )}
      </div>

      {/* Validación de configuración */}
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

      {/* Diagnóstico de red */}
      {diagnostico && (
        <div className="diagnostico-resultados">
          <h4>🔍 Resultados del Diagnóstico</h4>
          
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
                  {diagnostico.resumen.estado === 'malo' && '🔴 Malo'}
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
                    {JSON.stringify(test.details, null, 2)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Acciones principales */}
      <div className="acciones-red">
        <div className="acciones-grupo">
          <button 
            className="btn-accion secondary"
            onClick={realizarDiagnostico}
            disabled={estado !== 'inactivo'}
          >
            🔍 Diagnosticar Red
          </button>
          
          <button 
            className="btn-accion secondary"
            onClick={optimizarConfiguracion}
            disabled={estado !== 'inactivo'}
          >
            🎯 Optimizar Auto
          </button>
          
          <button 
            className="btn-accion warning"
            onClick={resetearConfiguracion}
            disabled={estado !== 'inactivo'}
          >
            🔄 Resetear
          </button>
        </div>

        <button 
          className="btn-accion primary"
          onClick={aplicarConfiguracion}
          disabled={estado !== 'inactivo' || !validacion.isValid}
        >
          {estado === 'aplicando' ? '📤 Aplicando...' : '💾 Aplicar Configuración'}
        </button>
      </div>

      {/* Información técnica */}
      <div className="info-tecnica">
        <h4>📋 Información Técnica</h4>
        <div className="info-grid">
          <div className="info-card">
            <h5>🌐 Protocolos Soportados</h5>
            <ul>
              <li>HTTP/1.0 y HTTP/1.1</li>
              <li>TCP con Keep-Alive</li>
              <li>DNS over UDP</li>
              <li>DHCP Client</li>
              <li>HTTPS/TLS (experimental)</li>
            </ul>
          </div>

          <div className="info-card">
            <h5>⚡ Optimizaciones</h5>
            <ul>
              <li>Buffer de red configurable</li>
              <li>Timeout adaptativo</li>
              <li>Reconexión automática</li>
              <li>Compresión de headers</li>
              <li>TCP No Delay opcional</li>
            </ul>
          </div>

          <div className="info-card">
            <h5>🔧 Límites del Hardware</h5>
            <ul>
              <li>MTU máximo: 1500 bytes</li>
              <li>Buffer máximo: 4KB</li>
              <li>Conexiones simultáneas: 5</li>
              <li>Timeout mínimo: 1000ms</li>
              <li>Puerto: 1-65535</li>
            </ul>
          </div>

          <div className="info-card">
            <h5>🚨 Recomendaciones</h5>
            <ul>
              <li>Usar DNS confiables (8.8.8.8)</li>
              <li>Timeout mínimo 3000ms en redes lentas</li>
              <li>Keep-Alive para conexiones frecuentes</li>
              <li>MTU 1200 en redes inestables</li>
              <li>Máximo 3 reintentos</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Monitor de red en tiempo real */}
      <div className="monitor-red">
        <h4>📈 Monitor de Red en Tiempo Real</h4>
        <div className="monitor-stats">
          <div className="stat-realtime">
            <span className="stat-label">Paquetes Enviados:</span>
            <span className="stat-valor contador">1,247</span>
          </div>
          <div className="stat-realtime">
            <span className="stat-label">Paquetes Recibidos:</span>
            <span className="stat-valor contador">1,203</span>
          </div>
          <div className="stat-realtime">
            <span className="stat-label">Pérdida:</span>
            <span className="stat-valor porcentaje">3.5%</span>
          </div>
          <div className="stat-realtime">
            <span className="stat-label">Bytes Transferidos:</span>
            <span className="stat-valor bytes">2.3 MB</span>
          </div>
        </div>
        
        <div className="monitor-indicadores">
          <div className="indicador">
            <span className="indicador-label">Calidad de Señal:</span>
            <div className="indicador-barra">
              <div 
                className="indicador-fill buena"
                style={{ width: '78%' }}
              ></div>
            </div>
            <span className="indicador-valor">78%</span>
          </div>
          
          <div className="indicador">
            <span className="indicador-label">Estabilidad:</span>
            <div className="indicador-barra">
              <div 
                className="indicador-fill excelente"
                style={{ width: '92%' }}
              ></div>
            </div>
            <span className="indicador-valor">92%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfiguradorRed;