// components/SetupSystem.jsx - Componente temporal para configurar el sistema
import React, { useState } from 'react';
import { configurarSistemaCompleto, limpiarDatos } from '../utils/setupSystem';

const SetupSystem = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSetup = async () => {
    setLoading(true);
    setMessage('Configurando sistema...');
    
    try {
      const success = await configurarSistemaCompleto();
      if (success) {
        setMessage('✅ Sistema configurado exitosamente! Puedes iniciar sesión con:');
      } else {
        setMessage('❌ Error al configurar el sistema');
      }
    } catch (error) {
      setMessage('❌ Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCleanup = async () => {
    if (!window.confirm('¿Estás seguro de limpiar todos los datos?')) {
      return;
    }
    
    setLoading(true);
    setMessage('Limpiando datos...');
    
    try {
      await limpiarDatos();
      setMessage('✅ Datos limpiados exitosamente');
    } catch (error) {
      setMessage('❌ Error limpiando datos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '20px',
      backgroundColor: '#f5f5f5'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '10px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        maxWidth: '500px',
        width: '100%'
      }}>
        <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>
          🔧 Configuración del Sistema
        </h2>
        
        <p style={{ textAlign: 'center', marginBottom: '20px', color: '#666' }}>
          Configura el sistema de alumbrado público por primera vez
        </p>
        
        <div style={{ marginBottom: '20px' }}>
          <button 
            onClick={handleSetup}
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              fontSize: '16px',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginBottom: '10px'
            }}
          >
            {loading ? 'Configurando...' : '🚀 Configurar Sistema'}
          </button>
          
          <button 
            onClick={handleCleanup}
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              fontSize: '16px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Limpiando...' : '🧹 Limpiar Datos'}
          </button>
        </div>
        
        {message && (
          <div style={{
            padding: '15px',
            backgroundColor: message.includes('❌') ? '#ffebee' : '#e8f5e8',
            color: message.includes('❌') ? '#c62828' : '#2e7d32',
            borderRadius: '5px',
            marginBottom: '20px',
            whiteSpace: 'pre-line'
          }}>
            {message}
          </div>
        )}
        
        <div style={{
          backgroundColor: '#f0f8ff',
          padding: '15px',
          borderRadius: '5px',
          marginTop: '20px'
        }}>
          <h4 style={{ margin: '0 0 10px 0' }}>📋 Credenciales de Prueba:</h4>
          <p style={{ margin: '5px 0', fontFamily: 'monospace' }}>
            <strong>Admin:</strong> roberto.sea@alto.gov.bo / 123456
          </p>
          <p style={{ margin: '5px 0', fontFamily: 'monospace' }}>
            <strong>Operador:</strong> jose.rojas@alto.gov.bo / 123456
          </p>
        </div>
        
        <div style={{
          backgroundColor: '#fff3cd',
          padding: '15px',
          borderRadius: '5px',
          marginTop: '15px'
        }}>
          <p style={{ margin: '0', fontSize: '14px' }}>
            <strong>⚠️ Nota:</strong> Este componente es solo para desarrollo. 
            Elimínalo en producción.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SetupSystem;