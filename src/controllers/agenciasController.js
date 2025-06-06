const agenciasService = require("../services/ageciasService");

exports.createAgencia = async(req, res) => {
    try {
      const response = await agenciasService.createAgencia(req.body);
      res.status(201).json(response);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
  
  exports.listAgencias = async(req, res) => {
    try {
      const agencias = await agenciasService.listAgencias();
      res.status(200).json(agencias);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  exports.getAgenciaById = async(req, res) => {
    try {
      const agencia = await agenciasService.getAgenciaById(req.params.id);
      res.status(200).json(agencia);
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  }
  
  exports.updateAgencia = async(req, res) => {
    try {
      const response = await agenciasService.updateAgencia(req.params.id, req.body);
      res.status(200).json(response);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
  
  exports.deleteAgencia = async(req, res) => {
    try {
      const response = await agenciasService.deleteAgencia(req.params.id);
      res.status(200).json(response);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }