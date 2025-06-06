const { db, auth } = require("../config/firebase");

const COLLECTION_NAME = "agencias";

exports.createAgencia = async ({
    nome_fantasia,
    razao_social,
    cnpj,
    telefone,
    endereco,
    cidade,
    uf,
    cep,
    email,
    pessoa_contato,
    ins_municipal,
    clientes,
}) => {
    if (!razao_social) throw new Error("O campo 'razão social' é obrigatório.");
    if (!cnpj) throw new Error("O campo 'CNPJ' é obrigatório.");
    if (!telefone) throw new Error("O campo 'telefone' é obrigatório.");
    if (!endereco) throw new Error("O campo 'endereço' é obrigatório.");
    if (!cidade) throw new Error("O campo 'cidade' é obrigatório.");
    if (!uf) throw new Error("O campo 'UF' é obrigatório.");
    if (!cep) throw new Error("O campo 'CEP' é obrigatório.");
    if (!email) throw new Error("O campo 'email' é obrigatório.");
    if (!pessoa_contato) throw new Error("O campo 'pessoa de contato' é obrigatório.");

    try {
        const docRef = db.collection(COLLECTION_NAME).doc();
        const clientesArray = Array.isArray(clientes) ? clientes.filter(Boolean) : [];
        if (clientesArray.length > 0) {
            const clientesDocs = await Promise.all(clientesArray.map(id => db.collection("clientes").doc(id).get()));
            if (clientesDocs.some(doc => !doc.exists)) {
                throw new Error("Um ou mais clientes informados não existem.");
            }
        }

        await docRef.set({
            nome_fantasia,
            razao_social,
            cnpj,
            telefone: Array.isArray(telefone) ? telefone : [telefone],
            endereco,
            cidade,
            uf,
            cep,
            email: Array.isArray(email) ? email : [email],
            pessoa_contato,
            ins_municipal,
            clientes: clientesArray,
            criado_em: new Date(),
            atualizado_em: new Date(),
        });

        // Update each cliente to point to this new agencia
        const batch = db.batch();
        for (const clienteId of clientesArray) {
            const clienteRef = db.collection("clientes").doc(clienteId);
            batch.update(clienteRef, { agencia: docRef.id });
        }
        await batch.commit();

        return { message: "Agencia criada com sucesso!", id: docRef.id };
    } catch (error) {
        throw new Error(error.message || error.code || "Erro desconhecido ao criar agencia.");
    }
};

exports.listAgencias = async () => {
    try {
        const snapshot = await db.collection(COLLECTION_NAME).get();
        return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Erro ao listar agencias:", error);
        throw new Error("Erro ao listar agencias.");
    }
};

exports.getAgenciaById = async (id) => {
    try {
        const userRef = db.collection(COLLECTION_NAME).doc(id);
        const user = await userRef.get();
        if (!user.exists) {
            throw new Error("Agencia não encontrada.");
        }
        return { id: user.id, ...user.data() };
    } catch (error) {
        console.error("Erro ao buscar agencia:", error);
        throw new Error("Erro ao buscar agencia.");
    }
};

exports.updateAgencia = async (id, data) => {
    try {
        const userRef = db.collection(COLLECTION_NAME).doc(id);
        const user = await userRef.get();
        if (!user.exists) {
            throw new Error("Agencia não encontrado.");
        }
        let newClientes = [];
        if (data.clientes) {
            newClientes = Array.isArray(data.clientes) ? data.clientes.filter(Boolean) : [];
            if (newClientes.length > 0) {
                const clientesDocs = await Promise.all(newClientes.map(cid => db.collection("clientes").doc(cid).get()));
                if (clientesDocs.some(doc => !doc.exists)) {
                    throw new Error("Um ou mais clientes informados não existem.");
                }
            }
        }

        // If updating clientes, update cliente documents accordingly
        if (data.clientes) {
            const oldClientes = user.data().clientes || [];

            // Find clientes to add and to remove
            const clientesToAdd = newClientes.filter((c) => !oldClientes.includes(c));
            const clientesToRemove = oldClientes.filter((c) => !newClientes.includes(c));

            const batch = db.batch();

            // Add agencia reference to new clientes
            for (const clienteId of clientesToAdd) {
                const clienteRef = db.collection("clientes").doc(clienteId);
                const clienteSnap = await clienteRef.get();
                if (clienteSnap.exists) {
                    batch.update(clienteRef, { agencia: id });
                }
            }

            // Remove agencia reference from removed clientes
            for (const clienteId of clientesToRemove) {
                const clienteRef = db.collection("clientes").doc(clienteId);
                const clienteSnap = await clienteRef.get();
                if (clienteSnap.exists) {
                    batch.update(clienteRef, { agencia: null });
                }
            }

            await batch.commit();
        }

        data.atualizado_em = new Date();
        await userRef.update(data);
        return { message: "Agencia atualizado com sucesso!" };
    } catch (error) {
        throw new Error(error.message || "Erro ao atualizar agencia.");
    }
};

exports.deleteAgencia = async (id) => {
    try {
        const userRef = db.collection(COLLECTION_NAME).doc(id);
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
            throw new Error("Agencia não encontrado.");
        }

        const clientes = userDoc.data().clientes || [];

        // Remove agencia reference from all associated clientes
        const batch = db.batch();
        for (const clienteId of clientes) {
            const clienteRef = db.collection("clientes").doc(clienteId);
            batch.update(clienteRef, { agencia: null });
        }
        await batch.commit();

        await userRef.delete();
        return { message: "Agencia deletado com sucesso!" };
    } catch (error) {
        throw new Error(error.message || "Erro ao deletar agencia.");
    }
};
