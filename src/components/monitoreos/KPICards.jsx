// components/Monitoreo/KPICards.jsx
import React from 'react';
import { 
  Zap, 
  Lightbulb, 
  Activity, 
  TrendingUp,
  TrendingDown,
  Gauge
} from 'lucide-react';
import './KPICards.css';

const KPICard = ({ title, value, unit, icon: Icon, trend, color = 'blue', subtitle }) => {
  return (
    <div className={`kpi-card kpi-card-${color}`}>
      <div className="kpi-card-content">
        <div className="kpi-icon-container">
          <Icon className="kpi-icon" />
        </div>
        <div className="kpi-info">
          <h3 className="kpi-title">{title}</h3>
          <div className="kpi-value">
            <span className="kpi-number">{value}</span>
            <span className="kpi-unit">{unit}</span>
          </div>
          {subtitle && <p className="kpi-subtitle">{subtitle}</p>}
        </div>
      </div>
      {trend !== null && trend !== undefined && (
        <div className={`kpi-trend ${trend > 0 ? 'trend-up' : trend < 0 ? 'trend-down' : 'trend-neutral'}`}>
          {trend > 0 ? <TrendingUp className="trend-icon" /> : 
           trend < 0 ? <TrendingDown className="trend-icon" /> : 
           <Activity className="trend-icon" />}
          <span className="trend-value">
            {trend === 0 ? 'Estable' : `${Math.abs(trend)}%`}
          </span>
        </div>
      )}
    </div>
  );
};

const KPICards = ({ kpis }) => {
  const { consumoTotal, postesActivos, totalPostes, eficiencia } = kpis;

  return (
    <div className="kpi-cards-container">
      <KPICard
        title="Consumo Total"
        value={consumoTotal.toLocaleString()}
        unit="kWh"
        icon={Zap}
        color="yellow"
        trend={2.5}
        subtitle="Últimas 24 horas"
      />
      
      <KPICard
        title="Postes Activos"
        value={postesActivos}
        unit={`de ${totalPostes}`}
        icon={Lightbulb}
        color="green"
        trend={postesActivos === totalPostes ? 0 : -1.2}
        subtitle="Estado actual"
      />
      
      <KPICard
        title="Eficiencia"
        value={eficiencia.toFixed(1)}
        unit="%"
        icon={Gauge}
        color="blue"
        trend={eficiencia > 90 ? 1.8 : -0.5}
        subtitle="Rendimiento del sistema"
      />
      
      <KPICard
        title="Estado Sistema"
        value={postesActivos > 0 ? "Online" : "Offline"}
        unit=""
        icon={Activity}
        color={postesActivos > 0 ? "green" : "red"}
        trend={null}
        subtitle={`${postesActivos} dispositivos conectados`}
      />
    </div>
  );
};

export default KPICards;