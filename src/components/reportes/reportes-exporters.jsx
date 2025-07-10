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

// Función para formatear moneda
const formatCurrency = (value) => {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN'
  }).format(value);
};

// Función para exportar datos a CSV (sin cambios)
export const exportarCSV = (dataToExport, activeTab, fechaInicio, fechaFin, idioma) => {
  let fileName = '';
  let delimiter = idioma === 'es' ? ';' : ',';
  
  switch(activeTab) {
    case 'viajes':
      fileName = `viajes_${formatDateShort(fechaInicio).replace(/\//g, '-')}_a_${formatDateShort(fechaFin).replace(/\//g, '-')}.csv`;
      break;
    case 'conductores':
      fileName = `conductores_${formatDateShort(new Date()).replace(/\//g, '-')}.csv`;
      break;
    case 'solicitudes':
      fileName = `solicitudes_${formatDateShort(new Date()).replace(/\//g, '-')}.csv`;
      break;
    case 'admins':
      fileName = `administradores_${formatDateShort(new Date()).replace(/\//g, '-')}.csv`;
      break;
    case 'grabaciones':
      fileName = `grabaciones_${formatDateShort(new Date()).replace(/\//g, '-')}.csv`;
      break;
    case 'logs':
      fileName = `logs_${formatDateShort(new Date()).replace(/\//g, '-')}.csv`;
      break;
    default:
      alert('No hay datos para exportar');
      return;
  }

  let dataPreparada = [];
  
  switch(activeTab) {
    case 'viajes':
      dataPreparada = dataToExport.map(item => ({
        Fecha: item.fecha,
        Origen: item.origen,
        Destino: item.destino,
        Estado: item.estado,
        Conductor: item.conductor,
        Cliente: item.cliente,
        Precio: item.precio,
        'Distancia (km)': item.distancia,
        'Duración (min)': item.duracion,
        Calificación: item.calificacion,
        'Tipo de Viaje': item.tipoViaje
      }));
      break;
    case 'conductores':
      dataPreparada = dataToExport.map(item => ({
        Nombre: item.nombre,
        Email: item.email,
        Teléfono: item.telefono,
        Licencia: item.licencia,
        'Categoría Licencia': item.licencia_categoria,
        'Fecha Registro': item.fechaRegistro,
        Estado: item.estado,
        'Viajes Realizados': item.viajesRealizados,
        'Calificación Promedio': item.calificacionPromedio,
        'Modelo Vehículo': item.modelo_vehiculo,
        'Placa Vehículo': item.placa_vehiculo
      }));
      break;
    case 'solicitudes':
      dataPreparada = dataToExport.map(item => ({
        Nombre: item.nombre,
        Email: item.email,
        Teléfono: item.telefono,
        Licencia: item.licencia,
        'Categoría Licencia': item.licencia_categoria,
        'Fecha Solicitud': item.fechaSolicitud,
        Estado: item.estado,
        'Documentos Completos': item.documentosCompletos ? 'Sí' : 'No',
        'Fecha Aprobación': item.fecha_aprobacion || 'N/A',
        'Modelo Vehículo': item.modelo_vehiculo,
        'Placa Vehículo': item.placa_vehiculo
      }));
      break;
    case 'admins':
      dataPreparada = dataToExport.map(item => ({
        Nombre: item.nombre,
        Email: item.email,
        Rol: item.rol,
        'Fecha Registro': item.fechaRegistro,
        'Último Acceso': item.ultimoAcceso,
        'Acciones Realizadas': item.accionesRealizadas,
        Estado: item.active ? 'Activo' : 'Inactivo'
      }));
      break;
    case 'grabaciones':
      dataPreparada = dataToExport.map(item => ({
        'ID Viaje': item.viajeId,
        'ID Conductor': item.conductorId,
        Fecha: item.fecha,
        Duración: item.duracion,
        Tamaño: item.tamaño,
        Estado: item.estado,
        Visualizaciones: item.visualizaciones
      }));
      break;
    case 'logs':
      dataPreparada = dataToExport.map(item => ({
        Fecha: item.fecha,
        Usuario: item.usuario,
        Acción: item.accion,
        Módulo: item.modulo,
        Detalles: item.detalles,
        Resultado: item.resultado
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

// Función para generar vista HTML optimizada para PDF (sin dependencias externas)
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
      <h3>📊 Resumen Ejecutivo</h3>
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
      <title>${escapeHtml(title)} - Viaje Seguro</title>
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
          border-bottom: 3px solid #00AF87;
        }
        
        .company-name {
          font-size: 32px;
          font-weight: 900;
          color: #002F6C;
          margin-bottom: 10px;
          letter-spacing: -0.5px;
        }
        
        .report-title {
          font-size: 24px;
          color: #002F6C;
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
        }
        
        .controls {
          margin-bottom: 30px;
          text-align: center;
        }
        
        .print-button {
          background: linear-gradient(135deg, #00AF87 0%, #008a6a 100%);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(0, 175, 135, 0.3);
        }
        
        .print-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 175, 135, 0.4);
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
          background: linear-gradient(135deg, #00AF87 0%, #008a6a 100%);
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
          background-color: #e8f5f1;
        }
        
        .data-table tr:last-child td {
          border-bottom: none;
        }
        
        .metrics-section {
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          padding: 25px;
          border-radius: 12px;
          margin-top: 30px;
          border-left: 5px solid #00AF87;
        }
        
        .metrics-section h3 {
          color: #002F6C;
          margin-bottom: 15px;
          font-size: 20px;
          font-weight: 700;
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
          border-left: 3px solid #00AF87;
          font-size: 14px;
          font-weight: 500;
          color: #333;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
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
          border-top: 3px solid #00AF87;
        }
        
        .stat-number {
          font-size: 24px;
          font-weight: 700;
          color: #002F6C;
          display: block;
        }
        
        .stat-label {
          font-size: 12px;
          color: #666;
          margin-top: 5px;
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
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="company-name">🚗 VIAJE SEGURO</div>
          <div class="report-title">${escapeHtml(title)}</div>
          <div class="report-subtitle">${escapeHtml(subtitle)}</div>
          <div class="generation-info">Generado: ${new Date().toLocaleString('es-ES')}</div>
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
            <div class="stat-label">Total de Registros</div>
          </div>
          <div class="stat-card">
            <span class="stat-number">${columns.length}</span>
            <div class="stat-label">Columnas</div>
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
          <p>© ${new Date().getFullYear()} Viaje Seguro - Sistema de Reportes y Estadísticas</p>
          <p>Este reporte fue generado automáticamente el ${new Date().toLocaleString('es-ES')}</p>
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

// Función principal de exportación PDF (solo HTML, sin jsPDF)
export const exportarPDF = (dataToExport, activeTab, fechaInicio, fechaFin, metricas) => {
  // Validación inicial
  if (!dataToExport || dataToExport.length === 0) {
    alert('No hay datos para exportar');
    return;
  }

  console.log('Generando reporte HTML para:', activeTab);

  let columns = [];
  let title = '';
  let subtitle = '';
  let extraInfo = '';
  let processedData = [];

  try {
    // Configurar datos según tipo de reporte
    switch(activeTab) {
      case 'viajes':
        processedData = dataToExport.map(v => [
          v.fecha || '', 
          (v.origen || '').length > 25 ? (v.origen || '').substring(0, 22) + '...' : (v.origen || ''), 
          (v.destino || '').length > 25 ? (v.destino || '').substring(0, 22) + '...' : (v.destino || ''), 
          v.estado || '', 
          (v.conductor || '').length > 20 ? (v.conductor || '').substring(0, 17) + '...' : (v.conductor || ''), 
          (v.cliente || '').length > 20 ? (v.cliente || '').substring(0, 17) + '...' : (v.cliente || ''), 
          formatCurrency(v.precio || 0), 
          `${(v.distancia || 0).toFixed(1)} km`, 
          `${v.duracion || 0} min`, 
          `⭐ ${v.calificacion || 0}`
        ]);
        columns = ['Fecha', 'Origen', 'Destino', 'Estado', 'Conductor', 'Cliente', 'Precio', 'Distancia', 'Duración', 'Calificación'];
        title = '🚗 Reporte de Viajes';
        subtitle = `📅 Período: ${formatDateShort(fechaInicio)} - ${formatDateShort(fechaFin)}`;
        
        if (metricas && metricas.viajes) {
          extraInfo = `💰 Ganancia Total: ${formatCurrency(metricas.viajes.gananciaTotal || 0)}
✅ Viajes Completados: ${metricas.viajes.viajesCompletados || 0}
❌ Viajes Cancelados: ${metricas.viajes.viajesCancelados || 0}
📏 Distancia Total: ${(metricas.viajes.distanciaTotal || 0).toFixed(1)} km
📊 Distancia Promedio: ${(metricas.viajes.distanciaPromedio || 0).toFixed(1)} km
💵 Tarifa Promedio: ${formatCurrency(metricas.viajes.tarifaPromedio || 0)}`;
        }
        break;
        
      case 'conductores':
        processedData = dataToExport.map(c => [
          c.nombre || '', 
          c.email || '', 
          c.telefono || '', 
          c.licencia || '', 
          c.fechaRegistro || '', 
          c.estado === 'activo' ? '✅ Activo' : '❌ Inactivo', 
          c.viajesRealizados || 0, 
          `⭐ ${(c.calificacionPromedio || 0).toFixed(1)}`,
          c.modelo_vehiculo || '',
          c.placa_vehiculo || ''
        ]);
        columns = ['Nombre', 'Email', 'Teléfono', 'Licencia', 'Registro', 'Estado', 'Viajes', 'Calificación', 'Modelo', 'Placa'];
        title = '👥 Reporte de Conductores';
        subtitle = `📅 Generado: ${formatDateShort(new Date())}`;
        
        if (metricas && metricas.conductores) {
          extraInfo = `✅ Conductores Activos: ${metricas.conductores.activos || 0}
❌ Conductores Inactivos: ${metricas.conductores.inactivos || 0}
🚗 Total de Viajes Realizados: ${metricas.conductores.totalViajes || 0}
⭐ Calificación Promedio: ${(metricas.conductores.calificacionPromedio || 0).toFixed(1)}`;
        }
        break;
        
      case 'solicitudes':
        processedData = dataToExport.map(s => [
          s.nombre || '', 
          s.email || '', 
          s.telefono || '', 
          s.licencia || '', 
          s.fechaSolicitud || '', 
          s.estado === 'aprobada' || s.estado === 'aprobado' ? '✅ Aprobada' : 
          s.estado === 'rechazada' || s.estado === 'rechazado' ? '❌ Rechazada' : 
          '⏳ Pendiente', 
          s.documentosCompletos ? '✅ Completos' : '❌ Incompletos',
          s.fecha_aprobacion || 'N/A',
          s.modelo_vehiculo || ''
        ]);
        columns = ['Nombre', 'Email', 'Teléfono', 'Licencia', 'Fecha Solicitud', 'Estado', 'Documentos', 'Fecha Aprobación', 'Vehículo'];
        title = '📋 Reporte de Solicitudes';
        subtitle = `📅 Generado: ${formatDateShort(new Date())}`;
        
        if (metricas && metricas.solicitudes) {
          extraInfo = `⏳ Pendientes: ${metricas.solicitudes.pendientes || 0}
✅ Aprobadas: ${metricas.solicitudes.aprobadas || 0}
❌ Rechazadas: ${metricas.solicitudes.rechazadas || 0}
⏰ Tiempo Promedio de Aprobación: ${(metricas.solicitudes.tiempoPromedioAprobacion || 0).toFixed(1)} horas`;
        }
        break;
        
      case 'admins':
        processedData = dataToExport.map(a => [
          a.nombre || '', 
          a.email || '', 
          a.rol || '', 
          a.fechaRegistro || '', 
          a.ultimoAcceso || '', 
          a.accionesRealizadas || 0,
          a.active ? '✅ Activo' : '❌ Inactivo'
        ]);
        columns = ['Nombre', 'Email', 'Rol', 'Registro', 'Último Acceso', 'Acciones', 'Estado'];
        title = '🛡️ Reporte de Administradores';
        subtitle = `📅 Generado: ${formatDateShort(new Date())}`;
        break;
        
      case 'grabaciones':
        processedData = dataToExport.map(g => [
          g.viajeId || '', 
          g.conductorId || '', 
          g.fecha || '', 
          g.duracion || '', 
          g.tamaño || '', 
          g.estado === 'disponible' ? '✅ Disponible' : 
          g.estado === 'procesando' ? '⏳ Procesando' : '📁 Archivada', 
          g.visualizaciones || 0
        ]);
        columns = ['ID Viaje', 'ID Conductor', 'Fecha', 'Duración', 'Tamaño', 'Estado', 'Visualizaciones'];
        title = '🎥 Reporte de Grabaciones';
        subtitle = `📅 Generado: ${formatDateShort(new Date())}`;
        break;
        
      case 'logs':
        processedData = dataToExport.map(l => [
          l.fecha || '', 
          l.usuario || '',
          l.accion || '', 
          (l.detalles || '').length > 30 ? (l.detalles || '').substring(0, 27) + '...' : (l.detalles || ''), 
          l.modulo || '', 
          l.resultado === 'exitoso' || l.resultado === 'completado' ? '✅ Exitoso' : '❌ Error'
        ]);
        columns = ['Fecha', 'Usuario', 'Acción', 'Detalles', 'Módulo', 'Resultado'];
        title = '📊 Reporte de Logs del Sistema';
        subtitle = `📅 Generado: ${formatDateShort(new Date())}`;
        break;
        
      default:
        throw new Error('Tipo de reporte no válido');
    }

    // Generar HTML y abrir en nueva ventana
    const htmlContent = generarVistaHTML(processedData, columns, title, subtitle, extraInfo);
    
    // Usar un identificador único para evitar problemas de caché
    const timestamp = new Date().getTime();
    const windowName = `reporte_${activeTab}_${timestamp}`;
    
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
        alert('✅ Reporte generado exitosamente!\n\n💡 En la nueva ventana:\n• Presiona Ctrl+P (Cmd+P en Mac)\n• Selecciona "Guardar como PDF"\n• Ajusta la configuración si es necesario');
      }, 500);
    };
    
    // Fallback si onload no funciona
    setTimeout(() => {
      if (printWindow && !printWindow.closed) {
        printWindow.focus();
      }
    }, 1000);
    
  } catch (error) {
    console.error('Error al generar reporte HTML:', error);
    
    // Mensaje de error más específico
    let errorMessage = 'Error al generar el reporte.';
    
    if (error.message.includes('ventanas emergentes')) {
      errorMessage = 'Error: Las ventanas emergentes están bloqueadas. Por favor, permita las ventanas emergentes en su navegador.';
    } else if (error.message.includes('no válido')) {
      errorMessage = 'Error: Tipo de reporte no válido. Por favor, seleccione una categoría válida.';
    } else {
      errorMessage = `Error al generar el reporte: ${error.message}. Por favor, intente nuevamente.`;
    }
    
    alert(errorMessage);
  }
};