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
  ResponsiveContainer
} from 'recharts';
import { renderMetricasViajes, renderMetricasConductores, renderMetricasSolicitudes, renderMetricasAdmins, renderMetricasGrabaciones, renderMetricasLogs } from './reportes-metrics';

// Función para formatear moneda
const formatCurrency = (value) => {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN'
  }).format(value);
};

// Colores para gráficos
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A64AC9', '#FF5A5F', '#3CAEA3'];

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

// Función para generar datos por estado de viaje para gráfico de pastel
const generarDatosPorEstado = (viajes) => {
  const estadosCount = {};
 
  viajes.forEach(viaje => {
    if (!estadosCount[viaje.estado]) {
      estadosCount[viaje.estado] = 0;
    }
    estadosCount[viaje.estado]++;
  });
 
  return Object.entries(estadosCount).map(([name, value]) => ({ name, value }));
};

// Función para generar datos por conductor
const generarDatosPorConductor = (viajes) => {
  const conductoresData = {};
 
  viajes.forEach(viaje => {
    if (!conductoresData[viaje.conductor]) {
      conductoresData[viaje.conductor] = {
        totalCalificacion: 0,
        totalViajes: 0,
        ganancias: 0
      };
    }
    conductoresData[viaje.conductor].totalCalificacion += viaje.calificacion || 0;
    conductoresData[viaje.conductor].totalViajes++;
    
    // Sumar ganancias solo para viajes completados
    if (viaje.estado === 'completado') {
      conductoresData[viaje.conductor].ganancias += viaje.precio || 0;
    }
  });
 
  return Object.entries(conductoresData).map(([name, datos]) => ({
    name,
    calificacion: datos.totalViajes > 0 ? datos.totalCalificacion / datos.totalViajes : 0,
    viajes: datos.totalViajes,
    ganancias: datos.ganancias
  }));
};

// Función para generar datos por rol de administrador
const generarDatosPorRol = (admins) => {
  const rolesCount = {};
  
  admins.forEach(admin => {
    const rol = admin.rol || 'sin rol';
    if (!rolesCount[rol]) {
      rolesCount[rol] = 0;
    }
    rolesCount[rol]++;
  });
  
  return Object.entries(rolesCount).map(([name, value]) => ({ name, value }));
};

// Función para generar datos por módulo de logs
const generarDatosPorModulo = (logs) => {
  const modulosCount = {};
  
  logs.forEach(log => {
    const modulo = log.modulo || 'sin clasificar';
    if (!modulosCount[modulo]) {
      modulosCount[modulo] = 0;
    }
    modulosCount[modulo]++;
  });
  
  return Object.entries(modulosCount).map(([name, value]) => ({ name, value }));
};

// Función para generar datos por día para logs
const generarDatosPorDia = (logs) => {
  const diasCount = {};
  
  logs.forEach(log => {
    // Extraer solo la fecha (sin hora)
    const fechaSolo = log.fecha.split(' ')[0];
    if (!diasCount[fechaSolo]) {
      diasCount[fechaSolo] = 0;
    }
    diasCount[fechaSolo]++;
  });
  
  // Convertir a formato para gráficos
  const datosGrafico = Object.entries(diasCount).map(([fecha, cantidad]) => ({
    fecha,
    cantidad
  }));
  
  // Ordenar por fecha
  datosGrafico.sort((a, b) => {
    const dateA = new Date(a.fecha.split('/').reverse().join('/'));
    const dateB = new Date(b.fecha.split('/').reverse().join('/'));
    return dateA - dateB;
  });
  
  return datosGrafico;
};

