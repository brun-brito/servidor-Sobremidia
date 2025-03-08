const express = require("express");
const router = express.Router();
const checkinController = require("../controllers/checkinController");
const { db, bucket } = require("../config/firebase");
const fs = require('fs');
const path = require('path');
const Busboy = require("busboy");
const session = require("express-session");

//
// 1. Endpoint para Fotos (upload normal)
//    - Utiliza armazenamento em memória, pois o arquivo fica disponível como buffer
//
router.post('/upload-photo', (req, res) => {
  const busboy = Busboy({ headers: req.headers });
  const uploads = [];
  let checkinId;

  busboy.on('field', (fieldname, val) => {
    if (fieldname === 'checkinId') checkinId = val;
  });

  busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
    const timestamp = Date.now();
    const fileName = `checkin/${checkinId}/${timestamp}_${filename}`;
    const fileRef = bucket.file(fileName);
    const writeStream = fileRef.createWriteStream({
      metadata: { contentType: mimetype }
    });

    file.pipe(writeStream);

    const promise = new Promise((resolve, reject) => {
      file.on('end', () => writeStream.end());
      writeStream.on('finish', async () => {
        await fileRef.makePublic();
        resolve(`https://storage.googleapis.com/sobremidia-ce.firebasestorage.app/${fileName}`);
      });
      writeStream.on('error', reject);
    });

    uploads.push(promise);
  });

  busboy.on('finish', async () => {
    if (!checkinId) {
      return res.status(400).json({ error: 'checkinId é obrigatório.' });
    }

    try {
      const urls = await Promise.all(uploads);
      return res.status(200).json({ message: 'Fotos enviadas com sucesso!', urls });
    } catch (error) {
      console.error("Erro ao subir fotos:", error);
      return res.status(500).json({ error: 'Erro ao fazer upload das fotos.' });
    }
  });

  busboy.end(req.rawBody);
});

//
// 2. Endpoint para Vídeos (upload em chunks)
//    - Utiliza armazenamento em disco para salvar os chunks
//    - Espera que o front-end envie os campos fileId, chunkIndex, totalChunks, originalName e o arquivo no campo "chunk"
//
router.post('/upload-chunk', async (req, res) => {
  const busboy = Busboy({ headers: req.headers });
  
  const fields = {};
  let chunkBuffer;

  busboy.on('field', (fieldname, val) => {
    fields[fieldname] = val;
  });

  busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
    const buffers = [];
    file.on('data', (data) => buffers.push(data));
    file.on('end', () => {
      chunkBuffer = Buffer.concat(buffers);
    });
  });

  busboy.on('finish', async () => {
    try {
      const { fileId, chunkIndex, totalChunks, originalName, checkinId } = fields;
      const chunkIndexNum = parseInt(chunkIndex, 10);
      const totalChunksNum = parseInt(totalChunks, 10);

      const chunksDir = path.join('/tmp/uploads', fileId);
      if (!fs.existsSync(chunksDir)) {
        fs.mkdirSync(chunksDir, { recursive: true });
      }

      const chunkFilePath = path.join(chunksDir, chunkIndexNum.toString());
      fs.writeFileSync(chunkFilePath, chunkBuffer);

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

        await new Promise((resolve, reject) => {
          writeStream.on('finish', resolve);
          writeStream.on('error', reject);
        });

        const fileName = `checkin/${checkinId}/${Date.now()}_${originalName}`;
        const fileRef = bucket.file(fileName);
        const finalFileBuffer = fs.readFileSync(finalFilePath);
        await fileRef.save(finalFileBuffer, {
          metadata: { contentType: 'video/mp4' },
          resumable: false,
        });
        await fileRef.makePublic();

        fs.rmSync(chunksDir, { recursive: true, force: true });

        return res.status(200).json({
          message: 'Upload completo e vídeo armazenado com sucesso!',
          url: `https://storage.googleapis.com/sobremidia-ce.firebasestorage.app/${fileName}`,
        });
      } else {
        return res.status(200).json({ message: `Chunk ${chunkIndexNum} recebido.` });
      }
    } catch (error) {
      console.error("Erro no upload em chunks:", error);
      return res.status(500).json({ error: 'Erro ao processar o upload em chunks.' });
    }
  });

  busboy.end(req.rawBody);
});
  
