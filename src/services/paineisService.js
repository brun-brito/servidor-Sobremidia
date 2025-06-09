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
  
    await db.collection(COLLECTION_PATH).doc(idManagerStr).set(dados);
    
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

  await ref.update(dados);
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