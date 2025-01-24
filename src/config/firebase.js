require('dotenv').config();
const admin = require('firebase-admin');

// Inicializar o Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET, // Define o bucket padrão  
});

// Inicializar Firestore e Storage
const db = admin.firestore();
const bucket = admin.storage().bucket(); // Obtém o bucket configurado no projeto

module.exports = {
  admin,
  db,
  bucket, // Exporta o bucket para uso nos serviços
};
