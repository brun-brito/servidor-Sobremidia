const express = require("express");
const { db, auth } = require("../config/firebase");

const router = express.Router();
const COLLECTION_NAME = "usuarios";

// Criar usuário
router.post("/", async (req, res) => {
    try {
        const { nome, email, senha, funcao } = req.body;

        if (!email || !senha || !nome || !funcao) {
            return res.status(400).json({ error: "Todos os campos são obrigatórios!" });
        }

        const userRecord = await auth.createUser({
            email: email,
            password: senha
        });

        await db.collection("usuarios").doc(userRecord.uid).set({
            nome: nome,
            email: email,
            funcao: funcao
        });

        res.status(201).json({ message: "Usuário criado com sucesso!", uid: userRecord.uid });

    } catch (error) {
        console.error("Erro ao criar usuário:", error.code);

        const errorMessages = {
            "auth/email-already-exists": "O e-mail informado já está em uso por outro usuário.",
            "auth/invalid-email": "O e-mail informado é inválido. Insira um e-mail válido.",
            "auth/invalid-password": "A senha deve ter pelo menos 6 caracteres.",
            "auth/uid-already-exists": "O ID do usuário já está em uso por outro usuário.",
            "auth/too-many-requests": "Muitas tentativas foram feitas. Tente novamente mais tarde.",
            "auth/internal-error": "Erro interno no servidor. Tente novamente mais tarde.",
            "auth/operation-not-allowed": "Este tipo de autenticação não está habilitado no Firebase.",
            "auth/insufficient-permission": "Permissões insuficientes para criar usuários.",
            "auth/invalid-credential": "Credenciais inválidas para criar o usuário.",
            "auth/project-not-found": "Nenhum projeto Firebase foi encontrado. Verifique sua configuração.",
            "auth/user-not-found": "Usuário não encontrado.",
        };

        const errorMessage = errorMessages[error.code] || "Erro desconhecido ao criar usuário.";

        res.status(400).json({ error: errorMessage });
    }
});

// Listar todos os usuários
router.get("/", async (req, res) => {
    try {
        const snapshot = await db.collection(COLLECTION_NAME).get();
        const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obter usuário por ID
router.get("/:id", async (req, res) => {
    try {
        const userRef = db.collection(COLLECTION_NAME).doc(req.params.id);
        const user = await userRef.get();

        if (!user.exists) {
            return res.status(404).json({ error: "Usuário não encontrado" });
        }

        res.status(200).json(user.data());
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Atualizar usuário
router.put("/:id", async (req, res) => {
    try {
        const { nome, email, funcao } = req.body;
        const userId = req.params.id;

        await auth.updateUser(userId, { email });

        await db.collection(COLLECTION_NAME).doc(userId).update({
            nome,
            email,
            funcao
        });

        res.status(200).json({ message: "Usuário atualizado com sucesso!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Excluir usuário
router.delete("/:id", async (req, res) => {
    try {
        const userId = req.params.id;

        const userRef = db.collection(COLLECTION_NAME).doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return res.status(404).json({ error: "Usuário não encontrado no Firestore." });
        }

        try {
            await auth.deleteUser(userId);
        } catch (authError) {
            console.warn("Usuário não encontrado no Firebase Authentication:", authError.message);
        }

        await userRef.delete();

        res.status(200).json({ message: "Usuário excluído com sucesso!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
