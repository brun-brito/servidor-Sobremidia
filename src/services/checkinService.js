const { db, bucket } = require("../config/firebase");
const { FieldValue } = require("firebase-admin/firestore");
const fs = require('fs');
const path = require('path');
const Busboy = require("busboy");
  
exports.createCheckinService = async (data) => {
    // Valida se o array de midias foi enviado e se cada mídia contém pelo menos um arquivo em cada categoria
    if (!data.midias || !Array.isArray(data.midias) || data.midias.length === 0) {
      throw new Error('Midias inválidas.');
    }
    for (let media of data.midias) {
      if (!media.fotosMidia || media.fotosMidia.length === 0 ||
          !media.fotosEntorno || media.fotosEntorno.length === 0 ||
          !media.videosMidia || media.videosMidia.length === 0) {
        throw new Error('Cada mídia deve ter pelo menos um arquivo em cada categoria.');
      }
    }
    
    const checkinData = {
      createdAt: FieldValue.serverTimestamp(),
      panelId: data.panelId,
      panelName: data.panelName,
      midias: data.midias,
      user: data.user,
      senha: Math.random().toString(36).slice(-5),
    };
    
    const docRef = await db.collection('checkin').add(checkinData);
    return { message: 'Check-in criado com sucesso!', id: docRef.id };
}

exports.getCheckIns = async () => {
    try {
        const snapshot = await db.collection("checkin").get();

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

exports.uploadPhoto = (req) => {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: req.headers });
    const fields = {};
    const fileBuffers = [];
    let filename = "";
    let mimetype = "";

    busboy.on("field", (fieldname, val) => {
      fields[fieldname] = val;
    });

    busboy.on("file", (fieldname, file, originalFilename, encoding, mime) => {
      filename = originalFilename;
      mimetype = mime;
      file.on("data", (data) => {
        fileBuffers.push(data);
      });
      file.on("end", () => {
      });
    });

    busboy.on("finish", async () => {
      
      if (!fields.checkinId) {
        console.error("Erro: checkinId não foi informado.");
        return reject(new Error("checkinId é obrigatório."));
      }
      const finalBuffer = Buffer.concat(fileBuffers);

      const timestamp = Date.now();
      const filePath = `checkin/${fields.checkinId}/${timestamp}_${fields.originalName}`;
      const fileRef = bucket.file(filePath);

      try {
        await fileRef.save(finalBuffer, {
          metadata: { contentType: mimetype },
          resumable: false,
        });

        await fileRef.makePublic();
        const url = `https://storage.googleapis.com/sobremidia-ce.firebasestorage.app/${filePath}`;

        resolve(url);
      } catch (error) {
        console.error("Erro ao salvar o arquivo:", error);
        reject(error);
      }
    });

    busboy.end(req.rawBody);
  });
};

exports.uploadChunk = (req) => {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: req.headers });
    const fields = {};
    let chunkBuffer;

    busboy.on("field", (fieldname, val) => {
      fields[fieldname] = val;
    });

    busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
      const buffers = [];
      file.on("data", (data) => buffers.push(data));
      file.on("end", () => {
        chunkBuffer = Buffer.concat(buffers);
      });
    });

    busboy.on("finish", async () => {
      try {
        const { fileId, chunkIndex, totalChunks, originalName, checkinId } = fields;
        const chunkIndexNum = parseInt(chunkIndex, 10);
        const totalChunksNum = parseInt(totalChunks, 10);

        const chunksDir = path.join("/tmp/uploads", fileId);
        if (!fs.existsSync(chunksDir)) {
          fs.mkdirSync(chunksDir, { recursive: true });
        }

        const chunkFilePath = path.join(chunksDir, chunkIndexNum.toString());
        fs.writeFileSync(chunkFilePath, chunkBuffer);

        if (chunkIndexNum === totalChunksNum - 1) {
          const finalFilePath = path.join(chunksDir, "final_" + originalName);
          const writeStream = fs.createWriteStream(finalFilePath);

          for (let i = 0; i < totalChunksNum; i++) {
            const chunkPath = path.join(chunksDir, i.toString());
            if (!fs.existsSync(chunkPath)) {
              return reject(new Error(`Chunk ${i} não encontrado.`));
            }
            const data = fs.readFileSync(chunkPath);
            writeStream.write(data);
          }
          writeStream.end();

          await new Promise((resolve, reject) => {
            writeStream.on("finish", resolve);
            writeStream.on("error", reject);
          });

          const fileName = `checkin/${checkinId}/${Date.now()}_${originalName}`;
          const fileRef = bucket.file(fileName);
          const finalFileBuffer = fs.readFileSync(finalFilePath);
          await fileRef.save(finalFileBuffer, {
            metadata: { contentType: "video/mp4" },
            resumable: false,
          });
          await fileRef.makePublic();

          fs.rmSync(chunksDir, { recursive: true, force: true });

          resolve({
            message: "Upload completo e vídeo armazenado com sucesso!",
            url: `https://storage.googleapis.com/sobremidia-ce.firebasestorage.app/${fileName}`,
          });
        } else {
          resolve({ message: `Chunk ${chunkIndexNum} recebido.` });
        }
      } catch (error) {
        reject(error);
      }
    });

    busboy.end(req.rawBody);
  });
};

