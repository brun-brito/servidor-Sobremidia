const { getDb } = require("../config/firebase");
const COLLECTION_NAME = "executivos";

exports.createExecutivo = async (executivos) => {
  const db = getDb();
  if (!Array.isArray(executivos) || executivos.length === 0) throw new Error("Envie uma lista de executivos.");
  const batch = db.batch();
  const refs = [];
  executivos.forEach(exec => {
    if (!exec.nome || !exec.sobrenome || !exec.email) throw new Error("Nome, sobrenome e email são obrigatórios para todos os executivos.");
    const ref = db.collection(COLLECTION_NAME).doc();
    batch.set(ref, { 
      nome: exec.nome, 
      sobrenome: exec.sobrenome, 
      email: exec.email, 
      apelido: exec.apelido || "", 
      ativo: true 
    });
    refs.push({ ref, ...exec });
  });
  await batch.commit();
  return refs.map(({ ref, ...data }) => ({ id: ref.id, ...data }));
};

exports.listExecutivos = async () => {
  const db = getDb();
  const snapshot = await db.collection(COLLECTION_NAME).get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

exports.getExecutivoById = async (id) => {
  const db = getDb();
  const doc = await db.collection(COLLECTION_NAME).doc(id).get();
  if (!doc.exists) throw new Error("Executivo não encontrado.");
  return { id: doc.id, ...doc.data() };
};

exports.updateExecutivo = async (id, { nome, sobrenome, email, apelido, ativo }) => {
  const db = getDb();
  await db.collection(COLLECTION_NAME).doc(id).update({ nome, sobrenome, email, apelido, ativo });
  return { id, nome, sobrenome, email, apelido, ativo };
};

exports.deleteExecutivo = async (id) => {
  const db = getDb();
  await db.collection(COLLECTION_NAME).doc(id).delete();
  return { id };
};