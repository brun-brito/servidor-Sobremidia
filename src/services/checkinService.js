const { db, admin, bucket } = require("../config/firebase");
const { v4: uuidv4 } = require("uuid");

// Salvar Check-In
exports.saveCheckIn = async (panelId, panelName, mediaPhotos) => {
    const checkInRef = db.collection("check-in").doc();
    const checkInId = checkInRef.id;

    const photoUrls = []; // Lista de URLs para salvar no Firestore

    for (const media of mediaPhotos) {
        const { mediaId, mediaName, mediaPhoto, environmentPhoto, timestamp } = media;

        // Salvar a foto da mídia
        const mediaFileName = `check-in/${checkInId}/${mediaId}_media_${uuidv4()}.jpg`;
        const mediaFile = bucket.file(mediaFileName);

        let mediaUrl;
        try {
            await mediaFile.save(Buffer.from(mediaPhoto, "base64"), {
                metadata: { contentType: "image/jpeg" },
            });
            [mediaUrl] = await mediaFile.getSignedUrl({
                action: "read",
                expires: "03-01-2030",
            });
        } catch (error) {
            console.error(`[ERROR] Falha ao salvar foto da mídia ${mediaId}:`, error);
            throw new Error(`Erro ao salvar a foto da mídia ${mediaId}.`);
        }

        // Salvar a foto do entorno
        const environmentFileName = `check-in/${checkInId}/${mediaId}_environment_${uuidv4()}.jpg`;
        const environmentFile = bucket.file(environmentFileName);

        let environmentUrl;
        try {
            await environmentFile.save(Buffer.from(environmentPhoto, "base64"), {
                metadata: { contentType: "image/jpeg" },
            });
            [environmentUrl] = await environmentFile.getSignedUrl({
                action: "read",
                expires: "03-01-2030",
            });
        } catch (error) {
            console.error(`[ERROR] Falha ao salvar foto do entorno ${mediaId}:`, error);
            throw new Error(`Erro ao salvar a foto do entorno ${mediaId}.`);
        }

        // Adicionar as URLs e informações no array
        photoUrls.push({
            mediaId,
            mediaName,
            mediaUrl,
            environmentUrl,
            timestamp,
        });
    }

    // Salvar dados no Firestore
    const checkInData = {
        panelId,
        panelName, // Nome do painel
        photos: photoUrls,
        createdAt: admin.firestore.Timestamp.now(),
    };

    await checkInRef.set(checkInData);
    return checkInData;
};

exports.getCheckIns = async () => {
    try {
        const snapshot = await db.collection("check-in").get();

        if (snapshot.empty) {
            return [];
        }

        const checkIns = [];
        snapshot.forEach((doc) => {
            checkIns.push({ id: doc.id, ...doc.data() });
        });

        return checkIns;
    } catch (error) {
        console.error("[ERROR] Falha ao buscar Check-Ins:", error);
        throw new Error("Erro ao buscar Check-Ins.");
    }
};