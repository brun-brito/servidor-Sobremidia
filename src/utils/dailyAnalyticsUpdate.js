const axios = require("axios");
const { loginAndExtractToken } = require("../services/tokenService");
const { db } = require("../config/firebase");
const API_URL = "https://analytics.4yousee.com/api/concurrent_dash_data/308";
const moment = require("moment-timezone");
const https = require("https");

exports.updateDailyAnalytics = async () => {
  const logRef = db.collection("analytics").doc("logs").collection("updates");
  const updateTime = moment().tz("America/Sao_Paulo");
  const formattedDate = moment()
    .tz("America/Sao_Paulo")
    .subtract(1, "day")
    .format("YYYY-MM-DD");

  try {
    const token = await loginAndExtractToken();

    const payload = {
      locations_filter: [
        "4409",
        "4410",
        "4411",
        "4412",
        "4413",
        "4499",
        "4500",
        "4541",
        "4792",
        "4793",
      ],
      duration: {
        "1_min": true,
        "1_3_min": true,
        "3_30_min": true,
        "30_min": true,
      },
      start_date: formattedDate,
      end_date: formattedDate,
    };

    console.log("🔄 Atualizando dados diários...");
    const response = await axios.post(API_URL, payload, {
      headers: { Cookie: `token=${token}` },
      httpsAgent: new https.Agent({keepAlive: true}),
    });

    const data = response.data;

    // Atualizar dados diários
    await db
      .collection("analytics")
      .doc("daily_data")
      .collection("dates")
      .doc(formattedDate)
      .set(data.total, { merge: true });

    for (const daily of data.audience_x_impact.daily) {
      await db
        .collection("analytics")
        .doc("audience_x_impact_daily")
        .collection("dates")
        .doc(daily.date)
        .set(daily, { merge: true });
    }

    for (const weekly of data.audience_x_impact.weekly) {
      await db
        .collection("analytics")
        .doc("audience_x_impact_weekly")
        .collection("days")
        .doc(weekly.name)
        .set(weekly, { merge: true });
    }

    for (const avg of data.impacts_per_hour.average) {
      await db
        .collection("analytics")
        .doc("impacts_per_hour_average")
        .collection("hours")
        .doc(String(avg.hour))
        .set(avg, { merge: true });
    }

    for (const period of data.impacts_per_hour.period) {
      await db
        .collection("analytics")
        .doc("impacts_per_hour_period")
        .collection("periods")
        .doc(period.name)
        .set(period, { merge: true });
    }

    for (const camera of data.cameras.per_type) {
      const docId = `${camera.id}_${camera.date}`;
      await db
        .collection("analytics")
        .doc("cameras")
        .collection("camera_data")
        .doc(docId)
        .set(camera, { merge: true });
    }

    for (const location of data.locations) {
      await db
        .collection("analytics")
        .doc("locations")
        .collection("location_data")
        .doc(String(location.id))
        .set(location, { merge: true });
    }

    for (const recurrence of data.recurrence) {
      await db
        .collection("analytics")
        .doc("recurrence")
        .collection("multipliers")
        .doc(recurrence.multiplier)
        .set(recurrence, { merge: true });
    }

    await logRef.doc(formattedDate).set({
      message: "Atualizado com sucesso",
      update_time: updateTime,
    });

    console.log("✅ Atualização diária concluída com sucesso!");
  } catch (error) {
    await logRef.doc(formattedDate).set({
      message: `Erro: ${error.message}`,
      update_time: updateTime,
    });

    console.error("❌ Erro na atualização diária:", error.message);
    console.error(error);
    throw new Error(error);
  }
};
