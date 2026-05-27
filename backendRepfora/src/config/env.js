import dotenv from "dotenv";
dotenv.config();

export const env = {
    PORT: process.env.PORT || 3000,
    MONGODB_URI: process.env.MONGODB_URI,

    // Seguridad y JWT
    JWT_SECRET: process.env.JWT_SECRET || "default_super_secret",
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "24h",

    // Control de Bloqueos Login
    MAX_LOGIN_ATTEMPTS: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5,
    LOCK_TIME_MINUTES: parseInt(process.env.LOCK_TIME_MINUTES) || 2,

    // Email (Brevo API)
    BREVO_API_KEY: process.env.BREVO_API_KEY,
    BREVO_SENDER_EMAIL: process.env.BREVO_SENDER_EMAIL || "noreply@repfora-sena.com",
    BREVO_SENDER_NAME: process.env.BREVO_SENDER_NAME || "REPFORA E.P. - SENA",

    // Frontend URL
    FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5174",
};