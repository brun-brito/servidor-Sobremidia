const express = require("express");
const cors = require("cors");
const reportsRouter = require("./routes/reports");
const proxyRouter = require("./routes/proxy");
const checkinRoute = require("./routes/checkin");
const emailRoute = require("./routes/email");
const userRoute = require("./routes/user");
const pdfRoute = require("./routes/pdf");
const tokenRoute = require("./routes/token");
const analyticsRoute = require("./routes/analytics");
const paineisRoute = require("./routes/paineis");
const verificaInsercoesRoute = require("./routes/verificaInsercoes");
const xlsRoute = require("./routes/xls");
const clientesRoute = require("./routes/clientes");
const agenciasRoute = require("./routes/agencias");
const propostaRoute = require("./routes/proposta");
const PORT = process.env.PORT || 3000;
const app = express();
const session = require("express-session");

app.use(cors({
    origin: "*", // Permite todas as origens
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Content-Type", "Authorization"],
}));

app.use(session({
    secret: "segredo-super-seguro",
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false,
    }
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
app.use("/token", tokenRoute);
app.use("/analytics", analyticsRoute);
app.use("/paineis", paineisRoute);
app.use("/verifica-insercoes", verificaInsercoesRoute);
app.use("/xls", xlsRoute);
app.use("/clientes", clientesRoute);
app.use("/agencias", agenciasRoute);
app.use("/propostas", propostaRoute);

module.exports = app;
