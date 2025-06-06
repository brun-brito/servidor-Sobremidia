const sharp = require("sharp");
const { jsPDF } = require("jspdf");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const moment = require("moment");

const pageWidth = 210;
const pageHeight = 297;
const headerHeight = 130;
const footerHeight = 150;
const contentStartY = headerHeight - 100;
const contentEndY = pageHeight - (footerHeight - 100);
const BASE_THUMBNAIL_URL = "https://s3.amazonaws.com/4yousee-files/sobremidia/common/videos/thumbnails/i_";

const loadImageAsBase64 = async (filePath) => {
    const isHeaderOrFooter = filePath.includes("fotoHeader.png") || filePath.includes("fotoFooter.png");

    if (filePath.startsWith("http")) {
        return await fetchImageAsBase64(filePath); // continua usando sharp para imagens externas
    } else {
        try {
            const imageBuffer = fs.readFileSync(filePath);

            if (isHeaderOrFooter) {
                return `data:image/png;base64,${imageBuffer.toString("base64")}`;
            }

            const resizedBuffer = await sharp(imageBuffer)
                .rotate()
                .resize({ width: 800 })
                .jpeg({ quality: 60 })
                .toBuffer();

            return `data:image/jpeg;base64,${resizedBuffer.toString("base64")}`;
        } catch (error) {
            console.error("Erro ao carregar imagem local:", error);
            return null;
        }
    }
};

const fetchImageAsBase64 = async (url) => {
    try {
        const response = await axios.get(url, { responseType: "arraybuffer" });
        const resizedBuffer = await sharp(response.data)
            .rotate()
            .resize({ width: 800 }) // Reduz a largura mantendo proporção
            .jpeg({ quality: 60 })  // Comprime a imagem
            .toBuffer();
        return `data:image/jpeg;base64,${resizedBuffer.toString("base64")}`;
    } catch (error) {
        console.error("Erro ao carregar imagem remota:", error);
        return null;
    }
};

const formattedDate = (date) => {
    return moment(date, "YYYY-MM-DD").format("DD/MM/YYYY");
};

function addHeaderAndFooter(doc, headerBase64, pageWidth, headerHeight, footerBase64, footerHeight, contentStartY, contentEndY) {
    doc.addImage(headerBase64, "PNG", -14, -49, pageWidth, headerHeight);
    doc.addImage(footerBase64, "PNG", -17, 217, 232, footerHeight);
    doc.setLineWidth(0.3);
    doc.rect(5, contentStartY, pageWidth - 10, contentEndY);
}

