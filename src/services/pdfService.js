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

function addPageNumber(doc, pageW, pageH, marginX, pageNumber) {
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`Página ${pageNumber}`, pageW - marginX, pageH - 6, { align: "right" });
    doc.setTextColor(0);
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

const createPDFProposta = async (proposta) => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  
    // Carrega logo da empresa (ajuste o caminho conforme necessário)
    const logoPath = path.join(__dirname, "../assets/fotos/logoProposta.png");
    const logoBase64 = await loadImageAsBase64(logoPath);
  
    // Dimensões e margens
    const pageW = doc.internal.pageSize.getWidth();
    const marginX = 10;
    const headerY = 10;
    const headerH = 28;
  
    // Larguras proporcionais
    const logoW = 65;
    const infoW = 110;
    const piW = pageW - marginX * 2 - logoW - infoW;
  
    // 1. Logo
    if (logoBase64) {
      doc.addImage(logoBase64, "PNG", marginX, headerY, logoW, 20);
    }
  
    // 2. Informações da empresa
    doc.setFontSize(11);
    doc.setFont(undefined, "bold");
    doc.text("SOBREMIDIA DIGITAL LTDA", marginX + logoW + 4, headerY + 6);
    doc.setFont(undefined, "normal");
    doc.setFontSize(9);
    doc.text([
      "RUA DOUTOR FRANCISCO GADELHA, 1480 LJ 02",
      "FORTALEZA/CE/ 6081",
      "FONE/ FAX (85) 99613-5757",
      "CNPJ: 53.385.130/0001-56",
    ], marginX + logoW + 4, headerY + 11);
  
    // 3. Título e PI (à direita)
    // doc.setFont(undefined, "bold");
    // doc.setFontSize(18);
    // doc.setFillColor(240);
    // doc.rect(pageW - marginX - piW, headerY, piW, headerH, "F");
    // doc.setTextColor(0);
    // doc.text("PROPOSTA DE\nINSERÇÃO", pageW - marginX - piW / 2, headerY + 10, { align: "center" });
    // doc.setFontSize(16);
    // doc.text((proposta.numero_pi || "-"), pageW - marginX - piW / 2, headerY + 25, { align: "center" });
    // doc.setFontSize(14);
  
    // Volta para preto e fonte normal
    doc.setFont(undefined, "normal");
    doc.setTextColor(0);
  
    // Ajuste início do conteúdo
    let y = headerY + headerH + 6;
  
    // Faixa verde título
    doc.setFillColor(35, 213, 99);
    doc.rect(0, y, pageW, 25, 'F');
    doc.setFontSize(18);
    doc.setTextColor(255);
    doc.text("PROPOSTA COMERCIAL", pageW / 2, y + 10, { align: "center" });
  
    // Cliente
    doc.setFontSize(14);
    doc.text(`CLIENTE: ${proposta.cliente || "-"}`, pageW / 2, y + 20, { align: "center" });
  
    doc.setTextColor(0);
  
    // Tabela
    const tableMarginY = y + 30;
    const tableW = pageW - marginX * 2;
    const colWidths = [16, 17, 24, 54, 18, 20, 17, 17, 16, 22, 18, 26];
    const headers = [
      "CÓD", "Formato", "Cidade", "Produto", "Inserções/Dia",
      "Total Inserções", "Início", "Fim", "Qtd. dias", "Valor tabela", "Desconto", "Valor mensal c/desconto"
    ];
  
    let yTable = tableMarginY;
    doc.setFontSize(10);
    doc.setLineWidth(0.1);
  
    // Altura máxima do cabeçalho
    let maxHeaderHeight = 0;
    for (let i = 0; i < headers.length; i++) {
      const lines = doc.splitTextToSize(headers[i], colWidths[i] - 2);
      const cellH = 4 + lines.length * 4;
      maxHeaderHeight = Math.max(maxHeaderHeight, cellH);
    }
  
    // Cabeçalhos
    doc.setFont(undefined, "bold");
    let xHeader = marginX;
    for (let i = 0; i < headers.length; i++) {
      const lines = doc.splitTextToSize(headers[i], colWidths[i] - 2);
      doc.setFillColor(35, 213, 99);
      doc.rect(xHeader, yTable, colWidths[i], maxHeaderHeight, 'F');
      doc.setTextColor(255);
      lines.forEach((line, j) => {
        doc.text(line, xHeader + colWidths[i] / 2, yTable + 5 + j * 4, { align: "center" });
      });
      xHeader += colWidths[i];
    }
    doc.setFont(undefined, "normal");
    doc.setTextColor(0);
    yTable += maxHeaderHeight;
  
    // Linhas da tabela
    let totalTabela = 0, totalFinal = 0;
    let totalInsercoesDia = 0, totalInsercoesMes = 0;
    const rowHeight = 12;
    let pageNumber = 1;
    const pageH = doc.internal.pageSize.getHeight();
    const footerHeight = 16;
    const maxY = pageH - footerHeight;
  
    for (const p of proposta.paineis || []) {
      let x = marginX;
      if (yTable + rowHeight > maxY) {
        addPageNumber(doc, pageW, pageH, marginX, pageNumber);
        doc.addPage();
        pageNumber++;
        yTable = 20;
    
        // Redesenha cabeçalho
        doc.setFont(undefined, "bold");
        let xHeader = marginX;
        for (let i = 0; i < headers.length; i++) {
          const lines = doc.splitTextToSize(headers[i], colWidths[i] - 2);
          doc.setFillColor(35, 213, 99);
          doc.rect(xHeader, yTable, colWidths[i], maxHeaderHeight, 'F');
          doc.setTextColor(255);
          doc.setFontSize(10);
          lines.forEach((line, j) => {
            doc.text(line, xHeader + colWidths[i] / 2, yTable + 5 + j * 4, { align: "center" });
          });
          xHeader += colWidths[i];
        }
        doc.setFont(undefined, "normal");
        doc.setTextColor(0);
        doc.setFontSize(8);
        yTable += maxHeaderHeight;
      }
    
      // Conversão segura dos valores
      const valorTabelaNum = parseFloat(p.valor_unitario_bruto || p.valor_tabela || "0");
      const valorFinalNum = parseFloat(p.valor_unitario_liquido || p.valor_final || "0");
      totalFinal += isNaN(valorFinalNum) ? 0 : valorFinalNum;
    
      // ALTERAÇÃO ROBUSTA PARA INSERCOES_MES
      let insercoesMesNum = 0;
      if (typeof p.insercoes_mes === "number") {
        insercoesMesNum = p.insercoes_mes;
      } else if (typeof p.insercoes_mes === "string") {
        insercoesMesNum = parseInt(p.insercoes_mes.replace(/\./g, ""));
      } else {
        insercoesMesNum = 0;
      }
    
      const insercoesDiaNum = parseInt(p.insercoes_diarias || p.insercoes_dia || "0");
    
      totalTabela += isNaN(valorTabelaNum) ? 0 : valorTabelaNum;
      totalInsercoesDia += isNaN(insercoesDiaNum) ? 0 : insercoesDiaNum;
      totalInsercoesMes += isNaN(insercoesMesNum) ? 0 : insercoesMesNum;
    
      const row = [
        p.codigo || p.painel || "-", 
        p.formato || p.formato_peca || "-", 
        p.cidade || "-", 
        doc.splitTextToSize(p.produto || p.painel || "-", colWidths[3] - 2),
        String(p.insercoes_diarias || p.insercoes_dia || "-"), 
        String(p.insercoes_mes || "-"),
        p.inicio || (p.periodo_veiculacao?.inicio || "-"), 
        p.fim || (p.periodo_veiculacao?.fim || "-"), 
        String(p.qtd_dias || "-"),
        `R$ ${p.valor_unitario_bruto || p.valor_tabela || "-"}`, 
        p.percentual_desconto || p.desconto || "0%", 
        `R$ ${p.valor_unitario_liquido || p.valor_final || "-"}`
      ];
    
      doc.setFontSize(8);
      row.forEach((text, i) => {
        const cellText = Array.isArray(text)
          ? text
          : doc.splitTextToSize(text, colWidths[i] - 2);
        doc.rect(x, yTable, colWidths[i], rowHeight);
        cellText.forEach((line, j) => {
          doc.text(line, x + colWidths[i] / 2, yTable + 5 + j * 4, { align: "center" });
        });
        x += colWidths[i];
      });
    
      yTable += rowHeight;
    }
  
    // Linha de totais destacada em verde, negrito e branco
    let x = marginX;
    const totalsRow = [
      "", "TOTAIS", "", "", 
      String(totalInsercoesDia), 
      String(totalInsercoesMes),
      "", "", "",
      `R$ ${totalTabela.toFixed(2).replace(".", ",")}`,
      "", 
      `R$ ${totalFinal.toFixed(2).replace(".", ",")}`
    ];
    doc.setFont(undefined, "bold");
    doc.setFontSize(10);
    doc.setTextColor(255);
    for (let i = 0; i < totalsRow.length; i++) {
      const cellText = doc.splitTextToSize(totalsRow[i], colWidths[i] - 2);
      doc.setFillColor(35, 213, 99);
      doc.rect(x, yTable, colWidths[i], rowHeight, 'F');
      cellText.forEach((line, j) => {
        doc.text(line, x + colWidths[i] / 2, yTable + 5 + j * 4, { align: "center" });
      });
      x += colWidths[i];
    }
    doc.setFont(undefined, "normal");
    doc.setTextColor(0);
    yTable += rowHeight;
  
    // 1. NOVA PÁGINA DE PROJEÇÕES DE AUDIÊNCIA
    addPageNumber(doc, pageW, pageH, marginX, pageNumber);
    doc.addPage();
    pageNumber++;

    // Cabeçalho destacado da nova seção
    doc.setFillColor(35, 213, 99);
    doc.rect(0, 0, pageW, 25, 'F');
    doc.setFontSize(22);
    doc.setTextColor(255);
    doc.setFont(undefined, "normal");
    doc.text("PROJEÇÕES DE AUDIÊNCIA E IMPACTO", pageW / 2, 16, { align: "center" });

    // Cabeçalho da tabela de audiência
    const audHeaders = [
    "CÓD", "Formato", "Cidade", "Produto", "Início", "Fim", "Qtd. Dias", "Impactos", "Audiência", "Veículos"
    ];
    // larguras das colunas
    const audColWidths = [16, 18, 24, 44, 26, 26, 16, 22, 22, 22];
    let audY = 30;
    let audX = marginX;

    // Desenha cabeçalho da tabela
    doc.setFont(undefined, "bold");
    for (let i = 0; i < audHeaders.length; i++) {
    doc.setFillColor(35, 213, 99);
    doc.rect(audX, audY, audColWidths[i], 10, 'F');
    doc.setTextColor(255);
    doc.setFontSize(10);
    doc.text(audHeaders[i], audX + audColWidths[i] / 2, audY + 7, { align: "center" });
    audX += audColWidths[i];
    }
    doc.setFont(undefined, "normal");
    doc.setFontSize(8);
    doc.setTextColor(0);
    audY += 10;
  
    // Ajuste a altura das células da tabela de audiência:
    const audRowHeight = 12;
  
    // Linhas da tabela de audiência
    let totalImpactos = 0, totalAudiencia = 0, totalVeiculos = 0;
    for (const p of proposta.paineis || []) {
      audX = marginX;
      const row = [
        p.codigo || p.painel || "-",
        p.formato || p.formato_peca || "-",
        p.cidade || "-",
        doc.splitTextToSize(p.produto || p.painel || "-", audColWidths[3] - 2),
        p.inicio || (p.periodo_veiculacao?.inicio || "-"),
        p.fim || (p.periodo_veiculacao?.fim || "-"),
        String(p.qtd_dias || "-"),
        String(p.impactos_mes || "-"),
        String(p.audiencia_mes || "-"),
        String(p.total_veiculos_mes || "-")
      ];

      // Acumula totais
      totalImpactos += parseInt(p.impactos_mes || "0") || 0;
      totalAudiencia += parseInt(p.audiencia_mes || "0") || 0;
      totalVeiculos += parseInt(p.total_veiculos_mes || "0") || 0;

      // Descubra quantas linhas o campo produto vai ocupar
      const produtoLines = Array.isArray(row[3]) ? row[3].length : 1;
      const maxLines = Math.max(1, produtoLines);

      for (let i = 0; i < row.length; i++) {
        const cellText = Array.isArray(row[i])
          ? row[i]
          : doc.splitTextToSize(row[i], audColWidths[i] - 2);

        // Centralize verticalmente
        const startY = audY + (audRowHeight - (cellText.length * 4)) / 2 + 5;

        doc.rect(audX, audY, audColWidths[i], audRowHeight);
        cellText.forEach((line, j) => {
          doc.text(line, audX + audColWidths[i] / 2, startY + j * 4, { align: "center" });
        });
        audX += audColWidths[i];
      }
      audY += audRowHeight;
      // Quebra de página se necessário
      if (audY > pageH - 20) {
        addPageNumber(doc, pageW, pageH, marginX, pageNumber);
        doc.addPage();
        pageNumber++;
        audY = 26;
        audX = marginX;
        // Cabeçalho da tabela
        doc.setFont(undefined, "bold");
        for (let i = 0; i < audHeaders.length; i++) {
          doc.setFillColor(35, 213, 99);
          doc.rect(audX, audY, audColWidths[i], 10, 'F');
          doc.setTextColor(255);
          doc.text(audHeaders[i], audX + audColWidths[i] / 2, audY + 7, { align: "center" });
          audX += audColWidths[i];
        }
        doc.setFont(undefined, "normal");
        doc.setTextColor(0);
        audY += 10;
      }
    }

    // Linha de totais destacada em verde, negrito e branco para audiência
    audX = marginX;
    const audTotalsRow = [
      "", "TOTAIS", "", "", "", "", "",
      String(totalImpactos),
      String(totalAudiencia),
      String(totalVeiculos)
    ];
    doc.setFont(undefined, "bold");
    doc.setFontSize(10);
    doc.setTextColor(255);
    for (let i = 0; i < audTotalsRow.length; i++) {
      const cellText = doc.splitTextToSize(audTotalsRow[i], audColWidths[i] - 2);
      doc.setFillColor(35, 213, 99);
      doc.rect(audX, audY, audColWidths[i], audRowHeight, 'F');
      cellText.forEach((line, j) => {
        doc.text(line, audX + audColWidths[i] / 2, audY + 5 + j * 4, { align: "center" });
      });
      audX += audColWidths[i];
    }
    doc.setFont(undefined, "normal");
    doc.setTextColor(0);
    audY += audRowHeight;
  
    // Quebra de página se necessário
    if (audY > pageH - 20) {
      addPageNumber(doc, pageW, pageH, marginX, pageNumber);
      doc.addPage();
      pageNumber++;
      audY = 26;
      audX = marginX;
    }
  
    // Adiciona número da última página de audiência
    addPageNumber(doc, pageW, pageH, marginX, pageNumber);
  
    // 3. Observações ao final do arquivo
    doc.setFontSize(10);
    doc.setTextColor(0, 150, 50);
    doc.text("Observações:", 10, audY + 10);
  
    doc.setTextColor(0);
    const obs = [
      "Material de exibição e veiculação de responsabilidade do cliente/agência;",
      "Valores de animação, adaptação e criação de layout para formatos digitais de responsabilidade da agência/cliente;",
      "Sistema utilizado para publicação e veiculação são auditados e regulados perante a IVC;",
      "Prazo de entrega do material de publicação deverá ser entregue, no mínimo, 72 horas antes do início da exibição;",
      "Vencimento D+15 (15 dias após finalização de cada período de exibição)."
    ];
  
    doc.setFontSize(8);
    let obsY = audY + 14;
    obs.forEach(line => {
      doc.text(line, 10, obsY);
      obsY += 5;
    });
  
    return Buffer.from(doc.output("arraybuffer"));
  };

