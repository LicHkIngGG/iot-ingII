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

      // Crear HTTP Manager
      const ip = dispositivo.red?.ip || dispositivo.ip;
      const puerto = dispositivo.red?.puerto || 80;
      if (ip) {
        const manager = new HttpManager(ip, puerto);
        setHttpManager(manager);
      }

      // Cargar estado de sensores
      cargarEstadoSensores();
    }
  }, [dispositivo]);

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

  // Enviar configuración al ESP32
  const enviarConfiguracion = async () => {
    if (!httpManager) {
      setMensaje('❌ No hay conexión con el dispositivo');
      return;
    }

    setEnviando(true);
    setMensaje('📤 Enviando configuración de sensores...');

    try {
      // Preparar datos para envío
      const configData = {
        ldr: configuracion.ldr,
        pir: configuracion.pir,
        acs712: configuracion.acs712,
        intervalos: configuracion.intervalos
      };

      // Enviar al ESP32 (simulado)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
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

    } catch (error) {
      setMensaje(`❌ Error enviando configuración: ${error.message}`);
    } finally {
      setEnviando(false);
      setTimeout(() => setMensaje(''), 3000);
    }
  };

  // Test de sensor individual
  const testearSensor = async (tipoSensor) => {
    if (!httpManager) {
      setMensaje('❌ No hay conexión con el dispositivo');
      return;
    }

    setModoTest(true);
    setMensaje(`🔍 Probando sensor ${tipoSensor.toUpperCase()}...`);

    try {
      // Simular test del sensor
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Obtener datos actuales del sensor
      const nuevoEstado = { ...estadoSensores };
      
      switch (tipoSensor) {
        case 'ldr':
          nuevoEstado.ldr = {
            funcionando: true,
            ultimaLectura: new Date().toISOString(),
            valor: Math.floor(Math.random() * 1000)
          };
          break;
        case 'pir':
          nuevoEstado.pir = {
            funcionando: true,
            ultimaDeteccion: new Date().toISOString(),
            estado: Math.random() > 0.5
          };
          break;
        case 'acs712':
          nuevoEstado.acs712 = {
            funcionando: true,
            ultimaLectura: new Date().toISOString(),
            corriente: (Math.random() * 5).toFixed(2)
          };
          break;
      }
      
      setEstadoSensores(nuevoEstado);
      setMensaje(`✅ Sensor ${tipoSensor.toUpperCase()} funcionando correctamente`);

    } catch (error) {
      setMensaje(`❌ Error probando sensor ${tipoSensor}: ${error.message}`);
    } finally {
      setModoTest(false);
      setTimeout(() => setMensaje(''), 3000);
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
                ldr: { ...prev.ldr, factorCalibracion: parseFloat(e.target.value) }// Continuación del renderConfigLDR
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
          disabled={enviando}
        >
          {enviando ? '📤 Enviando...' : '💾 Guardar Configuración'}
        </button>
      </div>
    </div>
  );
};

export default ConfiguradorSensores;