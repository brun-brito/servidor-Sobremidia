const executivoService = require("../services/executivoService");

exports.createExecutivo = async (req, res) => {
  try {
    const executivo = await executivoService.createExecutivo(req.body);
    res.status(201).json(executivo);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.listExecutivos = async (req, res) => {
  try {
    const executivos = await executivoService.listExecutivos();
    res.status(200).json(executivos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getExecutivoById = async (req, res) => {
  try {
    const executivo = await executivoService.getExecutivoById(req.params.id);
    res.status(200).json(executivo);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

exports.updateExecutivo = async (req, res) => {
  try {
    const executivo = await executivoService.updateExecutivo(req.params.id, req.body);
    res.status(200).json(executivo);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteExecutivo = async (req, res) => {
  try {
    await executivoService.deleteExecutivo(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};