exports.getCheckinsByIds = async (checkinIds) => {
  console.log(`[INFO] Buscando check-ins para os IDs: ${checkinIds.join(", ")}`);

  const checkinDocs = await Promise.all(
      checkinIds.map(id => db.collection("checkin").doc(id).get())
  );

  return checkinDocs
      .filter(doc => doc.exists)
      .map(doc => ({ id: doc.id, ...doc.data() }));
};

exports.validatePassword = async (checkinId, password) => {
  const checkinRef = db.collection("checkin").doc(checkinId);
  const checkinDoc = await checkinRef.get();

  if (!checkinDoc.exists) {
      console.log(`[ERROR] Check-in ${checkinId} não encontrado.`);
      return { valid: false, error: "Check-in não encontrado" };
  }

  const storedPassword = checkinDoc.data().senha;
  return { valid: password === storedPassword };
};

async function deleteMediaFromStorage(mediaLinks) {
  const deletePromises = mediaLinks.map(async (url) => {
      try {
          // Extrair o caminho correto do arquivo no Firebase Storage
          const regex = /https:\/\/storage\.googleapis\.com\/[^/]+\/(.+)/;
          const match = url.match(regex);

          if (!match || !match[1]) {
              console.error(`Erro ao processar URL inválida: ${url}`);
              return;
          }

          const filePath = match[1].split("?")[0];

          await bucket.file(filePath).delete();
          console.log(`Arquivo removido com sucesso: ${filePath}`);
      } catch (error) {
          console.error(`Erro ao remover arquivo: ${url}`, error);
      }
  });

  await Promise.all(deletePromises);
}

exports.deleteCheckin = async(checkinId) => {
  const checkinRef = db.collection("checkin").doc(checkinId);
  const checkinDoc = await checkinRef.get();

  if (!checkinDoc.exists) {
      throw new Error("Check-in não encontrado!");
  }

  const checkinData = checkinDoc.data();
  let mediaLinks = [];

  if (checkinData.midias && Array.isArray(checkinData.midias)) {
      checkinData.midias.forEach((midia) => {
          if (midia.fotosMidia && Array.isArray(midia.fotosMidia)) {
              mediaLinks.push(...midia.fotosMidia.map((foto) => foto.url));
          }
          if (midia.fotosEntorno && Array.isArray(midia.fotosEntorno)) {
              mediaLinks.push(...midia.fotosEntorno.map((foto) => foto.url));
          }
          if (midia.videosMidia && Array.isArray(midia.videosMidia)) {
              mediaLinks.push(...midia.videosMidia.map((video) => video.url));
          }
      });
  }

  console.log(`Mídias encontradas para exclusão: ${mediaLinks.length} arquivos.`);

  await deleteMediaFromStorage(mediaLinks);
  await checkinRef.delete();

  console.log(`Check-in ${checkinId} removido com sucesso.`);
}
