// src/components/MonitoreoControl/components/ReportesPostes/reportes-exporters-postes.js
import Papa from 'papaparse';

// Función para formatear fecha corta
const formatDateShort = (date) => {
  try {
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (error) {
    console.error("Error al formatear fecha corta:", error);
    return 'Fecha inválida';
  }
};

// Función para formatear moneda boliviana
const formatCurrency = (value) => {
  return new Intl.NumberFormat('es-BO', {
    style: 'currency',
    currency: 'BOB'
  }).format(value);
};

// Función para formatear energía
const formatEnergy = (value, unit = 'W') => {
  if (value >= 1000 && unit === 'W') {
    return `${(value / 1000).toFixed(2)} kW`;
  }
  return `${value.toFixed(1)} ${unit}`;
};

// Función para exportar datos a CSV adaptada para postes
export const exportarCSV = (dataToExport, activeTab, fechaInicio, fechaFin, idioma) => {
  let fileName = '';
  let delimiter = idioma === 'es' ? ';' : ',';
  
  switch(activeTab) {
    case 'postes':
      fileName = `postes_iluminacion_${formatDateShort(new Date()).replace(/\//g, '-')}.csv`;
      break;
    case 'eventos':
      fileName = `eventos_sistema_${formatDateShort(fechaInicio).replace(/\//g, '-')}_a_${formatDateShort(fechaFin).replace(/\//g, '-')}.csv`;
      break;
    case 'estadisticas':
      fileName = `estadisticas_zonas_${formatDateShort(new Date()).replace(/\//g, '-')}.csv`;
      break;
    case 'consumos':
      fileName = `consumo_energetico_${formatDateShort(new Date()).replace(/\//g, '-')}.csv`;
      break;
    case 'sensores':
      fileName = `datos_sensores_${formatDateShort(new Date()).replace(/\//g, '-')}.csv`;
      break;
    case 'alertas':
      fileName = `alertas_sistema_${formatDateShort(new Date()).replace(/\//g, '-')}.csv`;
      break;
    default:
      alert('No hay datos para exportar');
      return;
  }

  let dataPreparada = [];
  
  switch(activeTab) {
    case 'postes':
      dataPreparada = dataToExport.map(item => ({
        'ID Poste': item.id,
        'Nombre': item.nombre,
        'Zona': item.zona,
        'Ubicación': item.ubicacion,
        'Estado Conexión': item.estado,
        'LED Encendido': item.encendido,
        'Intensidad LED': item.intensidad,
        'Modo Operación': item.modoAutomatico,
        'Consumo Actual (W)': item.consumoActual,
        'Eficiencia (%)': item.eficiencia,
        'Dirección IP': item.ip,
        'Versión Hardware': item.version,
        'Versión Firmware': item.firmware,
        'Última Actualización': item.ultimaActualizacion
      }));
      break;
    case 'eventos':
      dataPreparada = dataToExport.map(item => ({
        'Fecha': item.fecha,
        'Poste': item.posteNombre,
        'ID Poste': item.posteId,
        'Zona': item.zona,
        'Tipo Evento': item.tipo,
        'Categoría': item.categoria,
        'Descripción': item.descripcion,
        'Prioridad': item.prioridad,
        'Usuario/Sistema': item.usuario
      }));
      break;
    case 'estadisticas':
      dataPreparada = dataToExport.map(item => ({
        'Zona': item.zona,
        'Total Postes': item.totalPostes,
        'Postes Online': item.postesOnline,
        'Porcentaje Online': `${item.porcentajeOnline}%`,
        'Postes Encendidos': item.postesEncendidos,
        'Porcentaje Encendidos': `${item.porcentajeEncendidos}%`,
        'Consumo Total (W)': item.consumoTotal,
        'Consumo Promedio (W)': item.consumoPromedio,
        'Eficiencia Promedio (%)': item.eficienciaPromedio,
        'Detecciones PIR': item.deteccionesPIR,
        'Fecha Estadística': item.fecha
      }));
      break;
    case 'consumos':
      dataPreparada = dataToExport.map(item => ({
        'Poste': item.posteNombre,
        'ID Poste': item.posteId,
        'Zona': item.zona,
        'Consumo Actual (W)': item.consumoActual,
        'Consumo Hoy (kWh)': item.consumoHoy,
        'Costo Hoy (Bs.)': item.costoHoy,
        'Eficiencia (%)': item.eficiencia,
        'Tiempo Encendido': item.tiempoEncendido,
        'Ahorro Energético (W)': item.ahorroEnergetico,
        'Fecha': item.fecha
      }));
      break;
    case 'sensores':
      dataPreparada = dataToExport.map(item => ({
        'Poste': item.posteNombre,
        'ID Poste': item.posteId,
        'Zona': item.zona,
        'LDR Valor Raw': item.ldrValor,
        'LDR Luminosidad (lux)': item.ldrLux,
        'LDR Estado': item.ldrEstado,
        'PIR Detecciones Hoy': item.pirDetecciones,
        'PIR Movimiento Actual': item.pirMovimiento,
        'PIR Estado': item.pirEstado,
        'Corriente (A)': item.corriente,
        'Voltaje (V)': item.voltaje,
        'ACS712 Estado': item.acs712Estado,
        'Fecha Lectura': item.fecha
      }));
      break;
    case 'alertas':
      dataPreparada = dataToExport.map(item => ({
        'Fecha': item.fecha,
        'Poste': item.posteNombre,
        'ID Poste': item.posteId,
        'Zona': item.zona,
        'Tipo Alerta': item.tipo,
        'Descripción': item.descripcion,
        'Prioridad': item.prioridad,
        'Estado Alerta': item.estado
      }));
      break;
    default:
      dataPreparada = dataToExport.map(item => {
        const itemLimpio = {...item};
        delete itemLimpio.raw;
        delete itemLimpio.id;
        return itemLimpio;
      });
  }
  
  const csvOptions = {
    delimiter: delimiter,
    header: true,
    quotes: true,
    quoteChar: '"',
    escapeChar: '"'
  };

  const csv = Papa.unparse(dataPreparada, csvOptions);
  const csvContent = '\uFEFF' + csv;
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Función para generar vista HTML optimizada para PDF (adaptada para postes)
const generarVistaHTML = (dataToExport, columns, title, subtitle, extraInfo = '') => {
  // Validar datos de entrada
  if (!dataToExport || !Array.isArray(dataToExport)) {
    console.warn('Datos de exportación inválidos');
    return '';
  }
  
  if (!columns || !Array.isArray(columns)) {
    console.warn('Columnas inválidas');
    return '';
  }

  // Escapar HTML para prevenir XSS
  const escapeHtml = (text) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  // Generar filas de la tabla de forma segura
  const tableRows = dataToExport.map(row => {
    if (!Array.isArray(row)) return '';
    
    const cells = row.map(cell => {
      const cellContent = cell !== null && cell !== undefined ? String(cell) : '';
      return `<td>${escapeHtml(cellContent)}</td>`;
    }).join('');
    
    return `<tr>${cells}</tr>`;
  }).join('');
  
  // Procesar información extra de métricas
  const metricsSection = extraInfo ? `
    <div class="metrics-section">
      <h3>📊 Resumen Ejecutivo del Sistema</h3>
      <div class="metrics-content">
        ${extraInfo.split('\n')
          .filter(line => line.trim())
          .map(line => `<div class="metric-item">${escapeHtml(line.trim())}</div>`)
          .join('')}
      </div>
    </div>
  ` : '';
  
  // Generar encabezados de tabla de forma segura
  const tableHeaders = columns.map(col => `<th>${escapeHtml(col)}</th>`).join('');
  
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${escapeHtml(title)} - Sistema de Iluminación Inteligente</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          line-height: 1.4;
          color: #333;
          background: #fff;
          padding: 20px;
        }
        
        .container {
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .header {
          text-align: center;
          margin-bottom: 40px;
          padding-bottom: 20px;
          border-bottom: 3px solid #0066FF;
        }
        
        .company-name {
          font-size: 32px;
          font-weight: 900;
          color: #003D82;
          margin-bottom: 10px;
          letter-spacing: -0.5px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
        }
        
        .company-icon {
          font-size: 36px;
          background: linear-gradient(135deg, #0066FF, #00A8FF);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .report-title {
          font-size: 24px;
          color: #003D82;
          margin-bottom: 8px;
          font-weight: 600;
        }
        
        .report-subtitle {
          font-size: 16px;
          color: #666;
          margin-bottom: 8px;
        }
        
        .generation-info {
          font-size: 14px;
          color: #888;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        
        .controls {
          margin-bottom: 30px;
          text-align: center;
        }
        
        .print-button {
          background: linear-gradient(135deg, #0066FF 0%, #00A8FF 100%);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(0, 102, 255, 0.3);
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        
        .print-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 102, 255, 0.4);
        }
        
        .print-button:active {
          transform: translateY(0);
        }
        
        .data-table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        
        .data-table th {
          background: linear-gradient(135deg, #0066FF 0%, #00A8FF 100%);
          color: white;
          padding: 12px 8px;
          text-align: left;
          font-weight: 600;
          font-size: 13px;
          border: none;
        }
        
        .data-table td {
          padding: 10px 8px;
          border-bottom: 1px solid #f0f0f0;
          font-size: 12px;
          vertical-align: top;
        }
        
        .data-table tr:nth-child(even) {
          background-color: #f8f9fa;
        }
        
        .data-table tr:hover {
          background-color: #e3f2fd;
        }
        
        .data-table tr:last-child td {
          border-bottom: none;
        }
        
        .metrics-section {
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          padding: 25px;
          border-radius: 12px;
          margin-top: 30px;
          border-left: 5px solid #0066FF;
        }
        
        .metrics-section h3 {
          color: #003D82;
          margin-bottom: 15px;
          font-size: 20px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .metrics-content {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 10px;
        }
        
        .metric-item {
          background: white;
          padding: 12px 16px;
          border-radius: 8px;
          border-left: 3px solid #0066FF;
          font-size: 14px;
          font-weight: 500;
          color: #333;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .footer {
          text-align: center;
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #eee;
          color: #999;
          font-size: 12px;
        }
        
        .stats-summary {
          display: flex;
          justify-content: space-around;
          margin: 20px 0;
          flex-wrap: wrap;
          gap: 15px;
        }
        
        .stat-card {
          background: white;
          padding: 15px;
          border-radius: 8px;
          text-align: center;
          min-width: 120px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          border-top: 3px solid #0066FF;
        }
        
        .stat-number {
          font-size: 24px;
          font-weight: 700;
          color: #003D82;
          display: block;
        }
        
        .stat-label {
          font-size: 12px;
          color: #666;
          margin-top: 5px;
        }
        
        .system-info {
          background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
          padding: 20px;
          border-radius: 10px;
          margin-bottom: 20px;
          border: 1px solid #90caf9;
        }
        
        .system-info h4 {
          color: #003D82;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .system-info p {
          color: #555;
          margin-bottom: 5px;
          font-size: 14px;
        }
        
        @media print {
          .no-print {
            display: none !important;
          }
          
          body {
            background: white !important;
            padding: 10mm !important;
          }
          
          .container {
            max-width: none !important;
            margin: 0 !important;
          }
          
          .data-table {
            font-size: 10px !important;
            page-break-inside: avoid;
          }
          
          .data-table th {
            padding: 8px 6px !important;
          }
          
          .data-table td {
            padding: 6px 6px !important;
          }
          
          .metrics-section {
            page-break-inside: avoid;
            background: #f8f9fa !important;
          }
          
          .header {
            page-break-after: avoid;
          }
          
          @page {
            margin: 15mm;
            size: A4;
          }
        }
        
        @media screen and (max-width: 768px) {
          .data-table {
            font-size: 11px;
          }
          
          .data-table th,
          .data-table td {
            padding: 6px 4px;
          }
          
          .metrics-content {
            grid-template-columns: 1fr;
          }
          
          .company-name {
            font-size: 28px;
          }
          
          .stats-summary {
            flex-direction: column;
            align-items: center;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="company-name">
            <span class="company-icon">💡</span>
            SISTEMA DE ILUMINACIÓN INTELIGENTE
          </div>
          <div class="report-title">${escapeHtml(title)}</div>
          <div class="report-subtitle">${escapeHtml(subtitle)}</div>
          <div class="generation-info">
            <span>📅</span>
            Generado: ${new Date().toLocaleString('es-ES')}
          </div>
        </div>
        
        <div class="system-info">
          <h4>🏠 Información del Sistema</h4>
          <p><strong>📍 Ubicación:</strong> Santa Cruz de la Sierra, Bolivia</p>
          <p><strong>🌐 Sistema:</strong> Red de Iluminación Pública Inteligente</p>
          <p><strong>⚡ Tecnología:</strong> LEDs con Control Automático y Sensores IoT</p>
          <p><strong>📊 Monitoreo:</strong> Tiempo Real con Firebase</p>
        </div>
        
        <div class="controls no-print">
          <button class="print-button" onclick="window.print()">
            🖨️ Imprimir/Guardar como PDF
          </button>
          <p style="margin-top: 10px; color: #666; font-size: 14px;">
            💡 Tip: Use Ctrl+P (Cmd+P en Mac) para guardar como PDF
          </p>
        </div>
        
        <div class="stats-summary">
          <div class="stat-card">
            <span class="stat-number">${dataToExport.length}</span>
            <div class="stat-label">📊 Total de Registros</div>
          </div>
          <div class="stat-card">
            <span class="stat-number">${columns.length}</span>
            <div class="stat-label">📋 Columnas de Datos</div>
          </div>
          <div class="stat-card">
            <span class="stat-number">${new Date().toLocaleDateString('es-ES')}</span>
            <div class="stat-label">📅 Fecha de Reporte</div>
          </div>
          <div class="stat-card">
            <span class="stat-number">🔥</span>
            <div class="stat-label">⚡ Datos en Tiempo Real</div>
          </div>
        </div>
        
        <table class="data-table">
          <thead>
            <tr>${tableHeaders}</tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        
        ${metricsSection}
        
        <div class="footer">
          <p>© ${new Date().getFullYear()} Sistema de Iluminación Inteligente - Santa Cruz, Bolivia</p>
          <p>💡 Reporte generado automáticamente el ${new Date().toLocaleString('es-ES')} desde el sistema de monitoreo IoT</p>
          <p>🌐 Datos obtenidos en tiempo real mediante Firebase | ⚡ Sistema de control automático con sensores LDR y PIR</p>
        </div>
      </div>
      
      <script>
        // Función para imprimir directamente sin dependencias externas
        function imprimirReporte() {
          try {
            window.print();
          } catch (error) {
            console.error('Error al intentar imprimir:', error);
            alert('Error al intentar imprimir. Use Ctrl+P manualmente.');
          }
        }
        
        // Auto-focus en la ventana para facilitar el print
        try {
          window.focus();
        } catch (error) {
          console.warn('No se pudo enfocar la ventana:', error);
        }
        
        // Detectar si se abrió para imprimir inmediatamente
        try {
          const urlParams = new URLSearchParams(window.location.search);
          if (urlParams.get('autoprint') === 'true') {
            setTimeout(() => {
              imprimirReporte();
            }, 1000);
          }
        } catch (error) {
          console.warn('Error al procesar parámetros URL:', error);
        }
        
        // Limpiar posibles referencias a librerías externas
        if (typeof window.jsPDF !== 'undefined') {
          delete window.jsPDF;
        }
        if (typeof window.autoTable !== 'undefined') {
          delete window.autoTable;
        }
      </script>
    </body>
    </html>
  `;
};

// Función principal de exportación PDF adaptada para postes
export const exportarPDF = (dataToExport, activeTab, fechaInicio, fechaFin, metricas) => {
  // Validación inicial
  if (!dataToExport || dataToExport.length === 0) {
    alert('No hay datos para exportar');
    return;
  }

  console.log('Generando reporte HTML para sistema de iluminación:', activeTab);

  let columns = [];
  let title = '';
  let subtitle = '';
  let extraInfo = '';
  let processedData = [];

  try {
    // Configurar datos según tipo de reporte
    switch(activeTab) {
      case 'postes':
        processedData = dataToExport.map(p => [
          p.id || '', 
          p.nombre || '', 
          p.zona || '', 
          p.estado === 'Online' ? '🟢 Online' : '🔴 Offline',
          p.encendido === 'Sí' ? '💡 Encendido' : '⚫ Apagado',
          p.intensidad || '0/255 (0%)', 
          p.modoAutomatico === 'Automático' ? '🤖 Auto' : '👤 Manual',
          `⚡ ${p.consumoActual}W`, 
          `📊 ${p.eficiencia}%`,
          p.ip || 'N/A',
          `v${p.version}`,
          p.ultimaActualizacion || 'N/A'
        ]);
        columns = ['ID', 'Nombre', 'Zona', 'Estado', 'LED', 'Intensidad', 'Modo', 'Consumo', 'Eficiencia', 'IP', 'Versión', 'Última Act.'];
        title = '🏠 Reporte de Postes de Iluminación';
        subtitle = `📅 Generado: ${formatDateShort(new Date())}`;
        
        if (metricas && metricas.postes) {
          extraInfo = `🏠 Total de Postes: ${metricas.postes.totalPostes || 0}
🟢 Postes Online: ${metricas.postes.postesOnline || 0} (${((metricas.postes.postesOnline || 0) / Math.max(metricas.postes.totalPostes || 1, 1) * 100).toFixed(1)}%)
💡 Postes Encendidos: ${metricas.postes.postesEncendidos || 0}
🤖 Modo Automático: ${metricas.postes.postesAutomaticos || 0}
⚡ Consumo Total: ${formatEnergy(metricas.postes.consumoTotal || 0)}
📊 Eficiencia Promedio: ${(metricas.postes.eficienciaPromedio || 0).toFixed(1)}%`;
        }
        break;
        
      case 'eventos':
        processedData = dataToExport.map(e => [
          e.fecha || '', 
          e.posteNombre || '', 
          e.zona || '', 
          e.tipo || '',
          e.descripcion.length > 40 ? e.descripcion.substring(0, 37) + '...' : e.descripcion,
          e.prioridad === 'critica' ? '🔴 Crítica' : 
          e.prioridad === 'alta' ? '🟠 Alta' : 
          e.prioridad === 'media' ? '🔵 Media' : '🟢 Baja',
          e.usuario || 'Sistema'
        ]);
        columns = ['Fecha', 'Poste', 'Zona', 'Tipo', 'Descripción', 'Prioridad', 'Usuario'];
        title = '📋 Reporte de Eventos del Sistema';
        subtitle = `📅 Período: ${formatDateShort(fechaInicio)} - ${formatDateShort(fechaFin)}`;
        
        if (metricas && metricas.eventos) {
          extraInfo = `📋 Total de Eventos: ${metricas.eventos.totalEventos || 0}
🔴 Eventos Críticos: ${metricas.eventos.eventosCriticos || 0}
🎮 Eventos de Control: ${metricas.eventos.eventosControl || 0}
🌐 Eventos de Conexión: ${metricas.eventos.eventosConexion || 0}
🔬 Eventos de Sensores: ${metricas.eventos.eventosSensores || 0}`;
        }
        break;
        
      case 'estadisticas':
        processedData = dataToExport.map(s => [
          s.zona || '', 
          s.totalPostes || 0, 
          s.postesOnline || 0, 
          `${s.porcentajeOnline}%`,
          s.postesEncendidos || 0,
          `${s.porcentajeEncendidos}%`,
          `${s.consumoTotal}W`,
          `${s.eficienciaPromedio}%`,
          s.deteccionesPIR || 0
        ]);
        columns = ['Zona', 'Total', 'Online', '% Online', 'Encendidos', '% Encendidos', 'Consumo', 'Eficiencia', 'Detecciones PIR'];
        title = '📊 Estadísticas por Zona';
        subtitle = `📅 Generado: ${formatDateShort(new Date())}`;
        break;
        
      case 'consumos':
        processedData = dataToExport.map(c => [
          c.posteNombre || '', 
          c.zona || '', 
          `⚡ ${c.consumoActual}W`,
          `${c.consumoHoy} kWh`,
          `${formatCurrency(parseFloat(c.costoHoy) || 0)}`,
          `📊 ${c.eficiencia}%`,
          c.tiempoEncendido || '0h 0m',
          `🌱 ${c.ahorroEnergetico}W`
        ]);
        columns = ['Poste', 'Zona', 'Consumo Actual', 'Consumo Hoy', 'Costo Hoy', 'Eficiencia', 'Tiempo Enc.', 'Ahorro'];
        title = '⚡ Reporte de Consumo Energético';
        subtitle = `📅 Generado: ${formatDateShort(new Date())}`;
        
if (metricas && metricas.consumos) {
          extraInfo = `⚡ Consumo Total: ${formatEnergy(metricas.consumos.consumoTotal || 0)}
📊 Consumo Promedio: ${formatEnergy(metricas.consumos.consumoPromedio || 0)}
💰 Costo Total: ${formatCurrency(metricas.consumos.costoTotal || 0)}
🎯 Eficiencia Promedio: ${(metricas.consumos.eficienciaPromedio || 0).toFixed(1)}%
🌱 Ahorro Energético: ${formatEnergy(metricas.consumos.ahorroEnergetico || 0)}`;
        }
        break;
        
      case 'sensores':
        processedData = dataToExport.map(s => [
          s.posteNombre || '', 
          s.zona || '', 
          s.ldrValor || '0',
          `☀️ ${s.ldrLux} lux`,
          s.ldrEstado === 'Funcionando' ? '✅ OK' : '❌ Error',
          `👁️ ${s.pirDetecciones}`,
          s.pirMovimiento === 'Sí' ? '🚶 Sí' : '🕳️ No',
          s.pirEstado === 'Funcionando' ? '✅ OK' : '❌ Error',
          `⚡ ${s.corriente}A`,
          `🔌 ${s.voltaje}V`,
          s.acs712Estado === 'Funcionando' ? '✅ OK' : '❌ Error'
        ]);
        columns = ['Poste', 'Zona', 'LDR Raw', 'Luminosidad', 'LDR Estado', 'PIR Detect.', 'Movimiento', 'PIR Estado', 'Corriente', 'Voltaje', 'ACS712'];
        title = '🔬 Reporte de Sensores';
        subtitle = `📅 Generado: ${formatDateShort(new Date())}`;
        break;
        
      case 'alertas':
        processedData = dataToExport.map(a => [
          a.fecha || '', 
          a.posteNombre || '', 
          a.zona || '', 
          a.tipo || '',
          a.descripcion.length > 45 ? a.descripcion.substring(0, 42) + '...' : a.descripcion,
          a.prioridad === 'critica' ? '🔴 Crítica' : 
          a.prioridad === 'alta' ? '🟠 Alta' : 
          a.prioridad === 'media' ? '🔵 Media' : '🟢 Baja',
          a.estado === 'activa' ? '🚨 Activa' : '✅ Resuelta'
        ]);
        columns = ['Fecha', 'Poste', 'Zona', 'Tipo', 'Descripción', 'Prioridad', 'Estado'];
        title = '⚠️ Reporte de Alertas del Sistema';
        subtitle = `📅 Generado: ${formatDateShort(new Date())}`;
        break;
        
      default:
        throw new Error('Tipo de reporte no válido para sistema de iluminación');
    }

    // Generar HTML y abrir en nueva ventana
    const htmlContent = generarVistaHTML(processedData, columns, title, subtitle, extraInfo);
    
    // Usar un identificador único para evitar problemas de caché
    const timestamp = new Date().getTime();
    const windowName = `reporte_iluminacion_${activeTab}_${timestamp}`;
    
    // Configuración de ventana más específica
    const windowFeatures = [
      'width=1200',
      'height=800',
      'scrollbars=yes',
      'resizable=yes',
      'toolbar=no',
      'location=no',
      'directories=no',
      'status=no',
      'menubar=no',
      'copyhistory=no'
    ].join(',');
    
    const printWindow = window.open('', windowName, windowFeatures);
    
    if (!printWindow) {
      throw new Error('Las ventanas emergentes están bloqueadas. Por favor, permita las ventanas emergentes para generar el reporte.');
    }
    
    // Limpiar y escribir el contenido
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Esperar a que la ventana cargue completamente
    printWindow.onload = function() {
      printWindow.focus();
      
      // Mostrar instrucciones después de un breve delay
      setTimeout(() => {
        alert('✅ Reporte del sistema de iluminación generado exitosamente!\n\n💡 En la nueva ventana:\n• Presiona Ctrl+P (Cmd+P en Mac)\n• Selecciona "Guardar como PDF"\n• Ajusta la configuración si es necesario\n\n🏠 El reporte incluye datos en tiempo real del sistema IoT');
      }, 500);
    };
    
    // Fallback si onload no funciona
    setTimeout(() => {
      if (printWindow && !printWindow.closed) {
        printWindow.focus();
      }
    }, 1000);
    
  } catch (error) {
    console.error('Error al generar reporte del sistema de iluminación:', error);
    
    // Mensaje de error más específico
    let errorMessage = 'Error al generar el reporte del sistema de iluminación.';
    
    if (error.message.includes('ventanas emergentes')) {
      errorMessage = 'Error: Las ventanas emergentes están bloqueadas. Por favor, permita las ventanas emergentes en su navegador para generar reportes.';
    } else if (error.message.includes('no válido')) {
      errorMessage = 'Error: Tipo de reporte no válido para el sistema de iluminación. Por favor, seleccione una categoría válida.';
    } else {
      errorMessage = `Error al generar el reporte: ${error.message}. Por favor, intente nuevamente o contacte al administrador del sistema.`;
    }
    
    alert(errorMessage);
  }
};

// Función auxiliar para exportar datos específicos del sistema de iluminación
export const exportarDatosPersonalizados = (datos, configuracion) => {
  const {
    tipo = 'csv',
    campos = [],
    filtros = {},
    nombre = 'datos_sistema_iluminacion'
  } = configuracion;

  try {
    // Aplicar filtros si existen
    let datosFiltrados = datos;
    
    if (filtros.zona) {
      datosFiltrados = datosFiltrados.filter(item => item.zona === filtros.zona);
    }
    
    if (filtros.estado) {
      datosFiltrados = datosFiltrados.filter(item => item.estado === filtros.estado);
    }
    
    if (filtros.fechaInicio && filtros.fechaFin) {
      datosFiltrados = datosFiltrados.filter(item => {
        const fechaItem = new Date(item.fecha || item.timestamp);
        return fechaItem >= filtros.fechaInicio && fechaItem <= filtros.fechaFin;
      });
    }

    // Preparar datos según campos especificados
    const datosPreparados = datosFiltrados.map(item => {
      const registro = {};
      campos.forEach(campo => {
        if (typeof campo === 'string') {
          registro[campo] = item[campo] || '';
        } else if (typeof campo === 'object') {
          registro[campo.nombre] = campo.transformar ? campo.transformar(item[campo.campo]) : item[campo.campo] || '';
        }
      });
      return registro;
    });

    if (tipo === 'csv') {
      const csv = Papa.unparse(datosPreparados, {
        delimiter: ';',
        header: true,
        quotes: true
      });
      
      const csvContent = '\uFEFF' + csv;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${nombre}_${formatDateShort(new Date()).replace(/\//g, '-')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (tipo === 'json') {
      const jsonContent = JSON.stringify(datosPreparados, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${nombre}_${formatDateShort(new Date()).replace(/\//g, '-')}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    return {
      exito: true,
      registros: datosPreparados.length,
      mensaje: `Exportación completada: ${datosPreparados.length} registros`
    };

  } catch (error) {
    console.error('Error en exportación personalizada:', error);
    return {
      exito: false,
      error: error.message,
      mensaje: 'Error en la exportación personalizada'
    };
  }
};

// Función para generar reporte consolidado del sistema
export const generarReporteConsolidado = async (datosCompletos, configuracion = {}) => {
  const {
    incluirPostes = true,
    incluirEventos = true,
    incluirConsumos = true,
    incluirAlertas = true,
    formato = 'pdf'
  } = configuracion;

  try {
    let contenidoCompleto = '';
    let metricas = {};

    // Recopilar métricas generales
    if (datosCompletos.postes) {
      metricas.totalPostes = datosCompletos.postes.length;
      metricas.postesOnline = datosCompletos.postes.filter(p => p.estado === 'Online').length;
    }

    if (datosCompletos.eventos) {
      metricas.totalEventos = datosCompletos.eventos.length;
      metricas.eventosCriticos = datosCompletos.eventos.filter(e => e.prioridad === 'critica').length;
    }

    if (datosCompletos.alertas) {
      metricas.alertasActivas = datosCompletos.alertas.filter(a => a.estado === 'activa').length;
    }

    // Generar secciones del reporte
    const secciones = [];

    if (incluirPostes && datosCompletos.postes) {
      secciones.push({
        titulo: '🏠 Estado de Postes',
        datos: datosCompletos.postes,
        tipo: 'postes'
      });
    }

    if (incluirEventos && datosCompletos.eventos) {
      secciones.push({
        titulo: '📋 Eventos Recientes',
        datos: datosCompletos.eventos.slice(0, 50), // Últimos 50 eventos
        tipo: 'eventos'
      });
    }

    if (incluirConsumos && datosCompletos.consumos) {
      secciones.push({
        titulo: '⚡ Análisis de Consumo',
        datos: datosCompletos.consumos,
        tipo: 'consumos'
      });
    }

    if (incluirAlertas && datosCompletos.alertas) {
      secciones.push({
        titulo: '⚠️ Alertas del Sistema',
        datos: datosCompletos.alertas.filter(a => a.estado === 'activa'),
        tipo: 'alertas'
      });
    }

    // Crear reporte consolidado
    const tituloReporte = '📊 Reporte Consolidado del Sistema de Iluminación';
    const subtituloReporte = `📅 Generado: ${formatDateShort(new Date())} | 🏠 ${metricas.totalPostes || 0} Postes | 📋 ${metricas.totalEventos || 0} Eventos`;
    
    const metricsInfo = `🏠 Total de Postes: ${metricas.totalPostes || 0}
🟢 Postes Online: ${metricas.postesOnline || 0}
📋 Total de Eventos: ${metricas.totalEventos || 0}
🔴 Eventos Críticos: ${metricas.eventosCriticos || 0}
⚠️ Alertas Activas: ${metricas.alertasActivas || 0}
📊 Estado del Sistema: ${metricas.alertasActivas === 0 ? '✅ Operativo' : '⚠️ Requiere Atención'}`;

    if (formato === 'pdf') {
      // Generar PDF consolidado
      exportarPDF(
        secciones.map(s => s.datos).flat(),
        'consolidado',
        new Date(),
        new Date(),
        { consolidado: metricas }
      );
    } else if (formato === 'csv') {
      // Generar CSV con todas las secciones
      const datosConsolidados = secciones.map(seccion => ({
        tipo: seccion.tipo,
        titulo: seccion.titulo,
        cantidad: seccion.datos.length,
        datos: seccion.datos
      }));
      
      exportarCSV(datosConsolidados, 'consolidado', new Date(), new Date(), 'es');
    }

    return {
      exito: true,
      secciones: secciones.length,
      totalRegistros: secciones.reduce((total, s) => total + s.datos.length, 0),
      mensaje: 'Reporte consolidado generado exitosamente'
    };

  } catch (error) {
    console.error('Error al generar reporte consolidado:', error);
    return {
      exito: false,
      error: error.message,
      mensaje: 'Error al generar el reporte consolidado'
    };
  }
};