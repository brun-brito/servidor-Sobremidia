const userService = require("../services/userService");

exports.createUser = async(req, res) => {
  try {
    const response = await userService.createUserService(req.body);
    res.status(201).json(response);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

exports.listUsers = async(req, res) => {
  try {
    const users = await userService.listUsersService();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

exports.getUserById = async(req, res) => {
  try {
    const user = await userService.getUserByIdService(req.params.id);
    res.status(200).json(user);
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
}

exports.updateUser = async(req, res) => {
  try {
    await userService.updateUserService(req.params.id, req.body);
    res.status(200).json({ message: "Usuário atualizado com sucesso!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

exports.deleteUser = async(req, res) => {
  try {
    await userService.deleteUserService(req.params.id);
    res.status(200).json({ message: "Usuário excluído com sucesso!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}