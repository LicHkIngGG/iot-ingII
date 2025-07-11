import React, { useState, useEffect, useMemo } from 'react';
import {
  Zap,
  Lightbulb,
  Activity,
  TrendingUp,
  TrendingDown,
  Gauge,
  DollarSign,
  Clock,
  Wifi,
  AlertTriangle,
  Power,
  Calculator
} from 'lucide-react';
import './KPICards.css';

const KPICard = ({ 
  title, 
  value, 
  unit, 
  icon: Icon, 
  trend, 
  color = 'blue', 
  subtitle, 
  calculation,
  isLoading = false 
}) => {
  return (
    <div className={`kpi-card kpi-card-${color}`}>
      <div className="kpi-card-content">
        <div className="kpi-icon-container">
          <Icon className="kpi-icon" />
        </div>
        <div className="kpi-info">
          <h3 className="kpi-title">{title}</h3>
          <div className="kpi-value">
            {isLoading ? (
              <span className="kpi-number loading">--</span>
            ) : (
              <span className="kpi-number">{value}</span>
            )}
            <span className="kpi-unit">{unit}</span>
          </div>
          {subtitle && <p className="kpi-subtitle">{subtitle}</p>}
          {calculation && (
            <div className="kpi-calculation">
              <Calculator className="calc-icon" />
              {calculation}
            </div>
          )}
        </div>
      </div>
      {trend !== null && trend !== undefined && !isLoading && (
        <div className={`kpi-trend ${trend > 0 ? 'trend-up' : trend < 0 ? 'trend-down' : 'trend-neutral'}`}>
          {trend > 0 ? <TrendingUp className="trend-icon" /> :
           trend < 0 ? <TrendingDown className="trend-icon" /> :
           <Activity className="trend-icon" />}
          <span className="trend-value">
            {trend === 0 ? 'Estable' : `${trend > 0 ? '+' : ''}${trend}%`}
          </span>
        </div>
      )}
    </div>
  );
};

