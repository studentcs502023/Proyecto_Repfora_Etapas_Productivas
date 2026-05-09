import { conectarMongo } from './src/config/db.js';
import User from './src/models/User.model.js';
import bcrypt from 'bcryptjs';

const seedExtras = async () => {
    try {
        await conectarMongo();
        
        const salt = await bcrypt.genSalt(10);
        const pass = await bcrypt.hash('Sena123!', salt);
        
        await User.updateOne({ nationalId: '222222' }, {
            nationalId: '222222',
            fullName: 'Instructor de Prueba',
            email: 'inst@sena.edu.co',
            password: pass,
            role: 'INSTRUCTOR',
            status: 'ACTIVE',
            knowledgeArea: 'Informática',
            firstLogin: false
        }, { upsert: true });
        
        await User.updateOne({ nationalId: '333333' }, {
            nationalId: '333333',
            fullName: 'Aprendiz de Prueba',
            email: 'aprendiz@sena.edu.co',
            password: pass,
            role: 'APPRENTICE',
            status: 'ACTIVE',
            enrollmentNumber: '1234567',
            program: 'ADSO',
            firstLogin: false
        }, { upsert: true });
        
        console.log('✅ Cuentas creadas exitosamente: Instructor (222222) y Aprendiz (333333) con pass Sena123!');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
};

seedExtras();