const createPDFRelatorio = async (data) => {
    const { summary, mediaDetails, playerDetails, startDate, endDate, startTime, endTime, clientes, mediaNames, panelNames } = data;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const headerBase64 = await loadImageAsBase64(path.join(__dirname, "../assets/fotos/fotoHeader.png"));
    const footerBase64 = await loadImageAsBase64(path.join(__dirname, "../assets/fotos/fotoFooter.png"));

    let yOffset = contentStartY + 10;
    const reportDate = moment().format("DD/MM/YYYY, HH:mm:ss");

    if (headerBase64 && footerBase64) {
        addHeaderAndFooter(doc, headerBase64, pageWidth, headerHeight, footerBase64, footerHeight, contentStartY, contentEndY);
    }

    doc.setFontSize(16);
    doc.text("Relatório de Inserções", 10, yOffset);
    yOffset += 7;
    doc.setFontSize(10);
    doc.text(`Gerado em: ${reportDate}`, 10, yOffset);
    yOffset += 7;

    // Linha de separação do cabeçalho
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(10, yOffset, pageWidth - 10, yOffset);
    yOffset += 7;

    // Resumo
    doc.setFontSize(12);
    const summaryText = `
Intervalo de Datas: ${formattedDate(startDate)} (${startTime}) - ${formattedDate(endDate)} (${endTime})
Cliente(s): ${clientes}
Total de Inserções: ${summary.totalExhibitions || 0}
Total de Mídias: ${summary.totalMedia || 0}
Total de Painéis: ${summary.totalPlayers || 0}
    `.trim().split("\n");

    summaryText.forEach((line) => {
        if (yOffset > contentEndY - 10) {
            doc.addPage();
            addHeaderAndFooter(doc, headerBase64, pageWidth, headerHeight, footerBase64, footerHeight, contentStartY, contentEndY);
            yOffset = contentStartY + 10;
        }
        doc.text(line, 10, yOffset);
        yOffset += 7;
    });

    // Linha de separação antes de "Inserções por Mídia"
    doc.setDrawColor(180);
    doc.setLineWidth(0.5);
    doc.line(10, yOffset, pageWidth - 10, yOffset);
    yOffset += 7;
    doc.setDrawColor(0);

    // Inserções por Mídia
    doc.setFillColor(230, 230, 230);
    doc.rect(10, yOffset - 5, pageWidth - 20, 10, "F");
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Inserções por Mídia", pageWidth / 2, yOffset, { align: "center" });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    yOffset += 7;

    for (const [mediaId, mediaData] of Object.entries(mediaDetails)) {
        const mediaName = mediaNames[mediaId] ? mediaNames[mediaId].split("-").slice(1).join("-") : `Mídia ${mediaId}`;
        const thumbnailUrl = `${BASE_THUMBNAIL_URL}${mediaId}.png`;

        if (yOffset > contentEndY - 30) {
            doc.addPage();
            addHeaderAndFooter(doc, headerBase64, pageWidth, headerHeight, footerBase64, footerHeight, contentStartY, contentEndY);
            yOffset = contentStartY + 10;
        }

        try {
            if (thumbnailUrl) {
                const thumbnailBase64 = await loadImageAsBase64(thumbnailUrl);
                if (thumbnailBase64) {
                    doc.addImage(thumbnailBase64, "JPEG", 10, yOffset, 20, 15);
                }
            }
        } catch (error) {
            console.warn("Erro ao carregar thumbnail da mídia:", mediaId);
        }

        doc.text(`${mediaName}`, 35, yOffset + 10);
        yOffset += 20;

        for (const [playerId, logs] of Object.entries(mediaData.players)) {
            const panelName = panelNames[playerId] || `Painel ${playerId}`;
            const totalAparicoes = logs.length;

            if (yOffset > contentEndY - 10) {
                doc.addPage();
                addHeaderAndFooter(doc, headerBase64, pageWidth, headerHeight, footerBase64, footerHeight, contentStartY, contentEndY);
                yOffset = contentStartY + 10;
            }

            doc.setFont("helvetica", "bold");
            doc.text(`${panelName}:`, 15, yOffset);
            doc.setFont("helvetica", "normal");

            yOffset += 7;
            doc.text(`- Total: ${totalAparicoes} inserções`, 20, yOffset);

            yOffset += 7;
        }
        yOffset += 10;
    }

    doc.addPage();
    addHeaderAndFooter(doc, headerBase64, pageWidth, headerHeight, footerBase64, footerHeight, contentStartY, contentEndY);
    yOffset = contentStartY + 10;
    
    // Inserções por Painel
    doc.setFillColor(230, 230, 230);
    doc.rect(10, yOffset - 5, pageWidth - 20, 10, "F");
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Inserções por Painel", pageWidth / 2, yOffset, { align: "center" });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    yOffset += 10;

    for (const [playerId, playerData] of Object.entries(playerDetails)) {
        const panelName = panelNames[playerId] || `Painel ${playerId}`;

        if (yOffset > contentEndY - 15) {
            doc.addPage();
            addHeaderAndFooter(doc, headerBase64, pageWidth, headerHeight, footerBase64, footerHeight, contentStartY, contentEndY);
            yOffset = contentStartY + 10;
        }

        doc.setFont("helvetica", "bold");
        doc.text(`${panelName}`, 10, yOffset);
        doc.setFont("helvetica", "normal");
        yOffset += 10;

        for (const [mediaId, logs] of Object.entries(playerData.media)) {
            const mediaName = mediaNames[mediaId] ? mediaNames[mediaId].split("-").slice(1).join("-") : `Mídia ${mediaId}`;
            const appearances = logs.length;

            if (yOffset > contentEndY - 7) {
                doc.addPage();
                addHeaderAndFooter(doc, headerBase64, pageWidth, headerHeight, footerBase64, footerHeight, contentStartY, contentEndY);
                yOffset = contentStartY + 10;
            }

            const textLine = `- ${mediaName}: ${appearances} inserções`;
            doc.text(textLine, 15, yOffset);

            yOffset += 7;
        }

        yOffset += 10;

    }

    return Buffer.from(doc.output("arraybuffer"));
};

