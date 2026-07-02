import express from 'express';
import mongoose from 'mongoose';
import morgan from 'morgan';
import cors from 'cors'; // Que no falte cors
import { env } from './src/config/env.js';
import { conectarMongo } from './src/config/db.js'; 
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { seedSystemConfigs } from './src/config/systemConfig.seed.js';
import authRoutes from './src/routes/auth.routes.js';
import usersRoutes from './src/routes/users.routes.js';
import epRoutes from './src/routes/productiveStages.routes.js';
import systemConfigRoutes from './src/routes/systemConfig.routes.js';
import companyRoutes from './src/routes/companies.routes.js';
import noveltyRoutes from './src/routes/novelties.routes.js';
import documentRoutes from './src/routes/documents.routes.js';
import bitacoraRoutes from './src/routes/bitacoras.routes.js';
import trackingRoutes from './src/routes/trackings.routes.js';
import hourRoutes from './src/routes/hours.routes.js';
import hourValidationRoutes from './src/routes/hourValidation.routes.js';
import notificationRoutes from './src/routes/notifications.routes.js';
import reportRoutes from './src/routes/reports.routes.js';
import dashboardRoutes from './src/routes/dashboard.routes.js';
import { initJobs } from './src/jobs/alerts.job.js';

const app = express();

// Conectar a MongoDB Atlas (Solo si no estamos en test, o según la env)
if (process.env.NODE_ENV !== 'test') {
    conectarMongo().then(() => {
        // Ejecutar semilla de configuraciones al iniciar la DB
        seedSystemConfigs();
        // Iniciar cron jobs
        initJobs();
    }).catch((error) => {
        console.error("❌ No se pudieron iniciar los servicios de base de datos debido al fallo en la conexión.");
    });
}

// Middlewares
app.use(cors());
app.use(morgan('dev')); 
app.use(express.json()); 

// Middleware para validar que la base de datos esté conectada en las peticiones de API
app.use('/api', (req, res, next) => {
    console.log(`[Server] ${req.method} ${req.originalUrl} - DB state: ${mongoose.connection.readyState === 1 ? 'CONECTADA' : 'DESCONECTADA'}`);
    if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({
            status: "error",
            message: "La base de datos no está disponible o no está conectada. Por favor, verifique la conexión en el servidor."
        });
    }
    next();
});



// Rutas base
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/productive-stages', epRoutes);
app.use('/api/system-config', systemConfigRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/novelties', noveltyRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/bitacoras', bitacoraRoutes);
app.use('/api/trackings', trackingRoutes);
app.use('/api/hours', hourRoutes);
app.use('/api/hour-validation', hourValidationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);
if (fs.existsSync('dist')) app.use(express.static('dist'));
if (fs.existsSync(path.join(__dirname, 'public'))) app.use(express.static(path.join(__dirname, 'public')));
// Error handler global (incluye errores de multer)
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: 'El archivo excede el tamaño máximo permitido (10MB).' });
  }
  if (err.message?.includes('Tipo de archivo no permitido')) {
    return res.status(400).json({ success: false, message: err.message });
  }
  console.error('[Server] Error no manejado:', err);
  return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
});

// Puerto y Listen (Solo si no estamos en test)
if (process.env.NODE_ENV !== 'test') {
    const PORT = env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`🚀 Servidor corriendo en: http://localhost:${PORT}`);
        console.log(`📂 Base de datos: Etapa Productiva`);
    });
}

export default app;