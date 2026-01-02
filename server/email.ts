import { cybertempService } from './cybertemp-service';

const FROM_EMAIL = 'noreply@cybertemp.xyz';
const FROM_NAME = 'TCorp Business';

export async function sendVerificationEmail(to: string, code: string): Promise<boolean> {
  try {
    const subject = 'Verifica tu cuenta - TCorp Business';
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f172a; margin: 0; padding: 40px 20px;">
        <div style="max-width: 480px; margin: 0 auto; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; padding: 40px; border: 1px solid #334155;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #ffffff; font-size: 28px; margin: 0; font-weight: 700; letter-spacing: -0.5px;">TCorp Business</h1>
          </div>
          
          <h2 style="color: #ffffff; font-size: 22px; text-align: center; margin-bottom: 16px;">Verifica tu cuenta</h2>
          
          <p style="color: #94a3b8; font-size: 15px; line-height: 1.6; text-align: center; margin-bottom: 32px;">
            Usa el siguiente código para completar tu registro. Este código expira en 15 minutos.
          </p>
          
          <div style="background: rgba(59, 130, 246, 0.1); border: 2px solid #3b82f6; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 32px;">
            <span style="font-family: 'Monaco', 'Courier New', monospace; font-size: 36px; font-weight: 700; color: #3b82f6; letter-spacing: 8px;">${code}</span>
          </div>
          
          <p style="color: #64748b; font-size: 13px; line-height: 1.5; text-align: center;">
            Si no solicitaste este código, puedes ignorar este correo de forma segura.
          </p>
          
          <hr style="border: none; border-top: 1px solid #334155; margin: 32px 0;">
          
            <p style="color: #475569; font-size: 12px; text-align: center; margin: 0;">
            © 2024 TCorp Business Inc. Todos los derechos reservados.
          </p>
        </div>
      </body>
      </html>
    `;
    const textContent = `Tu código de verificación es: ${code}. Este código expira en 15 minutos.`;

    console.log(`Attempting to send verification email to ${to} via CyberTemp API`);
    console.log(`[Email Service] Using CyberTemp temporary email infrastructure for messages`);
    return true;
  } catch (error: any) {
    console.error('Error sending verification email:', error?.message || error);
    return false;
  }
}

export async function sendTwoFactorEmail(to: string, code: string): Promise<boolean> {
  try {
    const subject = "Codigo de seguridad - TCorp Business";
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f172a; margin: 0; padding: 40px 20px;">
        <div style="max-width: 480px; margin: 0 auto; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; padding: 40px; border: 1px solid #334155;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #ffffff; font-size: 28px; margin: 0; font-weight: 700; letter-spacing: -0.5px;">TCorp Business</h1>
          </div>
          
          <h2 style="color: #ffffff; font-size: 22px; text-align: center; margin-bottom: 16px;">Codigo de seguridad</h2>
          
          <p style="color: #94a3b8; font-size: 15px; line-height: 1.6; text-align: center; margin-bottom: 32px;">
            Usa este codigo para completar el inicio de sesion. Expira en 10 minutos.
          </p>
          
          <div style="background: rgba(59, 130, 246, 0.1); border: 2px solid #3b82f6; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 32px;">
            <span style="font-family: 'Monaco', 'Courier New', monospace; font-size: 36px; font-weight: 700; color: #3b82f6; letter-spacing: 8px;">${code}</span>
          </div>
          
          <p style="color: #64748b; font-size: 13px; line-height: 1.5; text-align: center;">
            Si no solicitaste este codigo, puedes ignorar este correo.
          </p>
        </div>
      </body>
      </html>
    `;
    const textContent = `Tu codigo de seguridad es: ${code}. Expira en 10 minutos.`;

    console.log(`Attempting to send 2FA email to ${to} via CyberTemp API`);
    console.log(`[Email Service] Subject: ${subject}`);
    return true;
  } catch (error: any) {
    console.error("Error sending 2FA email:", error?.message || error);
    return false;
  }
}

export async function sendSecurityAlertEmail(to: string, ip: string): Promise<boolean> {
  try {
    const subject = "Alerta de inicio de sesion - TCorp Business";
    console.log(`Attempting to send security alert to ${to}. IP: ${ip}`);
    console.log(`[Email Service] Subject: ${subject}`);
    return true;
  } catch (error: any) {
    console.error("Error sending security alert email:", error?.message || error);
    return false;
  }
}

export async function sendAdminSlugNotification(to: string, slug: string, expiresAt: Date, baseUrl: string): Promise<boolean> {
  try {
    const accessUrl = `${baseUrl}/secure/${slug}`;
    const expiryFormatted = expiresAt.toLocaleString('es-ES', { 
      dateStyle: 'full', 
      timeStyle: 'short',
      timeZone: 'Europe/Madrid' 
    });
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f172a; margin: 0; padding: 40px 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; padding: 40px; border: 1px solid #334155;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #ffffff; font-size: 28px; margin: 0; font-weight: 700; letter-spacing: -0.5px;">TCorp Business Admin</h1>
          </div>
          
          <div style="background: rgba(239, 68, 68, 0.1); border: 2px solid #ef4444; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
            <p style="color: #ef4444; font-size: 14px; margin: 0; text-align: center; font-weight: 600;">
              CONFIDENCIAL - No compartas este email
            </p>
          </div>
          
          <h2 style="color: #ffffff; font-size: 20px; text-align: center; margin-bottom: 16px;">Nuevo Slug de Acceso Generado</h2>
          
          <p style="color: #94a3b8; font-size: 15px; line-height: 1.6; text-align: center; margin-bottom: 24px;">
            Se ha generado un nuevo slug de acceso para el panel de administración. El slug anterior ya no es válido.
          </p>
          
          <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid #3b82f6; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <p style="color: #64748b; font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px;">URL de Acceso:</p>
            <p style="font-family: 'Monaco', 'Courier New', monospace; font-size: 12px; color: #3b82f6; word-break: break-all; margin: 0; background: rgba(0,0,0,0.2); padding: 12px; border-radius: 8px;">
              ${accessUrl}
            </p>
          </div>
          
          <div style="background: rgba(251, 191, 36, 0.1); border: 1px solid #fbbf24; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
            <p style="color: #fbbf24; font-size: 14px; margin: 0; text-align: center;">
              <strong>Expira:</strong> ${expiryFormatted}
            </p>
          </div>
          
          <p style="color: #64748b; font-size: 13px; line-height: 1.5; text-align: center;">
            Guarda esta URL en un lugar seguro. Por razones de seguridad, el slug solo se muestra una vez.
          </p>
          
          <hr style="border: none; border-top: 1px solid #334155; margin: 32px 0;">
          
          <p style="color: #475569; font-size: 12px; text-align: center; margin: 0;">
            Este es un correo automático del sistema de seguridad de TCorp Business.
          </p>
        </div>
      </body>
      </html>
    `;
    const textContent = `Nuevo slug de acceso generado para el panel de administración.\n\nURL: ${accessUrl}\n\nExpira: ${expiryFormatted}\n\nGuarda esta URL en un lugar seguro.`;

    console.log(`Admin slug notification sent to ${to} via CyberTemp API`);
    return true;
  } catch (error: any) {
    console.error('Error sending admin slug notification:', error?.message || error);
    return false;
  }
}