const KPICards = ({ postes = [], isLoading = false }) => {
  const [historicalData, setHistoricalData] = useState([]);
  const [tarifaElectrica] = useState(0.80); // BOB por kWh

  // Generar datos históricos para tendencias
  useEffect(() => {
    const generateHistoricalPoint = () => {
      const activePostes = postes.filter(p => 
        p.estado?.online || p.estado === 'online'
      );
      const totalConsumption = activePostes.reduce((sum, poste) => {
        return sum + (poste.calculados?.consumoHoy || poste.consumoActual || 0);
      }, 0);
      
      return {
        timestamp: Date.now(),
        consumo: totalConsumption,
        postesActivos: activePostes.length,
        eficiencia: activePostes.length > 0 ? (activePostes.length / postes.length) * 100 : 0
      };
    };

    // Actualizar cada 30 segundos
    const interval = setInterval(() => {
      setHistoricalData(prev => {
        const newData = [...prev, generateHistoricalPoint()];
        return newData.slice(-10); // Mantener últimos 10 puntos
      });
    }, 30000);

    // Punto inicial
    if (postes.length > 0) {
      setHistoricalData([generateHistoricalPoint()]);
    }

    return () => clearInterval(interval);
  }, [postes]);

  // Cálculos principales
  const kpis = useMemo(() => {
    if (!postes || postes.length === 0) {
      return {
        consumoTotal: 0,
        postesActivos: 0,
        totalPostes: 0,
        eficiencia: 0,
        costoTotal: 0,
        tiempoEncendidoPromedio: 0,
        potenciaInstalada: 0,
        alertasActivas: 0
      };
    }

    // Postes online
    const postesOnline = postes.filter(poste => 
      poste.estado?.online || poste.estado === 'online'
    );

    // Consumo total del día
    const consumoTotal = postes.reduce((sum, poste) => {
      return sum + (poste.calculados?.consumoHoy || poste.consumoActual || 0);
    }, 0);

    // Costo total
    const costoTotal = postes.reduce((sum, poste) => {
      const consumo = poste.calculados?.consumoHoy || 0;
      const costo = poste.calculados?.costoHoy || (consumo * tarifaElectrica);
      return sum + costo;
    }, 0);

    // Tiempo promedio encendido (convertir minutos a horas)
    const tiempoEncendidoPromedio = postes.reduce((sum, poste) => {
      return sum + (poste.calculados?.tiempoEncendidoHoy || 0);
    }, 0) / Math.max(postes.length, 1) / 60;

    // Potencia instalada total
    const potenciaInstalada = postes.reduce((sum, poste) => {
      const potencia = poste.hardware?.tipoLED ? 
        parseInt(poste.hardware.tipoLED.replace(/\D/g, '')) || 60 : 60;
      return sum + potencia;
    }, 0);

    // Contar alertas activas
    const alertasActivas = postes.reduce((count, poste) => {
      let alertas = 0;
      
      // Poste offline
      if (!poste.estado?.online && poste.estado !== 'online') alertas++;
      
      // Sensores no funcionando
      if (poste.sensores) {
        if (poste.sensores.ldr && !poste.sensores.ldr.funcionando) alertas++;
        if (poste.sensores.pir && !poste.sensores.pir.funcionando) alertas++;
        if (poste.sensores.acs712 && !poste.sensores.acs712.funcionando) alertas++;
      }
      
      // Consumo anormal (>20% de lo esperado)
      const consumoEsperado = 60 * 0.22; // 60W por 22 horas aprox
      const consumoActual = poste.calculados?.consumoHoy || 0;
      if (consumoActual > consumoEsperado * 1.2) alertas++;
      
      return count + alertas;
    }, 0);

    // Eficiencia del sistema
    const eficiencia = postes.length > 0 ? 
      (postesOnline.length / postes.length) * 100 : 0;

    return {
      consumoTotal,
      postesActivos: postesOnline.length,
      totalPostes: postes.length,
      eficiencia,
      costoTotal,
      tiempoEncendidoPromedio,
      potenciaInstalada: potenciaInstalada / 1000, // Convertir a kW
      alertasActivas
    };
  }, [postes, tarifaElectrica]);

  // Calcular tendencias
  const trends = useMemo(() => {
    if (historicalData.length < 2) {
      return {
        consumoTrend: 0,
        eficienciaTrend: 0,
        postesTrend: 0
      };
    }

    const current = historicalData[historicalData.length - 1];
    const previous = historicalData[historicalData.length - 2];

    const consumoTrend = previous.consumo > 0 ? 
      ((current.consumo - previous.consumo) / previous.consumo * 100) : 0;
    
    const eficienciaTrend = previous.eficiencia > 0 ? 
      ((current.eficiencia - previous.eficiencia) / previous.eficiencia * 100) : 0;
    
    const postesTrend = previous.postesActivos > 0 ? 
      ((current.postesActivos - previous.postesActivos) / previous.postesActivos * 100) : 0;

    return {
      consumoTrend: Math.round(consumoTrend * 10) / 10,
      eficienciaTrend: Math.round(eficienciaTrend * 10) / 10,
      postesTrend: Math.round(postesTrend * 10) / 10
    };
  }, [historicalData]);

  const formatTime = (hours) => {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  return (
    <div className="kpi-cards-container">
      <KPICard
        title="Consumo Total Hoy"
        value={kpis.consumoTotal.toLocaleString('es-BO', { 
          minimumFractionDigits: 1, 
          maximumFractionDigits: 1 
        })}
        unit="kWh"
        icon={Zap}
        color="yellow"
        trend={trends.consumoTrend}
        subtitle="Acumulado últimas 24h"
        calculation={`${kpis.totalPostes} postes × promedio consumo`}
        isLoading={isLoading}
      />

      <KPICard
        title="Postes Online"
        value={kpis.postesActivos}
        unit={`de ${kpis.totalPostes}`}
        icon={Lightbulb}
        color="green"
        trend={trends.postesTrend}
        subtitle={`${((kpis.postesActivos / Math.max(kpis.totalPostes, 1)) * 100).toFixed(1)}% disponibilidad`}
        calculation="Dispositivos conectados via WebSocket"
        isLoading={isLoading}
      />

      <KPICard
        title="Eficiencia Sistema"
        value={kpis.eficiencia.toFixed(1)}
        unit="%"
        icon={Gauge}
        color="blue"
        trend={trends.eficienciaTrend}
        subtitle="Rendimiento operativo"
        calculation="(Postes online / Total postes) × 100"
        isLoading={isLoading}
      />

      <KPICard
        title="Costo Energético"
        value={kpis.costoTotal.toLocaleString('es-BO', { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 2 
        })}
        unit="Bs"
        icon={DollarSign}
        color="purple"
        trend={trends.consumoTrend}
        subtitle={`Tarifa: ${tarifaElectrica} Bs/kWh`}
        calculation="Consumo × tarifa eléctrica"
        isLoading={isLoading}
      />

      <KPICard
        title="Tiempo Operación"
        value={formatTime(kpis.tiempoEncendidoPromedio)}
        unit=""
        icon={Clock}
        color="blue"
        trend={null}
        subtitle="Promedio por poste hoy"
        calculation="Suma tiempo encendido / total postes"
        isLoading={isLoading}
      />

      <KPICard
        title="Potencia Instalada"
        value={kpis.potenciaInstalada.toFixed(1)}
        unit="kW"
        icon={Power}
        color="green"
        trend={null}
        subtitle={`${kpis.totalPostes} luminarias LED`}
        calculation="Suma potencia todas las luminarias"
        isLoading={isLoading}
      />

      <KPICard
        title="Estado de Red"
        value={kpis.postesActivos > 0 ? "Online" : "Offline"}
        unit=""
        icon={Wifi}
        color={kpis.postesActivos > 0 ? "green" : "red"}
        trend={null}
        subtitle={`${kpis.postesActivos} conexiones WebSocket`}
        calculation="Monitoreo tiempo real"
        isLoading={isLoading}
      />

      <KPICard
        title="Alertas Sistema"
        value={kpis.alertasActivas}
        unit="activas"
        icon={AlertTriangle}
        color={kpis.alertasActivas > 0 ? "red" : "green"}
        trend={null}
        subtitle={kpis.alertasActivas === 0 ? "Sistema normal" : "Requiere atención"}
        calculation="Sensores + conectividad + consumo"
        isLoading={isLoading}
      />
    </div>
  );
};

export default KPICards;