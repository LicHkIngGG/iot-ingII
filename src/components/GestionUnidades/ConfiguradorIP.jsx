// src/components/GestionUnidades/components/ConfiguradorIP/ConfiguradorIP.jsx
import React, { useState, useEffect } from 'react';
import { firebaseService } from '../../services/firebaseService';
import { isValidIPFormat, testESP32Connection, validateNetworkConfig } from '../../utils/deviceDetection';
import { HttpManager } from '../../utils/http';
import './ConfiguradorIP.css';

const ConfiguradorIP = ({ dispositivo, onActualizar }) => {
  const [configuracion, setConfiguracion] = useState({
    ipActual: '',
    ipNueva: '',
    puerto: 80,
    gateway: '',
    subnet: '255.255.255.0',
    dns: '8.8.8.8',
    timeout: 5000
  });

  const [estado, setEstado] = useState('inactivo'); // inactivo, probando, cambiando, completado, error
  const [progreso, setProgreso] = useState(0);
  const [mensaje, setMensaje] = useState('');
  const [validacion, setValidacion] = useState({
    isValid: true,
    errors: []
  });
  const [historialIPs, setHistorialIPs] = useState([]);
  const [mostrarAvanzado, setMostrarAvanzado] = useState(false);
  const [httpManager, setHttpManager] = useState(null);

  // Cargar configuración inicial
  useEffect(() => {
    if (dispositivo) {
      const config = {
        ipActual: dispositivo.red?.ip || dispositivo.ip || '',
        ipNueva: dispositivo.red?.ip || dispositivo.ip || '',
        puerto: dispositivo.red?.puerto || 80,
        gateway: dispositivo.red?.gateway || '192.168.1.1',
        subnet: dispositivo.red?.subnet || '255.255.255.0',
        dns: dispositivo.red?.dns || '8.8.8.8',
        timeout: dispositivo.red?.timeout || 5000
      };
      
      setConfiguracion(config);
      
      // Crear HTTP Manager
      if (config.ipActual) {
        const manager = new HttpManager(config.ipActual, config.puerto);
        setHttpManager(manager);
      }
      
      // Cargar historial de IPs
      cargarHistorialIPs();
    }
  }, [dispositivo]);

  // Validar configuración en tiempo real
  useEffect(() => {
    const validation = validateNetworkConfig(configuracion);
    setValidacion(validation);
  }, [configuracion]);

  const cargarHistorialIPs = () => {
    const historial = dispositivo?.historial?.filter(h => h.tipo === 'configuracion' && h.campo?.includes('ip')) || [];
    setHistorialIPs(historial.slice(-5)); // Últimas 5 IPs
  };

  // Probar conectividad con IP actual
  const probarIPActual = async () => {
    setEstado('probando');
    setMensaje('🔍 Probando conectividad con IP actual...');
    setProgreso(20);

    try {
      const resultado = await testESP32Connection(
        configuracion.ipActual, 
        configuracion.puerto, 
        configuracion.timeout
      );

      setProgreso(100);

      if (resultado.success) {
        setEstado('completado');
        setMensaje(`✅ Conectividad exitosa con ${configuracion.ipActual}:${configuracion.puerto}`);
      } else {
        setEstado('error');
        setMensaje(`❌ Error conectando: ${resultado.error}`);
      }
    } catch (error) {
      setEstado('error');
      setMensaje(`❌ Error durante la prueba: ${error.message}`);
      setProgreso(0);
    }

    setTimeout(() => {
      setEstado('inactivo');
      setProgreso(0);
    }, 3000);
  };

  // Probar nueva IP antes del cambio
  const probarNuevaIP = async () => {
    if (!validacion.isValid) {
      setMensaje('❌ Configuración inválida');
      return;
    }

    setEstado('probando');
    setMensaje('🔍 Verificando que la nueva IP esté disponible...');
    setProgreso(30);

    try {
      const resultado = await testESP32Connection(
        configuracion.ipNueva, 
        configuracion.puerto, 
        2000
      );

      setProgreso(100);

      if (resultado.success) {
        setEstado('error');
        setMensaje(`⚠️ ADVERTENCIA: Ya existe un dispositivo en ${configuracion.ipNueva}`);
      } else {
        setEstado('completado');
        setMensaje(`✅ IP ${configuracion.ipNueva} disponible para uso`);
      }
    } catch (error) {
      setEstado('completado');
      setMensaje(`✅ IP ${configuracion.ipNueva} disponible (sin conflictos)`);
      setProgreso(100);
    }

    setTimeout(() => {
      setEstado('inactivo');
      setProgreso(0);
    }, 3000);
  };

  // Cambiar IP en el ESP32
  const cambiarIP = async () => {
    if (!validacion.isValid) {
      setMensaje('❌ Configuración inválida');
      return;
    }

    if (configuracion.ipActual === configuracion.ipNueva) {
      setMensaje('ℹ️ La IP nueva es igual a la actual');
      return;
    }

    const confirmar = window.confirm(
      `¿Confirmar cambio de IP?\n\n` +
      `IP Actual: ${configuracion.ipActual}\n` +
      `IP Nueva: ${configuracion.ipNueva}\n\n` +
      `El dispositivo se reiniciará y puede tardar unos segundos en estar disponible.`
    );

    if (!confirmar) return;

    try {
      setEstado('cambiando');
      setMensaje('🔄 Enviando comando de cambio de IP al ESP32...');
      setProgreso(25);

      if (!httpManager) {
        throw new Error('HTTP Manager no inicializado');
      }

      // Enviar comando de cambio de IP
      const resultado = await httpManager.changeIPOnDevice(configuracion.ipNueva);
      
      setProgreso(50);
      setMensaje('⏰ ESP32 reiniciando con nueva IP...');

      // Actualizar configuración en Firebase
      await firebaseService.updateNetworkConfig(dispositivo.id, {
        ip: configuracion.ipNueva,
        puerto: configuracion.puerto,
        gateway: configuracion.gateway,
        subnet: configuracion.subnet,
        dns: configuracion.dns,
        timeout: configuracion.timeout
      });

      setProgreso(75);
      setMensaje('💾 Configuración guardada en Firebase...');

      // Esperar y probar nueva conexión
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      setMensaje('🔍 Probando conexión con nueva IP...');
      const pruebaConexion = await testESP32Connection(
        configuracion.ipNueva,
        configuracion.puerto,
        10000
      );

      if (pruebaConexion.success) {
        setProgreso(100);
        setEstado('completado');
        setMensaje(`🎉 Cambio de IP exitoso: ${configuracion.ipNueva}`);
        
        // Actualizar configuración local
        setConfiguracion(prev => ({
          ...prev,
          ipActual: configuracion.ipNueva
        }));

        // Crear nuevo HTTP Manager
        const nuevoManager = new HttpManager(configuracion.ipNueva, configuracion.puerto);
        setHttpManager(nuevoManager);

        // Notificar actualización
        if (onActualizar) {
          onActualizar();
        }

      } else {
        setEstado('error');
        setMensaje(`⚠️ IP cambiada pero conexión no confirmada. Verifica manualmente.`);
      }

    } catch (error) {
      setEstado('error');
      setMensaje(`❌ Error cambiando IP: ${error.message}`);
      setProgreso(0);
    }

    // Limpiar estado después de 5 segundos
    setTimeout(() => {
      if (estado !== 'completado') {
        setEstado('inactivo');
        setProgreso(0);
      }
    }, 5000);
  };

  // Generar IP automática
  const generarIPAutomatica = () => {
    const baseIP = configuracion.ipActual.split('.').slice(0, 3).join('.') + '.';
    let nuevaIP = 101;
    
    // Buscar primera IP disponible
    while (nuevaIP <= 200) {
      const ipCandidato = baseIP + nuevaIP;
      if (ipCandidato !== configuracion.ipActual) {
        setConfiguracion(prev => ({
          ...prev,
          ipNueva: ipCandidato
        }));
        break;
      }
      nuevaIP++;
    }
  };

  // Restaurar IP de historial
  const restaurarIPHistorial = (ip) => {
    setConfiguracion(prev => ({
      ...prev,
      ipNueva: ip
    }));
  };

  // Resetear configuración
  const resetearConfiguracion = () => {
    if (dispositivo) {
      setConfiguracion({
        ipActual: dispositivo.red?.ip || dispositivo.ip || '',
        ipNueva: dispositivo.red?.ip || dispositivo.ip || '',
        puerto: dispositivo.red?.puerto || 80,
        gateway: dispositivo.red?.gateway || '192.168.1.1',
        subnet: dispositivo.red?.subnet || '255.255.255.0',
        dns: dispositivo.red?.dns || '8.8.8.8',
        timeout: dispositivo.red?.timeout || 5000
      });
    }
  };

  return (
    <div className="configurador-ip">
      <div className="configurador-header">
        <div className="header-info">
          <h3>🌐 Configuración de IP</h3>
          <p>Gestiona la dirección IP y configuración de red del dispositivo</p>
        </div>
        
        <div className="header-estado">
          {estado !== 'inactivo' && (
            <div className={`estado-badge ${estado}`}>
              {estado === 'probando' && '🔍 Probando...'}
              {estado === 'cambiando' && '🔄 Cambiando...'}
              {estado === 'completado' && '✅ Completado'}
              {estado === 'error' && '❌ Error'}
            </div>
          )}
        </div>
      </div>

      {/* Información actual */}
      <div className="seccion-actual">
        <h4>📍 Configuración Actual</h4>
        <div className="config-actual-grid">
          <div className="config-item">
            <span className="config-label">IP Actual:</span>
            <span className="config-valor ip-actual">{configuracion.ipActual}</span>
          </div>
          <div className="config-item">
            <span className="config-label">Puerto:</span>
            <span className="config-valor">{configuracion.puerto}</span>
          </div>
          <div className="config-item">
            <span className="config-label">Estado:</span>
            <span className="config-valor estado-online">🟢 Conectado</span>
          </div>
          <div className="config-item">
            <span className="config-label">Protocolo:</span>
            <span className="config-valor">HTTP/1.1</span>
          </div>
        </div>
        
        <button 
          className="btn-probar-actual"
          onClick={probarIPActual}
          disabled={estado !== 'inactivo'}
        >
          🔍 Probar Conectividad Actual
        </button>
      </div>

      {/* Nueva configuración */}
      <div className="seccion-nueva">
        <h4>🎯 Nueva Configuración</h4>
        
        <div className="form-nueva-ip">
          <div className="input-group">
            <label>Nueva IP:</label>
            <div className="ip-input-container">
              <input
                type="text"
                value={configuracion.ipNueva}
                onChange={(e) => setConfiguracion(prev => ({...prev, ipNueva: e.target.value}))}
                className={`input-ip ${!isValidIPFormat(configuracion.ipNueva) ? 'invalid' : ''}`}
                placeholder="192.168.1.102"
              />
              <button 
                className="btn-generar-auto"
                onClick={generarIPAutomatica}
                title="Generar IP automática"
              >
                🎲
              </button>
            </div>
          </div>

          <div className="input-group">
            <label>Puerto:</label>
            <input
              type="number"
              value={configuracion.puerto}
              onChange={(e) => setConfiguracion(prev => ({...prev, puerto: parseInt(e.target.value)}))}
              className="input-puerto"
              min="1"
              max="65535"
            />
          </div>

          {/* Configuración avanzada */}
          <div className="config-avanzada">
            <button 
              className="btn-toggle-avanzado"
              onClick={() => setMostrarAvanzado(!mostrarAvanzado)}
            >
              {mostrarAvanzado ? '▼' : '▶'} Configuración Avanzada
            </button>

            {mostrarAvanzado && (
              <div className="config-avanzada-form">
                <div className="input-group">
                  <label>Gateway:</label>
                  <input
                    type="text"
                    value={configuracion.gateway}
                    onChange={(e) => setConfiguracion(prev => ({...prev, gateway: e.target.value}))}
                    className="input-config"
                    placeholder="192.168.1.1"
                  />
                </div>

                <div className="input-group">
                  <label>Máscara de Subred:</label>
                  <input
                    type="text"
                    value={configuracion.subnet}
                    onChange={(e) => setConfiguracion(prev => ({...prev, subnet: e.target.value}))}
                    className="input-config"
                    placeholder="255.255.255.0"
                  />
                </div>

                <div className="input-group">
                  <label>DNS:</label>
                  <input
                    type="text"
                    value={configuracion.dns}
                    onChange={(e) => setConfiguracion(prev => ({...prev, dns: e.target.value}))}
                    className="input-config"
                    placeholder="8.8.8.8"
                  />
                </div>

                <div className="input-group">
                  <label>Timeout (ms):</label>
                  <input
                    type="number"
                    value={configuracion.timeout}
                    onChange={(e) => setConfiguracion(prev => ({...prev, timeout: parseInt(e.target.value)}))}
                    className="input-config"
                    min="1000"
                    max="30000"
                  />
                </div>
              </div>
            )}
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
        </div>

        {/* Acciones */}
        <div className="acciones-ip">
          <button 
            className="btn-probar-nueva"
            onClick={probarNuevaIP}
            disabled={estado !== 'inactivo' || !validacion.isValid}
          >
            🔍 Probar Nueva IP
          </button>
          
          <button 
            className="btn-cambiar-ip primary"
            onClick={cambiarIP}
            disabled={estado !== 'inactivo' || !validacion.isValid}
          >
            🌐 Cambiar IP en ESP32
          </button>
          
          <button 
            className="btn-resetear"
            onClick={resetearConfiguracion}
            disabled={estado !== 'inactivo'}
          >
            🔄 Resetear
          </button>
        </div>
      </div>

      {/* Progreso */}
      {estado !== 'inactivo' && (
        <div className="progreso-seccion">
          <div className="progreso-info">
            <span className="progreso-mensaje">{mensaje}</span>
            <span className="progreso-porcentaje">{progreso}%</span>
          </div>
          <div className="progreso-barra">
            <div 
              className="progreso-fill"
              style={{ width: `${progreso}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Historial de IPs */}
      {historialIPs.length > 0 && (
        <div className="historial-ips">
          <h4>📋 Historial de IPs</h4>
          <div className="historial-lista">
            {historialIPs.map((entrada, index) => (
              <div key={index} className="historial-item">
                <div className="historial-info">
                  <span className="historial-ip">{entrada.valorNuevo}</span>
                  <span className="historial-fecha">
                    {new Date(entrada.timestamp).toLocaleDateString()}
                  </span>
                </div>
                <button 
                  className="btn-restaurar"
                  onClick={() => restaurarIPHistorial(entrada.valorNuevo)}
                  title="Restaurar esta IP"
                >
                  ↩️
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Información adicional */}
      <div className="info-adicional">
        <div className="info-card">
          <h5>💡 Consejos</h5>
          <ul>
            <li>Asegúrate de que la nueva IP esté en el mismo rango de red</li>
            <li>Evita IPs ya utilizadas por otros dispositivos</li>
            <li>El dispositivo se reiniciará automáticamente tras el cambio</li>
            <li>La reconexión puede tomar hasta 30 segundos</li>
          </ul>
        </div>
        
        <div className="info-card">
          <h5>🔧 Información Técnica</h5>
          <div className="info-tech">
            <span>Protocolo: HTTP/1.1</span>
            <span>Módulo: WIZnet W5500</span>
            <span>Reinicio automático: Sí</span>
            <span>Backup config: Firebase</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfiguradorIP;