const rolesService = require("../services/rolesService");

const listRoles = async (req, res) => {
    try {
        const roles = await rolesService.listRoles();
        res.status(200).json(roles);
    } catch (error) {
        console.error("Erro ao listar funções:", error);
        res.status(500).send(error.message);
    }
};

const listRoleById = async (req, res) => {
    try {
        const role = await rolesService.getRoleById(req.params.roleName);
        if (!role) {
            return res.status(404).send("Função não encontrada");
        }
        res.status(200).json(role);
    } catch (error) {
        console.error("Erro ao listar funções:", error);
        res.status(500).send(error.message);
    }
};

const updateRole = async (req, res) => {
    const { roleName } = req.params;
    const { permissoes } = req.body;

    try {
        await rolesService.updateRole(roleName, permissoes);
        res.status(200).send("Função atualizada com sucesso");
    } catch (error) {
        console.error("Erro ao atualizar função:", error);
        res.status(500).send(error.message);
    }
};

const createRole = async (req, res) => {
    const { nome, permissoes } = req.body;

    try {
        await rolesService.createRole({ nome, permissoes });
        res.status(201).send("Função criada com sucesso");
    } catch (error) {
        res.status(error.message === "Já existe uma função com esse nome." ? 400 : 500).json({ message: error.message });
    }
};

const deleteRole = async (req, res) => {
    const { roleName } = req.params;

    try {
        await rolesService.deleteRole(roleName);
        res.status(200).send("Função excluída com sucesso");
    } catch (error) {
        console.error("Erro ao excluir função:", error);
        res.status(500).send(error.message);
    }
};

module.exports = {
    listRoles,
    updateRole,
    createRole,
    deleteRole,
    listRoleById,
};