router.post(
    '/create',
    checkinController.createCheckin
  );

router.get(
    "/", 
    checkinController.getCheckIns
);

router.get("/:id", async (req, res) => {
  try {
      const checkinRef = db.collection("checkin").doc(req.params.id);
      const doc = await checkinRef.get();

      if (!doc.exists) {
          return res.status(404).json({ error: "Check-in não encontrado" });
      }

      return res.json(doc.data());
  } catch (error) {
      console.error("Erro ao buscar check-in:", error);
      res.status(500).json({ error: "Erro ao buscar check-in" });
  }
});

router.use(session({
  secret: "segredo-super-seguro",
  resave: false,
  saveUninitialized: true,
  cookie: {
      secure: false,
  }
}));

// Página de check-in protegida por senha
router.get("/html/:id", async (req, res) => {

  if (req.session[`authenticated_${req.params.id}`]) {
      console.log(`[INFO] Sessão autenticada para check-in ${req.params.id}. Exibindo relatório.`);
      return checkinController.displayCheckin(req, res);
  }

  const loginPage = `
      <html lang="pt-br">
      <head>
          <title>Check-in Protegido</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f4f4f4; }
              .container { max-width: 400px; margin: auto; padding: 20px; background: white; border-radius: 5px; box-shadow: 0px 0px 10px rgba(0,0,0,0.1); }
              input { display: block; width: 100%; margin-bottom: 10px; padding: 10px; font-size: 16px; border: 1px solid #ccc; border-radius: 5px; }
              button { padding: 10px; width: 100%; background: #24d464; border: none; color: white; font-size: 16px; cursor: pointer; border-radius: 5px; }
              button:hover { background: #1db354; }
              .error { color: red; font-size: 14px; margin-top: 10px; display: none; }
          </style>
      </head>
      <body>
          <div class="container">
              <h2>Digite a Senha para Acessar o Check-in</h2>
              <form id="passwordForm">
                  <input type="password" id="passwordInput" placeholder="Digite a senha" required>
                  <button type="submit">Entrar</button>
                  <p class="error" id="errorMessage">Senha incorreta!</p>
              </form>
          </div>

          <script>
              document.getElementById("passwordForm").addEventListener("submit", async function(event) {
                  event.preventDefault();
                  var password = document.getElementById("passwordInput").value;
                  const response = await fetch(window.location.pathname, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ password }),
                      credentials: "include"
                  });

                  const result = await response.text();

                  if (response.ok) {
                      console.log("[INFO] Senha correta. Redirecionando...");
                      window.location.href = window.location.pathname;
                  } else {
                      console.log("[ERROR] Senha incorreta.");
                      document.getElementById("errorMessage").style.display = "block";
                  }
              });
          </script>
      </body>
      </html>
  `;

  res.send(loginPage);
});

router.post("/html/:id", async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;

  console.log(`[INFO] Tentativa de autenticação para check-in ${id}`);

  try {
      const checkinRef = db.collection("checkin").doc(id);
      const doc = await checkinRef.get();

      if (!doc.exists) {
          console.log(`[ERROR] Check-in ${id} não encontrado.`);
          return res.status(404).send("Check-in não encontrado.");
      }

      const storedPassword = doc.data().senha;

      if (password === storedPassword) {
          req.session[`authenticated_${id}`] = true;
          console.log(`[SUCCESS] Autenticação bem-sucedida para check-in ${id}.`);
          return res.status(200).send("OK");
      }

      console.log(`[ERROR] Senha incorreta para check-in ${id}.`);
      res.status(401).send("Senha incorreta.");
  } catch (error) {
      console.error("[ERROR] Erro na autenticação:", error);
      res.status(500).send("Erro no servidor.");
  }
});

module.exports = router;