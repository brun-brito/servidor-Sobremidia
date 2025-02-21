const express = require("express");
const router = express.Router();
const checkinController = require("../controllers/checkinController");
const { db, bucket } = require("../config/firebase");
const fs = require('fs');
const path = require('path');
const Busboy = require("busboy");

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

// 🔹 Endpoint para retornar o HTML do check-in
router.get("/html/:id", async (req, res) => {
  try {
      const checkinRef = db.collection("checkin").doc(req.params.id);
      const doc = await checkinRef.get();

      if (!doc.exists) {
          return res.status(404).send("<h1>Check-in não encontrado</h1>");
      }

      const checkin = doc.data();

      // Gerando HTML dinâmico
      const reportHtml = `
      <!DOCTYPE html>
      <html lang="pt">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Relatório de Check-In</title>
          <style>
            body {
                font-family: Arial, sans-serif;
                max-width: 900px;
                margin: 20px auto;
                padding: 20px;
                background-color: #f4f4f4;
                color: #333;
                border-radius: 10px;
            }

            h1 {
                text-align: center;
                color: #0056b3;
            }

            h2 {
                border-bottom: 2px solid #0056b3;
                padding-bottom: 5px;
                color: #0056b3;
            }

            h3 {
                color: #333;
                margin-top: 15px;
            }

            .details-container {
                background: white;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);
            }

            p {
                font-size: 16px;
            }

            ul {
                list-style-type: none;
                padding: 0;
                margin: 10px 0;
            }

            li {
                background: #ffffff;
                margin: 10px 0;
                padding: 15px;
                border-radius: 8px;
                box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.1);
            }

            .checkin-image {
                display: block;
                max-width: 100%;
                border-radius: 5px;
                margin-top: 10px;
                box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.2);
            }

            .media-gallery {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
                gap: 15px;
                margin-top: 15px;
            }

            .media-item {
                position: relative;
                background: white;
                border-radius: 5px;
                overflow: hidden;
                padding: 10px;
                box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.1);
            }

            .media-item img,
            .media-item video {
                height: auto;
                border-radius: 5px;
            }

            .timestamp {
                font-size: 14px;
                color: #666;
                text-align: center;
                margin-top: 5px;
            }

            .video-gallery {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                gap: 15px;
                margin-top: 10px;
            }

            .video-item {
                display: flex;
                flex-direction: column;
                align-items: center;
            }

            .checkin-video {
                width: 100%;
                max-width: 400px;
                border-radius: 5px;
                box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.2);
            }
              .modal {
                position: fixed;
                z-index: 1000;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .modal-content {
                max-width: 90%;
                max-height: 90%;
                border-radius: 10px;
            }

            .close {
                position: absolute;
                top: 15px;
                right: 25px;
                color: white;
                font-size: 40px;
                font-weight: bold;
                cursor: pointer;
            }

            @media (max-width: 600px) {
              .media-gallery {
                  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
              }

              .video-gallery {
                  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
              }
            }
          </style>
        </head>
        <body>
          <h1>Relatório de Check-In</h1>
          <div class="details-container">
              <p><strong>Painel:</strong> ${checkin.panelName || checkin.panelId}</p>
              <p><strong>Data:</strong> ${new Date(checkin.createdAt._seconds * 1000).toLocaleString()}</p>

              <h2>Mídias</h2>
              <ul class="media-list">
                  ${checkin.midias.map(media => `
                      <li class="media-item">
                          <p><strong>Mídia:</strong> ${media.nomeMidia || media.idMidia}</p>
                          <p><strong>Cliente:</strong> ${media.cliente || "-"}</p>

                          <h3>Foto Esperada</h3>
                          <div class="photo-group">
                              <img src="https://s3.amazonaws.com/4yousee-files/sobremidia/common/videos/thumbnails/i_${media.idMidia}.png"
                                  alt="Foto Esperada" class="checkin-image">
                          </div>

                          <h3>Fotos da Mídia</h3>
                          <ul class="media-gallery">
                              ${media.fotosMidia.map(foto => `
                                  <li class="media-item">
                                      <img src="${foto.url}" alt="Foto Mídia" class="checkin-image">
                                      <p class="timestamp">${new Date(foto.timestamp).toLocaleString()}</p>
                                  </li>
                              `).join("")}
                          </ul>

                          <h3>Fotos do Entorno</h3>
                          <ul class="media-gallery">
                              ${media.fotosEntorno.map(foto => `
                                  <li class="media-item">
                                      <img src="${foto.url}" alt="Foto Entorno" class="checkin-image">
                                      <p class="timestamp">${new Date(foto.timestamp).toLocaleString()}</p>
                                  </li>
                              `).join("")}
                          </ul>

                          <h3>Vídeos da Mídia</h3>
                          <ul class="video-gallery">
                              ${media.videosMidia.map(video => `
                                  <li class="video-item">
                                      <video controls class="checkin-video">
                                          <source src="/proxy?url=${encodeURIComponent(video.url)}" type="video/mp4">
                                      </video>
                                      <p class="timestamp">${new Date(video.timestamp).toLocaleString()}</p>
                                  </li>
                              `).join("")}
                          </ul>
                      </li>
                  `).join("")}
              </ul>
          </div>
          <div style="display: none;" id="image-modal" class="modal">
              <span class="close">&times;</span>
              <img class="modal-content" id="modal-img">
          </div>
          <script>
            document.addEventListener("DOMContentLoaded", () => {
                const modal = document.getElementById("image-modal");
                const modalImg = document.getElementById("modal-img");
                const closeBtn = document.querySelector(".close");

                document.querySelectorAll(".checkin-image").forEach(img => {
                    img.addEventListener("click", function () {
                        modal.style.display = "flex";
                        modalImg.src = this.src;
                    });
                });

                closeBtn.addEventListener("click", () => {
                    modal.style.display = "none";
                });

                modal.addEventListener("click", (event) => {
                    if (event.target === modal) {
                        modal.style.display = "none";
                    }
                });
            });
            </script>

        </body>
      </html>
      `;

      res.send(reportHtml);
  } catch (error) {
      console.error("Erro ao buscar check-in:", error);
      res.status(500).send("<h1>Erro ao gerar relatório</h1>");
  }
});

module.exports = router;