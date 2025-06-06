const clientesService = require("../services/clientesService");

exports.createCliente = async(req, res) => {
    try {
      const response = await clientesService.createCliente(req.body);
      res.status(201).json(response);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
  
  exports.listClientes = async(req, res) => {
    try {
      const clients = await clientesService.listClientes();
      res.status(200).json(clients);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  exports.getClienteById = async(req, res) => {
    try {
      const client = await clientesService.getClienteById(req.params.id);
      res.status(200).json(client);
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  }
  
  exports.updateCliente = async(req, res) => {
    try {
      const response = await clientesService.updateCliente(req.params.id, req.body);
      res.status(200).json(response);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
  
  exports.deleteCliente = async(req, res) => {
    try {
      const response = await clientesService.deleteCliente(req.params.id);
      res.status(200).json(response);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }