const USER_MAIL = process.env.ANALYTICS_USER_MAIL;
const PASSWORD = process.env.ANALYTICS_PASSWORD;
const API_URL = 'https://analytics.4yousee.com/django';
const axios = require('axios');
const { db } = require("../config/firebase");

exports.loginAndExtractToken = async () => {
  const tokenRef = db.collection('token').doc('atual');
  const doc = await tokenRef.get();

  // Tenta usar o token salvo no Firestore
  if (doc.exists && doc.data()?.value) {
    const savedToken = doc.data().value;
    try {
      const testResponse = await axios.get(`${API_URL}/devices`, {
        headers: {
          Authorization: `Bearer ${savedToken}`
        },
        timeout: 5000
      });

      if (testResponse.status === 200) {
        console.log('Token do Firestore válido.');
        return savedToken;
      }
    } catch (err) {
      console.warn('Token do Firestore inválido, gerando novo token...');
    }
  }
  
  try{
    // faz o login via post e pega o token
    const response = await axios.post(`${API_URL}/token/`, {
      username: USER_MAIL,
      password: PASSWORD
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    const accessToken = response.data.access;
    if (!accessToken) {
      throw new Error('Token de acesso não encontrado na resposta.');
    }

    await tokenRef.set({ value: accessToken, updatedAt: new Date() });
    console.log('Token de acesso obtido com sucesso.');

    return accessToken;
  } catch (error) {
    throw new Error(`Erro ao obter token JWT: ${error.message}`);
  }
};