// 📧 TEMPLATE DE EMAIL PARA CREDENCIALES - Smart Light
// backend/templates/emailTemplate.js

/**
 * Generar template HTML para email de bienvenida con credenciales
 * @param {Object} data - Datos para personalizar el email
 * @param {string} data.nombreCompleto - Nombre completo del usuario
 * @param {string} data.emailCorporativo - Email corporativo generado
 * @param {string} data.passwordTemporal - Contraseña temporal
 * @param {string} data.tipo - Tipo de administrador (Administrador/Recepcionista)
 * @returns {string} HTML del email
 */
const getWelcomeEmailTemplate = (data) => {
  const fechaEnvio = new Date().toLocaleDateString('es-BO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/La_Paz'
  });

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bienvenido a Smart Light</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
    
    <!-- Contenedor principal -->
    <div style="max-width: 650px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);">
        
        <!-- Header con logo y branding -->
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 40px 30px; text-align: center; position: relative;">
            <img src="https://i.imgur.com/cXkWtJv.png" alt="Smart Light Logo" style="max-width: 120px; height: auto; margin-bottom: 20px; filter: brightness(0) invert(1);">
            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 300; letter-spacing: 1px;">
                Bienvenido a <strong>Smart Light</strong>
            </h1>
            <p style="margin: 10px 0 0 0; color: #fbbf24; font-size: 16px; font-weight: 300;">
                Sistema de Control del Alumbrado Público
            </p>
            <!-- Decorative line -->
            <div style="width: 60px; height: 3px; background-color: #fbbf24; margin: 20px auto 0; border-radius: 2px;"></div>
        </div>
        
        <!-- Contenido principal -->
        <div style="padding: 40px 30px;">
            
            <!-- Saludo personalizado -->
            <div style="margin-bottom: 30px;">
                <h2 style="color: #0f172a; font-size: 24px; font-weight: 400; margin: 0 0 15px 0;">
                    ¡Hola <span style="color: #fbbf24; font-weight: 600;">${data.nombreCompleto}</span>!
                </h2>
                <p style="color: #64748b; font-size: 16px; line-height: 1.6; margin: 0;">
                    Nos complace informarte que tu cuenta de administrador ha sido creada exitosamente en el sistema Smart Light. 
                    A partir de ahora, formas parte de nuestro equipo administrativo como <strong>${data.tipo}</strong>.
                </p>
            </div>
            
            <!-- Credenciales de acceso -->
            <div style="background: linear-gradient(145deg, #f8fafc 0%, #e2e8f0 100%); border: 2px solid #fbbf24; border-radius: 12px; padding: 25px; margin: 30px 0; position: relative;">
                <div style="position: absolute; top: -12px; left: 25px; background: #fbbf24; color: #0f172a; padding: 5px 15px; border-radius: 20px; font-size: 14px; font-weight: 600;">
                    🔐 CREDENCIALES DE ACCESO
                </div>
                
                <div style="margin-top: 15px;">
                    <div style="margin-bottom: 20px;">
                        <p style="margin: 0 0 8px 0; color: #0f172a; font-weight: 600; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">
                            📧 Correo Corporativo
                        </p>
                        <div style="background: #ffffff; padding: 12px 15px; border-radius: 8px; border-left: 4px solid #10b981; font-family: 'Courier New', monospace; font-size: 16px; color: #1e293b; font-weight: 600;">
                            ${data.emailCorporativo}
                        </div>
                    </div>
                    
                    <div>
                        <p style="margin: 0 0 8px 0; color: #0f172a; font-weight: 600; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">
                            🔑 Contraseña Temporal
                        </p>
                        <div style="background: #ffffff; padding: 12px 15px; border-radius: 8px; border-left: 4px solid #f59e0b; font-family: 'Courier New', monospace; font-size: 18px; color: #d97706; font-weight: 700; letter-spacing: 2px;">
                            ${data.passwordTemporal}
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Advertencia importante -->
            <div style="background: linear-gradient(145deg, #fef3c7 0%, #fde68a 100%); border: 2px solid #f59e0b; border-radius: 12px; padding: 20px; margin: 25px 0; position: relative;">
                <div style="display: flex; align-items: flex-start; gap: 15px;">
                    <div style="background: #f59e0b; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0;">
                        ⚠️
                    </div>
                    <div>
                        <h3 style="margin: 0 0 10px 0; color: #d97706; font-size: 18px; font-weight: 600;">
                            ACCIÓN REQUERIDA
                        </h3>
                        <p style="margin: 0; color: #b45309; font-size: 15px; line-height: 1.5; font-weight: 500;">
                            Por seguridad, <strong>debes cambiar tu contraseña</strong> en el primer inicio de sesión. 
                            Además, se te enviará un código de verificación a tu correo personal cada vez que accedas al sistema.
                        </p>
                    </div>
                </div>
            </div>
            
            <!-- Pasos siguientes -->
            <div style="background: #f8fafc; border-radius: 12px; padding: 25px; margin: 30px 0; border-left: 4px solid #10b981;">
                <h3 style="margin: 0 0 20px 0; color: #0f172a; font-size: 20px; font-weight: 500;">
                    💡 Próximos Pasos
                </h3>
                
                <div style="margin-bottom: 15px;">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                        <div style="background: #10b981; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold;">1</div>
                        <p style="margin: 0; color: #0f172a; font-weight: 500;">Accede al sistema con las credenciales proporcionadas</p>
                    </div>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                        <div style="background: #10b981; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold;">2</div>
                        <p style="margin: 0; color: #0f172a; font-weight: 500;">Verifica el código 2FA que llegará a tu correo personal</p>
                    </div>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                        <div style="background: #10b981; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold;">3</div>
                        <p style="margin: 0; color: #0f172a; font-weight: 500;">Cambia tu contraseña por una nueva y segura</p>
                    </div>
                </div>
                
                <div>
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                        <div style="background: #10b981; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold;">4</div>
                        <p style="margin: 0; color: #0f172a; font-weight: 500;">¡Comienza a controlar el alumbrado inteligente!</p>
                    </div>
                </div>
            </div>
            
            <!-- Información de seguridad -->
            <div style="background: linear-gradient(145deg, #ecfdf5 0%, #d1fae5 100%); border: 1px solid #10b981; border-radius: 12px; padding: 20px; margin: 25px 0;">
                <div style="display: flex; align-items: flex-start; gap: 15px;">
                    <div style="background: #10b981; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0;">
                        🛡️
                    </div>
                    <div>
                        <h3 style="margin: 0 0 10px 0; color: #065f46; font-size: 16px; font-weight: 600;">
                            Seguridad y Privacidad
                        </h3>
                        <p style="margin: 0; color: #047857; font-size: 14px; line-height: 1.5;">
                            Tu cuenta cuenta con autenticación de dos factores (2FA). Cada vez que inicies sesión, 
                            recibirás un código de seguridad en tu correo personal. Nunca compartas tus credenciales 
                            con terceros y reporta cualquier actividad sospechosa.
                        </p>
                    </div>
                </div>
            </div>
            
            <!-- Información de contacto -->
            <div style="background: #f1f5f9; border-radius: 12px; padding: 20px; margin: 30px 0; text-align: center;">
                <h3 style="margin: 0 0 15px 0; color: #0f172a; font-size: 18px; font-weight: 500;">
                    ¿Necesitas Ayuda?
                </h3>
                <p style="margin: 0 0 15px 0; color: #64748b; font-size: 14px; line-height: 1.5;">
                    Si tienes problemas para acceder al sistema o necesitas asistencia técnica, 
                    no dudes en contactar a nuestro equipo de soporte.
                </p>
                <div style="display: inline-flex; gap: 20px; flex-wrap: wrap; justify-content: center;">
                    <div style="display: flex; align-items: center; gap: 8px; color: #1e293b; font-size: 14px; font-weight: 500;">
                        📧 ${process.env.COMPANY_EMAIL || 'soporte@smartlight.com'}
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px; color: #1e293b; font-size: 14px; font-weight: 500;">
                        📱 ${process.env.COMPANY_PHONE || '+591 XXXX-XXXX'}
                    </div>
                </div>
            </div>
            
        </div>
        
        <!-- Footer -->
        <div style="background: #0f172a; color: #f8fafc; padding: 30px; text-align: center;">
            <div style="margin-bottom: 20px;">
                <img src="https://i.imgur.com/cXkWtJv.png" alt="Smart Light" style="max-width: 80px; height: auto; opacity: 0.9; filter: brightness(0) invert(1);">
            </div>
            
            <p style="margin: 0 0 10px 0; font-size: 16px; font-weight: 500; color: #ffffff;">
                ${process.env.COMPANY_NAME || 'Smart Light'} - Sistema de Control del Alumbrado Público
            </p>
            <p style="margin: 0 0 20px 0; font-size: 14px; color: #fbbf24;">
                Iluminando el futuro con tecnología inteligente
            </p>
            
            <div style="border-top: 1px solid #1e293b; padding-top: 20px; margin-top: 20px;">
                <p style="margin: 0; font-size: 12px; color: #64748b;">
                    © 2024 ${process.env.COMPANY_NAME || 'Smart Light'}. Todos los derechos reservados.<br>
                    Este es un correo automático, no responder a este mensaje.
                </p>
            </div>
            
            <div style="margin-top: 15px;">
                <p style="margin: 0; font-size: 11px; color: #64748b;">
                    Enviado el ${fechaEnvio} | ${process.env.COMPANY_LOCATION || 'El Alto, Bolivia'}
                </p>
            </div>
        </div>
        
    </div>
    