const createPDFCheckin = async (checkIns) => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    // console.log("CHECKIN ENVIADO",checkIn);

    const headerBase64 = await loadImageAsBase64(path.join(__dirname, "../assets/fotos/fotoHeader.png"));
    const footerBase64 = await loadImageAsBase64(path.join(__dirname, "../assets/fotos/fotoFooter.png"));

    let yOffset = contentStartY + 10;
    const imgWidth = 80;
    const imgHeight = 60;
    const colSpacing = 10;
    const startX = 15;
    let column = 0;
    const reportDate = moment().format("DD/MM/YYYY, HH:mm:ss");
    
    for (let i = 0; i < checkIns.length; i++) {
        const checkIn = checkIns[i];

        if (i > 0) {
            doc.addPage();
            yOffset = contentStartY + 10;
        }

        if (headerBase64 && footerBase64) {
            addHeaderAndFooter(doc, headerBase64, pageWidth, headerHeight, footerBase64, footerHeight, contentStartY, contentEndY);
        }

        doc.setFontSize(16);
        doc.text("Relatório de Check-In de Mídias", 10, yOffset);
        yOffset += 7;
        doc.setFontSize(10);
        doc.text(`Gerado em: ${reportDate}`, 10, yOffset);
        yOffset += 7;

        doc.setDrawColor(0);
        doc.setLineWidth(0.5);
        doc.line(10, yOffset, pageWidth - 10, yOffset);
        yOffset += 7;

        doc.setFontSize(12);
        doc.text(`Painel: ${checkIn.panelName}`, 15, yOffset);
        yOffset += 7;
        
        const createdAt = checkIn.createdAt?._seconds
        ? moment.unix(checkIn.createdAt._seconds).format("DD/MM/YYYY HH:mm:ss")
        : "Data desconhecida";
        doc.text(`Data: ${createdAt}`, 15, yOffset);
        yOffset += 7;
        doc.text(`Mídia: ${checkIn.midias[0].nomeMidia || checkIn.midias[0].idMidia}`, 15, yOffset);
        yOffset += 7;
        doc.text(`Cliente: ${checkIn.midias[0].cliente || "-"}`, 15, yOffset);
        yOffset += 8;

        doc.setDrawColor(180);
        doc.setLineWidth(0.5);
        doc.line(10, yOffset, pageWidth - 10, yOffset);
        yOffset += 7;
        doc.setDrawColor(0);

        const media = checkIn.midias[0];

        // Preview da Mídia
        doc.setFillColor(230, 230, 230);
        doc.rect(10, yOffset - 5, pageWidth - 20, 10, "F");
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Preview da Mídia", pageWidth / 2, yOffset, { align: "center" });
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        yOffset += 12;
        column = 0;

        if (media.idMidia) {
            const thumbnailUrl = `${BASE_THUMBNAIL_URL}${media.idMidia}.png`;
            const base64Thumb = await loadImageAsBase64(thumbnailUrl);
        
            if (base64Thumb) {
                doc.addImage(base64Thumb, "JPEG", 15, yOffset, 40, 30);
            } else {
                console.warn("Thumbnail não carregada:", media.idMidia);
            }
        }
        yOffset += 40;

        // Fotos da Mídia
        if (media.fotosMidia.length > 0) {
            doc.setFillColor(230, 230, 230);
            doc.rect(10, yOffset - 5, pageWidth - 20, 10, "F");
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.text("Fotos da Mídia", pageWidth / 2, yOffset, { align: "center" });
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            yOffset += 12;
            let index = 1;

            for (const foto of media.fotosMidia) {
                if (yOffset + imgHeight > contentEndY) {
                    doc.addPage();
                    addHeaderAndFooter(doc, headerBase64, pageWidth, headerHeight, footerBase64, footerHeight, contentStartY, contentEndY);
                    yOffset = contentStartY + 10;
                    column = 0;
                }

                const xPosition = startX + (column * (imgWidth + colSpacing));

                try {
                    const mediaUrl = foto.url;
                    const base64Media = await loadImageAsBase64(mediaUrl);
                    if (base64Media) {
                        doc.setFontSize(12);
                        doc.text(`${index})`, xPosition - 3, yOffset + 3);
                        doc.addImage(base64Media, "JPEG", xPosition + 5, yOffset, imgWidth, imgHeight);
                        doc.setFontSize(10);
                        doc.text(`Tirada em: ${moment(foto.timestamp).format("DD/MM/YYYY HH:mm:ss")}`, xPosition + 5, yOffset + imgHeight + 5);                } else {
                        console.warn("Erro ao carregar imagem da mídia:", foto.url);
                    }
                } catch (error) {
                    console.warn("Erro ao carregar imagem da mídia:", error);
                }

                column++;
                index++;

                if (column >= 2) {
                    column = 0;
                    yOffset += imgHeight + 20;
                }
            }
        }

        // Fotos Entorno
        if (media.fotosEntorno.length > 0) {
            doc.addPage();
            addHeaderAndFooter(doc, headerBase64, pageWidth, headerHeight, footerBase64, footerHeight, contentStartY, contentEndY);
            yOffset = contentStartY + 10;
            doc.setFillColor(230, 230, 230);
            doc.rect(10, yOffset - 5, pageWidth - 20, 10, "F");
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.text("Fotos do Entorno", pageWidth / 2, yOffset, { align: "center" });
            doc.setFont("helvetica", "normal");
            yOffset += 12;
            column = 0;
            index = 1;

            for (const foto of media.fotosEntorno) {
                if (yOffset + 80 > contentEndY) {
                    doc.addPage();
                    addHeaderAndFooter(doc, headerBase64, pageWidth, headerHeight, footerBase64, footerHeight, contentStartY, contentEndY);
                    yOffset = contentStartY + 10;
                    column = 0;
                }

                const xPosition = startX + (column * (imgWidth + colSpacing));

                try {
                    const entornoUrl = foto.url;
                    const base64Entorno = await loadImageAsBase64(entornoUrl);
                    doc.setFontSize(12);
                    doc.text(`${index})`, xPosition - 3, yOffset + 3);
                    doc.addImage(base64Entorno, "JPEG", xPosition + 5, yOffset, imgWidth, imgHeight);
                    doc.setFontSize(10);
                        doc.text(`Tirada em: ${moment(foto.timestamp).format("DD/MM/YYYY HH:mm:ss")}`, xPosition + 5, yOffset + imgHeight + 5);            } catch (error) {
                    console.warn("Erro ao carregar imagem do entorno:", error);
                }
                column++;
                index++;

                if (column >= 2) {
                    column = 0;
                    yOffset += imgHeight + 20;
                }
            }
        }

        // Links Vídeos
        if (media.videosMidia.length > 0) {
            doc.addPage();
            addHeaderAndFooter(doc, headerBase64, pageWidth, headerHeight, footerBase64, footerHeight, contentStartY, contentEndY);
            yOffset = contentStartY + 10;
            doc.setFillColor(230, 230, 230);
            doc.rect(10, yOffset - 5, pageWidth - 20, 10, "F");
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.text("Links dos Vídeos", pageWidth / 2, yOffset, { align: "center" });
            doc.setFont("helvetica", "normal");
            yOffset += 12;
            const maxLineWidth = pageWidth - 30;
            index = 1;

            for (const video of media.videosMidia) {
                if (yOffset + 15 > contentEndY) {
                    doc.addPage();
                    addHeaderAndFooter(doc, headerBase64, pageWidth, headerHeight, footerBase64, footerHeight, contentStartY, contentEndY);
                    yOffset = contentStartY + 10;
                }
        
                // Divide o link em várias linhas se for muito longo
                const wrappedText = doc.splitTextToSize(video.url, maxLineWidth);
                doc.setFontSize(12);
                doc.text(`${index})`, 10, yOffset + 1);
                doc.setFontSize(10);
        
                doc.setTextColor(0, 0, 255);
                wrappedText.forEach((line, index) => {
                    doc.textWithLink(line, 15, yOffset + (index * 5), { url: video.url });
                });
                doc.setTextColor(0, 0, 0);
        
                yOffset += (wrappedText.length * 5);
                doc.text(`Gravado em: ${moment(video.timestamp).format("DD/MM/YYYY HH:mm:ss")}`, 15, yOffset);
        
                yOffset += 10;
                index++;
            }
        }
    }

    return Buffer.from(doc.output("arraybuffer"));
};

