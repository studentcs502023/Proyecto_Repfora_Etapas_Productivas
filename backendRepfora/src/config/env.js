import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
    PORT: process.env.PORT || 3000,
    MONGODB_URI: process.env.MONGODB_URI,

    // Seguridad y JWT
    JWT_SECRET: process.env.JWT_SECRET || "default_super_secret",
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "24h",

    // Control de Bloqueos Login
    MAX_LOGIN_ATTEMPTS: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5,
    LOCK_TIME_MINUTES: parseInt(process.env.LOCK_TIME_MINUTES) || 2,

    // Email (SMTP via Nodemailer)
    SMTP_HOST: process.env.SMTP_HOST || '',
    SMTP_PORT: process.env.SMTP_PORT || '587',
    SMTP_SECURE: process.env.SMTP_SECURE || 'false',
    SMTP_USER: process.env.SMTP_USER || '',
    SMTP_PASS: process.env.SMTP_PASS || '',
    SMTP_FROM: process.env.SMTP_FROM || 'noreply@repfora-sena.com',
    SMTP_FROM_NAME: process.env.SMTP_FROM_NAME || 'REPFORA E.P. - SENA',
    SMTP_TLS_REJECT: process.env.SMTP_TLS_REJECT || 'true',

    // Email (Brevo API - legacy, en desuso)
    BREVO_API_KEY: process.env.BREVO_API_KEY,
    BREVO_SENDER_EMAIL: process.env.BREVO_SENDER_EMAIL || "noreply@repfora-sena.com",
    BREVO_SENDER_NAME: process.env.BREVO_SENDER_NAME || "REPFORA E.P. - SENA",

    // Frontend URL
    FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5174",
};