const { getDb } = require("../config/firebase");

const COLLECTION_PATH = "paineis";

exports.listarPaineisService = async () => {
  const db = getDb();
  const snapshot = await db.collection(COLLECTION_PATH).get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

exports.obterPainelPorIdService = async (id) => {
  const db = getDb();
  const ref = db.collection(COLLECTION_PATH).doc(id);
  const doc = await ref.get();

  if (!doc.exists) {
    const error = new Error("Painel não encontrado.");
    error.statusCode = 404;
    throw error;
  }

  return { id: doc.id, ...doc.data() };
};

exports.criarPainelService = async (dados) => {
    // Extrai o valor antes do primeiro hífen do campo painel ou nome
    const nomePainel = dados.nameManager || dados.nome || "";
    const match = nomePainel.match(/^([^-\s]+)/);
    const painelId = match ? match[1].trim() : String(dados.idManager);

    // Verifica se já existe um painel com esse id
    const db = getDb();
    const ref = db.collection(COLLECTION_PATH).doc(painelId);
    const doc = await ref.get();
    if (doc.exists) {
        const error = new Error(`Já existe um painel com o id '${painelId}'.`);
        error.statusCode = 409;
        throw error;
    }

    const { formato, latitude, longitude, cidade, impactos_mes, audiencia_mes, total_veiculos_mes, cpm_mes, ...outrosDados } = dados;

    await ref.set({
        ...outrosDados,
        formato: formato || "",
        latitude: latitude || "",
        longitude: longitude || "",
        cidade: cidade || "",
        impactos_mes: impactos_mes || "",
        audiencia_mes: audiencia_mes || "",
        total_veiculos_mes: total_veiculos_mes || "",
        cpm_mes: cpm_mes || "",
        criado_em: new Date(),
        atualizado_em: new Date()
    });

    return { message: "Painel criado com sucesso!", id: painelId };
};

exports.atualizarPainelService = async (id, dados) => {
  const db = getDb();
  const ref = db.collection(COLLECTION_PATH).doc(id);
  const doc = await ref.get();

  if (!doc.exists) {
    const error = new Error("Painel não encontrado.");
    error.statusCode = 404;
    throw error;
  }

  const { formato, latitude, longitude, cidade, impactos_mes, audiencia_mes, total_veiculos_mes, cpm_mes, ...outrosDados } = dados;
  await ref.update({
    ...outrosDados,
    formato: formato || "",
    latitude: latitude || "",
    longitude: longitude || "",
    cidade: cidade || "",
    impactos_mes: impactos_mes || "",
    audiencia_mes: audiencia_mes || "",
    total_veiculos_mes: total_veiculos_mes || "",
    cpm_mes: cpm_mes || "",
    atualizado_em: new Date()
  });
};

exports.excluirPainelService = async (id) => {
  const db = getDb();
  const ref = db.collection(COLLECTION_PATH).doc(id);
  const doc = await ref.get();

  if (!doc.exists) {
    const error = new Error("Painel não encontrado.");
    error.statusCode = 404;
    throw error;
  }

  await ref.delete();
};