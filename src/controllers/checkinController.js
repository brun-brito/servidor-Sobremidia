const checkinService = require("../services/checkinService");
const { getDb } = require("../config/firebase");
const moment = require("moment");
require("moment/locale/pt-br"); 
  
exports.createCheckin = async (req, res) => {
    try {
      const result = await checkinService.createCheckinService(req.body);
      res.status(200).json(result);
    } catch (error) {
      console.error("Erro ao criar check-in:", error);
      res.status(500).json({ error: error.message || 'Erro ao criar check-in.' });
    }
}

exports.getCheckIns = async (req, res) => {
    try {
        const checkIns = await checkinService.getCheckIns();
        res.status(200).json({ success: true, data: checkIns });
    } catch (error) {
        console.error("[ERROR] Falha ao buscar Check-Ins:", error.message);
        res.status(500).json({ success: false, error: "Erro ao buscar Check-Ins." });
    }
};

exports.getCheckinById = async (req, res) => {
    try {
        const db = getDb();
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
}

exports.displayCheckin = async (req, res) => {
    try {
        const checkinIds = req.params.ids.split("&");
        if (!checkinIds.length) {
            return res.status(400).send("Nenhum ID de check-in fornecido.");
        }

        const checkins = await checkinService.getCheckinsByIds(checkinIds);

        if (checkins.length === 0) {
            return res.status(404).json({ error: "Nenhum check-in encontrado" });
        }

        const authKey = `authenticated_${checkinIds[0]}`;
        if (req.session[authKey]) {
            console.log(`[INFO] Sessão autenticada para check-ins: ${checkinIds.join(", ")}`);

            const checkinHtml = checkins.map(checkin => `
                <div class="header-container">
                <img src="../../assets/fotos/fotoHeader.png" 
                alt="Logo Sobremidia" 
                class="header-image">
                </div>
                <h1>Relatório de Checkin</h1>
                <p><strong>Painel:</strong> ${checkin.panelName || checkin.panelId}</p>
                <p><strong>Data:</strong> ${moment.unix(checkin.createdAt._seconds).utcOffset('-03:00').format("DD/MM/YYYY, HH:mm:ss")}</p>
                <ul class="media-list">
                    ${checkin.midias.map(media => `
                        <li class="media-item">
                            <p><strong>Mídia:</strong> ${media.nomeMidia || media.idMidia}</p>
                            <p><strong>Cliente:</strong> ${media.cliente || "-"}</p>

                            <h3>Preview da Mídia</h3>
                            <div class="photo-group">
                                <img src="https://s3.amazonaws.com/4yousee-files/sobremidia/common/videos/thumbnails/i_${media.idMidia}.png"
                                    alt="Preview da Mídia" class="checkin-image">
                            </div>

                            <h3>Fotos da Mídia</h3>
                            <ul class="media-gallery">
                                ${media.fotosMidia.map(foto => `
                                    <li class="media-item">
                                        <img src="${foto.url}" alt="Foto Mídia" class="checkin-image">
                                        <p class="timestamp">${moment(foto.timestamp).format("DD/MM/YYYY, HH:mm:ss")}</p>
                                    </li>
                                `).join("")}
                            </ul>

                            <h3>Fotos do Entorno</h3>
                            <ul class="media-gallery">
                                ${media.fotosEntorno.map(foto => `
                                    <li class="media-item">
                                        <img src="${foto.url}" alt="Foto Entorno" class="checkin-image">
                                        <p class="timestamp">${moment(foto.timestamp).format("DD/MM/YYYY, HH:mm:ss")}</p>
                                    </li>
                                `).join("")} 
                            </ul>

                            <h3>Vídeos da Mídia</h3>
                            <ul class="video-gallery">
                                ${media.videosMidia.map(video => `
                                    <li class="video-item">
                                        <video controls class="checkin-video">
                                            <source src="${video.url}" type="video/mp4">
                                        </video>
                                        <p class="timestamp">${moment(video.timestamp).format("DD/MM/YYYY, HH:mm:ss")}</p>
                                    </li>
                                `).join("")}
                            </ul>
                        </li>
                    `).join("")}
                </ul>
            </div>
            
            <div class="footer-container">
                <img src="../../assets/fotos/fotoFooter.png" 
                alt="Rodapé Sobremidia" 
                class="footer-image">
            </div>
            `).join("");

            // Gerando HTML dinâmico
            const reportHtml = `
            <!DOCTYPE html>
            <html lang="pt">
            <head>
                <link rel="icon" href="../../assets/fotos/color.png" type="image/x-icon">
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Relatório de Check-In</title>
                <style>
                body {font-family: Arial, sans-serif;max-width: 900px;margin: 20px auto;padding: 20px;background-color: #f4f4f4;color: #333;border-radius: 10px;}
                h1 {color: #333;}
                h3 {color: #333;margin-top: 15px;}
                .details-container {width: 90%;max-width: 900px;background: white;padding: 20px;border-radius: 8px;box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);margin-bottom: 40px; /* Adiciona espaço suficiente para o footer */}
                p {font-size: 16px;}ul {list-style-type: none;padding: 0;margin: 10px 0;}
                li {background: #ffffff;margin: 10px 0;padding: 15px;border-radius: 8px;//box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.1);}
                .checkin-image {display: block;max-width: 100%;border-radius: 5px;margin-top: 10px;box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.2);}
                .media-gallery {display: grid;grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));gap: 15px;margin-top: 15px;}
                .media-item {position: relative;background: white;border-radius: 5px;overflow: hidden;padding: 10px;box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.1);}
                .media-item img, .media-item video {height: auto;border-radius: 5px;}
                .timestamp {font-size: 14px;color: #666;text-align: center;margin-top: 5px;}
                .video-gallery {display: grid;grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));gap: 15px;margin-top: 10px;}
                .video-item {display: flex;flex-direction: column;align-items: center;}
                .checkin-video {width: 100%;max-width: 400px;border-radius: 5px;box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.2);}
                .modal {position: fixed;z-index: 1000;left: 0;top: 0;width: 100%;height: 100%;background-color: rgba(0, 0, 0, 0.8);display: flex;align-items: center;justify-content: center;}
                .modal-content {max-width: 90%;max-height: 90%;border-radius: 10px;}
                .close {position: absolute;top: 15px;right: 25px;color: white;font-size: 40px;font-weight: bold;cursor: pointer;}
                @media (max-width: 600px) {.media-gallery {grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));}
                .video-gallery {grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));}}
                .header-container {height: clamp(90px, 12vw, 150px);background: #ffffff;border-bottom: 3px solid #24d464;overflow: hidden;}
                .header-image {height: clamp(123%, 80vw, 90%);width: clamp(60%, 70vw, 90%);object-fit: cover;position: relative;left: clamp(-80px, -5vw, 0px);}
                .footer-container {height: clamp(90px, 12vw, 150px);overflow: hidden;display: flex;justify-content: center;align-items: center;}
                .footer-image {height: 100%;width: clamp(100%, 80vw, 100%);object-fit: cover;position: relative;}
                @media(min-width: 768px) {.header-container {padding-bottom: 5px;} }
                </style>
            </head>
            <body>
                ${checkinHtml}
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
            return res.send(reportHtml);
        }
        else {
            return res.send(`
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
            `)
        }
    } catch (error) {
        console.error("Erro ao buscar check-in:", error);
        res.status(500).json({ error: "Erro ao buscar check-ins" });
    }
};

exports.uploadPhoto = async (req, res) => {
  try {
    const urls = await checkinService.uploadPhoto(req);
    return res.status(200).json({ message: "Fotos enviadas com sucesso!", urls });
  } catch (error) {
    console.error("Erro ao subir fotos:", error);
    return res.status(500).json({ error: error.message || "Erro ao fazer upload das fotos." });
  }
};

exports.uploadChunk = async (req, res) => {
    try {
      const response = await checkinService.uploadChunk(req);
      return res.status(200).json(response);
    } catch (error) {
      console.error("Erro no upload em chunks:", error);
      return res.status(500).json({ error: error.message || "Erro ao processar o upload em chunks." });
    }
  };

exports.authenticateCheckin = async (req, res) => {
    try {
        const checkinIds = req.params.ids.split("&");
        const { password } = req.body;

        if (!checkinIds.length) {
            return res.status(400).send("Nenhum ID de check-in fornecido.");
        }

        const { valid, error } = await checkinService.validatePassword(checkinIds[0], password);

        if (!valid) {
            return res.status(401).send(error || "Senha incorreta.");
        }

        req.session[`authenticated_${checkinIds[0]}`] = true;
        return res.status(200).send("OK");
    } catch (error) {
        console.error("[ERROR] Erro na autenticação:", error);
        res.status(500).json({ error: "Erro no servidor" });
    }
};

exports.deleteCheckin = async(req, res) =>{
    const checkinId = req.params.id;

    if (!checkinId || checkinId.trim() === "") {
        return res.status(400).json({ error: "ID do check-in é obrigatório." });
    }

    try {
        await checkinService.deleteCheckin(checkinId);
        return res.status(200).json({ message: "Check-in deletado com sucesso." });
    } catch (error) {
        console.error("[ERROR] Falha ao deletar check-in:", error);
        return res.status(500).json({ error: error.message || "Erro interno do servidor." });
    }
}
