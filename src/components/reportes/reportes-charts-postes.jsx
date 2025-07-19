// src/components/MonitoreoControl/components/ReportesPostes/reportes-charts-postes.js
import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  RadialBarChart,
  RadialBar,
  ComposedChart,
  Scatter,
  ScatterChart
} from 'recharts';

// Colores para gráficos del sistema de iluminación
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A64AC9', '#FF5A5F', '#3CAEA3', '#8B5CF6'];

// Colores específicos por categoría
const COLORS_ESTADO = {
  'Online': '#28A745',
  'Offline': '#DC3545'
};

const COLORS_MODO = {
  'Automático': '#007BFF',
  'Manual': '#6C757D'
};

const COLORS_PRIORIDAD = {
  'critica': '#DC3545',
  'alta': '#FF8F00',
  'media': '#007BFF',
  'baja': '#28A745'
};

// Función para renderizar etiquetas personalizadas en gráficos de pastel
const renderCustomizedLabel = ({
  cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, value
}) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
 
  if (percent < 0.05) return null; // No mostrar etiquetas muy pequeñas
 
  return (
    <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

// Función para generar métricas de postes
const renderMetricasPostes = (metricas) => {
  return (
    <div className="metricas-container">
      <h3>📊 Métricas Generales del Sistema</h3>
      <div className="metricas-grid">
        <div className="metrica-card">
          <div className="metrica-valor">{metricas.totalPostes}</div>
          <div className="metrica-label">Total de Postes</div>
        </div>
        <div className="metrica-card">
          <div className="metrica-valor">{metricas.postesOnline}</div>
          <div className="metrica-label">Postes Online</div>
        </div>
        <div className="metrica-card">
          <div className="metrica-valor">{metricas.postesEncendidos}</div>
          <div className="metrica-label">Postes Encendidos</div>
        </div>
        <div className="metrica-card">
          <div className="metrica-valor">{metricas.postesAutomaticos}</div>
          <div className="metrica-label">Modo Automático</div>
        </div>
        <div className="metrica-card">
          <div className="metrica-valor">{metricas.consumoTotal.toFixed(1)}W</div>
          <div className="metrica-label">Consumo Total</div>
        </div>
        <div className="metrica-card">
          <div className="metrica-valor">{metricas.eficienciaPromedio.toFixed(1)}%</div>
          <div className="metrica-label">Eficiencia Promedio</div>
        </div>
      </div>
    </div>
  );
};

// Función para generar datos por zona
const generarDatosPorZona = (postes) => {
  const zonaData = {};
 
  postes.forEach(poste => {
    const zona = poste.zona || 'Sin zona';
    if (!zonaData[zona]) {
      zonaData[zona] = {
        zona: zona,
        total: 0,
        online: 0,
        encendidos: 0,
        consumo: 0,
        eficiencia: 0
      };
    }
    zonaData[zona].total++;
    if (poste.estado === 'Online') zonaData[zona].online++;
    if (poste.encendido === 'Sí') zonaData[zona].encendidos++;
    zonaData[zona].consumo += parseFloat(poste.consumoActual) || 0;
    zonaData[zona].eficiencia += parseFloat(poste.eficiencia) || 0;
  });
 
  // Calcular promedios
  return Object.values(zonaData).map(zona => ({
    ...zona,
    eficienciaPromedio: zona.total > 0 ? zona.eficiencia / zona.total : 0,
    porcentajeOnline: zona.total > 0 ? (zona.online / zona.total) * 100 : 0
  }));
};

// Función para generar datos de estado
const generarDatosEstado = (postes) => {
  const estadoCount = {
    'Online': 0,
    'Offline': 0
  };
 
  postes.forEach(poste => {
    estadoCount[poste.estado] = (estadoCount[poste.estado] || 0) + 1;
  });
 
  return Object.entries(estadoCount).map(([name, value]) => ({ name, value }));
};

// Función para generar datos de modo de operación
const generarDatosModo = (postes) => {
  const modoCount = {
    'Automático': 0,
    'Manual': 0
  };
 
  postes.forEach(poste => {
    modoCount[poste.modoAutomatico] = (modoCount[poste.modoAutomatico] || 0) + 1;
  });
 
  return Object.entries(modoCount).map(([name, value]) => ({ name, value }));
};

// Función para generar datos de intensidad
const generarDatosIntensidad = (postes) => {
  const rangos = {
    'Apagado (0%)': 0,
    'Bajo (1-25%)': 0,
    'Medio (26-50%)': 0,
    'Alto (51-75%)': 0,
    'Máximo (76-100%)': 0
  };
 
  postes.forEach(poste => {
    const intensidad = poste.intensidad || '0/255 (0%)';
    const porcentaje = parseInt(intensidad.match(/\((\d+)%\)/)?.[1] || '0');
    
    if (porcentaje === 0) rangos['Apagado (0%)']++;
    else if (porcentaje <= 25) rangos['Bajo (1-25%)']++;
    else if (porcentaje <= 50) rangos['Medio (26-50%)']++;
    else if (porcentaje <= 75) rangos['Alto (51-75%)']++;
    else rangos['Máximo (76-100%)']++;
  });
 
  return Object.entries(rangos).map(([name, value]) => ({ name, value }));
};

// Función para generar datos de consumo vs eficiencia
const generarDatosConsumoEficiencia = (postes) => {
  return postes.map(poste => ({
    nombre: poste.nombre,
    consumo: parseFloat(poste.consumoActual) || 0,
    eficiencia: parseFloat(poste.eficiencia) || 0,
    zona: poste.zona
  }));
};

// Renderizado de gráficos para postes
export const renderGraficosPostes = (postesData, metricas) => {
  if (postesData.length === 0) {
    return <div className="no-data-message">No hay datos suficientes para generar gráficos.</div>;
  }
 
  return (
    <div className="graficos-container">
      {/* Renderizar métricas */}
      {renderMetricasPostes(metricas)}
     
      <div className="grafico-box">
        <h4>📊 Estado de Conectividad</h4>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={generarDatosEstado(postesData)}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
              isAnimationActive={false}
            >
              {generarDatosEstado(postesData).map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS_ESTADO[entry.name]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => [`${value} postes`, 'Cantidad']} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
     
      <div className="grafico-box">
        <h4>💡 Modo de Operación</h4>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={generarDatosModo(postesData)}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
              isAnimationActive={false}
            >
              {generarDatosModo(postesData).map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS_MODO[entry.name]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => [`${value} postes`, 'Cantidad']} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
     
      <div className="grafico-box">
        <h4>📍 Distribución por Zona</h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={generarDatosPorZona(postesData)}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="zona" />
            <YAxis />
            <Tooltip formatter={(value, name) => {
              const labels = {
                total: 'Total de Postes',
                online: 'Postes Online',
                encendidos: 'Postes Encendidos'
              };
              return [`${value}`, labels[name] || name];
            }} />
            <Legend />
            <Bar dataKey="total" fill="#0088FE" name="Total" />
            <Bar dataKey="online" fill="#00C49F" name="Online" />
            <Bar dataKey="encendidos" fill="#FFBB28" name="Encendidos" />
          </BarChart>
        </ResponsiveContainer>
      </div>
     
      <div className="grafico-box">
        <h4>⚡ Consumo por Zona</h4>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={generarDatosPorZona(postesData)}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="zona" />
            <YAxis />
            <Tooltip formatter={(value) => [`${value.toFixed(1)}W`, 'Consumo']} />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="consumo" 
              stroke="#FF8042" 
              fill="#FF8042"
              fillOpacity={0.6}
              name="Consumo (W)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grafico-box">
        <h4>🔆 Distribución de Intensidad</h4>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={generarDatosIntensidad(postesData)}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
              isAnimationActive={false}
            >
              {generarDatosIntensidad(postesData).map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => [`${value} postes`, 'Cantidad']} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="grafico-box">
        <h4>📊 Eficiencia por Zona</h4>
        <ResponsiveContainer width="100%" height={300}>
          <RadialBarChart 
            width={400} 
            height={300} 
            cx={200} 
            cy={150} 
            innerRadius={20} 
            outerRadius={140} 
            data={generarDatosPorZona(postesData)}
          >
            <RadialBar 
              minAngle={15} 
              label={{ position: 'insideStart', fill: '#fff' }} 
              background 
              clockWise 
              dataKey="porcentajeOnline" 
              fill="#8884d8"
            />
            <Legend iconSize={18} layout="vertical" verticalAlign="middle" wrapperStyle={{paddingLeft: '20px'}} />
            <Tooltip formatter={(value) => [`${value.toFixed(1)}%`, 'Conectividad']} />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>

      <div className="grafico-box">
        <h4>⚡🎯 Consumo vs Eficiencia</h4>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart data={generarDatosConsumoEficiencia(postesData)}>
            <CartesianGrid />
            <XAxis type="number" dataKey="consumo" name="Consumo" unit="W" />
            <YAxis type="number" dataKey="eficiencia" name="Eficiencia" unit="%" />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Scatter name="Postes" data={generarDatosConsumoEficiencia(postesData)} fill="#8884d8" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Función para generar métricas de eventos
const renderMetricasEventos = (metricas) => {
  return (
    <div className="metricas-container">
      <h3>📋 Métricas de Eventos</h3>
      <div className="metricas-grid">
        <div className="metrica-card">
          <div className="metrica-valor">{metricas.totalEventos}</div>
          <div className="metrica-label">Total de Eventos</div>
        </div>
        <div className="metrica-card">
          <div className="metrica-valor">{metricas.eventosCriticos}</div>
          <div className="metrica-label">Eventos Críticos</div>
        </div>
        <div className="metrica-card">
          <div className="metrica-valor">{metricas.eventosControl}</div>
          <div className="metrica-label">Eventos de Control</div>
        </div>
        <div className="metrica-card">
          <div className="metrica-valor">{metricas.eventosConexion}</div>
          <div className="metrica-label">Eventos de Conexión</div>
        </div>
        <div className="metrica-card">
          <div className="metrica-valor">{metricas.eventosSensores}</div>
          <div className="metrica-label">Eventos de Sensores</div>
        </div>
      </div>
    </div>
  );
};

// Función para generar datos de eventos por categoría
const generarDatosEventosPorCategoria = (eventos) => {
  const categoriaCount = {};
 
  eventos.forEach(evento => {
    const categoria = evento.categoria || 'otros';
    categoriaCount[categoria] = (categoriaCount[categoria] || 0) + 1;
  });
 
  return Object.entries(categoriaCount).map(([name, value]) => ({ name, value }));
};

// Función para generar datos de eventos por prioridad
const generarDatosEventosPorPrioridad = (eventos) => {
  const prioridadCount = {};
 
  eventos.forEach(evento => {
    const prioridad = evento.prioridad || 'media';
    prioridadCount[prioridad] = (prioridadCount[prioridad] || 0) + 1;
  });
 
  return Object.entries(prioridadCount).map(([name, value]) => ({ name, value }));
};

// Función para generar datos de eventos por zona
const generarDatosEventosPorZona = (eventos) => {
  const zonaCount = {};
 
  eventos.forEach(evento => {
    const zona = evento.zona || 'Sin zona';
    zonaCount[zona] = (zonaCount[zona] || 0) + 1;
  });
 
  return Object.entries(zonaCount).map(([name, value]) => ({ name, value }));
};

// Renderizado de gráficos para eventos
export const renderGraficosEventos = (eventosData, metricas) => {
  if (eventosData.length === 0) {
    return <div className="no-data-message">No hay eventos para mostrar en gráficos.</div>;
  }
 
  return (
    <div className="graficos-container">
      {/* Renderizar métricas */}
      {renderMetricasEventos(metricas)}
     
      <div className="grafico-box">
        <h4>📋 Eventos por Categoría</h4>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={generarDatosEventosPorCategoria(eventosData)}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
              isAnimationActive={false}
            >
              {generarDatosEventosPorCategoria(eventosData).map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => [`${value} eventos`, 'Cantidad']} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
     
      <div className="grafico-box">
        <h4>⚠️ Eventos por Prioridad</h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={generarDatosEventosPorPrioridad(eventosData)}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" fill="#8884d8" name="Cantidad">
              {generarDatosEventosPorPrioridad(eventosData).map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS_PRIORIDAD[entry.name] || '#8884d8'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grafico-box">
        <h4>📍 Eventos por Zona</h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={generarDatosEventosPorZona(eventosData)}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" fill="#00C49F" name="Eventos" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Función para generar métricas de consumo
const renderMetricasConsumo = (metricas) => {
  return (
    <div className="metricas-container">
      <h3>⚡ Métricas de Consumo Energético</h3>
      <div className="metricas-grid">
        <div className="metrica-card">
          <div className="metrica-valor">{metricas.consumoTotal.toFixed(1)}W</div>
          <div className="metrica-label">Consumo Total</div>
        </div>
        <div className="metrica-card">
          <div className="metrica-valor">{metricas.consumoPromedio.toFixed(1)}W</div>
          <div className="metrica-label">Consumo Promedio</div>
        </div>
        <div className="metrica-card">
          <div className="metrica-valor">${metricas.costoTotal.toFixed(2)}</div>
          <div className="metrica-label">Costo Total</div>
        </div>
        <div className="metrica-card">
          <div className="metrica-valor">{metricas.eficienciaPromedio.toFixed(1)}%</div>
          <div className="metrica-label">Eficiencia Promedio</div>
        </div>
        <div className="metrica-card">
          <div className="metrica-valor">{metricas.ahorroEnergetico.toFixed(1)}W</div>
          <div className="metrica-label">Ahorro Energético</div>
        </div>
      </div>
    </div>
  );
};

// Función para generar datos de consumo por zona
const generarDatosConsumoPorZona = (consumos) => {
  const zonaData = {};
 
  consumos.forEach(consumo => {
    const zona = consumo.zona || 'Sin zona';
    if (!zonaData[zona]) {
      zonaData[zona] = {
        zona: zona,
        consumoTotal: 0,
        costoTotal: 0,
        count: 0
      };
    }
    zonaData[zona].consumoTotal += parseFloat(consumo.consumoActual) || 0;
    zonaData[zona].costoTotal += parseFloat(consumo.costoHoy) || 0;
    zonaData[zona].count++;
  });
 
  return Object.values(zonaData);
};

// Renderizado de gráficos para consumos
export const renderGraficosConsumos = (consumosData, metricas) => {
  if (consumosData.length === 0) {
    return <div className="no-data-message">No hay datos de consumo para mostrar en gráficos.</div>;
  }
 
  return (
    <div className="graficos-container">
      {/* Renderizar métricas */}
      {renderMetricasConsumo(metricas)}
     
      <div className="grafico-box">
        <h4>⚡ Consumo por Zona</h4>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={generarDatosConsumoPorZona(consumosData)}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="zona" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Bar yAxisId="left" dataKey="consumoTotal" fill="#0088FE" name="Consumo (W)" />
            <Line yAxisId="right" type="monotone" dataKey="costoTotal" stroke="#FF8042" name="Costo ($)" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="grafico-box">
        <h4>💰 Distribución de Costos</h4>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={generarDatosConsumoPorZona(consumosData)}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius={100}
              fill="#8884d8"
              dataKey="costoTotal"
              isAnimationActive={false}
            >
              {generarDatosConsumoPorZona(consumosData).map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => [`$${value.toFixed(2)}`, 'Costo']} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Renderizado de gráficos para estadísticas
export const renderGraficosEstadisticas = (estadisticasData) => {
  if (estadisticasData.length === 0) {
    return <div className="no-data-message">No hay estadísticas para mostrar en gráficos.</div>;
  }
 
  return (
    <div className="graficos-container">
      <div className="grafico-box">
        <h4>📊 Estadísticas por Zona</h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={estadisticasData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="zona" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="totalPostes" fill="#0088FE" name="Total Postes" />
            <Bar dataKey="postesOnline" fill="#00C49F" name="Online" />
            <Bar dataKey="postesEncendidos" fill="#FFBB28" name="Encendidos" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grafico-box">
        <h4>⚡ Consumo y Eficiencia</h4>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={estadisticasData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="zona" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Bar yAxisId="left" dataKey="consumoTotal" fill="#FF8042" name="Consumo Total (W)" />
            <Line yAxisId="right" type="monotone" dataKey="eficienciaPromedio" stroke="#8B5CF6" name="Eficiencia (%)" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Renderizado de gráficos para sensores
export const renderGraficosSensores = (sensoresData) => {
  if (sensoresData.length === 0) {
    return <div className="no-data-message">No hay datos de sensores para mostrar en gráficos.</div>;
  }

  // Generar datos de estado de sensores
  const estadosSensores = {
    'LDR Funcionando': sensoresData.filter(s => s.ldrEstado === 'Funcionando').length,
    'LDR Error': sensoresData.filter(s => s.ldrEstado === 'Error').length,
    'PIR Funcionando': sensoresData.filter(s => s.pirEstado === 'Funcionando').length,
    'PIR Error': sensoresData.filter(s => s.pirEstado === 'Error').length,
    'ACS712 Funcionando': sensoresData.filter(s => s.acs712Estado === 'Funcionando').length,
    'ACS712 Error': sensoresData.filter(s => s.acs712Estado === 'Error').length
  };

  const datosEstadoSensores = Object.entries(estadosSensores).map(([name, value]) => ({ name, value }));
 
  return (
    <div className="graficos-container">
      <div className="grafico-box">
        <h4>🔬 Estado de Sensores</h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={datosEstadoSensores}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" fill="#8884d8" name="Cantidad">
              {datosEstadoSensores.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.name.includes('Error') ? '#DC3545' : '#28A745'} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grafico-box">
        <h4>👁️ Detecciones PIR por Zona</h4>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={sensoresData.reduce((acc, sensor) => {
            const zona = sensor.zona;
            const existing = acc.find(item => item.zona === zona);
            if (existing) {
              existing.detecciones += parseInt(sensor.pirDetecciones) || 0;
            } else {
              acc.push({
                zona: zona,
                detecciones: parseInt(sensor.pirDetecciones) || 0
              });
            }
            return acc;
          }, [])}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="zona" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="detecciones" 
              stroke="#FF8042" 
              fill="#FF8042"
              fillOpacity={0.6}
              name="Detecciones PIR"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grafico-box">
        <h4>💡 Niveles de Luminosidad (LDR)</h4>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart data={sensoresData.map(sensor => ({
            nombre: sensor.posteNombre,
            lux: parseFloat(sensor.ldrLux) || 0,
            valor: parseFloat(sensor.ldrValor) || 0
          }))}>
            <CartesianGrid />
            <XAxis type="number" dataKey="valor" name="Valor LDR" />
            <YAxis type="number" dataKey="lux" name="Lux" unit=" lux" />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Scatter name="Sensores LDR" fill="#FFBB28" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Renderizado de gráficos para alertas
export const renderGraficosAlertas = (alertasData) => {
  if (alertasData.length === 0) {
    return <div className="no-data-message">No hay alertas para mostrar en gráficos.</div>;
  }

  // Generar datos de alertas por tipo
  const alertasPorTipo = {};
  alertasData.forEach(alerta => {
    const tipo = alerta.tipo || 'Otros';
    alertasPorTipo[tipo] = (alertasPorTipo[tipo] || 0) + 1;
  });

  const datosAlertasTipo = Object.entries(alertasPorTipo).map(([name, value]) => ({ name, value }));

  // Generar datos de alertas por prioridad
  const alertasPorPrioridad = {};
  alertasData.forEach(alerta => {
    const prioridad = alerta.prioridad || 'media';
    alertasPorPrioridad[prioridad] = (alertasPorPrioridad[prioridad] || 0) + 1;
  });

  const datosAlertasPrioridad = Object.entries(alertasPorPrioridad).map(([name, value]) => ({ name, value }));

  // Generar datos de alertas por zona
  const alertasPorZona = {};
  alertasData.forEach(alerta => {
    const zona = alerta.zona || 'Sin zona';
    alertasPorZona[zona] = (alertasPorZona[zona] || 0) + 1;
  });

  const datosAlertasZona = Object.entries(alertasPorZona).map(([name, value]) => ({ name, value }));
 
  return (
    <div className="graficos-container">
      <div className="grafico-box">
        <h4>⚠️ Alertas por Tipo</h4>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={datosAlertasTipo}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
              isAnimationActive={false}
            >
              {datosAlertasTipo.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => [`${value} alertas`, 'Cantidad']} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
     
      <div className="grafico-box">
        <h4>🚨 Alertas por Prioridad</h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={datosAlertasPrioridad}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" fill="#8884d8" name="Cantidad">
              {datosAlertasPrioridad.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS_PRIORIDAD[entry.name] || '#8884d8'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grafico-box">
        <h4>📍 Alertas por Zona</h4>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={datosAlertasZona}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke="#DC3545" 
              fill="#DC3545"
              fillOpacity={0.6}
              name="Alertas"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grafico-box">
        <h4>📊 Resumen de Criticidad</h4>
        <ResponsiveContainer width="100%" height={300}>
          <RadialBarChart 
            width={400} 
            height={300} 
            cx={200} 
            cy={150} 
            innerRadius={20} 
            outerRadius={140} 
            data={datosAlertasPrioridad.map(item => ({
              ...item,
              fill: COLORS_PRIORIDAD[item.name] || '#8884d8'
            }))}
          >
            <RadialBar 
              minAngle={15} 
              label={{ position: 'insideStart', fill: '#fff' }} 
              background 
              clockWise 
              dataKey="value"
            />
            <Legend iconSize={18} layout="vertical" verticalAlign="middle" wrapperStyle={{paddingLeft: '20px'}} />
            <Tooltip formatter={(value) => [`${value}`, 'Alertas']} />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Función auxiliar para generar gráficos de tendencias temporales
export const renderGraficoTendencias = (datos, titulo, campoX, campoY, color = '#8884d8') => {
  return (
    <div className="grafico-box">
      <h4>{titulo}</h4>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={datos}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={campoX} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line 
            type="monotone" 
            dataKey={campoY} 
            stroke={color} 
            strokeWidth={2}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// Función para generar gráfico de comparación múltiple
export const renderGraficoComparacion = (datos, titulo, campos, colores) => {
  return (
    <div className="grafico-box">
      <h4>{titulo}</h4>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={datos}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="zona" />
          <YAxis />
          <Tooltip />
          <Legend />
          {campos.map((campo, index) => (
            <Bar 
              key={campo.key}
              dataKey={campo.key} 
              fill={colores[index] || COLORS[index]} 
              name={campo.nombre}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};