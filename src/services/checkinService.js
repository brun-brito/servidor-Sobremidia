const { db, bucket } = require("../config/firebase");
const { FieldValue } = require("firebase-admin/firestore");
const fs = require('fs');
const path = require('path');

exports.uploadPhotosService = async (files, body) => {
    // Recebe os timestamps enviados; se não forem arrays, converte para array
    let fotosMidiaTimestamps = body.fotosMidiaTimestamps;
    let fotosEntornoTimestamps = body.fotosEntornoTimestamps;
    if (!Array.isArray(fotosMidiaTimestamps)) {
      fotosMidiaTimestamps = [fotosMidiaTimestamps];
    }
    if (!Array.isArray(fotosEntornoTimestamps)) {
      fotosEntornoTimestamps = [fotosEntornoTimestamps];
    }
    
    // Função auxiliar para upload de um arquivo para o Firebase Storage
    const uploadFile = async (file, timestamp) => {
      const ts = Date.now();
      const fileName = `checkin/${ts}_${file.originalname}`;
      const fileRef = bucket.file(fileName);
      await fileRef.save(file.buffer, {
        metadata: { contentType: file.mimetype },
        resumable: true
      });
      await fileRef.makePublic();
      return { timestamp: timestamp || new Date().toISOString(), url: `https://storage.googleapis.com/${bucket.name}/${fileName}` };
    };
  
    // Upload de fotos da mídia
    const fotosMidiaUploads = await Promise.all(
      files.fotosMidia.map((file, idx) => uploadFile(file, fotosMidiaTimestamps[idx]))
    );
    
    // Upload de fotos do entorno
    const fotosEntornoUploads = await Promise.all(
      files.fotosEntorno.map((file, idx) => uploadFile(file, fotosEntornoTimestamps[idx]))
    );
    
    return { fotosMidia: fotosMidiaUploads, fotosEntorno: fotosEntornoUploads };
}
  
exports.uploadVideoChunkService = async (req) => {
    const { fileId, chunkIndex, totalChunks, originalName, videoTimestamp } = req.body;
    const chunkIndexNum = parseInt(chunkIndex, 10);
    const totalChunksNum = parseInt(totalChunks, 10);
  
    const chunksDir = path.join("tmp/uploads", fileId);
    const chunkFilePath = path.join(chunksDir, `${chunkIndexNum}`);
  
    // Garante que o diretório de chunks exista
    fs.mkdirSync(chunksDir, { recursive: true });
  
    // Salva o chunk atual no diretório temporário
    await new Promise((resolve, reject) => {
      const writeStream = fs.createWriteStream(chunkFilePath);
      req.file.stream.pipe(writeStream);
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
    });
  
    // Se for o último chunk, junta todos os pedaços
    if (chunkIndexNum === totalChunksNum - 1) {
      const finalFilePath = path.join(chunksDir, `final_${originalName}`);
      const writeStream = fs.createWriteStream(finalFilePath);
  
      // Concatena os chunks na ordem correta
      for (let i = 0; i < totalChunksNum; i++) {
        const chunkPath = path.join(chunksDir, `${i}`);
        if (!fs.existsSync(chunkPath)) {
          throw new Error(`Chunk ${i} não encontrado.`);
        }
        const data = fs.readFileSync(chunkPath);
        writeStream.write(data);
      }
      writeStream.end();
  
      await new Promise((resolve, reject) => {
        writeStream.on("finish", resolve);
        writeStream.on("error", reject);
      });
  
      // Upload do arquivo final para o Firebase Storage
      const fileName = `checkin/${Date.now()}_${originalName}`;
      const fileRef = bucket.file(fileName);
      const finalFileBuffer = fs.readFileSync(finalFilePath);
      await fileRef.save(finalFileBuffer, {
        metadata: { contentType: req.file.mimetype },
        resumable: false,
      });
      await fileRef.makePublic();
  
      // Limpa os arquivos temporários
      fs.rmSync(chunksDir, { recursive: true, force: true });
  
      return { timestamp: videoTimestamp || new Date().toISOString(), url: `https://storage.googleapis.com/${bucket.name}/${fileName}` };
    } else {
      return { message: `Chunk ${chunkIndex} recebido.` };
    }
};
  
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