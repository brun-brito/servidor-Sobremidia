const express = require("express");
const cors = require("cors");
const reportsRouter = require("./routes/reports");
const proxyRouter = require("./routes/proxy");
const checkinRoute = require("./routes/checkin");
const emailRoute = require("./routes/email");
const PORT = process.env.PORT || 3000;
const app = express();

app.use(cors({
    origin: "*", // Permite todas as origens
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Content-Type", "Authorization"],
}));

// Middleware para JSON
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Rotas
app.use("/reports", reportsRouter);
app.use("/proxy", proxyRouter);
app.use("/checkin", checkinRoute);
app.use("/email", emailRoute);

// app.listen(PORT, () => {
//     console.log(`[INFO] Servidor rodando na porta ${PORT}`);
// });

module.exports = app;
