const verificaEmailService = require("../services/verificaEmailService");

exports.getAll = async (req, res) => {
    try {
        const emails = await verificaEmailService.getAllEmails();
        res.json(emails);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getById = async (req, res) => {
    try {
        const email = await verificaEmailService.getEmailById(req.params.id);
        if (!email) return res.status(404).json({ error: "Email not found" });
        res.json(email);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
