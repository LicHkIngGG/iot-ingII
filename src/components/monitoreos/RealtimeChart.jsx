// components/Monitoreo/RealtimeChart.jsx
import React, { useState, useEffect } from 'react';
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
  Area
} from 'recharts';
import { 
  BarChart3, 
  TrendingUp, 
  Activity, 
  Zap,
  Calendar,
  Clock
} from 'lucide-react';
import './RealtimeChart.css';

const RealtimeChart = ({ postes }) => {
  const [chartData, setChartData] = useState([]);
  const [viewMode, setViewMode] = useState('line'); // line, area, bar
  const [timeRange, setTimeRange] = useState('1h'); // 1h, 6h, 24h

  useEffect(() => {
    // Generar datos en tiempo real
    const generateRealtimeData = () => {
      const now = new Date();
      const data = [];
      const intervals = timeRange === '1h' ? 12 : timeRange === '6h' ? 36 : 144; // Puntos de datos
      const intervalMinutes = timeRange === '1h' ? 5 : timeRange === '6h' ? 10 : 10;

      for (let i = intervals; i >= 0; i--) {
        const time = new Date(now.getTime() - (i * intervalMinutes * 60000));
        const timeLabel = time.toLocaleTimeString('es-ES', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });

        // Calcular consumo total basado en postes activos
        const postesOnline = postes.filter(p => p.estado === 'online');
        const consumoBase = postesOnline.reduce((sum, p) => sum + (p.consumoActual || 0), 0);
        
        // Agregar variación realista
        const variacion = (Math.random() - 0.5) * 0.2; // ±10%
        const consumoTotal = Math.max(0, consumoBase * (1 + variacion));
        
        // Calcular eficiencia
        const eficiencia = postesOnline.length > 0 ? 
          Math.min(100, 85 + Math.random() * 15) : 0;

        data.push({
          time: timeLabel,
          timestamp: time.getTime(),
          consumoTotal: Math.round(consumoTotal),
          eficiencia: Math.round(eficiencia * 10) / 10,
          postesActivos: postesOnline.length,
          totalPostes: postes.length
        });
      }

      return data;
    };

    setChartData(generateRealtimeData());

    // Actualizar cada 30 segundos
    const interval = setInterval(() => {
      setChartData(generateRealtimeData());
    }, 30000);

    return () => clearInterval(interval);
  }, [postes, timeRange]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="chart-tooltip">
          <p className="tooltip-label">{`Hora: ${label}`}</p>
          {payload.map((pld, index) => (
            <p key={index} className="tooltip-value" style={{ color: pld.color }}>
              {`${pld.name}: ${pld.value}${pld.name.includes('Consumo') ? ' kWh' : 
                pld.name.includes('Eficiencia') ? '%' : ''}`}
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

    switch (viewMode) {
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id="colorConsumo" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="colorEficiencia" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis 
              dataKey="time" 
              stroke="#64748b"
              fontSize={12}
              tick={{ fill: '#64748b' }}
            />
            <YAxis 
              stroke="#64748b"
              fontSize={12}
              tick={{ fill: '#64748b' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area
              type="monotone"
              dataKey="consumoTotal"
              stroke="#3b82f6"
              fillOpacity={1}
              fill="url(#colorConsumo)"
              name="Consumo Total"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="eficiencia"
              stroke="#10b981"
              fillOpacity={1}
              fill="url(#colorEficiencia)"
              name="Eficiencia"
              strokeWidth={2}
            />
          </AreaChart>
        );
      
      default:
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis 
              dataKey="time" 
              stroke="#64748b"
              fontSize={12}
              tick={{ fill: '#64748b' }}
            />
            <YAxis 
              stroke="#64748b"
              fontSize={12}
              tick={{ fill: '#64748b' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="consumoTotal"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: '#3b82f6' }}
              name="Consumo Total"
            />
            <Line
              type="monotone"
              dataKey="eficiencia"
              stroke="#10b981"
              strokeWidth={3}
              dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: '#10b981' }}
              name="Eficiencia"
            />
            <Line
              type="monotone"
              dataKey="postesActivos"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ fill: '#f59e0b', strokeWidth: 2, r: 3 }}
              activeDot={{ r: 5, fill: '#f59e0b' }}
              name="Postes Activos"
            />
          </LineChart>
        );
    }
  };

  const getCurrentStats = () => {
    if (chartData.length === 0) return null;
    
    const latest = chartData[chartData.length - 1];
    const previous = chartData[chartData.length - 2];
    
    if (!previous) return latest;
    
    return {
      ...latest,
      consumoTrend: latest.consumoTotal - previous.consumoTotal,
      eficienciaTrend: latest.eficiencia - previous.eficiencia
    };
  };

  const stats = getCurrentStats();

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
        </div>
      </div>

      {/* Estadísticas actuales */}
      {stats && (
        <div className="chart-stats">
          <div className="stat-item">
            <div className="stat-value">
              {stats.consumoTotal}
              <span className="stat-unit">kWh</span>
            </div>
            <div className="stat-label">
              Consumo Actual
              {stats.consumoTrend !== undefined && (
                <span className={`trend ${stats.consumoTrend >= 0 ? 'up' : 'down'}`}>
                  {stats.consumoTrend >= 0 ? '+' : ''}{stats.consumoTrend.toFixed(1)}
                </span>
              )}
            </div>
          </div>
          
          <div className="stat-item">
            <div className="stat-value">
              {stats.eficiencia}
              <span className="stat-unit">%</span>
            </div>
            <div className="stat-label">
              Eficiencia
              {stats.eficienciaTrend !== undefined && (
                <span className={`trend ${stats.eficienciaTrend >= 0 ? 'up' : 'down'}`}>
                  {stats.eficienciaTrend >= 0 ? '+' : ''}{stats.eficienciaTrend.toFixed(1)}%
                </span>
              )}
            </div>
          </div>

          <div className="stat-item">
            <div className="stat-value">
              {stats.postesActivos}
              <span className="stat-unit">/{stats.totalPostes}</span>
            </div>
            <div className="stat-label">Postes Online</div>
          </div>
        </div>
      )}

      {/* Gráfico */}
      <div className="chart-container">
        <ResponsiveContainer width="100%" height={300}>
          {renderChart()}
        </ResponsiveContainer>
      </div>

      {/* Indicador de tiempo real */}
      <div className="realtime-indicator">
        <div className="pulse-dot"></div>
        <span className="realtime-text">Datos en tiempo real</span>
        <span className="last-update">
          Actualizado: {new Date().toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
};

export default RealtimeChart;