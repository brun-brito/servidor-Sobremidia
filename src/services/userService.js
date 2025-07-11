const { getDb, getAuth } = require("../config/firebase");

const COLLECTION_NAME = "usuarios";

exports.createUserService = async({ nome, email, senha, funcao }) => {
  if (!email || !senha || !nome || !funcao) {
    throw new Error("Todos os campos são obrigatórios!");
  }

  try {
    const db = getDb();
    const auth = getAuth();
    const userRecord = await auth.createUser({ email, password: senha });

    await db.collection(COLLECTION_NAME).doc(userRecord.uid).set({ nome, email, funcao });

    return { message: "Usuário criado com sucesso!", uid: userRecord.uid };
  } catch (error) {
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

    throw new Error(errorMessages[error.code] || "Erro desconhecido ao criar usuário.");
  }
}

exports.listUsersService = async(email) => {
  const db = getDb();
  let query = db.collection(COLLECTION_NAME);
  if (email) {
    query = query.where("email", "==", email);
  }
  const snapshot = await query.get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

exports.getUserByIdService = async(id) => {
  const db = getDb();
  const userRef = db.collection(COLLECTION_NAME).doc(id);
  const user = await userRef.get();

  if (!user.exists) {
    const error = new Error("Usuário não encontrado");
    error.statusCode = 404;
    throw error;
  }

  return user.data();
}

exports.updateUserService = async(id, { nome, email, funcao }) => {
  const db = getDb();
  const auth = getAuth();
  await auth.updateUser(id, { email });
  await db.collection(COLLECTION_NAME).doc(id).update({ nome, email, funcao });
}

exports.deleteUserService = async(id) => {
  const db = getDb();
  const auth = getAuth();
  const userRef = db.collection(COLLECTION_NAME).doc(id);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    const error = new Error("Usuário não encontrado no Firestore.");
    error.statusCode = 404;
    throw error;
  }

  try {
    await auth.deleteUser(id);
  } catch (authError) {
    console.warn("Usuário não encontrado no Firebase Authentication:", authError.message);
  }

  await userRef.delete();
}