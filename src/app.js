const express = require("express");
const cors = require("cors");
const reportsRouter = require("./routes/reports");
const proxyRouter = require("./routes/proxy");
const checkinRoute = require("./routes/checkin");
const emailRoute = require("./routes/email");
const userRoute = require("./routes/user");
const pdfRoute = require("./routes/pdf");
const verificaInsercoesRoute = require("./routes/verificaInsercoes");
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
app.use('/assets', express.static(__dirname + '/assets'));
app.use("/reports", reportsRouter);
app.use("/proxy", proxyRouter);
app.use("/checkin", checkinRoute);
app.use("/email", emailRoute);
app.use("/user", userRoute);
app.use("/pdf", pdfRoute);
app.use("/verifica-insercoes", verificaInsercoesRoute);

module.exports = app;
