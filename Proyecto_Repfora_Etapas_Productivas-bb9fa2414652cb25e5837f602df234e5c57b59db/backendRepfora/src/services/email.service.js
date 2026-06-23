import nodemailer from 'nodemailer';
import axios from 'axios';
import { env } from '../config/env.js';

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
    console.log(`[EmailService] Usando SMTP: ${env.SMTP_HOST}:${env.SMTP_PORT}`);
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: parseInt(env.SMTP_PORT),
      secure: env.SMTP_SECURE === 'true',
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: env.SMTP_TLS_REJECT !== 'false'
      }
    });
    return transporter;
  }

  if (env.BREVO_API_KEY) {
    console.log('[EmailService] Usando Brevo API (fallback)');
    return 'brevo';
  }

  return null;
};

const sendViaSMTP = async ({ to, subject, body }) => {
  console.log(`[EmailService] Enviando via SMTP...`);
  console.log(`[EmailService]   Para: ${to}`);
  console.log(`[EmailService]   Asunto: ${subject}`);
  console.log(`[EmailService]   Remitente: ${env.SMTP_FROM_NAME} <${env.SMTP_FROM}>`);

  const info = await transporter.sendMail({
    from: `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM}>`,
    to,
    subject,
    html: body
  });

  console.log(`[EmailService] OK - messageId: ${info.messageId}`);
};

const sendViaBrevo = async ({ to, subject, body }) => {
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
};

const send = async ({ to, subject, body }) => {
  try {
    const transport = getTransporter();

    if (!transport) {
      console.warn('[EmailService] No hay servicio de email configurado (SMTP o Brevo). El correo no se enviara.');
      return;
    }

    if (transport === 'brevo') {
      await sendViaBrevo({ to, subject, body });
    } else {
      await sendViaSMTP({ to, subject, body });
    }
  } catch (error) {
    const errData = error.response?.data;
    console.error('[EmailService] ERROR:');
    console.error(`[EmailService]   HTTP: ${error.response?.status || 'N/A'}`);
    console.error(`[EmailService]   Mensaje: ${errData?.message || error.message}`);
    if (errData?.code) console.error(`[EmailService]   Codigo: ${errData.code}`);
  }
};

export default { send };
