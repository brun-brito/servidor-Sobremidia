const express = require("express");
const session = require("express-session");
const { 
    generateReport, 
    getReportStatus, 
    getReportResult, 
    downloadAndProcessReport 
} = require("../services/reportService");
const { db }= require("../config/firebase");
const router = express.Router();
const { displayReport } = require("../controllers/reportController");

// Rota para gerar relatórios
router.post("/generate", generateReport);

// Rota para verificar status do relatório
router.get("/status/:reportId", getReportStatus);

// Rota para obter o resultado do relatório
router.get("/result/:reportId", getReportResult);

// Configuração da sessão para armazenar a senha temporariamente
router.use(session({
    secret: "segredo-super-seguro",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// Página de senha para relatório
router.get("/html/:reportId", (req, res) => {

    if (req.session.isAuthenticated) {
        return displayReport(req, res);
    }

    const loginPage = `
        <html lang="pt-br">
        <head>
            <title>Relatório Protegido</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f4f4f4; }
                .container { max-width: 400px; margin: auto; padding: 20px; background: white; border-radius: 5px; box-shadow: 0px 0px 10px rgba(0,0,0,0.1); }
                input { display: block; width: 100%; margin-bottom: 10px; padding: 10px; font-size: 16px; border: 1px solid #ccc; border-radius: 5px; }
                button { padding: 10px; width: 100%; background: #24d464; border: none; color: white; font-size: 16px; cursor: pointer; border-radius: 5px; }
                button:hover { background: #1db354; }
                .error { color: red; font-size: 14px; margin-top: 10px; display: none; }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>Digite a Senha para Acessar o Relatório</h2>
                <form id="passwordForm">
                    <input type="password" id="passwordInput" placeholder="Digite a senha" required>
                    <button type="submit">Entrar</button>
                    <p class="error" id="errorMessage">Senha incorreta!</p>
                </form>
            </div>

            <script>
                document.getElementById("passwordForm").addEventListener("submit", async function(event) {
                    event.preventDefault();
                    var password = document.getElementById("passwordInput").value;
                    
                    const response = await fetch(window.location.pathname, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ password })
                    });

                    if (response.ok) {
                        window.location.reload();
                    } else {
                        document.getElementById("errorMessage").style.display = "block";
                    }
                });
            </script>
        </body>
        </html>
    `;

    res.send(loginPage);
});

router.post("/html/:reportId", async (req, res) => {
    const { reportId } = req.params;
    const { password } = req.body;

    try {
        const reportRef = db.collection("relatorios").doc(reportId);
        const reportData = await reportRef.get();

        if (!reportData.exists) {
            return res.status(404).send("Relatório não encontrado.");
        }

        const storedPassword = reportData.data().senha;

        if (password === storedPassword) {
            req.session.isAuthenticated = true;
            return res.status(200).send("OK");
        }

        res.status(401).send("Senha incorreta.");
    } catch (error) {
        console.error("[ERROR] Erro na autenticação:", error);
        res.status(500).send("Erro no servidor.");
    }
});

router.get("/organize", async (req, res) => {
    const { url } = req.query;

    if (!url) {
        console.error("[ERROR] URL do relatório não fornecida.");
        return res.status(400).json({ success: false, error: "A URL do relatório é obrigatória." });
    }

    try {
        console.log(`[INFO] Processando relatório a partir da URL: ${url}`);

        const processedData = await downloadAndProcessReport(url);

        return res.status(200).json({ success: true, data: processedData });

    } catch (error) {
        console.error(`[ERROR] Erro ao processar relatório ${url}:`, error.message);
        return res.status(500).json({ success: false, error: error.message || "Erro interno ao processar o relatório." });
    }
});

module.exports = router;
