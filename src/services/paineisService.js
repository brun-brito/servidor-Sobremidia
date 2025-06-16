const { db } = require("../config/firebase");

const COLLECTION_PATH = "paineis";

exports.listarPaineisService = async () => {
  const snapshot = await db.collection(COLLECTION_PATH).get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

exports.obterPainelPorIdService = async (id) => {
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
    const idManagerStr = String(dados.idManager);
    const { formato, ...outrosDados } = dados;
  
    await db.collection(COLLECTION_PATH).doc(idManagerStr).set({
        ...outrosDados,
        formato: formato || "",
        criado_em: new Date(),
        atualizado_em: new Date()
    });
    
    return { message: "Painel criado com sucesso!", id: idManagerStr };
  };

exports.atualizarPainelService = async (id, dados) => {
  const ref = db.collection(COLLECTION_PATH).doc(id);
  const doc = await ref.get();

  if (!doc.exists) {
    const error = new Error("Painel não encontrado.");
    error.statusCode = 404;
    throw error;
  }

  const { formato, ...outrosDados } = dados;
  await ref.update({
    ...outrosDados,
    formato: formato || "",
    atualizado_em: new Date()
  });
};

exports.excluirPainelService = async (id) => {
  const ref = db.collection(COLLECTION_PATH).doc(id);
  const doc = await ref.get();

  if (!doc.exists) {
    const error = new Error("Painel não encontrado.");
    error.statusCode = 404;
    throw error;
  }

  await ref.delete();
};