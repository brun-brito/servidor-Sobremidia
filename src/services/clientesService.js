const { getDb } = require("../config/firebase");

const COLLECTION_NAME = "clientes";
const AGENCIAS_COLLECTION = "agencias";

exports.createCliente = async ({
    nome_fantasia,
    razao_social,
    cnpj,
    telefone,
    endereco,
    cidade,
    bairro,
    uf,
    cep,
    email,
    pessoa_contato,
    ins_municipal,
    agencia,
    executivo_vendas
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

    const db = getDb();
    if (agencia) {
        const agenciaRef = db.collection(AGENCIAS_COLLECTION).doc(agencia);
        const agenciaSnap = await agenciaRef.get();
        if (!agenciaSnap.exists) {
            throw new Error("Agência informada não existe.");
        }
    }

    try {
        const docRef = db.collection(COLLECTION_NAME).doc();
        await docRef.set({
            nome_fantasia,
            razao_social,
            cnpj,
            telefone: Array.isArray(telefone) ? telefone : [telefone],
            endereco,
            cidade,
            bairro,
            uf,
            cep,
            email: Array.isArray(email) ? email : [email],
            pessoa_contato,
            ins_municipal,
            agencia,
            executivo_vendas,
            criado_em: new Date(),
            atualizado_em: new Date(),
        });

        if (agencia) {
            const agenciaRef = db.collection(AGENCIAS_COLLECTION).doc(agencia);
            const agenciaSnap = await agenciaRef.get();
            const agenciaData = agenciaSnap.data();
            if (agenciaData) {
                const clientes = Array.isArray(agenciaData.clientes) ? agenciaData.clientes : [];
                if (!clientes.includes(docRef.id)) {
                    clientes.push(docRef.id);
                    await agenciaRef.update({ clientes });
                }
            }
        }

        return { message: "Cliente criado com sucesso!", id: docRef.id };
    } catch (error) {
        throw new Error(error.message || error.code || "Erro desconhecido ao criar usuário.");
    }
};

exports.listClientes = async () => {
    try {
        const db = getDb();
        const snapshot = await db.collection(COLLECTION_NAME).get();
        return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        throw new Error(error.message || "Erro ao listar clientes.");
    }
};

exports.getClienteById = async (id) => {
    try {
        const db = getDb();
        const userRef = db.collection(COLLECTION_NAME).doc(id);
        const user = await userRef.get();
        if (!user.exists) {
            throw new Error("Cliente não encontrado.");
        }
        return { id: user.id, ...user.data() };
    } catch (error) {
        throw new Error(error.message || "Erro ao buscar cliente.");
    }
};

exports.updateCliente = async (id, data) => {
    try {
        const db = getDb();
        const userRef = db.collection(COLLECTION_NAME).doc(id);
        const user = await userRef.get();
        if (!user.exists) {
            throw new Error("Cliente não encontrado.");
        }
        const clienteData = user.data();
        const oldAgencia = clienteData.agencia;
        const newAgencia = data.agencia;

        if (newAgencia && newAgencia !== oldAgencia) {
            const agenciaRef = db.collection(AGENCIAS_COLLECTION).doc(newAgencia);
            const agenciaSnap = await agenciaRef.get();
            if (!agenciaSnap.exists) {
                throw new Error("Nova agência informada não existe.");
            }
        }

        data.atualizado_em = new Date();
        await userRef.update(data);

        if (newAgencia !== oldAgencia) {
            if (oldAgencia) {
                const oldRef = db.collection(AGENCIAS_COLLECTION).doc(oldAgencia);
                const oldSnap = await oldRef.get();
                const oldData = oldSnap.data();
                if (oldData) {
                    const updated = (oldData.clientes || []).filter(cid => cid !== id);
                    await oldRef.update({ clientes: updated });
                }
            }
            if (newAgencia) {
                const newRef = db.collection(AGENCIAS_COLLECTION).doc(newAgencia);
                const newSnap = await newRef.get();
                if (!newSnap.exists) {
                    throw new Error("Nova agência não encontrada.");
                }
                const newData = newSnap.data();
                if (newData) {
                    const updated = new Set([...(newData.clientes || []), id]);
                    await newRef.update({ clientes: Array.from(updated) });
                }
            }
        }

        return { message: "Cliente atualizado com sucesso!" };
    } catch (error) {
        throw new Error(error.message || "Erro ao atualizar cliente.");
    }
};

exports.deleteCliente = async (id) => {
    try {
        const db = getDb();
        const userRef = db.collection(COLLECTION_NAME).doc(id);
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
            throw new Error("Cliente não encontrado.");
        }
        const clienteData = userDoc.data();
        const agencia = clienteData.agencia;

        await userRef.delete();

        if (agencia) {
            const agenciaRef = db.collection(AGENCIAS_COLLECTION).doc(agencia);
            const agenciaSnap = await agenciaRef.get();
            const agenciaData = agenciaSnap.data();
            if (agenciaData) {
                const updated = (agenciaData.clientes || []).filter(cid => cid !== id);
                await agenciaRef.update({ clientes: updated });
            }
        }

        return { message: "Cliente deletado com sucesso!" };
    } catch (error) {
        throw new Error(error.message || "Erro ao deletar cliente.");
    }
};
