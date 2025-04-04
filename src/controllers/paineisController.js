const painelService = require("../services/paineisService");

exports.listarPaineis = async (req, res) => {
  try {
    const paineis = await painelService.listarPaineisService();
    res.status(200).json(paineis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.obterPainelPorId = async (req, res) => {
  try {
    const painel = await painelService.obterPainelPorIdService(req.params.id);
    res.status(200).json(painel);
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
};

exports.criarPainel = async (req, res) => {
  try {
    const response = await painelService.criarPainelService(req.body);
    res.status(201).json(response);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.atualizarPainel = async (req, res) => {
  try {
    await painelService.atualizarPainelService(req.params.id, req.body);
    res.status(200).json({ message: "Painel atualizado com sucesso!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.excluirPainel = async (req, res) => {
  try {
    await painelService.excluirPainelService(req.params.id);
    res.status(200).json({ message: "Painel excluído com sucesso!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};