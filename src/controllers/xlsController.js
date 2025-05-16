const { createXLSMidias } = require("../services/xlsService");

const generateXLS = async (req, res) => {
  try {
    const midias = req.body;

    const buffer = await createXLSMidias(midias);

    res.setHeader("Content-Disposition", "attachment; filename=Midias.xlsx");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buffer);
  } catch (error) {
    console.error("Erro ao gerar XLS:", error);
    res.status(500).send("Erro ao gerar XLS.");
  }
};

module.exports = { generateXLS };