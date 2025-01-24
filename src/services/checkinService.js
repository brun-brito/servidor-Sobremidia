const { db, admin, bucket } = require("../config/firebase");
const { v4: uuidv4 } = require("uuid");

// Salvar Check-In
exports.saveCheckIn = async (panelId, panelName, mediaPhotos) => {
    const checkInRef = db.collection("check-in").doc();
    const checkInId = checkInRef.id;

    const photoUrls = []; // Lista de URLs para salvar no Firestore

    for (const media of mediaPhotos) {
        const {
            mediaId,
            mediaName,
            mediaPhoto,
            environmentPhoto,
            timestampMedia,
            timestampEnvironment,
        } = media;

        // Validar se ambas as fotos estão presentes
        if (!mediaPhoto || !environmentPhoto) {
            console.error(`[ERROR] Fotos ausentes para mídia ${mediaId}:`, {
                mediaPhoto,
                environmentPhoto,
            });
            throw new Error(`Fotos obrigatórias ausentes para mídia ${mediaId}.`);
        }

        let mediaUrl, environmentUrl;

        try {
            // Salvar a foto da mídia
            const mediaFileName = `check-in/${checkInId}/${mediaId}_media_${uuidv4()}.jpg`;
            const mediaFile = bucket.file(mediaFileName);

            await mediaFile.save(Buffer.from(mediaPhoto, "base64"), {
                metadata: { contentType: "image/jpeg" },
            });

            [mediaUrl] = await mediaFile.getSignedUrl({
                action: "read",
                expires: "03-01-2030",
            });

            // Salvar a foto do entorno
            const environmentFileName = `check-in/${checkInId}/${mediaId}_environment_${uuidv4()}.jpg`;
            const environmentFile = bucket.file(environmentFileName);

            await environmentFile.save(Buffer.from(environmentPhoto, "base64"), {
                metadata: { contentType: "image/jpeg" },
            });

            [environmentUrl] = await environmentFile.getSignedUrl({
                action: "read",
                expires: "03-01-2030",
            });

            // Adicionar as URLs e timestamps ao array
            photoUrls.push({
                mediaId,
                mediaName,
                mediaUrl,
                environmentUrl,
                timestampMedia: timestampMedia || "Sem data", // Valor padrão caso esteja ausente
                timestampEnvironment: timestampEnvironment || "Sem data", // Valor padrão caso esteja ausente
            });

        } catch (error) {
            console.error(`[ERROR] Falha ao salvar fotos para mídia ${mediaId}:`, error);
            throw new Error(`Erro ao salvar as fotos para mídia ${mediaId}.`);
        }
    }

    // Salvar dados no Firestore
    const checkInData = {
        panelId,
        panelName,
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