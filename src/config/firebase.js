require('dotenv').config();
const admin = require('firebase-admin');

let initialized = false;
let db, bucket, auth;
let currentProjectId = null;

function isLocalRequest(req) {
  // Busca o campo [Symbol(kHeaders)] para pegar o host que envia a requisição
  let host = null;
  if (req) {
    const kHeadersSymbol = Object.getOwnPropertySymbols(req).find(s => s.toString().includes('kHeaders'));
    if (kHeadersSymbol && req[kHeadersSymbol]) {
      host = req[kHeadersSymbol].host;
    }
    // Fallback: tenta pelo rawHeaders (outro campo recebido em req)
    if (!host && Array.isArray(req.rawHeaders)) {
      const hostIndex = req.rawHeaders.findIndex(h => h.toLowerCase() === 'host');
      if (hostIndex !== -1 && req.rawHeaders[hostIndex + 1]) {
        host = req.rawHeaders[hostIndex + 1];
      }
    }
  }

  // Considera DEV se host for 127.0.0.1. Se quiser usar os dados de PROD, é preciso reiniciar a aplicação e a primeira requisição ser feita com localhost.
  if (host && host.startsWith('127.0.0.1')) {
    return true;
  }

  // Heurística extra para jobs/agendados
  if (!req) {
    return process.env.FUNCTIONS_EMULATOR === 'true' ||
           process.env.NODE_ENV === 'development' ||
           process.env.GCLOUD_PROJECT?.includes('dev');
  }
  return false;
}

function initFirebase(req) {
  if (initialized) return;

  let host = null;
  if (req) {
    const kHeadersSymbol = Object.getOwnPropertySymbols(req).find(s => s.toString().includes('kHeaders'));
    if (kHeadersSymbol && req[kHeadersSymbol]) {
      host = req[kHeadersSymbol].host;
    }
    if (!host && Array.isArray(req.rawHeaders)) {
      const hostIndex = req.rawHeaders.findIndex(h => h.toLowerCase() === 'host');
      if (hostIndex !== -1 && req.rawHeaders[hostIndex + 1]) {
        host = req.rawHeaders[hostIndex + 1];
      }
    }
  }

  const isDev = isLocalRequest(req);
  const env = isDev ? '_DEV' : '';
  const projectId = process.env[`PROJECT_ID${env}`];
  const clientEmail = process.env[`CLIENT_EMAIL${env}`];
  let privateKey = process.env[`PRIVATE_KEY${env}`];
  const storageBucket = process.env[`STORAGE_BUCKET${env}`];

  if (!privateKey) {
    throw new Error('Firebase PRIVATE_KEY not found in environment');
  }
  privateKey = privateKey.replace(/\\n/g, '\n');

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
    storageBucket,
  });

  db = admin.firestore();
  bucket = admin.storage().bucket();
  auth = admin.auth();
  currentProjectId = projectId;
  initialized = true;
}

function getDb() {
  return db;
}
function getBucket() {
  return bucket;
}
function getAuth() {
  return auth;
}

function getProjectId() {
  if (!currentProjectId) throw new Error("Firebase não inicializado. Chame initFirebase(req) antes de acessar o projectId.");
  return currentProjectId;
}

module.exports = {
  initFirebase,
  getDb,
  getBucket,
  getAuth,
  getProjectId,
};
