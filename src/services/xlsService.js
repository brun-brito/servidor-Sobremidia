const ExcelJS = require("exceljs");

const createXLSMidias = async (dados) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Relatório");

  sheet.columns = [
    { header: "Painel", key: "painel", width: 25 },
    { header: "Cliente", key: "cliente", width: 20 },
    { header: "Mídia", key: "midia", width: 30 },
    { header: "Início", key: "inicio", width: 15 },
    { header: "Fim", key: "fim", width: 15 },
    { header: "Slots Ativos", key: "slots", width: 15 },
    { header: "Ocupação", key: "ocupacao", width: 12 },
  ];

  dados.forEach((item, idx) => {
    sheet.addRow({
      index: idx + 1,
      painel: item.painel,
      cliente: item.cliente,
      midia: item.midia,
      inicio: item.inicio,
      fim: item.fim,
      slots: item.slots,
      ocupacao: item.ocupacao,
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};

module.exports = { createXLSMidias };