</body>
</html>`;
};

/**
 * Template simplificado para texto plano (fallback)
 * @param {Object} data - Datos para personalizar el email
 * @returns {string} Texto plano del email
 */
const getWelcomeEmailTextTemplate = (data) => {
  return `
BIENVENIDO A SMART LIGHT
========================

Hola ${data.nombreCompleto},

Tu cuenta de administrador ha sido creada exitosamente en el sistema Smart Light.

CREDENCIALES DE ACCESO:
- Correo Corporativo: ${data.emailCorporativo}
- Contraseña Temporal: ${data.passwordTemporal}

IMPORTANTE: Debes cambiar tu contraseña en el primer inicio de sesión.

PRÓXIMOS PASOS:
1. Accede al sistema con las credenciales proporcionadas
2. Verifica el código 2FA que llegará a tu correo personal
3. Cambia tu contraseña por una nueva y segura
4. ¡Comienza a controlar el alumbrado inteligente!

SOPORTE:
- Email: ${process.env.COMPANY_EMAIL || 'soporte@smartlight.com'}
- Teléfono: ${process.env.COMPANY_PHONE || '+591 XXXX-XXXX'}

--
${process.env.COMPANY_NAME || 'Smart Light'}
${process.env.COMPANY_LOCATION || 'El Alto, Bolivia'}
`;
};

module.exports = {
  getWelcomeEmailTemplate,
  getWelcomeEmailTextTemplate
};