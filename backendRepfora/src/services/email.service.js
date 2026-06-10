import axios from 'axios';
import { env } from '../config/env.js';

const send = async ({ to, subject, body }) => {
  try {
    if (!env.BREVO_API_KEY) {
      console.warn('[EmailService] BREVO_API_KEY no configurada. El correo no se enviara.');
      return;
    }

    console.log(`[EmailService] Enviando via Brevo API...`);
    console.log(`[EmailService]   Para: ${to}`);
    console.log(`[EmailService]   Asunto: ${subject}`);
    console.log(`[EmailService]   Remitente: ${env.BREVO_SENDER_NAME} <${env.BREVO_SENDER_EMAIL}>`);

    const response = await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: {
          name: env.BREVO_SENDER_NAME,
          email: env.BREVO_SENDER_EMAIL
        },
        to: [{ email: to }],
        subject,
        htmlContent: body
      },
      {
        headers: {
          'api-key': env.BREVO_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );

    console.log(`[EmailService] OK - messageId: ${response.data?.messageId || 'N/A'}`);
  } catch (error) {
    const errData = error.response?.data;
    console.error('[EmailService] ERROR Brevo:');
    console.error(`[EmailService]   HTTP: ${error.response?.status || 'N/A'}`);
    console.error(`[EmailService]   Mensaje: ${errData?.message || error.message}`);
    if (errData?.code) console.error(`[EmailService]   Codigo Brevo: ${errData.code}`);
    throw error;
  }
};

export default { send };