const createPDFPedidoInsercao = async (pedido) => {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  // Dimensões e margens
  const pageW = doc.internal.pageSize.getWidth();
  const marginX = 8;
  let y = 10;

  // Faixa verde topo + logo
  doc.setFillColor(35, 213, 99);
  doc.rect(0, y, pageW, 28, 'F');
  const logoPath = path.join(__dirname, "../assets/fotos/logoPI.jpg");
  const logoBase64 = await loadImageAsBase64(logoPath);
  if (logoBase64) {
    doc.addImage(logoBase64, "PNG", marginX, y + 4, 65, 20);//40, 12);
  }
  doc.setFontSize(20);
  doc.setFont(undefined, "bold");
  doc.setTextColor(255);
  doc.text("PEDIDO DE INSERÇÃO", pageW / 2, y + 16, { align: "center" });

  // Bloco AP/Campanha (direita, dentro da faixa verde)
  let apBoxW = 70;
  let apBoxH = 28;
  let apBoxX = pageW - marginX - apBoxW;
  let apBoxY = y;
  doc.setFillColor(35, 213, 99);
  doc.rect(apBoxX, apBoxY, apBoxW, apBoxH, 'F');
  doc.setTextColor(255);
  doc.setFontSize(14);
  doc.setFont(undefined, "bold");
  doc.text(`PI: ${pedido.numero_pi || "PI: -"}`, apBoxX + apBoxW / 2, apBoxY + 13, { align: "center" });
  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  doc.text(`Emissão: ${pedido.data_emissao || "-"}`, apBoxX + 18, apBoxY + 20);

  // --- Cabeçalho Cliente/Veículo (2 colunas) ---
  const lineH = 7;
  const col1X = marginX + 2;
  const col2X = pageW / 2 + 2;
  let yCliente = y + apBoxH + 6;

  // Cliente (esquerda)
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.setFont(undefined, "bold");
  doc.text("Cliente:", col1X, yCliente);
  doc.setFont(undefined, "normal");
  doc.text(pedido.cliente?.nome || "-", col1X + 30, yCliente);

  doc.setFont(undefined, "bold");
  doc.text("CNPJ:", col1X, yCliente + lineH);
  doc.setFont(undefined, "normal");
  doc.text(pedido.cliente?.cnpj || "-", col1X + 30, yCliente + lineH);

  doc.setFont(undefined, "bold");
  doc.text("Razão Social:", col1X, yCliente + 2 * lineH);
  doc.setFont(undefined, "normal");
  doc.text(pedido.cliente?.razao_social || "-", col1X + 30, yCliente + 2 * lineH);

  doc.setFont(undefined, "bold");
  doc.text("Endereço:", col1X, yCliente + 3 * lineH);
  doc.setFont(undefined, "normal");
  doc.text(pedido.cliente?.endereco || "-", col1X + 30, yCliente + 3 * lineH);

  doc.setFont(undefined, "bold");
  doc.text("Cidade:", col1X, yCliente + 4 * lineH);
  doc.setFont(undefined, "normal");
  doc.text(pedido.cliente?.cidade || "-", col1X + 30, yCliente + 4 * lineH);

  doc.setFont(undefined, "bold");
  doc.text("CEP:", col1X, yCliente + 5 * lineH);
  doc.setFont(undefined, "normal");
  doc.text(pedido.cliente?.cep || "-", col1X + 30, yCliente + 5 * lineH);

  // Cliente (direita da coluna esquerda)
  doc.setFont(undefined, "bold");
  doc.text("Tel:", col2X, yCliente);
  doc.setFont(undefined, "normal");
  doc.text(pedido.cliente?.tel || "-", col2X + 15, yCliente);

  doc.setFont(undefined, "bold");
  doc.text("Email:", col2X, yCliente + lineH);
  doc.setFont(undefined, "normal");
  doc.text(pedido.cliente?.email || "-", col2X + 15, yCliente + lineH);

  doc.setFont(undefined, "bold");
  doc.text("Bairro:", col2X, yCliente + 2 * lineH);
  doc.setFont(undefined, "normal");
  doc.text(pedido.cliente?.bairro || "-", col2X + 15, yCliente + 2 * lineH);

  doc.setFont(undefined, "bold");
  doc.text("Estado:", col2X, yCliente + 3 * lineH);
  doc.setFont(undefined, "normal");
  doc.text(pedido.cliente?.estado || "-", col2X + 15, yCliente + 3 * lineH);

  doc.setFont(undefined, "bold");
  doc.text("Nome Contato:", col2X, yCliente + 4 * lineH);
  doc.setFont(undefined, "normal");
  doc.text(pedido.cliente?.contato || "-", col2X + 30, yCliente + 4 * lineH);

  // Divisória entre Cliente e Veículo
  const divisoriaY = yCliente + 7 * lineH - 2;
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(marginX, divisoriaY, pageW - marginX, divisoriaY);
  doc.setLineWidth(0.1);

  // --- Veículo (abaixo da divisória, alinhado à esquerda) ---
  let yVeiculo = divisoriaY + 6;
  doc.setFont(undefined, "bold");
  doc.text("Veículo:", col1X, yVeiculo);
  doc.setFont(undefined, "normal");
  doc.text("Sobremidia Digital", col1X + 30, yVeiculo);

  doc.setFont(undefined, "bold");
  doc.text("CNPJ:", col1X, yVeiculo + lineH);
  doc.setFont(undefined, "normal");
  doc.text("53.385.130/0001-56", col1X + 30, yVeiculo + lineH);

  doc.setFont(undefined, "bold");
  doc.text("Razão Social:", col1X, yVeiculo + 2 * lineH);
  doc.setFont(undefined, "normal");
  doc.text("Sobremidia Digital Ltda", col1X + 30, yVeiculo + 2 * lineH);

  doc.setFont(undefined, "bold");
  doc.text("Endereço:", col1X, yVeiculo + 3 * lineH);
  doc.setFont(undefined, "normal");
  doc.text("Rua Doutor Francisco Gadelha, 1480 - Loja 02", col1X + 30, yVeiculo + 3 * lineH);

  doc.setFont(undefined, "bold");
  doc.text("Cidade:", col1X, yVeiculo + 4 * lineH);
  doc.setFont(undefined, "normal");
  doc.text("Fortaleza", col1X + 30, yVeiculo + 4 * lineH);

  doc.setFont(undefined, "bold");
  doc.text("CEP:", col1X, yVeiculo + 5 * lineH);
  doc.setFont(undefined, "normal");
  doc.text("60.714-705", col1X + 30, yVeiculo + 5 * lineH);

  // --- Bloco campanha (direita, alinhado ao topo do veículo) ---
  let campBoxY = yVeiculo;
  doc.setFontSize(10);
  doc.setFont(undefined, "bold");
  doc.text("CAMPANHA:", col2X, campBoxY);
  doc.setFont(undefined, "normal");
  doc.text(pedido.campanha?.nome || "-", col2X + 25, campBoxY);

  doc.setFont(undefined, "bold");
  doc.text("CRIATIVO:", col2X, campBoxY + lineH);
  doc.setFont(undefined, "normal");
  doc.text(pedido.campanha?.criativo || "CLIENTE", col2X + 25, campBoxY + lineH);

  doc.setFont(undefined, "bold");
  doc.text("E-MAIL (ENVIO CHECKIN):", col2X, campBoxY + 2 * lineH);
  doc.setFont(undefined, "normal");
  doc.text(pedido.campanha?.email_checkin || "-", col2X + 50, campBoxY + 2 * lineH);

  doc.setFont(undefined, "bold");
  doc.text("OBS:", col2X, campBoxY + 3 * lineH);
  doc.setFont(undefined, "normal");
  doc.text(pedido.campanha?.obs || "-", col2X + 15, campBoxY + 3 * lineH);

  // --- Agora, inicie a tabela após o maior Y entre o bloco campanha e o bloco veículo ---
  let tableY = Math.max(campBoxY + 4 * lineH + 8, yVeiculo + 6 * lineH + 8);

  // --- Lógica de quebra de página para tabela e totais ---
  const pageH = doc.internal.pageSize.getHeight();
  const minBottomMargin = 20;
  const rowHeight = 9;
  const colWidths = [10, 25, 70, 17, 17, 12, 12, 21, 22, 22, 22, 22];
  const headers = [
    "Item", "Cidade", "Painel", "Início", "Fim", "Dias", "Telas", "Inserção/dia", "Inserções TOTAIS", "Valor Tabela", "Desconto", "Valor Total"
  ];

  // Cabeçalho tabela (ajuste automático de altura)
  let x = marginX;
  doc.setFont(undefined, "bold");
  doc.setFontSize(9);
  doc.setTextColor(255);

  // Calcule a altura máxima do cabeçalho
  let headerLines = [];
  let maxHeaderHeight = 0;
  for (let i = 0; i < colWidths.length; i++) {
    const lines = doc.splitTextToSize(headers[i], colWidths[i] - 2);
    headerLines.push(lines);
    maxHeaderHeight = Math.max(maxHeaderHeight, lines.length * 4 + 2);
  }

  // Desenhe o cabeçalho com altura dinâmica
  x = marginX;
  for (let i = 0; i < colWidths.length; i++) {
    doc.setFillColor(35, 213, 99);
    doc.rect(x, tableY, colWidths[i], maxHeaderHeight, 'F');
    // Centralize verticalmente cada célula
    const lines = headerLines[i];
    const startY = tableY + (maxHeaderHeight - lines.length * 4) / 2 + 3;
    lines.forEach((line, j) => {
      doc.text(line, x + colWidths[i] / 2, startY + j * 4, { align: "center" });
    });
    x += colWidths[i];
  }
  doc.setFont(undefined, "normal");
  doc.setTextColor(0);

  // Ajuste o início das linhas da tabela
  let yTable = tableY + maxHeaderHeight;

  // Linhas da tabela com quebra de página
  let totalBruto = 0, totalDesconto = 0, totalLiquido = 0;
  for (let idx = 0; idx < (pedido.itens?.length || 0); idx++) {
    if (yTable + rowHeight > pageH - minBottomMargin) {
      doc.addPage();
      yTable = marginX;
      // Redesenha cabeçalho da tabela na nova página, com altura dinâmica
      x = marginX;
      doc.setFont(undefined, "bold");
      doc.setFontSize(9);
      doc.setTextColor(255);
      for (let i = 0; i < colWidths.length; i++) {
        doc.setFillColor(35, 213, 99);
        doc.rect(x, yTable, colWidths[i], maxHeaderHeight, 'F');
        const lines = headerLines[i];
        const startY = yTable + (maxHeaderHeight - lines.length * 4) / 2 + 3;
        lines.forEach((line, j) => {
          doc.text(line, x + colWidths[i] / 2, startY + j * 4, { align: "center" });
        });
        x += colWidths[i];
      }
      doc.setFont(undefined, "normal");
      doc.setTextColor(0);
      yTable += maxHeaderHeight;
    }
    x = marginX;
    const item = pedido.itens[idx];
    const valorTabela = parseFloat(item.valor_tabela || "0");
    const desconto = parseFloat(item.desconto || "0");
    const valorTotal = parseFloat(item.valor_total || "0");
    totalBruto += valorTabela;
    totalDesconto += (valorTabela - valorTotal);
    totalLiquido += valorTotal;

    const row = [
      String(idx + 1),
      item.cidade || "-",
      doc.splitTextToSize(item.painel || "-", colWidths[2] - 2),
      item.inicio || "-",
      item.fim || "-",
      String(item.dias || "-"),
      String(item.telas || "-"),
      String(item.insercao_dia || "-"),
      String(item.insercoes_totais || "-"),
      `R$ ${valorTabela.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      `${desconto ? desconto + "%" : "0%"}`,
      `R$ ${valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
    ];
    doc.setFontSize(8);
    for (let i = 0; i < colWidths.length; i++) {
      const cellText = Array.isArray(row[i]) ? row[i] : doc.splitTextToSize(row[i], colWidths[i] - 2);
      doc.rect(x, yTable, colWidths[i], rowHeight);
      cellText.forEach((line, j) => {
        doc.text(line, x + colWidths[i] / 2, yTable + 5 + j * 4, { align: "center" });
      });
      x += colWidths[i];
    }
    yTable += rowHeight;
  }

  // Totais: ajuste para garantir que os valores aparecem corretamente
  if (yTable + rowHeight * 3 > pageH - minBottomMargin) {
    doc.addPage();
    yTable = marginX + 10;
  }

  // Adiciona as linhas de totais nas últimas 3 colunas
  const totalLabels = ["Valor Bruto:", "Desconto adicional:", "Valor Líquido:"];
  const totalValues = [
    `R$ ${totalBruto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
    `R$ ${totalDesconto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
    `R$ ${totalLiquido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
  ];

  // Calcula a posição X das 3 últimas colunas
  const xTotais = marginX + colWidths.slice(0, -3).reduce((a, b) => a + b, 0);
  const widthLegenda = colWidths[colWidths.length - 3] + colWidths[colWidths.length - 2];
  const widthValor = colWidths[colWidths.length - 1];

  for (let i = 0; i < 3; i++) {
    // Mescla as duas primeiras células para a legenda
    doc.setFillColor(35, 213, 99);
    doc.setFont(undefined, "bold");
    doc.setTextColor(255);
    doc.rect(xTotais, yTable + i * rowHeight, widthLegenda, rowHeight, 'F');
    doc.text(totalLabels[i], xTotais + 2, yTable + 6 + i * rowHeight, { align: "left" });

    // Valor na última coluna
    doc.setFillColor(35, 213, 99);
    doc.rect(xTotais + widthLegenda, yTable + i * rowHeight, widthValor, rowHeight, 'F');
    doc.text(
      totalValues[i],
      xTotais + widthLegenda + widthValor / 2,
      yTable + 6 + i * rowHeight,
      { align: "center" }
    );
  }
  doc.setTextColor(0);

  // Observações e rodapé
  let rodapeY = yTable + rowHeight * 3 + 8;
  const rodapeLargura = pageW - marginX * 2;
  const rodapeFont = 8.2;

  function rodapeSecao(titulo, texto) {
    doc.setFont(undefined, "bold");
    doc.setFontSize(rodapeFont);
    doc.text(`${titulo}:`, marginX, rodapeY, { maxWidth: rodapeLargura });
    doc.setFont(undefined, "normal");
    doc.setFontSize(5);
    rodapeY += 4;
    const lines = doc.splitTextToSize(texto, rodapeLargura);
    lines.forEach(line => {
      doc.text(line, marginX, rodapeY);
      rodapeY += 4;
    });
    // Linha separadora
    doc.setDrawColor(0);
    doc.setLineWidth(0.2);
    doc.line(marginX, rodapeY, pageW - marginX, rodapeY);
    rodapeY += 4;
  }

  rodapeSecao(
    "Veiculações",
    "Caberá ao Cliente (i) fornecer todas as informações e especificações necessárias à prestação de serviços por parte do Veículo; (ii) comunicar, por escrito e com antecedência razoável, toda e qualquer alteração à veiculação a ser realizada ou ao quanto acordado na proposta comercial; e (iii) responsabilizar-se, exclusivamente, pelo conteúdo das mídias, sendo que os anúncios deverão estar de acordo com as exigências impostas pelas legislações pertinentes a direitos autorais e conexos, direitos do consumidor, direitos da criança e do adolescente, regulamentos do Código Nacional de Autorregulamentação Publicitária – CONAR, entre outras, bem como respeitar as normas internas e os padrões éticos, morais e jornalísticos de absoluta isenção e imparcialidade, exigidos pela Contratada, sob pena de suspensão da veiculação publicitária."
  );

  rodapeSecao(
    "Atraso no pagamento",
    "O atraso no pagamento das faturas nas suas respectivas datas de vencimento sujeitará o Anunciante ao pagamento de multa equivalente a 2% (dois por cento), mais correção monetária de acordo com a variação do índice IGP-M, editado pela Fundação Getúlio Vargas, acrescido de juros de 1% (um por cento) ao mês até a data do efetivo pagamento.\nO não pagamento dos valores negociados entre as Partes, após 05 (cinco) dias do vencimento das faturas, implicará a suspensão das veiculações até que ocorra o devido pagamento, sem prejuízo da aplicação das sanções pelo atraso, descritas acima.\nO Cliente nomeia a pessoa indicada no campo \"Nome Contato\" da seção \"Cliente\" deste instrumento como responsável por receber todas e quaisquer notificações e cobranças decorrentes da presente Autorização de Publicação, sem prejuízo de ser considerada válida a notificação ou cobrança enviada para eventuais outros empregados, prepostos ou prestadores de serviços do Cliente que atuem e representem os interesses do Cliente perante o Veículo no âmbito desta Autorização de Publicação."
  );

  rodapeSecao(
    "Título Executivo",
    "A presente Autorização de Publicidade é celebrada em caráter irrevogável e irretratável tendo plena eficácia e força de título executivo extrajudicial conforme determinado o artigo 784, inciso III do Código de Processo Civil Vigente."
  );

  rodapeSecao(
    "Foro",
    "Fica eleito o Foro da Comarca de Fortaleza para dirimir os problemas relacionados ao presente instrumento, com renúncia expressa a qualquer outro, por mais privilegiado que seja, para a solução de eventuais litígios e controvérsias."
  );

  doc.setFont(undefined, "bold");
  doc.text("Observações:", marginX, rodapeY + 2);

  return Buffer.from(doc.output("arraybuffer"));
};

module.exports = {
  createPDFRelatorio,
  createPDFCheckin,
  createPDFMidiasAtivas,
  createPDFProposta,
  createPDFPedidoInsercao,
};