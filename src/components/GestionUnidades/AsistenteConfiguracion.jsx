// src/components/GestionUnidades/components/AsistenteConfiguracion/AsistenteConfiguracion.jsx
import React, { useState, useEffect } from 'react';
import { firebaseService } from '../../services/firebaseService';
import { detectESP32InRange, testESP32Connection, createDeviceProfile } from '../../utils/deviceDetection';
import { HttpManager } from '../../utils/http';
import './AsistenteConfiguracion.css';

const AsistenteConfiguracion = ({ onCerrar, onCompletar }) => {
  const [pasoActual, setPasoActual] = useState(1);
  const [datosDispositivo, setDatosDispositivo] = useState({});
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [progreso, setProgreso] = useState(0);

  const pasos = [
    { numero: 1, titulo: 'Detección', icono: '🔍', descripcion: 'Buscar dispositivo ESP32' },
    { numero: 2, titulo: 'Identificación', icono: '🏷️', descripcion: 'Configurar información básica' },
    { numero: 3, titulo: 'Red', icono: '🌐', descripcion: 'Configurar conexión de red' },
    { numero: 4, titulo: 'Sensores', icono: '🔬', descripcion: 'Configurar sensores' },
    { numero: 5, titulo: 'Confirmación', icono: '✅', descripcion: 'Revisar y guardar' }
  ];

  // Estado para cada paso
  const [deteccion, setDeteccion] = useState({
    metodo: 'automatico', // automatico, manual
    rangoIP: { base: '192.168.1.', inicio: 100, fin: 200 },
    ipManual: '',
    dispositivosEncontrados: [],
    dispositivoSeleccionado: null
  });

  const [identificacion, setIdentificacion] = useState({
    nombre: '',
    ubicacion: '',
    zona: '',
    descripcion: ''
  });

  const [configuracionRed, setConfiguracionRed] = useState({
    ipNueva: '',
    puerto: 80,
    gateway: '192.168.1.1',
    subnet: '255.255.255.0',
    dns: '8.8.8.8'
  });

  const [configuracionSensores, setConfiguracionSensores] = useState({
    ldr: { habilitado: true, umbralEncendido: 100, umbralApagado: 300 },
    pir: { habilitado: true, sensibilidad: 'media', tiempoActivacion: 30 },
    acs712: { habilitado: true, modelo: '20A', alertaMaxima: 20 }
  });

  // Calcular progreso
  useEffect(() => {
    const nuevoProgreso = (pasoActual / pasos.length) * 100;
    setProgreso(nuevoProgreso);
  }, [pasoActual]);

  // PASO 1: Detección de dispositivo
  const renderPasoDeteccion = () => (
    <div className="paso-contenido">
      <div className="paso-header">
        <h3>🔍 Detectar Dispositivo ESP32</h3>
        <p>Encuentra tu dispositivo en la red local</p>
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
              <p>Escanea un rango de IPs buscando dispositivos ESP32</p>
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
              <p>Introduce la IP si ya la conoces</p>
            </div>
          </label>
        </div>
      </div>

      {deteccion.metodo === 'automatico' && (
        <div className="config-automatica">
          <h4>Configuración de Escaneo</h4>
          <div className="config-grid">
            <div className="config-item">
              <label>Rango de IP:</label>
              <div className="ip-range-input">
                <input
                  type="text"
                  value={deteccion.rangoIP.base}
                  onChange={(e) => setDeteccion(prev => ({
                    ...prev,
                    rangoIP: { ...prev.rangoIP, base: e.target.value }
                  }))}
                  className="input-ip-base"
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
            </div>
          </div>

          <button
            className="btn-detectar primary"
            onClick={iniciarDeteccionAutomatica}
            disabled={cargando}
          >
            {cargando ? '🔄 Escaneando...' : '🔍 Iniciar Escaneo'}
          </button>
        </div>
      )}

      {deteccion.metodo === 'manual' && (
        <div className="config-manual">
          <h4>IP del Dispositivo</h4>
          <div className="ip-manual-input">
            <input
              type="text"
              placeholder="192.168.1.101"
              value={deteccion.ipManual}
              onChange={(e) => setDeteccion(prev => ({ ...prev, ipManual: e.target.value }))}
              className="input-ip-manual"
            />
            <button
              className="btn-probar"
              onClick={probarIPManual}
              disabled={cargando || !deteccion.ipManual}
            >
              {cargando ? '🔄' : '🎯'} Probar
            </button>
          </div>
        </div>
      )}

      {/* Dispositivos encontrados */}
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
                    <span className="dispositivo-icon">📱</span>
                    <span className="dispositivo-id">{dispositivo.data?.deviceId || 'ESP32'}</span>
                  </div>
                  <div className="dispositivo-detalles">
                    <span className="dispositivo-ip">{dispositivo.ip}:{dispositivo.puerto}</span>
                    <span className="dispositivo-firmware">v{dispositivo.data?.firmwareVersion || '1.0.0'}</span>
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
          <span>{error}</span>
        </div>
      )}
    </div>
  );

  // PASO 2: Identificación
  const renderPasoIdentificacion = () => (
    <div className="paso-contenido">
      <div className="paso-header">
        <h3>🏷️ Información del Dispositivo</h3>
        <p>Configura los datos básicos del dispositivo</p>
      </div>

      <div className="dispositivo-detectado">
        <div className="detectado-info">
          <span className="detectado-icon">📱</span>
          <div>
            <strong>{datosDispositivo.deviceId || 'ESP32'}</strong>
            <p>IP: {datosDispositivo.ip} | Firmware: v{datosDispositivo.firmwareVersion || '1.0.0'}</p>
          </div>
        </div>
      </div>

      <div className="form-identificacion">
        <div className="form-group">
          <label>Nombre del Dispositivo *</label>
          <input
            type="text"
            value={identificacion.nombre}
            onChange={(e) => setIdentificacion(prev => ({ ...prev, nombre: e.target.value }))}
            placeholder="Ej: Poste Villa Adela Norte 001"
            className="input-form"
            required
          />
        </div>

        <div className="form-group">
          <label>Ubicación *</label>
          <input
            type="text"
            value={identificacion.ubicacion}
            onChange={(e) => setIdentificacion(prev => ({ ...prev, ubicacion: e.target.value }))}
            placeholder="Ej: Calle Murillo 456, Villa Adela"
            className="input-form"
            required
          />
        </div>

        <div className="form-group">
          <label>Zona</label>
          <select
            value={identificacion.zona}
            onChange={(e) => setIdentificacion(prev => ({ ...prev, zona: e.target.value }))}
            className="select-form"
          >
            <option value="">Seleccionar zona</option>
            <option value="Norte">Norte</option>
            <option value="Sur">Sur</option>
            <option value="Centro">Centro</option>
            <option value="Este">Este</option>
            <option value="Oeste">Oeste</option>
          </select>
        </div>

        <div className="form-group">
          <label>Descripción</label>
          <textarea
            value={identificacion.descripcion}
            onChange={(e) => setIdentificacion(prev => ({ ...prev, descripcion: e.target.value }))}
            placeholder="Descripción adicional del dispositivo..."
            className="textarea-form"
            rows={3}
          />
        </div>
      </div>
    </div>
  );

  // PASO 3: Configuración de Red
  const renderPasoRed = () => (
    <div className="paso-contenido">
      <div className="paso-header">
        <h3>🌐 Configuración de Red</h3>
        <p>Ajusta los parámetros de conexión del dispositivo</p>
      </div>

      <div className="red-actual">
        <h4>📍 Configuración Actual</h4>
        <div className="config-actual">
          <div className="config-item-actual">
            <span className="config-label">IP Actual:</span>
            <span className="config-valor">{datosDispositivo.ip}</span>
          </div>
          <div className="config-item-actual">
            <span className="config-label">Puerto:</span>
            <span className="config-valor">{datosDispositivo.puerto || 80}</span>
          </div>
        </div>
      </div>

      <div className="red-nueva">
        <h4>🎯 Nueva Configuración</h4>
        <div className="form-red">
          <div className="form-row">
            <div className="form-group">
              <label>Nueva IP</label>
              <input
                type="text"
                value={configuracionRed.ipNueva}
                onChange={(e) => setConfiguracionRed(prev => ({ ...prev, ipNueva: e.target.value }))}
                placeholder={datosDispositivo.ip}
                className="input-form"
              />
              <small>Dejar vacío para mantener la IP actual</small>
            </div>

            <div className="form-group">
              <label>Puerto</label>
              <input
                type="number"
                value={configuracionRed.puerto}
                onChange={(e) => setConfiguracionRed(prev => ({ ...prev, puerto: parseInt(e.target.value) }))}
                className="input-form"
                min="1"
                max="65535"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Gateway</label>
              <input
                type="text"
                value={configuracionRed.gateway}
                onChange={(e) => setConfiguracionRed(prev => ({ ...prev, gateway: e.target.value }))}
                className="input-form"
              />
            </div>

            <div className="form-group">
              <label>Máscara de Subred</label>
              <input
                type="text"
                value={configuracionRed.subnet}
                onChange={(e) => setConfiguracionRed(prev => ({ ...prev, subnet: e.target.value }))}
                className="input-form"
              />
            </div>
          </div>

          <div className="form-group">
            <label>DNS</label>
            <input
              type="text"
              value={configuracionRed.dns}
              onChange={(e) => setConfiguracionRed(prev => ({ ...prev, dns: e.target.value }))}
              className="input-form"
            />
          </div>
        </div>
      </div>
    </div>
  );

  // PASO 4: Configuración de Sensores
  const renderPasoSensores = () => (
    <div className="paso-contenido">
      <div className="paso-header">
        <h3>🔬 Configuración de Sensores</h3>
        <p>Configura los sensores detectados en el dispositivo</p>
      </div>

      <div className="sensores-config">
        {/* LDR */}
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
              <span className="sensor-titulo">💡 Sensor LDR (Luminosidad)</span>
            </label>
          </div>
          
          {configuracionSensores.ldr.habilitado && (
            <div className="sensor-config">
              <div className="config-row">
                <div className="config-item">
                  <label>Umbral Encendido (lux)</label>
                  <input
                    type="number"
                    value={configuracionSensores.ldr.umbralEncendido}
                    onChange={(e) => setConfiguracionSensores(prev => ({
                      ...prev,
                      ldr: { ...prev.ldr, umbralEncendido: parseInt(e.target.value) }
                    }))}
                    className="input-config"
                    min="0"
                    max="1000"
                  />
                </div>
                <div className="config-item">
                  <label>Umbral Apagado (lux)</label>
                  <input
                    type="number"
                    value={configuracionSensores.ldr.umbralApagado}
                    onChange={(e) => setConfiguracionSensores(prev => ({
                      ...prev,
                      ldr: { ...prev.ldr, umbralApagado: parseInt(e.target.value) }
                    }))}
                    className="input-config"
                    min="0"
                    max="1000"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* PIR */}
        <div className="sensor-group">
          <div className="sensor-header">
            <label className="checkbox-label">// Continuación del renderPasoSensores - PIR
              <input
                type="checkbox"
                checked={configuracionSensores.pir.habilitado}
                onChange={(e) => setConfiguracionSensores(prev => ({
                  ...prev,
                  pir: { ...prev.pir, habilitado: e.target.checked }
                }))}
              />
              <span className="checkbox-custom"></span>
              <span className="sensor-titulo">👁️ Sensor PIR (Movimiento)</span>
            </label>
          </div>
          
          {configuracionSensores.pir.habilitado && (
            <div className="sensor-config">
              <div className="config-row">
                <div className="config-item">
                  <label>Sensibilidad</label>
                  <select
                    value={configuracionSensores.pir.sensibilidad}
                    onChange={(e) => setConfiguracionSensores(prev => ({
                      ...prev,
                      pir: { ...prev.pir, sensibilidad: e.target.value }
                    }))}
                    className="select-config"
                  >
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                  </select>
                </div>
                <div className="config-item">
                  <label>Tiempo Activación (seg)</label>
                  <input
                    type="number"
                    value={configuracionSensores.pir.tiempoActivacion}
                    onChange={(e) => setConfiguracionSensores(prev => ({
                      ...prev,
                      pir: { ...prev.pir, tiempoActivacion: parseInt(e.target.value) }
                    }))}
                    className="input-config"
                    min="5"
                    max="300"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ACS712 */}
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
              <span className="sensor-titulo">⚡ Sensor ACS712 (Corriente)</span>
            </label>
          </div>
          
          {configuracionSensores.acs712.habilitado && (
            <div className="sensor-config">
              <div className="config-row">
                <div className="config-item">
                  <label>Modelo</label>
                  <select
                    value={configuracionSensores.acs712.modelo}
                    onChange={(e) => setConfiguracionSensores(prev => ({
                      ...prev,
                      acs712: { ...prev.acs712, modelo: e.target.value }
                    }))}
                    className="select-config"
                  >
                    <option value="5A">ACS712-5A</option>
                    <option value="20A">ACS712-20A</option>
                    <option value="30A">ACS712-30A</option>
                  </select>
                </div>
                <div className="config-item">
                  <label>Alerta Máxima (A)</label>
                  <input
                    type="number"
                    value={configuracionSensores.acs712.alertaMaxima}
                    onChange={(e) => setConfiguracionSensores(prev => ({
                      ...prev,
                      acs712: { ...prev.acs712, alertaMaxima: parseFloat(e.target.value) }
                    }))}
                    className="input-config"
                    min="1"
                    max="30"
                    step="0.1"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // PASO 5: Confirmación
  const renderPasoConfirmacion = () => (
    <div className="paso-contenido">
      <div className="paso-header">
        <h3>✅ Confirmar Configuración</h3>
        <p>Revisa toda la configuración antes de guardar</p>
      </div>

      <div className="confirmacion-resumen">
        <div className="resumen-seccion">
          <h4>📱 Dispositivo</h4>
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
        </div>

        <div className="resumen-seccion">
          <h4>🌐 Red</h4>
          <div className="resumen-item">
            <span className="resumen-label">IP:</span>
            <span className="resumen-valor">
              {configuracionRed.ipNueva || datosDispositivo.ip}
            </span>
          </div>
          <div className="resumen-item">
            <span className="resumen-label">Puerto:</span>
            <span className="resumen-valor">{configuracionRed.puerto}</span>
          </div>
          <div className="resumen-item">
            <span className="resumen-label">Gateway:</span>
            <span className="resumen-valor">{configuracionRed.gateway}</span>
          </div>
        </div>

        <div className="resumen-seccion">
          <h4>🔬 Sensores</h4>
          <div className="sensores-resumen">
            <div className={`sensor-resumen-item ${configuracionSensores.ldr.habilitado ? 'habilitado' : 'deshabilitado'}`}>
              <span className="sensor-icon">💡</span>
              <span className="sensor-nombre">LDR</span>
              <span className="sensor-estado">
                {configuracionSensores.ldr.habilitado ? '✅ Habilitado' : '❌ Deshabilitado'}
              </span>
            </div>
            <div className={`sensor-resumen-item ${configuracionSensores.pir.habilitado ? 'habilitado' : 'deshabilitado'}`}>
              <span className="sensor-icon">👁️</span>
              <span className="sensor-nombre">PIR</span>
              <span className="sensor-estado">
                {configuracionSensores.pir.habilitado ? '✅ Habilitado' : '❌ Deshabilitado'}
              </span>
            </div>
            <div className={`sensor-resumen-item ${configuracionSensores.acs712.habilitado ? 'habilitado' : 'deshabilitado'}`}>
              <span className="sensor-icon">⚡</span>
              <span className="sensor-nombre">ACS712</span>
              <span className="sensor-estado">
                {configuracionSensores.acs712.habilitado ? '✅ Habilitado' : '❌ Deshabilitado'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="confirmacion-advertencia">
        <div className="advertencia-content">
          <span className="advertencia-icon">⚠️</span>
          <div>
            <strong>Importante:</strong>
            <p>Se enviará la configuración al dispositivo ESP32 y se guardará en Firebase. 
               Si se configuró una nueva IP, el dispositivo se reiniciará automáticamente.</p>
          </div>
        </div>
      </div>
    </div>
  );

  // Funciones del asistente

  const iniciarDeteccionAutomatica = async () => {
    setCargando(true);
    setError('');
    
    try {
      const dispositivos = await detectESP32InRange(
        deteccion.rangoIP.base,
        deteccion.rangoIP.inicio,
        deteccion.rangoIP.fin,
        {
          onProgress: (info) => {
            console.log(`Progreso: ${info.percentage}%`);
          },
          onDeviceFound: (dispositivo) => {
            console.log('Dispositivo encontrado:', dispositivo.ip);
          }
        }
      );

      if (dispositivos.success && dispositivos.devicesFound.length > 0) {
        setDeteccion(prev => ({
          ...prev,
          dispositivosEncontrados: dispositivos.devicesFound
        }));
      } else {
        setError('No se encontraron dispositivos ESP32 en el rango especificado');
      }
    } catch (error) {
      setError(`Error durante la detección: ${error.message}`);
    } finally {
      setCargando(false);
    }
  };

  const probarIPManual = async () => {
    setCargando(true);
    setError('');
    
    try {
      const resultado = await testESP32Connection(deteccion.ipManual, 80, 5000);
      
      if (resultado.success) {
        const dispositivo = {
          ip: deteccion.ipManual,
          puerto: 80,
          data: resultado.data,
          responseTime: resultado.responseTime
        };
        
        setDeteccion(prev => ({
          ...prev,
          dispositivosEncontrados: [dispositivo]
        }));
        
        seleccionarDispositivo(dispositivo);
      } else {
        setError(`No se pudo conectar con ${deteccion.ipManual}: ${resultado.error}`);
      }
    } catch (error) {
      setError(`Error probando IP: ${error.message}`);
    } finally {
      setCargando(false);
    }
  };

  const seleccionarDispositivo = (dispositivo) => {
    setDeteccion(prev => ({
      ...prev,
      dispositivoSeleccionado: dispositivo
    }));
    
    setDatosDispositivo({
      ip: dispositivo.ip,
      puerto: dispositivo.puerto,
      deviceId: dispositivo.data?.deviceId || `ESP32_${dispositivo.ip.replace(/\./g, '_')}`,
      firmwareVersion: dispositivo.data?.firmwareVersion || '1.0.0',
      hardware: dispositivo.data?.hardware || 'ESP32-WROOM-32',
      sensores: dispositivo.data?.sensors || {}
    });

    // Auto-rellenar algunos campos
    setIdentificacion(prev => ({
      ...prev,
      nombre: dispositivo.data?.deviceName || `Poste ${dispositivo.ip.split('.').pop()}`
    }));

    setConfiguracionRed(prev => ({
      ...prev,
      ipNueva: '', // Mantener IP actual por defecto
      puerto: dispositivo.puerto
    }));
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
      // Crear perfil del dispositivo
      const perfilDispositivo = createDeviceProfile(datosDispositivo);
      
      // Generar ID único
      const deviceId = `POSTE_${Date.now()}`;
      
      // Preparar datos completos
      const dispositivoCompleto = {
        ...perfilDispositivo,
        id: deviceId,
        nombre: identificacion.nombre,
        ubicacion: identificacion.ubicacion,
        zona: identificacion.zona,
        descripcion: identificacion.descripcion,
        red: {
          ip: configuracionRed.ipNueva || datosDispositivo.ip,
          puerto: configuracionRed.puerto,
          gateway: configuracionRed.gateway,
          subnet: configuracionRed.subnet,
          dns: configuracionRed.dns,
          protocolo: 'HTTP/1.1'
        },
        configuracion: {
          ldr: configuracionSensores.ldr,
          pir: configuracionSensores.pir,
          acs712: configuracionSensores.acs712
        }
      };

      // Crear en Firebase
      await firebaseService.createInitialPoste(deviceId);
      
      // Actualizar con configuración completa
      await firebaseService.updateDoc(`postes/${deviceId}`, dispositivoCompleto);

      // Si hay cambio de IP, enviarlo al ESP32
      if (configuracionRed.ipNueva && configuracionRed.ipNueva !== datosDispositivo.ip) {
        const httpManager = new HttpManager(datosDispositivo.ip, datosDispositivo.puerto);
        await httpManager.changeIPOnDevice(configuracionRed.ipNueva);
      }

      // Completar
      if (onCompletar) {
        onCompletar(dispositivoCompleto);
      }

      if (onCerrar) {
        onCerrar();
      }

    } catch (error) {
      setError(`Error guardando configuración: ${error.message}`);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="asistente-overlay">
      <div className="asistente-modal">
        <div className="asistente-header">
          <h2>🧙‍♂️ Asistente de Configuración</h2>
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
          {pasoActual === 3 && renderPasoRed()}
          {pasoActual === 4 && renderPasoSensores()}
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
              {cargando ? '💾 Guardando...' : '✅ Finalizar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AsistenteConfiguracion;