// Renderizado de gráficos para viajes
export const renderGraficosViajes = (viajesData, viajesDataGrafico, metricasViajes) => {
  if (viajesDataGrafico.length === 0) {
    return <div className="no-data-message">No hay datos suficientes para generar gráficos.</div>;
  }
 
  return (
    <div className="graficos-container">
      {/* Renderizar métricas */}
      {renderMetricasViajes(metricasViajes)}
     
      <div className="grafico-box">
        <h4>Viajes por Día</h4>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={viajesDataGrafico}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="fecha" />
            <YAxis />
            <Tooltip formatter={(value) => [`${value} viajes`, 'Cantidad']} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="viajes" 
              stroke="#2EB086" 
              activeDot={{ r: 8 }} 
              strokeWidth={2} 
              name="Viajes" 
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
     
      <div className="grafico-box">
        <h4>Ganancias por Día</h4>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={viajesDataGrafico}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="fecha" />
            <YAxis />
            <Tooltip formatter={(value) => [formatCurrency(value), 'Ganancias']} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="ganancias" 
              stroke="#FF8042" 
              activeDot={{ r: 8 }} 
              strokeWidth={2} 
              name="Ganancias" 
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
     
      <div className="grafico-box">
        <h4>Distribución de Estados de Viajes</h4>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={generarDatosPorEstado(viajesData)}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
              isAnimationActive={false}
            >
              {generarDatosPorEstado(viajesData).map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => [`${value} viajes`, 'Cantidad']} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
     
      <div className="grafico-box">
        <h4>Top Conductores por Viajes</h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart 
            data={generarDatosPorConductor(viajesData)
              .sort((a, b) => b.viajes - a.viajes)
              .slice(0, 5)}
            isAnimationActive={false}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip formatter={(value, name) => {
              if (name === 'viajes') return [`${value} viajes`, name];
              return [value, name];
            }} />
            <Legend />
            <Bar dataKey="viajes" fill="#2EB086" name="Viajes" isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Renderizado de gráficos para conductores
export const renderGraficosConductores = (conductoresData, metricasConductores) => {
  return (
    <div className="graficos-container">
      {/* Renderizar métricas */}
      {renderMetricasConductores(metricasConductores)}
    
      <div className="grafico-box">
        <h4>Conductores por Estado</h4>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={[
                { name: 'Activos', value: metricasConductores.activos },
                { name: 'Inactivos', value: metricasConductores.inactivos }
              ]}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              <Cell fill="#2EB086" />
              <Cell fill="#DC3545" />
            </Pie>
            <Tooltip formatter={(value) => [`${value} conductores`, 'Cantidad']} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
     
      <div className="grafico-box">
        <h4>Top Conductores por Viajes Realizados</h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={conductoresData.sort((a, b) => b.viajesRealizados - a.viajesRealizados).slice(0, 5)}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="nombre" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="viajesRealizados" fill="#2EB086" name="Viajes Realizados" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      <div className="grafico-box">
        <h4>Top Conductores por Calificación</h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={conductoresData.filter(c => c.calificacionPromedio > 0).sort((a, b) => b.calificacionPromedio - a.calificacionPromedio).slice(0, 5)}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="nombre" />
            <YAxis domain={[0, 5]} />
            <Tooltip />
            <Legend />
            <Bar dataKey="calificacionPromedio" fill="#FFBB28" name="Calificación Promedio" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Renderizado de gráficos para solicitudes
export const renderGraficosSolicitudes = (solicitudesData, metricasSolicitudes) => {
  // Calcular datos para gráficos
  const solicitudesPorEstado = [
    { name: 'Pendientes', value: metricasSolicitudes.pendientes },
    { name: 'Aprobadas', value: metricasSolicitudes.aprobadas },
    { name: 'Rechazadas', value: metricasSolicitudes.rechazadas }
  ].filter(item => item.value > 0); // Filtrar estados sin datos
 
  return (
    <div className="graficos-container">
      {/* Renderizar métricas */}
      {renderMetricasSolicitudes(metricasSolicitudes)}
      
      <div className="grafico-box">
        <h4>Solicitudes por Estado</h4>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={solicitudesPorEstado}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              <Cell fill="#FFC107" /> {/* Pendientes */}
              <Cell fill="#2EB086" /> {/* Aprobadas */}
              <Cell fill="#DC3545" /> {/* Rechazadas */}
            </Pie>
            <Tooltip formatter={(value) => [`${value} solicitudes`, 'Cantidad']} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      <div className="grafico-box">
        <h4>Categorías de Licencia Solicitadas</h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={
            (() => {
              const categorias = {};
              solicitudesData.forEach(sol => {
                const cat = sol.licencia_categoria || "No especificada";
                if (!categorias[cat]) categorias[cat] = 0;
                categorias[cat]++;
              });
              return Object.entries(categorias).map(([name, value]) => ({ name, value }));
            })()
          }>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" fill="#2EB086" name="Solicitudes" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Renderizado de gráficos para administradores
export const renderGraficosAdmins = (administradoresData) => {
  return (
    <div className="graficos-container">
      {renderMetricasAdmins(administradoresData)}
      
      <div className="grafico-box">
        <h4>Administradores por Rol</h4>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={generarDatosPorRol(administradoresData)}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {generarDatosPorRol(administradoresData).map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => [`${value} administradores`, 'Cantidad']} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      <div className="grafico-box">
        <h4>Top Administradores por Acciones</h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={administradoresData.sort((a, b) => b.accionesRealizadas - a.accionesRealizadas).slice(0, 5)}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="nombre" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="accionesRealizadas" fill="#2EB086" name="Acciones Realizadas" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Renderizado de gráficos para grabaciones
export const renderGraficosGrabaciones = (grabacionesData) => {
  // Calcular datos para gráficos
  const grabacionesPorEstado = [
    { name: 'Disponibles', value: grabacionesData.filter(g => g.estado === 'disponible').length },
    { name: 'Procesando', value: grabacionesData.filter(g => g.estado === 'procesando').length },
    { name: 'Archivadas', value: grabacionesData.filter(g => g.estado === 'archivado').length }
  ].filter(item => item.value > 0); // Filtrar estados sin datos
 
  return (
    <div className="graficos-container">
      {renderMetricasGrabaciones(grabacionesData)}
      
      <div className="grafico-box">
        <h4>Grabaciones por Estado</h4>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={grabacionesPorEstado}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              <Cell fill="#2EB086" /> {/* Disponibles */}
              <Cell fill="#FFC107" /> {/* Procesando */}
              <Cell fill="#6C757D" /> {/* Archivadas */}
            </Pie>
            <Tooltip formatter={(value) => [`${value} grabaciones`, 'Cantidad']} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Renderizado de gráficos para logs
export const renderGraficosLogs = (logsData) => {
  return (
    <div className="graficos-container">
      {renderMetricasLogs(logsData)}
      
      <div className="grafico-box">
        <h4>Logs por Módulo</h4>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={generarDatosPorModulo(logsData)}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {generarDatosPorModulo(logsData).map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => [`${value} logs`, 'Cantidad']} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      <div className="grafico-box">
        <h4>Actividad por Día</h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={generarDatosPorDia(logsData)}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="fecha" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="cantidad" fill="#2EB086" name="Cantidad de Logs" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};