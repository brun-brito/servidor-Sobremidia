const { getDb } = require("../config/firebase");

const COLLECTION_NAME = "propostas";

exports.createProposta = async (dados) => {
    const {
        cliente,
        agencia,
        produto_campanha,
        tipo_midia,
        duracao_peca_segundos,
        percentual_comissao,
        valor_liquido_total,
        prazo_pagamento,
        forma_pagamento,
        observacoes_adicionais,
        paineis,
        infoCliente,
        infoAgencia,
        executivo_vendas,
    } = dados;

    // Validação básica dos campos gerais
    if (!cliente) throw new Error("O campo 'Cliente' é obrigatório.");
    if (!produto_campanha) throw new Error("O campo 'Campanha' é obrigatório.");
    if (!prazo_pagamento) throw new Error("O campo 'Prazo de pagamento' é obrigatório.");
    if (!forma_pagamento) throw new Error("O campo 'Forma de pagamento' é obrigatório.");
    if (!paineis || !Array.isArray(paineis) || paineis.length === 0) {
        throw new Error("É obrigatório informar pelo menos um painel.");
    }

    // Validação dos painéis
    paineis.forEach((p, idx) => {
        if (!p.painelId || !p.painelNome) throw new Error(`O campo 'Painel' é obrigatório no painel ${idx + 1}.`);
        if (!p.periodo_veiculacao || !p.periodo_veiculacao.inicio || !p.periodo_veiculacao.fim)
            throw new Error(`O período de veiculação é obrigatório no painel ${idx + 1}.`);
        if (!p.insercoes_diarias) throw new Error(`O campo 'Inserções diárias' é obrigatório no painel ${idx + 1}.`);
    });

    // Geração automática do número do PI
    const now = new Date();
    const ano = now.getFullYear();
    const mes = String(now.getMonth() + 1).padStart(2, '0');
    const prefixo = `${ano}${mes}`;

    const db = getDb();
    const snapshot = await db.collection(COLLECTION_NAME)
        .where('numero_pi', '>=', `${prefixo}0000`)
        .where('numero_pi', '<', `${prefixo}9999`)
        .orderBy('numero_pi', 'desc')
        .limit(1)
        .get();

    let sequencia = 1;
    if (!snapshot.empty) {
        const ultimoPI = snapshot.docs[0].data().numero_pi;
        const ultimos4 = ultimoPI.slice(-4);
        sequencia = parseInt(ultimos4, 10) + 1;
    }
    const numero_pi = `${prefixo}${String(sequencia).padStart(4, '0')}`;
    const data_emissao = new Date();

    const docRef = db.collection(COLLECTION_NAME).doc();
    await docRef.set({
        status: "em aberto",
        cliente,
        agencia,
        numero_pi,
        data_emissao,
        produto_campanha,
        tipo_midia,
        duracao_peca_segundos,
        percentual_comissao,
        valor_liquido_total,
        prazo_pagamento,
        forma_pagamento,
        observacoes_adicionais,
        paineis,
        infoCliente,
        infoAgencia,
        executivo_vendas,
        criado_em: new Date(),
        atualizado_em: new Date(),
    });
    return { message: "Proposta criada com sucesso!", id: docRef.id, numero_pi };
};

exports.listPropostas = async () => {
    const db = getDb();
    const snapshot = await db.collection(COLLECTION_NAME).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

exports.getPropostaById = async (id) => {
    const db = getDb();
    const ref = db.collection(COLLECTION_NAME).doc(id);
    const doc = await ref.get();
    if (!doc.exists) {
        throw new Error("Proposta não encontrada.");
    }
    return { id: doc.id, ...doc.data() };
};

exports.updateProposta = async (id, dados) => {
    const db = getDb();
    const ref = db.collection(COLLECTION_NAME).doc(id);
    const doc = await ref.get();
    if (!doc.exists) {
        throw new Error("Proposta não encontrada.");
    }
    dados.atualizado_em = new Date();
    await ref.update(dados);
    return { message: "Proposta atualizada com sucesso!" };
};

exports.deleteProposta = async (id) => {
    const db = getDb();
    const ref = db.collection(COLLECTION_NAME).doc(id);
    const doc = await ref.get();
    if (!doc.exists) {
        throw new Error("Proposta não encontrada.");
    }
    await ref.delete();
    return { message: "Proposta deletada com sucesso!" };
}; 