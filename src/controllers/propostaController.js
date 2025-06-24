const propostaService = require("../services/propostaService");

exports.createProposta = async (req, res) => {
  try {
    const resultado = await propostaService.createProposta(req.body);
    res.status(201).json(resultado);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.listPropostas = async (req, res) => {
  try {
    const propostas = await propostaService.listPropostas();
    res.json(propostas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getPropostaById = async (req, res) => {
  try {
    const proposta = await propostaService.getPropostaById(req.params.id);
    res.json(proposta);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

exports.updateProposta = async (req, res) => {
  try {
    const resultado = await propostaService.updateProposta(req.params.id, req.body);
    res.json(resultado);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteProposta = async (req, res) => {
  try {
    const resultado = await propostaService.deleteProposta(req.params.id);
    res.json(resultado);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};