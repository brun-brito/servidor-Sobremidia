require('dotenv').config();
const admin = require('firebase-admin');

// Inicializar o Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.PROJECT_ID,
    clientEmail: process.env.CLIENT_EMAIL,
    privateKey: process.env.PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
  storageBucket: process.env.STORAGE_BUCKET, 
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

module.exports = {
  db,
  bucket,
};
