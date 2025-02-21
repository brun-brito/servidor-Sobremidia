const functions = require("firebase-functions");
const app = require("./src/app");

exports.v1 = functions.https.onRequest(app);

/**
 NÃO MEXER!
 */