const createPDFMidiasAtivas = async (midias) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const headerBase64 = await loadImageAsBase64(path.join(__dirname, "../assets/fotos/fotoHeader.png"));
  const footerBase64 = await loadImageAsBase64(path.join(__dirname, "../assets/fotos/fotoFooter.png"));
  let yOffset = contentStartY + 10;
  const reportDate = moment().format("DD/MM/YYYY, HH:mm:ss");

  if (headerBase64 && footerBase64) {
    addHeaderAndFooter(doc, headerBase64, pageWidth, headerHeight, footerBase64, footerHeight, contentStartY, contentEndY);
  }

  doc.setFontSize(16);
  doc.text("Relatório de Mídias Ativas", 10, yOffset);
  yOffset += 7;
  doc.setFontSize(10);
  doc.text(`Gerado em: ${reportDate}`, 10, yOffset);
  yOffset += 7;

  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(10, yOffset, pageWidth - 10, yOffset);
  yOffset += 7;

  for (const item of midias) {
    if (yOffset > contentEndY - 20) {
      doc.addPage();
      addHeaderAndFooter(doc, headerBase64, pageWidth, headerHeight, footerBase64, footerHeight, contentStartY, contentEndY);
      yOffset = contentStartY + 10;
    }

    doc.setFont("helvetica", "bold");
    doc.text(`Mídia: ${item.midia}`, 10, yOffset);
    doc.setFont("helvetica", "normal");
    yOffset += 5;
    doc.text(`Painel: ${item.painel}`, 10, yOffset);
    yOffset += 5;
    doc.text(`Cliente: ${item.cliente}`, 10, yOffset);
    yOffset += 5;
    doc.text(`Categoria: ${item.categoria || 'N/A'}`, 10, yOffset);
    yOffset += 5;
    doc.text(`Início: ${item.inicio} | Fim: ${item.fim}`, 10, yOffset);
    yOffset += 10;
  }

  return Buffer.from(doc.output("arraybuffer"));
};

module.exports = {
  createPDFRelatorio,
  createPDFCheckin,
  createPDFMidiasAtivas,
};