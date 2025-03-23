const USER_MAIL = process.env.ANALYTICS_USER_MAIL;
const PASSWORD = process.env.ANALYTICS_PASSWORD;
const API_URL = 'https://analytics.4yousee.com/api';
const axios = require('axios');
const { db } = require("../config/firebase");

exports.loginAndExtractToken = async () => {
  const tokenRef = db.collection('token').doc('atual');
  const doc = await tokenRef.get();

  // Tenta usar o token salvo no Firestore
  if (doc.exists && doc.data()?.value) {
    const savedToken = doc.data().value;
    try {
      const testResponse = await axios.get(`${API_URL}/get_status_sensor`, {
        headers: {
          Cookie: `token=${savedToken}`
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
    const response = await axios.post(`${API_URL}/login`, {
      username: USER_MAIL,
      password: PASSWORD
    });

    const cookies = response.headers['set-cookie'];
    if (!cookies || cookies.length === 0) {
      throw new Error('Cookies não encontrados na resposta.');
    }

    const tokenCookie = cookies.find(cookie => cookie.includes('token='));
    if (!tokenCookie) {
      throw new Error('Cookie "token" não encontrado.');
    }

    const token = tokenCookie.match(/token=([^;]+)/)[1];
    console.log('Token obtido com sucesso.');

    await tokenRef.set({ value: token, updatedAt: new Date() });

    return token;

  } catch (error) {
    throw new Error(`Erro ao obter token: ${error.message}`);
  }
};