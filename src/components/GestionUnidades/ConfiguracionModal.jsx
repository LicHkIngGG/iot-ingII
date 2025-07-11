import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Settings,
  Eye,
  Activity,
  Zap,
  Wifi,
  Clock,
  AlertTriangle,
  Cpu,
  HardDrive,
  CheckCircle,
  Info
} from 'lucide-react';

const ConfiguracionModal = ({ 
  visible, 
  config, 
  editMode, 
  postes, 
  configuraciones, 
  onSave, 
  onClose 
}) => {
  const [formData, setFormData] = useState(config || {});
  const [selectedPoste, setSelectedPoste] = useState(null);
  const [activeSection, setActiveSection] = useState('general');
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    if (config) {
      setFormData(config);
      if (config.posteId && !editMode) {
        const poste = postes.find(p => p.id === config.posteId);
        setSelectedPoste(poste);
      }
    }
  }, [config, postes, editMode]);

  // Validar formulario
  const validateForm = () => {
    const errors = {};

    if (!formData.posteId) {
      errors.posteId = 'Debe seleccionar un poste';
    }

    if (!formData.red?.ip) {
      errors.ip = 'Dirección IP requerida';
    } else if (!/^192\.168\.1\.\d{1,3}$/.test(formData.red.ip)) {
      errors.ip = 'IP debe estar en formato 192.168.1.xxx';
    }

    if (!formData.red?.puerto || formData.red.puerto < 1 || formData.red.puerto > 65535) {
      errors.puerto = 'Puerto debe estar entre 1 y 65535';
    }

    // Validar umbrales LDR
    if (formData.sensores?.ldr?.habilitado) {
      if (formData.sensores.ldr.umbralEncendido >= formData.sensores.ldr.umbralApagado) {
        errors.ldrUmbrales = 'Umbral de encendido debe ser menor que el de apagado';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Manejar cambios en campos generales
  const handleGeneralChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Manejar cambios en hardware
  const handleHardwareChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      hardware: {
        ...prev.hardware,
        [field]: value
      }
    }));
  };

  // Manejar cambios en red
  const handleRedChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      red: {
        ...prev.red,
        [field]: value
      }
    }));
  };

  // Manejar cambios en sensores
  const handleSensorChange = (sensor, field, value) => {
    setFormData(prev => ({
      ...prev,
      sensores: {
        ...prev.sensores,
        [sensor]: {
          ...prev.sensores[sensor],
          [field]: value
        }
      }
    }));
  };

  // Manejar cambios en automatización
  const handleAutomatizacionChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      automatizacion: {
        ...prev.automatizacion,
        [field]: value
      }
    }));
  };

  // Manejar cambios en reglas de automatización
  const handleReglasChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      automatizacion: {
        ...prev.automatizacion,
        reglas: {
          ...prev.automatizacion.reglas,
          [field]: value
        }
      }
    }));
  };

  // Manejar cambios en horarios
  const handleHorariosChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      automatizacion: {
        ...prev.automatizacion,
        horarios: {
          ...prev.automatizacion.horarios,
          [field]: value
        }
      }
    }));
  };

  // Manejar cambios en alertas
  const handleAlertasChange = (category, field, value) => {
    setFormData(prev => ({
      ...prev,
      alertas: {
        ...prev.alertas,
        [category]: {
          ...prev.alertas[category],
          [field]: value
        }
      }
    }));
  };

  // Seleccionar poste
  const handleSeleccionarPoste = (poste) => {
    setSelectedPoste(poste);
    setFormData(prev => ({
      ...prev,
      posteId: poste.id,
      nombrePoste: poste.nombre,
      ubicacion: poste.ubicacion,
      red: {
        ...prev.red,
        ip: generateNextIP()
      }
    }));
  };

  // Generar siguiente IP disponible
  const generateNextIP = () => {
    const usedIPs = configuraciones
      .map(config => config.red?.ip)
      .filter(ip => ip && ip.startsWith('192.168.1.'));
    
    for (let i = 100; i <= 200; i++) {
      const ip = `192.168.1.${i}`;
      if (!usedIPs.includes(ip)) {
        return ip;
      }
    }
    return '192.168.1.100';
  };

  // Manejar envío del formulario
  const handleSubmit = () => {
    if (validateForm()) {
      onSave(formData);
    }
  };

  if (!visible) return null;

  const postesDisponibles = postes.filter(poste => 
    !configuraciones.some(config => config.posteId === poste.id) || 
    (editMode && config.posteId === poste.id)
  );

  return (
    <div className="modal-overlay">
      <div className="modal-container large">
        <div className="modal-header">
          <div className="header-content">
            <Settings className="header-icon" />
            <h2 className="header-title">
              {editMode ? 'Editar Configuración' : 'Nueva Configuración'}
            </h2>
            {formData.posteId && (
              <span className="header-subtitle">
                {formData.nombrePoste || `Dispositivo ${formData.posteId}`}
              </span>
            )}
          </div>
          <button 
            className="close-button"
            onClick={onClose}
          >
            <X className="close-icon" />
          </button>
        </div>

        <div className="modal-body">
          {/* Navegación por secciones */}
          <div className="sections-nav">
            {[
              { key: 'general', label: 'General', icon: Settings },
              { key: 'hardware', label: 'Hardware', icon: Cpu },
              { key: 'red', label: 'Red', icon: Wifi },
              { key: 'sensores', label: 'Sensores', icon: Activity },
              { key: 'automatizacion', label: 'Automatización', icon: Clock },
              { key: 'alertas', label: 'Alertas', icon: AlertTriangle }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                className={`section-btn ${activeSection === key ? 'active' : ''}`}
                onClick={() => setActiveSection(key)}
              >
                <Icon className="section-icon" />
                {label}
              </button>
            ))}
          </div>

          {/* Contenido de secciones */}
          <div className="section-content">
            {/* Sección General */}
            {activeSection === 'general' && (
              <div className="config-section">
                <h3 className="section-title">Información General</h3>
                
                {!editMode && (
                  <div className="form-group">
                    <label className="form-label">Seleccionar Poste</label>
                    <div className="postes-grid">
                      {postesDisponibles.map(poste => (
                        <div
                          key={poste.id}
                          className={`poste-option ${selectedPoste?.id === poste.id ? 'selected' : ''}`}
                          onClick={() => handleSeleccionarPoste(poste)}
                        >
                          <div className="poste-header">
                            <h4 className="poste-name">{poste.nombre}</h4>
                            <span className={`poste-status ${poste.estado || 'unknown'}`}>
                              {poste.estado || 'Desconocido'}
                            </span>
                          </div>
                          <p className="poste-location">{poste.ubicacion}</p>
                          <span className="poste-id">ID: {poste.id}</span>
                        </div>
                      ))}
                    </div>
                    {postesDisponibles.length === 0 && (
                      <div className="no-postes">
                        <Info className="info-icon" />
                        <p>Todos los postes disponibles ya tienen configuración.</p>
                      </div>
                    )}
                    {validationErrors.posteId && (
                      <span className="error-message">{validationErrors.posteId}</span>
                    )}
                  </div>
                )}

                {(selectedPoste || editMode) && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Nombre del Dispositivo</label>
                      <input
                        type="text"
                        className="form-input"
                        value={formData.nombrePoste || ''}
                        onChange={(e) => handleGeneralChange('nombrePoste', e.target.value)}
                        placeholder="Nombre descriptivo del dispositivo"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Ubicación</label>
                      <input
                        type="text"
                        className="form-input"
                        value={formData.ubicacion || ''}
                        onChange={(e) => handleGeneralChange('ubicacion', e.target.value)}
                        placeholder="Ubicación física del dispositivo"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">ID del Dispositivo</label>
                      <input
                        type="text"
                        className="form-input disabled"
                        value={formData.posteId || ''}
                        disabled
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Sección Hardware */}
            {activeSection === 'hardware' && (selectedPoste || editMode) && (
              <div className="config-section">
                <h3 className="section-title">Configuración de Hardware</h3>
                
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Modelo ESP32</label>
                    <select
                      className="form-select"
                      value={formData.hardware?.modelo || 'ESP32-WROOM-32'}
                      onChange={(e) => handleHardwareChange('modelo', e.target.value)}
                    >
                      <option value="ESP32-WROOM-32">ESP32-WROOM-32</option>
                      <option value="ESP32-WROVER">ESP32-WROVER</option>
                      <option value="ESP32-S2">ESP32-S2</option>
                      <option value="ESP32-S3">ESP32-S3</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Tipo de LED</label>
                    <select
                      className="form-select"
                      value={formData.hardware?.tipoLED || '60W'}
                      onChange={(e) => handleHardwareChange('tipoLED', e.target.value)}
                    >
                      <option value="30W">LED 30W</option>
                      <option value="60W">LED 60W</option>
                      <option value="100W">LED 100W</option>
                      <option value="150W">LED 150W</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Número de Serie</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.hardware?.numeroSerie || ''}
                      onChange={(e) => handleHardwareChange('numeroSerie', e.target.value)}
                      placeholder="Serie del dispositivo"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Versión de Firmware</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.hardware?.versionFirmware || '1.0.0'}
                      onChange={(e) => handleHardwareChange('versionFirmware', e.target.value)}
                      placeholder="1.0.0"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Sección Red */}
            {activeSection === 'red' && (selectedPoste || editMode) && (
              <div className="config-section">
                <h3 className="section-title">Configuración de Red</h3>
                
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Dirección IP *</label>
                    <input
                      type="text"
                      className={`form-input ${validationErrors.ip ? 'error' : ''}`}
                      value={formData.red?.ip || ''}
                      onChange={(e) => handleRedChange('ip', e.target.value)}
                      placeholder="192.168.1.100"
                    />
                    {validationErrors.ip && (
                      <span className="error-message">{validationErrors.ip}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Puerto *</label>
                    <input
                      type="number"
                      className={`form-input ${validationErrors.puerto ? 'error' : ''}`}
                      value={formData.red?.puerto || 8080}
                      onChange={(e) => handleRedChange('puerto', parseInt(e.target.value))}
                      min="1"
                      max="65535"
                    />
                    {validationErrors.puerto && (
                      <span className="error-message">{validationErrors.puerto}</span>
                    )}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Gateway</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.red?.gateway || '192.168.1.1'}
                      onChange={(e) => handleRedChange('gateway', e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Máscara de Subred</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.red?.subnet || '255.255.255.0'}
                      onChange={(e) => handleRedChange('subnet', e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">DNS</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.red?.dns || '8.8.8.8'}
                      onChange={(e) => handleRedChange('dns', e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Timeout (ms)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.red?.timeout || 5000}
                      onChange={(e) => handleRedChange('timeout', parseInt(e.target.value))}
                      min="1000"
                      max="30000"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Intervalo de Envío (segundos)</label>
                  <input
                    type="range"
                    className="form-range"
                    min="10"
                    max="300"
                    value={formData.red?.intervaloEnvio || 30}
                    onChange={(e) => handleRedChange('intervaloEnvio', parseInt(e.target.value))}
                  />
                  <span className="range-value">{formData.red?.intervaloEnvio || 30} segundos</span>
                </div>

                <div className="form-group">
                  <label className="form-label">Dirección MAC</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.red?.mac || ''}
                    onChange={(e) => handleRedChange('mac', e.target.value)}
                    placeholder="AA:BB:CC:DD:EE:FF"
                  />
                </div>
              </div>
            )}

            {/* Sección Sensores */}
            {activeSection === 'sensores' && (selectedPoste || editMode) && (
              <div className="config-section">
                <h3 className="section-title">Configuración de Sensores</h3>
                
                {/* Sensor LDR */}
                <div className="sensor-config-group">
                  <div className="sensor-header">
                    <div className="sensor-title">
                      <Eye className="sensor-icon" />
                      <h4>Sensor LDR (Luminosidad)</h4>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={formData.sensores?.ldr?.habilitado || false}
                        onChange={(e) => handleSensorChange('ldr', 'habilitado', e.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  {formData.sensores?.ldr?.habilitado && (
                    <div className="sensor-controls">
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">Umbral de Encendido</label>
                          <input
                            type="range"
                            className="form-range"
                            min="0"
                            max="1023"
                            value={formData.sensores.ldr.umbralEncendido || 100}
                            onChange={(e) => handleSensorChange('ldr', 'umbralEncendido', parseInt(e.target.value))}
                          />
                          <span className="range-value">{formData.sensores.ldr.umbralEncendido || 100} lux</span>
                        </div>

                        <div className="form-group">
                          <label className="form-label">Umbral de Apagado</label>
                          <input
                            type="range"
                            className="form-range"
                            min="0"
                            max="1023"
                            value={formData.sensores.ldr.umbralApagado || 300}
                            onChange={(e) => handleSensorChange('ldr', 'umbralApagado', parseInt(e.target.value))}
                          />
                          <span className="range-value">{formData.sensores.ldr.umbralApagado || 300} lux</span>
                        </div>
                      </div>

                      {validationErrors.ldrUmbrales && (
                        <span className="error-message">{validationErrors.ldrUmbrales}</span>
                      )}

                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">Factor de Calibración</label>
                          <input
                            type="number"
                            className="form-input"
                            min="0.1"
                            max="5.0"
                            step="0.1"
                            value={formData.sensores.ldr.factorCalibracion || 1.0}
                            onChange={(e) => handleSensorChange('ldr', 'factorCalibracion', parseFloat(e.target.value))}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">Filtro de Ruido</label>
                          <input
                            type="range"
                            className="form-range"
                            min="1"
                            max="20"
                            value={formData.sensores.ldr.filtroRuido || 5}
                            onChange={(e) => handleSensorChange('ldr', 'filtroRuido', parseInt(e.target.value))}
                          />
                          <span className="range-value">{formData.sensores.ldr.filtroRuido || 5}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sensor PIR */}
                <div className="sensor-config-group">
                  <div className="sensor-header">
                    <div className="sensor-title">
                      <Activity className="sensor-icon" />
                      <h4>Sensor PIR (Movimiento)</h4>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={formData.sensores?.pir?.habilitado || false}
                        onChange={(e) => handleSensorChange('pir', 'habilitado', e.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  {formData.sensores?.pir?.habilitado && (
                    <div className="sensor-controls">
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">Sensibilidad</label>
                          <select
                            className="form-select"
                            value={formData.sensores.pir.sensibilidad || 'media'}
                            onChange={(e) => handleSensorChange('pir', 'sensibilidad', e.target.value)}
                          >
                            <option value="baja">Baja</option>
                            <option value="media">Media</option>
                            <option value="alta">Alta</option>
                          </select>
                        </div>

                        <div className="form-group">
                          <label className="form-label">Tiempo de Activación (segundos)</label>
                          <input
                            type="number"
                            className="form-input"
                            min="5"
                            max="300"
                            value={formData.sensores.pir.tiempoActivacion || 30}
                            onChange={(e) => handleSensorChange('pir', 'tiempoActivacion', parseInt(e.target.value))}
                          />
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">Rango de Detección (metros)</label>
                          <input
                            type="range"
                            className="form-range"
                            min="1"
                            max="10"
                            value={formData.sensores.pir.rangoDeteccion || 5}
                            onChange={(e) => handleSensorChange('pir', 'rangoDeteccion', parseInt(e.target.value))}
                          />
                          <span className="range-value">{formData.sensores.pir.rangoDeteccion || 5}m</span>
                        </div>

                        <div className="form-group">
                          <label className="form-label">Retardo de Lectura (segundos)</label>
                          <input
                            type="number"
                            className="form-input"
                            min="1"
                            max="10"
                            value={formData.sensores.pir.retardoLectura || 2}
                            onChange={(e) => handleSensorChange('pir', 'retardoLectura', parseInt(e.target.value))}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sensor ACS712 */}
                <div className="sensor-config-group">
                  <div className="sensor-header">
                    <div className="sensor-title">
                      <Zap className="sensor-icon" />
                      <h4>Sensor ACS712 (Corriente)</h4>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={formData.sensores?.acs712?.habilitado || false}
                        onChange={(e) => handleSensorChange('acs712', 'habilitado', e.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  {formData.sensores?.acs712?.habilitado && (
                    <div className="sensor-controls">
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">Modelo ACS712</label>
                          <select
                            className="form-select"
                            value={formData.sensores.acs712.modelo || '20A'}
                            onChange={(e) => handleSensorChange('acs712', 'modelo', e.target.value)}
                          >
                            <option value="5A">ACS712-5A (185mV/A)</option>
                            <option value="20A">ACS712-20A (100mV/A)</option>
                            <option value="30A">ACS712-30A (66mV/A)</option>
                          </select>
                        </div>

                        <div className="form-group">
                          <label className="form-label">Voltaje de Referencia</label>
                          <input
                            type="number"
                            className="form-input"
                            min="1.0"
                            max="5.0"
                            step="0.1"
                            value={formData.sensores.acs712.voltajeReferencia || 2.5}
                            onChange={(e) => handleSensorChange('acs712', 'voltajeReferencia', parseFloat(e.target.value))}
                          />
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">Sensibilidad (mV/A)</label>
                          <input
                            type="number"
                            className="form-input"
                            min="50"
                            max="200"
                            value={formData.sensores.acs712.sensibilidad || 100}
                            onChange={(e) => handleSensorChange('acs712', 'sensibilidad', parseInt(e.target.value))}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">Filtro Promedio</label>
                          <input
                            type="range"
                            className="form-range"
                            min="1"
                            max="50"
                            value={formData.sensores.acs712.filtroPromedio || 10}
                            onChange={(e) => handleSensorChange('acs712', 'filtroPromedio', parseInt(e.target.value))}
                          />
                          <span className="range-value">{formData.sensores.acs712.filtroPromedio || 10} muestras</span>
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Alerta Corriente Máxima (A)</label>
                        <input
                          type="number"
                          className="form-input"
                          min="1"
                          max="30"
                          step="0.1"
                          value={formData.sensores.acs712.alertaMaxima || 20}
                          onChange={(e) => handleSensorChange('acs712', 'alertaMaxima', parseFloat(e.target.value))}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sección Automatización */}
            {activeSection === 'automatizacion' && (selectedPoste || editMode) && (
              <div className="config-section">
                <h3 className="section-title">Configuración de Automatización</h3>
                
                <div className="form-group">
                  <div className="checkbox-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.automatizacion?.habilitada || false}
                        onChange={(e) => handleAutomatizacionChange('habilitada', e.target.checked)}
                      />
                      <span className="checkbox-text">Automatización Habilitada</span>
                    </label>
                  </div>
                </div>

                {formData.automatizacion?.habilitada && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Modo de Automatización</label>
                      <select
                        className="form-select"
                        value={formData.automatizacion.modo || 'inteligente'}
                        onChange={(e) => handleAutomatizacionChange('modo', e.target.value)}
                      >
                        <option value="manual">Manual</option>
                        <option value="horario">Por Horario</option>
                        <option value="sensores">Por Sensores</option>
                        <option value="inteligente">Inteligente (Sensores + Horario)</option>
                      </select>
                    </div>

                    <div className="automation-rules">
                      <h4 className="subsection-title">Reglas de Automatización</h4>
                      <div className="checkbox-group">
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={formData.automatizacion.reglas?.ldrAutomatico || false}
                            onChange={(e) => handleReglasChange('ldrAutomatico', e.target.checked)}
                          />
                          <span className="checkbox-text">Control automático por LDR</span>
                        </label>

                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={formData.automatizacion.reglas?.pirAutomatico || false}
                            onChange={(e) => handleReglasChange('pirAutomatico', e.target.checked)}
                          />
                          <span className="checkbox-text">Activación por movimiento (PIR)</span>
                        </label>

                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={formData.automatizacion.reglas?.horarioFijo || false}
                            onChange={(e) => handleReglasChange('horarioFijo', e.target.checked)}
                          />
                          <span className="checkbox-text">Horarios fijos</span>
                        </label>

                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={formData.automatizacion.reglas?.sobreescribirManual || false}
                            onChange={(e) => handleReglasChange('sobreescribirManual', e.target.checked)}
                          />
                          <span className="checkbox-text">Permitir sobreescribir control manual</span>
                        </label>
                      </div>
                    </div>

                    <div className="automation-schedule">
                      <h4 className="subsection-title">Configuración de Horarios</h4>
                      <div className="checkbox-group">
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={formData.automatizacion.horarios?.habilitado || false}
                            onChange={(e) => handleHorariosChange('habilitado', e.target.checked)}
                          />
                          <span className="checkbox-text">Horarios habilitados</span>
                        </label>
                      </div>

                      {formData.automatizacion.horarios?.habilitado && (
                        <>
                          <div className="form-row">
                            <div className="form-group">
                              <label className="form-label">Encendido Forzado</label>
                              <input
                                type="time"
                                className="form-input"
                                value={formData.automatizacion.horarios.encendidoForzado || '18:00'}
                                onChange={(e) => handleHorariosChange('encendidoForzado', e.target.value)}
                              />
                            </div>

                            <div className="form-group">
                              <label className="form-label">Apagado Forzado</label>
                              <input
                                type="time"
                                className="form-input"
                                value={formData.automatizacion.horarios.apagadoForzado || '06:00'}
                                onChange={(e) => handleHorariosChange('apagadoForzado', e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="dimmer-config">
                            <div className="checkbox-group">
                              <label className="checkbox-label">
                                <input
                                  type="checkbox"
                                  checked={formData.automatizacion.horarios.dimmerNocturno?.habilitado || false}
                                  onChange={(e) => handleHorariosChange('dimmerNocturno', {
                                    ...formData.automatizacion.horarios.dimmerNocturno,
                                    habilitado: e.target.checked
                                  })}
                                />
                                <span className="checkbox-text">Dimmer Nocturno</span>
                              </label>
                            </div>

                            {formData.automatizacion.horarios.dimmerNocturno?.habilitado && (
                              <div className="form-row">
                                <div className="form-group">
                                  <label className="form-label">Hora de Dimmer</label>
                                  <input
                                    type="time"
                                    className="form-input"
                                    value={formData.automatizacion.horarios.dimmerNocturno.hora || '22:00'}
                                    onChange={(e) => handleHorariosChange('dimmerNocturno', {
                                      ...formData.automatizacion.horarios.dimmerNocturno,
                                      hora: e.target.value
                                    })}
                                  />
                                </div>

                                <div className="form-group">
                                  <label className="form-label">Intensidad (%)</label>
                                  <input
                                    type="range"
                                    className="form-range"
                                    min="10"
                                    max="100"
                                    value={formData.automatizacion.horarios.dimmerNocturno.intensidad || 60}
                                    onChange={(e) => handleHorariosChange('dimmerNocturno', {
                                      ...formData.automatizacion.horarios.dimmerNocturno,
                                      intensidad: parseInt(e.target.value)
                                    })}
                                  />
                                  <span className="range-value">
                                    {formData.automatizacion.horarios.dimmerNocturno.intensidad || 60}%
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Sección Alertas */}
            {activeSection === 'alertas' && (selectedPoste || editMode) && (
              <div className="config-section">
                <h3 className="section-title">Configuración de Alertas</h3>
                
                <div className="form-group">
                  <div className="checkbox-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.alertas?.habilitadas || false}
                        onChange={(e) => handleAlertasChange('', 'habilitadas', e.target.checked)}
                      />
                      <span className="checkbox-text">Alertas Habilitadas</span>
                    </label>
                  </div>
                </div>

                {formData.alertas?.habilitadas && (
                  <>
                    <div className="alerts-types">
                      <h4 className="subsection-title">Tipos de Alertas</h4>
                      <div className="checkbox-group">
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={formData.alertas.tipos?.desconexion || false}
                            onChange={(e) => handleAlertasChange('tipos', 'desconexion', e.target.checked)}
                          />
                          <span className="checkbox-text">Alerta por desconexión</span>
                        </label>

                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={formData.alertas.tipos?.sensorFalla || false}
                            onChange={(e) => handleAlertasChange('tipos', 'sensorFalla', e.target.checked)}
                          />
                          <span className="checkbox-text">Alerta por falla de sensores</span>
                        </label>

                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={formData.alertas.tipos?.consumoAnormal || false}
                            onChange={(e) => handleAlertasChange('tipos', 'consumoAnormal', e.target.checked)}
                          />
                          <span className="checkbox-text">Alerta por consumo anormal</span>
                        </label>

                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={formData.alertas.tipos?.voltajeBajo || false}
                            onChange={(e) => handleAlertasChange('tipos', 'voltajeBajo', e.target.checked)}
                          />
                          <span className="checkbox-text">Alerta por voltaje bajo</span>
                        </label>
                      </div>
                    </div>

                    <div className="alerts-thresholds">
                      <h4 className="subsection-title">Umbrales de Alertas</h4>
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">Tiempo de Desconexión (segundos)</label>
                          <input
                            type="number"
                            className="form-input"
                            min="60"
                            max="3600"
                            value={formData.alertas.umbrales?.tiempoDesconexion || 300}
                            onChange={(e) => handleAlertasChange('umbrales', 'tiempoDesconexion', parseInt(e.target.value))}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">Consumo Máximo (W)</label>
                          <input
                            type="number"
                            className="form-input"
                            min="50"
                            max="1000"
                            value={formData.alertas.umbrales?.consumoMaximo || 400}
                            onChange={(e) => handleAlertasChange('umbrales', 'consumoMaximo', parseInt(e.target.value))}
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Voltaje Mínimo (V)</label>
                        <input
                          type="number"
                          className="form-input"
                          min="100"
                          max="250"
                          value={formData.alertas.umbrales?.voltajeMinimo || 200}
                          onChange={(e) => handleAlertasChange('umbrales', 'voltajeMinimo', parseInt(e.target.value))}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button 
            className="btn-secondary"
            onClick={onClose}
          >
            Cancelar
          </button>
          
          <button 
            className="btn-primary"
            onClick={handleSubmit}
            disabled={!formData.posteId}
          >
            <Save className="btn-icon" />
            {editMode ? 'Actualizar Configuración' : 'Guardar Configuración'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfiguracionModal;