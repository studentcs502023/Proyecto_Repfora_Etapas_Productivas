import 'dotenv/config';
import { google } from 'googleapis';
import http from 'http';
import { URL } from 'url';
import fs from 'fs';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/oauth2callback';
const PORT = 3001;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Error: GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET deben estar en el .env');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authorizeUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/drive'],
  prompt: 'consent',
});

console.log('\n========================================');
console.log('  ABRE ESTA URL EN TU NAVEGADOR:');
console.log('========================================\n');
console.log(authorizeUrl);
console.log('\n========================================\n');

const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url, `http://localhost:${PORT}`);

  if (urlObj.pathname === '/oauth2callback') {
    const code = urlObj.searchParams.get('code');
    const error = urlObj.searchParams.get('error');

    if (error) {
      res.end(`Error: ${error}`);
      server.close();
      process.exit(1);
    }

    if (!code) {
      res.end('No authorization code received');
      server.close();
      process.exit(1);
    }

    try {
      const { tokens } = await oauth2Client.getToken(code);
      console.log('\n========================================');
      console.log('  TOKENS OBTENIDOS:');
      console.log('========================================\n');
      console.log(JSON.stringify(tokens, null, 2));
      console.log('\n========================================');
      console.log('  REFRESH TOKEN (copia esto en .env):');
      console.log('========================================\n');
      console.log(tokens.refresh_token);
      console.log('\n========================================');

      const envPath = '.env';
      let envContent = fs.readFileSync(envPath, 'utf8');
      envContent = envContent.replace(
        /GOOGLE_REFRESH_TOKEN=.*/,
        `GOOGLE_REFRESH_TOKEN=${tokens.refresh_token || ''}`
      );
      fs.writeFileSync(envPath, envContent);
      console.log('  .env actualizado automaticamente!');
      console.log('========================================\n');

      res.end('OK! Refresh token saved. You can close this window.');
    } catch (err) {
      console.error('Error exchanging code:', err.message);
      res.end(`Error exchanging code: ${err.message}`);
    }

    server.close();
    process.exit(0);
  } else {
    res.end('Waiting for OAuth callback...');
  }
});

server.listen(PORT, () => {
  console.log(`Esperando callback en ${REDIRECT_URI}...\n`);
});
