const USER_MAIL = process.env.ANALYTICS_USER_MAIL;
const PASSWORD = process.env.ANALYTICS_PASSWORD;
const MAIN_URL = 'https://analytics.4yousee.com/pt';
const API_URL = 'https://analytics.4yousee.com/api';
const puppeteer = require('puppeteer');
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

  // Gera novo token via Puppeteer
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  let token = null;

  page.on('response', async (response) => {
    const url = response.url();
    const headers = response.headers();

    if (url.includes(API_URL) && headers['set-cookie']?.includes('token=')) {
      const tokenMatch = headers['set-cookie'].match(/token=([^;]+)/);
      if (tokenMatch && tokenMatch[1]) {
        token = tokenMatch[1];
      }
    }
  });

  try {
    await page.goto(MAIN_URL, { waitUntil: 'networkidle2', timeout: 15000 });

    if (page.url().includes('/pt/login')) {
      await page.type('input[name="username"]', USER_MAIL);
      await page.type('input[name="password"]', PASSWORD);

      await Promise.all([
        page.click('button[type="submit"]'),
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }),
      ]);
    }

    if (!token) {
      throw new Error('Token não encontrado após login.');
    }

    console.log('Novo token obtido:', token);

    await tokenRef.set({ value: token, updatedAt: new Date() });

    return token;

  } catch (error) {
    throw new Error(`Erro ao obter token: ${error.message}`);
  } finally {
    await browser.close();
  }
};
// loginAndExtractToken();