const { getDb } = require("../config/firebase");

const COLLECTION_NAME = "roles";

exports.createRole = async ({ nome, permissoes }) => {
    if (!nome) throw new Error("O campo 'nome' é obrigatório.");
    if (!permissoes || typeof permissoes !== "object") throw new Error("O campo 'permissoes' é obrigatório e deve ser um objeto.");

    try {
        const db = getDb();
        const docRef = db.collection(COLLECTION_NAME).doc(nome);

        const existing = await docRef.get();
        if (existing.exists) {
            throw new Error("Já existe uma função com esse nome.");
        }

        await docRef.set({
            nome,
            permissoes,
        });

        return { message: "Função criada com sucesso!", id: docRef.id };
    } catch (error) {
        throw new Error(error.message || error.code || "Erro desconhecido ao criar função.");
    }
};

exports.listRoles = async () => {
    try {
        const db = getDb();
        const snapshot = await db.collection(COLLECTION_NAME).get();
        return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Erro ao listar funções:", error);
        throw new Error("Erro ao listar funções.");
    }
};

exports.getRoleById = async (nome) => {
    try {
        const db = getDb();
        const roleRef = db.collection(COLLECTION_NAME).doc(nome);
        const role = await roleRef.get();
        if (!role.exists) {
            throw new Error("Função não encontrada.");
        }
        return { id: role.id, ...role.data() };
    } catch (error) {
        console.error("Erro ao buscar função:", error);
        throw new Error("Erro ao buscar função.");
    }
};

exports.updateRole = async (nome, permissoes) => {
    if (!permissoes || typeof permissoes !== "object") throw new Error("O campo 'permissoes' é obrigatório e deve ser um objeto.");

    try {
        const db = getDb();
        const roleRef = db.collection(COLLECTION_NAME).doc(nome);
        const role = await roleRef.get();
        if (!role.exists) {
            throw new Error("Função não encontrada.");
        }

        await roleRef.update({ permissoes });

        return { message: "Função atualizada com sucesso!" };
    } catch (error) {
        throw new Error(error.message || "Erro ao atualizar função.");
    }
};

exports.deleteRole = async (nome) => {
    try {
        const db = getDb();
        const roleRef = db.collection(COLLECTION_NAME).doc(nome);
        const roleDoc = await roleRef.get();
        if (!roleDoc.exists) {
            throw new Error("Função não encontrada.");
        }

        await roleRef.delete();
        return { message: "Função deletada com sucesso!" };
    } catch (error) {
        throw new Error(error.message || "Erro ao deletar função.");
    }
};
