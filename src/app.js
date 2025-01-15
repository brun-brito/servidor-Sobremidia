const express = require("express");
const cors = require("cors");
const reportsRouter = require("./routes/reports");
const PORT = process.env.PORT || 3000;
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Rotas
app.use("/reports", reportsRouter);

app.listen(PORT, () => {
    console.log(`[INFO] Servidor rodando na porta ${PORT}`);
});

module.exports = app;
