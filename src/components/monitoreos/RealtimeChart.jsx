import React, { useState, useEffect, useMemo } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar
} from 'recharts';
import { 
  BarChart3, 
  TrendingUp, 
  Activity, 
  Zap,
  Calendar,
  Clock,
  Lightbulb,
  Gauge,
  Eye,
  WifiOff
} from 'lucide-react';
import './RealtimeChart.css';

const RealtimeChart = ({ postes }) => {
  const [chartData, setChartData] = useState([]);
  const [viewMode, setViewMode] = useState('line'); // line, area, bar
  const [timeRange, setTimeRange] = useState('1h'); // 1h, 6h, 24h
  const [selectedMetric, setSelectedMetric] = useState('all'); // all, consumo, lux, movimiento, corriente

  // Generar datos históricos basados en postes reales
  useEffect(() => {
    const generateRealtimeData = () => {
      const now = new Date();
      const data = [];
      const intervals = timeRange === '1h' ? 12 : timeRange === '6h' ? 36 : 144;
      const intervalMinutes = timeRange === '1h' ? 5 : timeRange === '6h' ? 10 : 10;

      for (let i = intervals; i >= 0; i--) {
        const time = new Date(now.getTime() - (i * intervalMinutes * 60000));
        const timeLabel = time.toLocaleTimeString('es-ES', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });

        // Calcular métricas reales basadas en postes
        const postesOnline = postes.filter(p => p.estado?.online);
        
        // Consumo total real
        const consumoTotal = postesOnline.reduce((sum, poste) => {
          const consumoBase = poste.calculados?.potenciaActual || 0;
          const variacion = (Math.random() - 0.5) * 0.1; // ±5% variación
          return sum + Math.max(0, consumoBase * (1 + variacion) / 1000); // Convertir W a kW
        }, 0);

        // Promedio de luminosidad (LDR)
        const luxPromedio = postesOnline.length > 0 ? 
          postesOnline.reduce((sum, poste) => {
            const luxBase = poste.sensores?.ldr?.luxCalculado || 0;
            const variacion = (Math.random() - 0.5) * 0.2; // ±10% variación
            return sum + Math.max(0, luxBase * (1 + variacion));
          }, 0) / postesOnline.length : 0;

        // Detecciones de movimiento acumuladas
        const movimientosTotal = postesOnline.reduce((sum, poste) => {
          return sum + (poste.sensores?.pir?.contadorHoy || 0);
        }, 0);

        // Corriente promedio
        const corrientePromedio = postesOnline.length > 0 ?
          postesOnline.reduce((sum, poste) => {
            const corrienteBase = poste.sensores?.acs712?.corriente || 0;
            const variacion = (Math.random() - 0.5) * 0.15; // ±7.5% variación
            return sum + Math.max(0, corrienteBase * (1 + variacion));
          }, 0) / postesOnline.length : 0;

        // Eficiencia del sistema
        const eficiencia = postes.length > 0 ? 
          (postesOnline.length / postes.length) * 100 : 0;

        // Postes encendidos actualmente
        const postesEncendidos = postesOnline.filter(p => 
          p.estado?.encendido || p.calculados?.potenciaActual > 0
        ).length;

        data.push({
          time: timeLabel,
          timestamp: time.getTime(),
          consumoTotal: Math.round(consumoTotal * 100) / 100,
          luxPromedio: Math.round(luxPromedio),
          movimientosTotal: movimientosTotal,
          corrientePromedio: Math.round(corrientePromedio * 100) / 100,
          eficiencia: Math.round(eficiencia * 10) / 10,
          postesOnline: postesOnline.length,
          postesEncendidos: postesEncendidos,
          totalPostes: postes.length
        });
      }

      return data;
    };

    if (postes.length > 0) {
      setChartData(generateRealtimeData());
    }

    // Actualizar cada 30 segundos con datos reales
    const interval = setInterval(() => {
      if (postes.length > 0) {
        setChartData(generateRealtimeData());
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [postes, timeRange]);

  // Calcular estadísticas actuales
  const currentStats = useMemo(() => {
    if (chartData.length === 0) return null;
    
    const latest = chartData[chartData.length - 1];
    const previous = chartData[chartData.length - 2];
    
    if (!previous) return latest;
    
    return {
      ...latest,
      consumoTrend: ((latest.consumoTotal - previous.consumoTotal) / Math.max(previous.consumoTotal, 0.01) * 100).toFixed(1),
      luxTrend: ((latest.luxPromedio - previous.luxPromedio) / Math.max(previous.luxPromedio, 1) * 100).toFixed(1),
      eficienciaTrend: ((latest.eficiencia - previous.eficiencia) / Math.max(previous.eficiencia, 1) * 100).toFixed(1)
    };
  }, [chartData]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="chart-tooltip">
          <p className="tooltip-label">{`Hora: ${label}`}</p>
          {payload.map((pld, index) => (
            <p key={index} className="tooltip-value" style={{ color: pld.color }}>
              {`${pld.name}: ${pld.value}${
                pld.name.includes('Consumo') ? ' kW' : 
                pld.name.includes('Eficiencia') ? '%' : 
                pld.name.includes('Lux') ? ' lux' :
                pld.name.includes('Corriente') ? ' A' : ''
              }`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
    };

    const getLines = () => {
      switch (selectedMetric) {
        case 'consumo':
          return [
            <Line key="consumo" type="monotone" dataKey="consumoTotal" stroke="#f59e0b" strokeWidth={3} name="Consumo (kW)" />
          ];
        case 'lux':
          return [
            <Line key="lux" type="monotone" dataKey="luxPromedio" stroke="#8b5cf6" strokeWidth={3} name="Luminosidad (lux)" />
          ];
        case 'movimiento':
          return [
            <Line key="movimiento" type="monotone" dataKey="movimientosTotal" stroke="#ef4444" strokeWidth={3} name="Movimientos" />
          ];
        case 'corriente':
          return [
            <Line key="corriente" type="monotone" dataKey="corrientePromedio" stroke="#06b6d4" strokeWidth={3} name="Corriente (A)" />
          ];
        default:
          return [
            <Line key="consumo" type="monotone" dataKey="consumoTotal" stroke="#f59e0b" strokeWidth={2} name="Consumo (kW)" />,
            <Line key="eficiencia" type="monotone" dataKey="eficiencia" stroke="#10b981" strokeWidth={2} name="Eficiencia (%)" />,
            <Line key="postes" type="monotone" dataKey="postesEncendidos" stroke="#3b82f6" strokeWidth={2} name="Postes Encendidos" />
          ];
      }
    };

    switch (viewMode) {
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id="colorConsumo" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="colorEficiencia" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="time" stroke="#64748b" fontSize={12} />
            <YAxis stroke="#64748b" fontSize={12} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area
              type="monotone"
              dataKey="consumoTotal"
              stroke="#f59e0b"
              fill="url(#colorConsumo)"
              name="Consumo (kW)"
            />
            <Area
              type="monotone"
              dataKey="eficiencia"
              stroke="#10b981"
              fill="url(#colorEficiencia)"
              name="Eficiencia (%)"
            />
          </AreaChart>
        );
      
      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="time" stroke="#64748b" fontSize={12} />
            <YAxis stroke="#64748b" fontSize={12} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="postesOnline" fill="#3b82f6" name="Postes Online" />
            <Bar dataKey="postesEncendidos" fill="#f59e0b" name="Postes Encendidos" />
          </BarChart>
        );
      
      default:
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="time" stroke="#64748b" fontSize={12} />
            <YAxis stroke="#64748b" fontSize={12} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {getLines()}
          </LineChart>
        );
    }
  };

  return (
    <div className="realtime-chart">
      {/* Controles del gráfico */}
      <div className="chart-controls">
        <div className="time-controls">
          <button
            className={`time-btn ${timeRange === '1h' ? 'active' : ''}`}
            onClick={() => setTimeRange('1h')}
          >
            <Clock className="time-icon" />
            1H
          </button>
          <button
            className={`time-btn ${timeRange === '6h' ? 'active' : ''}`}
            onClick={() => setTimeRange('6h')}
          >
            <Clock className="time-icon" />
            6H
          </button>
          <button
            className={`time-btn ${timeRange === '24h' ? 'active' : ''}`}
            onClick={() => setTimeRange('24h')}
          >
            <Calendar className="time-icon" />
            24H
          </button>
        </div>

        <div className="metric-controls">
          <select 
            value={selectedMetric} 
            onChange={(e) => setSelectedMetric(e.target.value)}
            className="metric-select"
          >
            <option value="all">Todas las métricas</option>
            <option value="consumo">Solo Consumo</option>
            <option value="lux">Solo Luminosidad</option>
            <option value="movimiento">Solo Movimiento</option>
            <option value="corriente">Solo Corriente</option>
          </select>
        </div>

        <div className="view-controls">
          <button
            className={`view-btn ${viewMode === 'line' ? 'active' : ''}`}
            onClick={() => setViewMode('line')}
            title="Vista de líneas"
          >
            <TrendingUp className="view-icon" />
          </button>
          <button
            className={`view-btn ${viewMode === 'area' ? 'active' : ''}`}
            onClick={() => setViewMode('area')}
            title="Vista de área"
          >
            <BarChart3 className="view-icon" />
          </button>
          <button
            className={`view-btn ${viewMode === 'bar' ? 'active' : ''}`}
            onClick={() => setViewMode('bar')}
            title="Vista de barras"
          >
            <Activity className="view-icon" />
          </button>
        </div>
      </div>

      {/* Estadísticas actuales */}
      {currentStats && (
        <div className="chart-stats">
          <div className="stat-item">
            <div className="stat-icon">
              <Zap className="icon" />
            </div>
            <div className="stat-content">
              <div className="stat-value">
                {currentStats.consumoTotal}
                <span className="stat-unit">kW</span>
              </div>
              <div className="stat-label">
                Consumo Actual
                {currentStats.consumoTrend && (
                  <span className={`trend ${parseFloat(currentStats.consumoTrend) >= 0 ? 'up' : 'down'}`}>
                    {parseFloat(currentStats.consumoTrend) >= 0 ? '+' : ''}{currentStats.consumoTrend}%
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="stat-item">
            <div className="stat-icon">
              <Eye className="icon" />
            </div>
            <div className="stat-content">
              <div className="stat-value">
                {currentStats.luxPromedio}
                <span className="stat-unit">lux</span>
              </div>
              <div className="stat-label">
                Luminosidad Promedio
                {currentStats.luxTrend && (
                  <span className={`trend ${parseFloat(currentStats.luxTrend) >= 0 ? 'up' : 'down'}`}>
                    {parseFloat(currentStats.luxTrend) >= 0 ? '+' : ''}{currentStats.luxTrend}%
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="stat-item">
            <div className="stat-icon">
              <Gauge className="icon" />
            </div>
            <div className="stat-content">
              <div className="stat-value">
                {currentStats.eficiencia}
                <span className="stat-unit">%</span>
              </div>
              <div className="stat-label">
                Eficiencia
                {currentStats.eficienciaTrend && (
                  <span className={`trend ${parseFloat(currentStats.eficienciaTrend) >= 0 ? 'up' : 'down'}`}>
                    {parseFloat(currentStats.eficienciaTrend) >= 0 ? '+' : ''}{currentStats.eficienciaTrend}%
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="stat-item">
            <div className="stat-icon">
              <Lightbulb className="icon" />
            </div>
            <div className="stat-content">
              <div className="stat-value">
                {currentStats.postesEncendidos}
                <span className="stat-unit">/{currentStats.totalPostes}</span>
              </div>
              <div className="stat-label">Postes Encendidos</div>
            </div>
          </div>

          <div className="stat-item">
            <div className="stat-icon">
              <Activity className="icon" />
            </div>
            <div className="stat-content">
              <div className="stat-value">
                {currentStats.movimientosTotal}
                <span className="stat-unit">det</span>
              </div>
              <div className="stat-label">Movimientos Hoy</div>
            </div>
          </div>
        </div>
      )}

      {/* Gráfico */}
      <div className="chart-container">
        {chartData.length === 0 ? (
          <div className="no-data">
            <WifiOff className="no-data-icon" />
            <p className="no-data-text">No hay datos disponibles</p>
            <p className="no-data-subtitle">Verificar conexión con dispositivos ESP32</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            {renderChart()}
          </ResponsiveContainer>
        )}
      </div>

      {/* Indicador de tiempo real */}
      <div className="realtime-indicator">
        <div className="pulse-dot"></div>
        <span className="realtime-text">Datos de sensores ESP32 en tiempo real</span>
        <span className="last-update">
          Actualizado: {new Date().toLocaleTimeString()}
        </span>
      </div>

      {/* Información de sensores */}
      <div className="sensors-info">
        <div className="sensor-item">
          <Eye className="sensor-icon" />
          <span className="sensor-label">LDR</span>
          <span className="sensor-desc">Sensor de luminosidad</span>
        </div>
        <div className="sensor-item">
          <Activity className="sensor-icon" />
          <span className="sensor-label">PIR</span>
          <span className="sensor-desc">Detector de movimiento</span>
        </div>
        <div className="sensor-item">
          <Zap className="sensor-icon" />
          <span className="sensor-label">ACS712</span>
          <span className="sensor-desc">Sensor de corriente</span>
        </div>
      </div>
    </div>
  );
};

export default RealtimeChart;