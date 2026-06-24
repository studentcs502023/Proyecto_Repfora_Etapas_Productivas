import { google } from 'googleapis';
import dotenv from 'dotenv';
import path from 'path';
import readline from 'readline';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '.env');
dotenv.config({ path: envPath });

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.log('Falta GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET en el .env');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  'http://localhost:3001/callback'
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/drive'],
  prompt: 'consent',
});

console.log('\n========================================');
console.log('  GENERADOR DE REFRESH TOKEN - REPFORA');
console.log('========================================\n');
console.log('Abre este link en el navegador:\n');
console.log(authUrl);
console.log('\nDespues de aceptar los permisos, Google intentara redirigirte a localhost:3001');
console.log('La pagina dira "No se puede cargar" — ES NORMAL.');
console.log('COPIA la URL completa de la barra del navegador y pegala aqui.\n');
console.log('Ejemplo: http://localhost:3001/callback?code=4/0AanRRr...&scope=...\n');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question('Pega la URL aqui: ', async (input) => {
  rl.close();
  
  try {
    const url = new URL(input.trim());
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');
    
    if (error) {
      console.error('\nERROR: Google devolvio: ' + error);
      console.error('Asegurate que http://localhost:3001/callback este en Authorized redirect URIs en Google Cloud Console.');
      process.exit(1);
    }
    
    if (!code) {
      console.error('\nERROR: No se encontro el codigo de autorizacion en la URL.');
      console.error('Asegurate de copiar la URL COMPLETA de la barra del navegador.');
      process.exit(1);
    }
    
    console.log('\nIntercambiando codigo por tokens...');
    const { tokens } = await oauth2Client.getToken(code);
    const refreshToken = tokens.refresh_token;
    
    if (!refreshToken) {
      console.error('ERROR: No se recibio refresh token. Volve a intentar (asegurate de usar prompt=consent).');
      process.exit(1);
    }
    
    let envContent = '';
    try {
      envContent = fs.readFileSync(envPath, 'utf-8');
    } catch (e) {}
    
    if (envContent.includes('GOOGLE_REFRESH_TOKEN=')) {
      envContent = envContent.replace(
        /GOOGLE_REFRESH_TOKEN=.*(\r?\n|$)/g,
        'GOOGLE_REFRESH_TOKEN=' + refreshToken + '\n'
      );
    } else {
      envContent += '\nGOOGLE_REFRESH_TOKEN=' + refreshToken + '\n';
    }
    
    fs.writeFileSync(envPath, envContent, 'utf-8');
    
    console.log('\n========================================');
    console.log('  REFRESH TOKEN GUARDADO EN .env');
    console.log('========================================');
    console.log('GOOGLE_REFRESH_TOKEN=' + refreshToken);
    console.log('========================================\n');
    console.log('Reinicia el servidor con: npm start\n');
    
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
});
