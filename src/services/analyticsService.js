const { loginAndExtractToken } = require('../services/tokenService');
const axios = require('axios');
const API_URL = 'https://analytics.4yousee.com/api/concurrent_dash_data/308';
const { db } = require("../config/firebase");
const moment = require('moment-timezone');

/**
 * 
 * FUNCAO QUE INICIALIZA FIRESTORE COM DADOS DA API ANALYTICS
 * 
 */
async function initializeFirestoreCollections() {
  try {
    let currentDate = moment('2025-01-27');
    const endDate = moment('2025-03-15');

    while (currentDate.isBefore(endDate) || currentDate.isSame(endDate, 'day')) {
      const formattedDate = currentDate.format('YYYY-MM-DD');
      const data = await fetchAnalyticsData(formattedDate, formattedDate);

      // Salvar dados diários separados
      await db.collection('analytics').doc('daily_data').collection('dates').doc(formattedDate).set(data.total);

      for (const daily of data.audience_x_impact.daily) {
        await db.collection('analytics').doc('audience_x_impact_daily').collection('dates').doc(daily.date).set(daily);
      }

      for (const weekly of data.audience_x_impact.weekly) {
        await db.collection('analytics').doc('audience_x_impact_weekly').collection('days').doc(weekly.name).set(weekly);
      }

      for (const avg of data.impacts_per_hour.average) {
        await db.collection('analytics').doc('impacts_per_hour_average').collection('hours').doc(String(avg.hour)).set(avg);
      }

      for (const period of data.impacts_per_hour.period) {
        await db.collection('analytics').doc('impacts_per_hour_period').collection('periods').doc(period.name).set(period);
      }

      for (const camera of data.cameras.per_type) {
        const docId = `${camera.id}_${camera.date}`;
        await db.collection('analytics').doc('cameras').collection('camera_data').doc(docId).set(camera);
      }

      for (const location of data.locations) {
        await db.collection('analytics').doc('locations').collection('location_data').doc(String(location.id)).set(location);
      }

      for (const recurrence of data.recurrence) {
        await db.collection('analytics').doc('recurrence').collection('multipliers').doc(recurrence.multiplier).set(recurrence);
      }

      console.log(`✅ Dados de ${formattedDate} inicializados com sucesso!`);

      currentDate.add(1, 'day');
    }
  } catch (error) {
    console.error('❌ Erro ao inicializar coleções:', error.message);
  }
}

exports.fetchAnalyticsData = async (startDate, endDate, locations) => {
  const token = await loginAndExtractToken();
  const payload = {
    locations_filter: locations,
    duration: {
      "1_min": true,
      "1_3_min": true,
      "3_30_min": true,
      "30_min": true
    },
    start_date: startDate,
    end_date: endDate
  };

  const response = await axios.post(API_URL, payload, {
    headers: { Cookie: `token=${token}` }
  });

  return response.data;
};
