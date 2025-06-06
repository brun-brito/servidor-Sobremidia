const ExcelJS = require("exceljs");

const createXLSMidias = async (dados) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Relatório");

  sheet.columns = [
    { header: "Painel", key: "painel", width: 25 },
    { header: "Cliente", key: "cliente", width: 20 },
    { header: "Mídia", key: "midia", width: 30 },
    { header: "Categoria", key: "categoria", width: 20 },
    { header: "Início", key: "inicio", width: 15 },
    { header: "Fim", key: "fim", width: 15 }
  ];

  dados.forEach((item, idx) => {
    sheet.addRow({
      painel: item.painel,
      cliente: item.cliente,
      midia: item.midia,
      categoria: item.categoria,
      inicio: item.inicio,
      fim: item.fim
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};

module.exports = { createXLSMidias };