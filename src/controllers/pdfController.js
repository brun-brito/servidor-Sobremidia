const { createPDFRelatorio, createPDFCheckin, createPDFMidiasAtivas, createPDFProposta, createPDFPedidoInsercao } = require("../services/pdfService");
const { downloadAndProcessReport } = require("../services/reportService")
const { getDb } = require("../config/firebase");

const generatePDFProposta = async (req, res) => {
  try {
    const proposta = req.body;
    const pdfBuffer = await createPDFProposta(proposta);

    res.setHeader("Content-Disposition", "attachment; filename=proposta.pdf");
    res.setHeader("Content-Type", "application/pdf");
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Erro ao gerar PDF da proposta:", error);
    res.status(500).send("Erro ao gerar PDF da proposta.");
  }
};

const generatePDFRelatorio = async (req, res) => {
    try {
        const { reportId, startDate, endDate, startTime, endTime, clientes, mediaNames, panelNames } = req.body;

        if (!reportId) {
            return res.status(400).json({ success: false, message: "ID do relatório é obrigatório." });
        }

        const db = getDb();
        const reportRef = db.collection("relatorios").doc(reportId);
        const doc = await reportRef.get();

        if (!doc.exists) {
            return res.status(404).json({ success: false, message: "Relatório não encontrado." });
        }

        const reportData = doc.data();
        const url = reportData.url;

        if (!url) {
            return res.status(400).json({ success: false, message: "URL do relatório não encontrada." });
        }

        const firebaseData = await downloadAndProcessReport(url);

        const completeData = {
            ...firebaseData,
            startDate,
            endDate,
            startTime,
            endTime,
            clientes,
            mediaNames,
            panelNames
        };

        const pdfBuffer = await createPDFRelatorio(completeData);

        res.setHeader("Content-Disposition", `attachment; filename=relatorio-${reportId}.pdf`);
        res.setHeader("Content-Type", "application/pdf");
        res.send(pdfBuffer);
    } catch (error) {
        console.error("Erro ao gerar PDF:", error);
        res.status(500).send("Erro ao gerar PDF.");
    }
};

const generatePDFCheckin = async (req, res) => {
    try {
        const pdfBuffer = await createPDFCheckin(req.body);

        res.setHeader("Content-Disposition", "attachment; filename=relatorio_checkin.pdf");
        res.setHeader("Content-Type", "application/pdf");
        res.send(pdfBuffer);
    } catch (error) {
        console.error("Erro ao gerar PDF de check-in:", error);
        res.status(500).send("Erro ao gerar PDF");
    }
};


const generatePDFMidiasAtivas = async (req, res) => {
  try {
    const pdfBuffer = await createPDFMidiasAtivas(req.body);
    res.setHeader("Content-Disposition", "attachment; filename=midias_ativas.pdf");
    res.setHeader("Content-Type", "application/pdf");
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Erro ao gerar PDF de mídias ativas:", error);
    res.status(500).send("Erro ao gerar PDF.");
  }
};

const generatePDFPedidoInsercao = async (req, res) => {
  try {
    const pedido = req.body;
    const pdfBuffer = await createPDFPedidoInsercao(pedido);

    res.setHeader("Content-Disposition", "attachment; filename=pedido_insercao.pdf");
    res.setHeader("Content-Type", "application/pdf");
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Erro ao gerar PDF do Pedido de Inserção:", error);
    res.status(500).send("Erro ao gerar PDF do Pedido de Inserção.");
  }
};

module.exports = {
  generatePDFRelatorio,
  generatePDFCheckin,
  generatePDFMidiasAtivas,
  generatePDFProposta,
  generatePDFPedidoInsercao,
};