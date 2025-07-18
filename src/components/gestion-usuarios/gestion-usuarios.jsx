import React, { useState, useEffect } from 'react';
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  onSnapshot,
  query,
  where
} from 'firebase/firestore';
import {
  getAuth,
  createUserWithEmailAndPassword,
  updatePassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import { db } from '../../utils/firebase';
import GestionAdmTabla from './gestion-adm-tabla';
import './gestion-usuarios.css';

const GestionUsuarios = () => {
  // Estados para manejo de formularios y datos
  const [formData, setFormData] = useState({
    nombres: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    ci: '',
    genero: 'masculino',
    celular: '',
    correoPersonal: '',
    role: 'receptionist',
  });
  
  // Estados de la aplicación
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [usuarioActual, setUsuarioActual] = useState(null);
  const [modalCambioClave, setModalCambioClave] = useState(false);
  const [nuevaClave, setNuevaClave] = useState('');
  const [confirmarClave, setConfirmarClave] = useState('');
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [notificacion, setNotificacion] = useState({ 
    visible: false, 
    mensaje: '', 
    tipo: '' 
  });
  const [nuevoUsuario, setNuevoUsuario] = useState(null);
  const [activeTab, setActiveTab] = useState('registro');
  const [enviandoEmail, setEnviandoEmail] = useState(false);

  // Configuraciones de autenticación
  const auth = getAuth();
  const DOMAIN = 'vseguro.com';

  // 🔧 FIX 1: Modificar el efecto de autenticación para evitar modal automático
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Buscar información del usuario en Firestore
        const usuarioRef = query(
          collection(db, 'usuarios'), 
          where('uid', '==', user.uid)
        );
        
        const querySnapshot = await getDocs(usuarioRef);
        
        if (!querySnapshot.empty) {
          const usuarioData = querySnapshot.docs[0].data();
          
          // 🔧 CAMBIO CRÍTICO: Solo mostrar modal si es el primer login del usuario ACTUAL
          // y no estamos en proceso de crear un nuevo usuario
          if (usuarioData.requiereCambioPassword && !showNewUserModal) {
            // Verificar si realmente es el primer login de este usuario específico
            // mediante una verificación adicional del tiempo de creación
            const tiempoCreacion = new Date(usuarioData.fechaCreacion).getTime();
            const tiempoActual = new Date().getTime();
            const diferenciaTiempo = tiempoActual - tiempoCreacion;
            
            // Solo mostrar modal si han pasado al menos 30 segundos desde la creación
            // esto evita que aparezca inmediatamente después de crear el usuario
            if (diferenciaTiempo > 30000) {
              setModalCambioClave(true);
              setUsuarioActual({
                ...usuarioData,
                docId: querySnapshot.docs[0].id
              });
            } else {
              setUsuarioActual(usuarioData);
            }
          } else {
            setUsuarioActual(usuarioData);
          }
        }
      }
    });

    return () => unsubscribe();
  }, [auth, showNewUserModal]);

  // Efecto para obtener usuarios
  useEffect(() => {
    const obtenerUsuarios = async () => {
      try {
        const usuariosRef = collection(db, 'usuarios');
        const unsubscribe = onSnapshot(usuariosRef, (snapshot) => {
          const usuariosActualizados = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setUsuarios(usuariosActualizados);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('Error al obtener usuarios:', error);
        mostrarNotificacion('Error al cargar administradores', 'error');
      }
    };

    obtenerUsuarios();
  }, []);

  // Función para mostrar notificaciones
  const mostrarNotificacion = (mensaje, tipo = 'info') => {
    setNotificacion({
      visible: true,
      mensaje,
      tipo
    });
    
    setTimeout(() => {
      setNotificacion(prev => ({ ...prev, visible: false }));
    }, 3000);
  };

  // Función para manejar cambio de contraseña
  const handleCambioClave = async (e) => {
    e.preventDefault();
    
    if (nuevaClave !== confirmarClave) {
      mostrarNotificacion('Las contraseñas no coinciden', 'error');
      return;
    }
    
    if (nuevaClave.length < 8) {
      mostrarNotificacion('La contraseña debe tener al menos 8 caracteres', 'warning');
      return;
    }
    
    const regexMayuscula = /[A-Z]/;
    const regexMinuscula = /[a-z]/;
    const regexNumero = /[0-9]/;
    const regexEspecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/;
    
    if (!regexMayuscula.test(nuevaClave) || 
        !regexMinuscula.test(nuevaClave) || 
        !regexNumero.test(nuevaClave) || 
        !regexEspecial.test(nuevaClave)) {
      mostrarNotificacion('La contraseña debe incluir mayúsculas, minúsculas, números y caracteres especiales', 'warning');
      return;
    }
    
    setLoading(true);
    
    try {
      const user = auth.currentUser;
      await updatePassword(user, nuevaClave);
      
      await updateDoc(doc(db, 'usuarios', usuarioActual.docId), {
        requiereCambioPassword: false,
        fechaCambioClave: new Date().toISOString()
      });
      
      setModalCambioClave(false);
      setNuevaClave('');
      setConfirmarClave('');
      
      mostrarNotificacion('Contraseña cambiada exitosamente', 'success');
    } catch (error) {
      console.error('Error al cambiar contraseña:', error);
      mostrarNotificacion('Error al cambiar contraseña', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Generar correo electrónico basado en nombres
  const generarCorreo = (nombres, apellidoPaterno, apellidoMaterno) => {
    if (!nombres || !apellidoPaterno) return '';
    
    const primeraLetraNombre = nombres.trim().charAt(0).toLowerCase();
    const apellidoPaternoLower = apellidoPaterno.trim().toLowerCase();
    const primeraLetraMaterno = apellidoMaterno ? apellidoMaterno.trim().charAt(0).toLowerCase() : '';
    
    return `${primeraLetraNombre}${apellidoPaternoLower}${primeraLetraMaterno}@${DOMAIN}`;
  };

  // Generar contraseña aleatoria segura
  const generarContraseña = (longitud = 10) => {
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+';
    const caracteresEspeciales = '!@#$%^&*()_+';
    let contraseña = '';
    
    contraseña += caracteres.charAt(Math.floor(Math.random() * 26));
    contraseña += caracteres.charAt(26 + Math.floor(Math.random() * 26));
    contraseña += caracteres.charAt(52 + Math.floor(Math.random() * 10));
    contraseña += caracteresEspeciales.charAt(Math.floor(Math.random() * caracteresEspeciales.length));
    
    for (let i = 4; i < longitud; i++) {
      contraseña += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    
    return contraseña.split('').sort(() => 0.5 - Math.random()).join('');
  };

  // Verificar si el correo ya existe
  const verificarCorreoExistente = async (email) => {
    try {
      const q = query(collection(db, 'usuarios'), where('email', '==', email));
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error al verificar correo:', error);
      return true;
    }
  };

  // Validar correo personal
  const validarCorreoPersonal = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // 🔧 FIX 2: Función mejorada para envío de emails
  // 🔧 FUNCIÓN enviarEmailCredenciales CORREGIDA CON DEBUG
// Reemplaza la función enviarEmailCredenciales en tu GestionUsuarios.jsx (líneas 188-225)

const enviarEmailCredenciales = async (usuarioData, password) => {
  console.log('📧 ========================================');
  console.log('📧 INICIANDO ENVÍO DE EMAIL');
  console.log('📧 ========================================');
  
  setEnviandoEmail(true);
  
  try {
    console.log('📧 Datos del usuario para email:', usuarioData);
    console.log('📮 Correo destino:', usuarioData.correoPersonal);
    console.log('👤 Nombre completo:', `${usuarioData.nombres} ${usuarioData.apellidoPaterno} ${usuarioData.apellidoMaterno || ''}`.trim());
    console.log('📧 Email corporativo:', usuarioData.email);
    console.log('🔑 Contraseña temporal:', password);
    console.log('🎭 Tipo de usuario:', usuarioData.role === 'admin' ? 'Administrador' : 'Recepcionista');
    
    // Preparar payload para el backend
    const payload = {
      destinatario: usuarioData.correoPersonal,
      nombreCompleto: `${usuarioData.nombres} ${usuarioData.apellidoPaterno} ${usuarioData.apellidoMaterno || ''}`.trim(),
      emailCorporativo: usuarioData.email,
      passwordTemporal: password,
      tipo: usuarioData.role === 'admin' ? 'Administrador' : 'Recepcionista'
    };
    
    console.log('📦 Payload para backend:', payload);
    console.log('🌐 URL del backend: http://localhost:5000/api/enviar-credenciales');
    
    // Realizar petición al backend
    console.log('🚀 Enviando petición HTTP...');
    
    const response = await fetch('http://localhost:5000/api/enviar-credenciales', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    console.log('📡 Respuesta recibida:');
    console.log('   Status:', response.status);
    console.log('   Status Text:', response.statusText);
    console.log('   Headers:', Object.fromEntries(response.headers));

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Respuesta exitosa del backend:', result);
      console.log('📧 Message ID:', result.data?.messageId);
      console.log('📮 Destinatario confirmado:', result.data?.destinatario);
      console.log('⏰ Timestamp:', result.data?.timestamp);
      
      mostrarNotificacion('Credenciales enviadas al correo personal exitosamente', 'success');
      
      console.log('✅ ========================================');
      console.log('✅ EMAIL ENVIADO EXITOSAMENTE');
      console.log('✅ ========================================');
      
      return true;
    } else {
      console.error('❌ Error en la respuesta del servidor:');
      console.error('   Status:', response.status);
      console.error('   Status Text:', response.statusText);
      
      let errorData;
      try {
        errorData = await response.json();
        console.error('   Error data:', errorData);
      } catch (parseError) {
        console.error('   No se pudo parsear error data:', parseError);
        const textResponse = await response.text();
        console.error('   Respuesta como texto:', textResponse);
      }
      
      throw new Error(errorData?.message || `Error del servidor: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error('❌ ========================================');
    console.error('❌ ERROR AL ENVIAR EMAIL');
    console.error('❌ ========================================');
    console.error('❌ Error completo:', error);
    console.error('❌ Tipo de error:', error.name);
    console.error('❌ Mensaje:', error.message);
    
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      console.error('🔍 DIAGNÓSTICO: Error de conexión');
      console.error('   • Verificar que el backend esté ejecutándose en puerto 5000');
      console.error('   • Comprobar la URL: http://localhost:5000/api/enviar-credenciales');
      console.error('   • Revisar configuración CORS en el backend');
      mostrarNotificacion('No se pudo conectar con el servidor de correo. Verifique que el backend esté ejecutándose.', 'warning');
    } else if (error.message.includes('CORS')) {
      console.error('🔍 DIAGNÓSTICO: Error de CORS');
      console.error('   • Verificar configuración CORS en server.js');
      console.error('   • Asegurar que el puerto 5173 esté permitido');
      mostrarNotificacion('Error de CORS. Verificar configuración del servidor.', 'warning');
    } else if (error.message.includes('500')) {
      console.error('🔍 DIAGNÓSTICO: Error interno del servidor');
      console.error('   • Verificar configuración de email en el backend (.env)');
      console.error('   • Revisar logs del backend para más detalles');
      mostrarNotificacion('Error interno del servidor de correo. Verificar configuración de email.', 'warning');
    } else {
      console.error('🔍 DIAGNÓSTICO: Error general');
      mostrarNotificacion('Error al enviar credenciales por correo. Las credenciales se muestran en pantalla.', 'warning');
    }
    
    console.error('❌ ========================================');
    return false;
  } finally {
    setEnviandoEmail(false);
    console.log('🏁 Proceso de envío de email finalizado');
  }
};

  // Manejar cambios en inputs del formulario
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // 🔧 FIX 3: Crear nuevo usuario con envío de email mejorado
  // 🔧 FUNCIÓN handleSubmit CORREGIDA CON DEBUG
// Reemplaza la función handleSubmit en tu GestionUsuarios.jsx (líneas 262-390)

const handleSubmit = async (e) => {
  e.preventDefault();
  
  console.log('🚀 Iniciando creación de usuario...');
  console.log('📋 Datos del formulario:', formData);
  
  // Validaciones básicas
  if (!formData.nombres || !formData.apellidoPaterno || !formData.ci || !formData.celular || !formData.correoPersonal) {
    mostrarNotificacion('Por favor, complete todos los campos obligatorios', 'warning');
    return;
  }

  // Validar correo personal
  if (!validarCorreoPersonal(formData.correoPersonal)) {
    mostrarNotificacion('El correo personal no tiene un formato válido', 'warning');
    return;
  }
  
  // Validar CI
  if (!/^\d{5,10}$/.test(formData.ci)) {
    mostrarNotificacion('El carnet debe contener entre 5 y 10 dígitos', 'warning');
    return;
  }
  
  // Validar celular
  if (!/^\d{8}$/.test(formData.celular)) {
    mostrarNotificacion('El número de celular debe contener 8 dígitos', 'warning');
    return;
  }
  
  setLoading(true);
  
  try {
    // Generar correo electrónico
    const email = generarCorreo(formData.nombres, formData.apellidoPaterno, formData.apellidoMaterno);
    console.log('📧 Email corporativo generado:', email);
    
    // Verificar si el correo ya existe
    const correoExistente = await verificarCorreoExistente(email);
    if (correoExistente) {
      mostrarNotificacion(`El correo ${email} ya está registrado en el sistema`, 'error');
      setLoading(false);
      return;
    }
    
    // Generar contraseña aleatoria
    const password = generarContraseña();
    console.log('🔑 Contraseña temporal generada:', password);
    
    // 🔧 GUARDAR USUARIO ACTUAL PARA RESTAURAR SESIÓN
    const currentUser = auth.currentUser;
    console.log('👤 Usuario actual (admin):', currentUser?.email);
    
    // ===== CREAR USUARIO EN FIREBASE AUTH =====
    console.log('🔐 Creando usuario en Firebase Auth...');
    console.log('📧 Email:', email);
    console.log('🔑 Password:', password);
    
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log('✅ Usuario creado en Firebase Auth');
    console.log('🆔 UID generado:', userCredential.user.uid);
    console.log('📧 Email confirmado en Auth:', userCredential.user.email);
    
    // ===== PREPARAR DATOS PARA FIRESTORE =====
    const userData = {
      nombres: formData.nombres.trim(),
      apellidoPaterno: formData.apellidoPaterno.trim(),
      apellidoMaterno: formData.apellidoMaterno?.trim() || '',
      ci: formData.ci.trim(),
      genero: formData.genero,
      celular: formData.celular.trim(),
      correoPersonal: formData.correoPersonal.trim().toLowerCase(),
      email: email,
      role: formData.role,
      uid: userCredential.user.uid,
      active: true,
      requiereCambioPassword: true,
      fechaCreacion: new Date().toISOString()
    };
    
    console.log('💾 Datos para Firestore:', userData);

    // ===== GUARDAR EN FIRESTORE =====
    console.log('💾 Guardando en Firestore...');
    const docRef = await addDoc(collection(db, 'usuarios'), userData);
    console.log('✅ Guardado en Firestore con ID:', docRef.id);
    
    // 🔧 CERRAR SESIÓN DEL NUEVO USUARIO INMEDIATAMENTE
    console.log('🚪 Cerrando sesión del nuevo usuario...');
    await signOut(auth);
    console.log('✅ Sesión del nuevo usuario cerrada');
    
    // ===== PREPARAR DATOS PARA ENVÍO DE EMAIL =====
    const nuevoUsuarioData = { 
      ...userData, 
      password, 
      docId: docRef.id 
    };
    
    console.log('📧 Preparando envío de email...');
    console.log('📮 Destinatario:', nuevoUsuarioData.correoPersonal);
    console.log('👤 Nombre completo:', `${nuevoUsuarioData.nombres} ${nuevoUsuarioData.apellidoPaterno} ${nuevoUsuarioData.apellidoMaterno || ''}`.trim());
    
    // ===== ENVIAR EMAIL =====
    let emailEnviado = false;
    try {
      console.log('📤 Iniciando envío de email...');
      emailEnviado = await enviarEmailCredenciales(nuevoUsuarioData, password);
      console.log('📧 Resultado envío email:', emailEnviado ? 'EXITOSO' : 'FALLÓ');
    } catch (emailError) {
      console.error('❌ Error específico al enviar email:', emailError);
      emailEnviado = false;
    }
    
    // ===== PREPARAR DATOS PARA MODAL =====
    nuevoUsuarioData.emailEnviado = emailEnviado;
    setNuevoUsuario(nuevoUsuarioData);
    
    // ===== RESETEAR FORMULARIO =====
    setFormData({
      nombres: '',
      apellidoPaterno: '',
      apellidoMaterno: '',
      ci: '',
      genero: 'masculino',
      celular: '',
      correoPersonal: '',
      role: 'receptionist',
    });
    
    console.log('📋 Formulario reseteado');
    
    // ===== MOSTRAR MODAL =====
    setShowNewUserModal(true);
    console.log('🪟 Modal de credenciales mostrado');
    
    // ===== NOTIFICACIÓN DE ÉXITO =====
    const mensajeExito = emailEnviado 
      ? 'Administrador creado correctamente. Credenciales enviadas por correo.'
      : 'Administrador creado correctamente. Revise las credenciales en pantalla.';
    mostrarNotificacion(mensajeExito, 'success');
    
    console.log('✅ ========================================');
    console.log('✅ USUARIO CREADO EXITOSAMENTE');
    console.log('✅ ========================================');
    console.log('📧 Email corporativo:', email);
    console.log('🔑 Contraseña temporal:', password);
    console.log('📮 Email enviado:', emailEnviado ? 'SÍ' : 'NO');
    console.log('📥 Correo personal:', nuevoUsuarioData.correoPersonal);
    console.log('✅ ========================================');
    
  } catch (error) {
    console.error('❌ ========================================');
    console.error('❌ ERROR AL CREAR USUARIO');
    console.error('❌ ========================================');
    console.error('❌ Error completo:', error);
    console.error('❌ Código de error:', error.code);
    console.error('❌ Mensaje:', error.message);
    console.error('❌ Stack:', error.stack);
    console.error('❌ ========================================');
    
    let mensajeError = 'Error al crear administrador';
    
    if (error.code === 'auth/email-already-in-use') {
      mensajeError = 'Este correo electrónico ya está en uso';
      console.error('🔍 SUGERENCIA: El email ya existe en Firebase Auth');
    } else if (error.code === 'auth/invalid-email') {
      mensajeError = 'El formato del correo electrónico no es válido';
      console.error('🔍 SUGERENCIA: Verificar formato del email generado');
    } else if (error.code === 'auth/weak-password') {
      mensajeError = 'La contraseña es demasiado débil';
      console.error('🔍 SUGERENCIA: Verificar función generarContraseña()');
    } else if (error.code === 'auth/network-request-failed') {
      mensajeError = 'Error de conexión. Verifique su internet.';
      console.error('🔍 SUGERENCIA: Problema de conectividad');
    }
    
    mostrarNotificacion(mensajeError, 'error');
  } finally {
    setLoading(false);
    console.log('🏁 Proceso de creación finalizado');
  }
};

  // Copiar información al portapapeles
  const copiarAlPortapapeles = (texto) => {
    navigator.clipboard.writeText(texto)
      .then(() => mostrarNotificacion('Información copiada al portapapeles', 'success'))
      .catch(err => mostrarNotificacion('Error al copiar información', 'error'));
  };

  // Renderizado de modal de cambio de contraseña
  const renderModalCambioClave = () => {
    return (
      <div className="modal-overlay">
        <div className="modal-container">
          <div className="modal-header">
            <h3>Cambio de Contraseña Obligatorio</h3>
          </div>
          
          <form onSubmit={handleCambioClave} className="modal-body">
            <p>Por seguridad, debe cambiar su contraseña en el primer inicio de sesión.</p>
            
            <div className="form-group">
              <label htmlFor="nuevaClave">Nueva Contraseña</label>
              <input 
                type="password"
                id="nuevaClave"
                value={nuevaClave}
                onChange={(e) => setNuevaClave(e.target.value)}
                required
                minLength={8}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="confirmarClave">Confirmar Nueva Contraseña</label>
              <input 
                type="password"
                id="confirmarClave"
                value={confirmarClave}
                onChange={(e) => setConfirmarClave(e.target.value)}
                required
                minLength={8}
              />
            </div>
            
            <div className="form-info">
              <p><small>La contraseña debe contener:</small></p>
              <ul>
                <li>Mínimo 8 caracteres</li>
                <li>Al menos una mayúscula</li>
                <li>Al menos una minúscula</li>
                <li>Al menos un número</li>
                <li>Al menos un carácter especial</li>
              </ul>
            </div>
            
            <div className="modal-footer">
              <button 
                type="submit" 
                className="btn-primary" 
                disabled={loading}
              >
                {loading ? 'Cambiando...' : 'Cambiar Contraseña'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Renderizado del formulario de registro
  const renderFormularioRegistro = () => {
    return (
      <div className="usuarios-section">
        <div className="form-card">
          <h3>Registrar Nuevo Administrador</h3>
          
          <form onSubmit={handleSubmit} className="usuario-form">
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="nombres">Nombres *</label>
                <input 
                  type="text" 
                  id="nombres"
                  name="nombres" 
                  value={formData.nombres} 
                  onChange={handleInputChange} 
                  required 
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="apellidoPaterno">Apellido Paterno *</label>
                <input 
                  type="text" 
                  id="apellidoPaterno"
                  name="apellidoPaterno" 
                  value={formData.apellidoPaterno} 
                  onChange={handleInputChange} 
                  required 
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="apellidoMaterno">Apellido Materno</label>
                <input 
                  type="text" 
                  id="apellidoMaterno"
                  name="apellidoMaterno" 
                  value={formData.apellidoMaterno} 
                  onChange={handleInputChange} 
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="ci">Carnet de Identidad *</label>
                <input 
                  type="text" 
                  id="ci"
                  name="ci" 
                  value={formData.ci} 
                  onChange={handleInputChange} 
                  pattern="\d{5,10}"
                  title="El carnet debe contener entre 5 y 10 dígitos"
                  required 
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="genero">Género *</label>
                <select 
                  id="genero"
                  name="genero" 
                  value={formData.genero} 
                  onChange={handleInputChange}
                  required
                >
                  <option value="masculino">Masculino</option>
                  <option value="femenino">Femenino</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="celular">Celular *</label>
                <input 
                  type="tel" 
                  id="celular"
                  name="celular" 
                  value={formData.celular} 
                  onChange={handleInputChange} 
                  pattern="\d{8}"
                  title="El número de celular debe contener 8 dígitos"
                  required 
                />
              </div>

              <div className="form-group">
                <label htmlFor="correoPersonal">Correo Personal *</label>
                <input 
                  type="email" 
                  id="correoPersonal"
                  name="correoPersonal" 
                  value={formData.correoPersonal} 
                  onChange={handleInputChange} 
                  placeholder="ejemplo@gmail.com"
                  title="Ingrese un correo personal válido donde se enviarán las credenciales"
                  required 
                />
                <small className="form-help">
                  📧 Las credenciales de acceso se enviarán a este correo
                </small>
              </div>
              
              <div className="form-group">
                <label htmlFor="role">Tipo de Administrador *</label>
                <select 
                  id="role"
                  name="role" 
                  value={formData.role} 
                  onChange={handleInputChange}
                  required
                >
                  <option value="receptionist">Recepcionista</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            </div>
            
            <div className="form-info">
              <p><small>* Campos obligatorios</small></p>
              <p><small>📧 <strong>Correo institucional:</strong> Se generará automáticamente usando la primera letra del nombre, el apellido paterno completo y la primera letra del apellido materno.</small></p>
              <p><small>🔐 <strong>Contraseña:</strong> Se generará automáticamente y se enviará al correo personal.</small></p>
              <p><small>📨 <strong>Notificación:</strong> Las credenciales de acceso se enviarán automáticamente al correo personal proporcionado.</small></p>
            </div>
            
            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={loading || enviandoEmail}>
                {loading 
                  ? 'Creando...' 
                  : enviandoEmail 
                  ? 'Enviando credenciales...' 
                  : 'Crear Nuevo Administrador'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Renderizado de componente principal
  return (
    <div className="gestion-usuarios-container">
      {/* Modal de cambio de contraseña obligatorio */}
      {modalCambioClave && renderModalCambioClave()}

      {/* Encabezado de sección */}
      <div className="section-header">
        <h2>Panel de Gestión de Administradores</h2>
        <div className="green-underline"></div>
      </div>

      {/* Sistema de pestañas */}
      <div className="tabs-container">
        <div className="tabs-nav">
          <button 
            className={`tab-button ${activeTab === 'registro' ? 'active' : ''}`}
            onClick={() => setActiveTab('registro')}
          >
            <i className="fa fa-plus-circle"></i>
            <span>Registrar Administrador</span>
          </button>
          <button 
            className={`tab-button ${activeTab === 'lista' ? 'active' : ''}`}
            onClick={() => setActiveTab('lista')}
          >
            <i className="fa fa-list"></i>
            <span>Lista de Administradores</span>
          </button>
        </div>
      </div>

      {/* Contenido de las pestañas */}
      <div className="tab-content">
        {activeTab === 'registro' && renderFormularioRegistro()}
        
        {activeTab === 'lista' && (
          <GestionAdmTabla 
            usuarios={usuarios}
            loading={loading}
            mostrarNotificacion={mostrarNotificacion}
            generarContraseña={generarContraseña}
            copiarAlPortapapeles={copiarAlPortapapeles}
            setShowNewUserModal={setShowNewUserModal}
            setNuevoUsuario={setNuevoUsuario}
            showNewUserModal={showNewUserModal}
            nuevoUsuario={nuevoUsuario}
            enviarEmailCredenciales={enviarEmailCredenciales}
          />
        )}
      </div>

      {/* Modal para nuevo usuario */}
      {showNewUserModal && nuevoUsuario && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Nuevo Administrador Creado</h3>
              <button 
                className="close-button" 
                onClick={() => setShowNewUserModal(false)}
              >
                &times;
              </button>
            </div>
            
            <div className="modal-body">
              <h4>Información del Administrador</h4>
              <p><strong>Nombre completo:</strong> {`${nuevoUsuario.nombres} ${nuevoUsuario.apellidoPaterno} ${nuevoUsuario.apellidoMaterno}`}</p>
              <p><strong>Tipo:</strong> {nuevoUsuario.role === 'admin' ? 'Administrador' : 'Recepcionista'}</p>
              <p><strong>Correo personal:</strong> {nuevoUsuario.correoPersonal}</p>

              <div className="credentials-box">
                <h4>Credenciales de Acceso</h4>
                <div className="credential-item">
                  <span><strong>Correo electrónico:</strong> {nuevoUsuario.email}</span>
                </div>
                <div className="credential-item">
                  <span><strong>Contraseña temporal:</strong> {nuevoUsuario.password}</span>
                </div>
              </div>
              
              {/* 🔧 FIX: Mostrar estado del envío de email */}
              {nuevoUsuario.emailEnviado ? (
                <div className="success-box">
                  <i className="fa fa-check-circle"></i>
                  <p><strong>✅ CREDENCIALES ENVIADAS:</strong> Las credenciales de acceso han sido enviadas automáticamente al correo personal: <strong>{nuevoUsuario.correoPersonal}</strong></p>
                </div>
              ) : (
                <div className="warning-box">
                  <i className="fa fa-exclamation-triangle"></i>
                  <p><strong>⚠️ EMAIL NO ENVIADO:</strong> No se pudieron enviar las credenciales automáticamente. Por favor, comparta estas credenciales manualmente con el usuario.</p>
                </div>
              )}
              
              <div className="warning-box">
                <i className="fa fa-exclamation-triangle"></i>
                <p><strong>ADVERTENCIA:</strong> GUARDE ESTAS CREDENCIALES DE ACCESO. EL USUARIO DEBERÁ CAMBIAR SU CONTRASEÑA EN EL PRIMER INICIO DE SESIÓN.</p>
              </div>
              
              <div className="info-box">
                <i className="fa fa-info-circle"></i>
                <p>Por razones de seguridad, estas credenciales no podrán ser recuperadas una vez que cierre esta ventana.</p>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn-copy-all" 
                onClick={() => copiarAlPortapapeles(`Correo: ${nuevoUsuario.email}\nContraseña: ${nuevoUsuario.password}`)}
              >
                <i className="fa fa-copy"></i> Copiar Todas las Credenciales
              </button>
              <button 
                className="btn-primary" 
                onClick={() => setShowNewUserModal(false)}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Sistema de notificaciones */}
      {notificacion.visible && (
        <div className={`notification notification-${notificacion.tipo}`}>
          <span className="notification-message">{notificacion.mensaje}</span>
          <button 
            className="notification-close" 
            onClick={() => setNotificacion(prev => ({ ...prev, visible: false }))}
          >
            <i className="fa fa-times"></i>
          </button>
        </div>
      )}
    </div>
  );
};

export default GestionUsuarios;