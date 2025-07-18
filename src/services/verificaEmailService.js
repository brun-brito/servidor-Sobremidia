const { getDb } = require("../config/firebase");

async function getAllEmails() {
    const db = getDb();
    const snapshot = await db.collection("emails").get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function getEmailById(id) {
    const db = getDb();
    const doc = await db.collection("emails").doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
}

module.exports = {
    getAllEmails,
    getEmailById
};
