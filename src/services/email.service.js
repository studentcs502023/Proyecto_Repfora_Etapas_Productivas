import axios from 'axios';
import { env } from '../config/env.js';

const send = async ({ to, subject, body }) => {
  try {
    if (!env.BREVO_API_KEY) {
      console.warn('[EmailService] BREVO_API_KEY no configurada. El correo no se enviará.');
      return;
    }

    await axios.post(
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
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    const errorData = error.response?.data;
    console.error('[EmailService] Error enviando correo:', errorData?.message || error.message);
    throw error;
  }
};

export default { send };
