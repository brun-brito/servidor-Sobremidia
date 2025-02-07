const express = require("express");
const router = express.Router();
const checkinController = require("../controllers/checkinController");
const { bucket } = require("../config/firebase");
const multer = require('multer');
const fs = require('fs');
const path = require('path');

//
// 1. Endpoint para Fotos (upload normal)
//    - Utiliza armazenamento em memória, pois o arquivo fica disponível como buffer
//
const storageMemory = multer.memoryStorage();
const uploadPhotos = multer({
  storage: storageMemory,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB por foto (ajuste se necessário)
});

router.post('/upload-photo', uploadPhotos.array('files'), async (req, res) => {
  try {
    // Verifica se foram enviados arquivos
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }

    const uploadPromises = req.files.map(async (file) => {
      // Gera um nome único usando timestamp e o nome original
      const timestamp = Date.now();
      const fileName = `checkin/${timestamp}_${file.originalname}`;
      const fileRef = bucket.file(fileName);

      // Salva o arquivo utilizando o buffer recebido
      await fileRef.save(file.buffer, {
        metadata: { contentType: file.mimetype },
        resumable: true
      });

      // Torna o arquivo público (opcional)
      await fileRef.makePublic();

      // Retorna a URL pública do arquivo
      return `https://storage.googleapis.com/sobremidia-ce.firebasestorage.app/${fileName}`;
    });

    const urls = await Promise.all(uploadPromises);

    return res.status(200).json({
      message: 'Fotos enviadas com sucesso!',
      urls
    });
  } catch (error) {
    console.error("Erro no upload das fotos:", error);
    return res.status(500).json({ error: 'Erro ao fazer upload das fotos.' });
  }
});

//
// 2. Endpoint para Vídeos (upload em chunks)
//    - Utiliza armazenamento em disco para salvar os chunks
//    - Espera que o front-end envie os campos fileId, chunkIndex, totalChunks, originalName e o arquivo no campo "chunk"
//
const storageChunks = multer.diskStorage({
    destination: function (req, file, cb) {
      console.log("[DEBUG] Iniciando a função destination...");
  
      req.body = req.body || {}; // Garante que o req.body existe
      console.log("[DEBUG] req.body inicial:", req.body);
  
      const fileId = req.body.fileId || req.query.fileId;
      console.log("[DEBUG] fileId obtido:", fileId);
  
      if (!fileId) {
        console.error("[ERROR] fileId é obrigatório.");
        return cb(new Error("fileId é obrigatório"), null);
      }
  
      const uploadPath = path.join('tmp/uploads', fileId);
      console.log("[DEBUG] Caminho do upload:", uploadPath);
  
      try {
        fs.mkdirSync(uploadPath, { recursive: true });
        console.log("[DEBUG] Pasta criada (ou já existente).");
      } catch (error) {
        console.error("[ERROR] Erro ao criar pasta:", error);
        return cb(error, null);
      }
  
      cb(null, uploadPath);
    },
  
    filename: function (req, file, cb) {
      console.log("[DEBUG] Iniciando a função filename...");
  
      req.body = req.body || {}; // Garante que o req.body existe
      console.log("[DEBUG] req.body inicial na função filename:", req.body);
  
      const chunkIndex = req.body.chunkIndex || req.query.chunkIndex;
      console.log("[DEBUG] chunkIndex obtido:", chunkIndex);
  
      if (chunkIndex === undefined) {
        console.error("[ERROR] chunkIndex é obrigatório.");
        return cb(new Error("chunkIndex é obrigatório"), null);
      }
  
      cb(null, chunkIndex.toString());
    }
  });
  
  
const uploadVideoChunk = multer().any();
// multer({
//     storage: storageChunks,
//     limits: { fileSize: 10 * 1024 * 1024 } // 10MB por chunk
// });

router.post('/upload-chunk', uploadVideoChunk, async (req, res) => {
    try {
      const { fileId, chunkIndex, totalChunks, originalName } = req.body;
      const chunkIndexNum = parseInt(chunkIndex, 10);
      const totalChunksNum = parseInt(totalChunks, 10);
  
      // Verifica e cria o diretório de chunks se necessário
      const chunksDir = path.join('tmp/uploads', fileId);
      if (!fs.existsSync(chunksDir)) {
        fs.mkdirSync(chunksDir, { recursive: true });
      }
  
      // Salva o chunk no disco (nome do arquivo = chunkIndex)
      const chunkFilePath = path.join(chunksDir, chunkIndexNum.toString());
      const chunkFile = req.files.find(file => file.fieldname === 'chunk');
      if (!chunkFile) {
        return res.status(400).json({ error: 'Arquivo do chunk não encontrado.' });
      }
  
      fs.writeFileSync(chunkFilePath, chunkFile.buffer);
  
      // Se for o último chunk, concatena todos os chunks
      if (chunkIndexNum === totalChunksNum - 1) {
        const finalFilePath = path.join(chunksDir, 'final_' + originalName);
        const writeStream = fs.createWriteStream(finalFilePath);
  
        for (let i = 0; i < totalChunksNum; i++) {
          const chunkPath = path.join(chunksDir, i.toString());
          if (!fs.existsSync(chunkPath)) {
            return res.status(400).json({ error: `Chunk ${i} não encontrado.` });
          }
          const data = fs.readFileSync(chunkPath);
          writeStream.write(data);
        }
        writeStream.end();
  
        // Aguarda a concatenação
        await new Promise((resolve, reject) => {
          writeStream.on('finish', resolve);
          writeStream.on('error', reject);
        });
  
  
        // Realiza o upload do arquivo final para o Firebase Storage
        const fileName = `checkin/${Date.now()}_${originalName}`;
        const fileRef = bucket.file(fileName);
        const finalFileBuffer = fs.readFileSync(finalFilePath);
        await fileRef.save(finalFileBuffer, {
          metadata: { contentType: chunkFile.mimetype },
          resumable: false,
        });
        await fileRef.makePublic();
  
        // Limpa os arquivos temporários
        fs.rmSync(chunksDir, { recursive: true, force: true });
  
        return res.status(200).json({
          message: 'Upload completo e vídeo armazenado com sucesso!',
          url: `https://storage.googleapis.com/sobremidia-ce.firebasestorage.app/${fileName}`,
              //https://storage.googleapis.com/sobremidia-ce.firebasestorage.app/teste/1738955989005_VideoAbertura%20-%20Copia%20(3).mp4
        });
      } else {
        return res.status(200).json({ message: `Chunk ${chunkIndexNum} recebido.` });
      }
    } catch (error) {
      console.error("Erro no upload em chunks:", error);
      return res.status(500).json({ error: 'Erro ao processar o upload em chunks.' });
    }
  });
  
router.post(
    '/create',
    checkinController.createCheckin
  );

// router.post("/", checkinController.createCheckIn);
// router.get("/", checkinController.getCheckIns);
module.exports = router;
