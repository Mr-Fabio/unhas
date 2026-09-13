// Painel web pra dona do salão ver os agendamentos direto do navegador.
// Importante: os dados aqui vêm sempre do banco de dados real do bot
// (mesmo arquivo que o WhatsApp usa) — não é armazenado no navegador,
// então funciona igual em qualquer computador ou celular.

const express = require("express");
const path = require("path");
const config = require("./config");
const db = require("./db");

function checarSenha(req, res, next) {
  if (!config.dashboardSenha) return next(); // sem senha configurada = acesso livre

  const auth = req.headers.authorization || "";
  const esperado =
    "Basic " + Buffer.from(`admin:${config.dashboardSenha}`).toString("base64");

  if (auth === esperado) return next();

  res.set("WWW-Authenticate", 'Basic realm="Painel de Agendamentos"');
  return res.status(401).send("Autenticação necessária");
}

function iniciarDashboard() {
  const app = express();

  app.use(checarSenha);
  app.use(express.static(path.join(__dirname, "public")));

  app.get("/api/agendamentos", (req, res) => {
    res.json(db.listarTodosAgendamentos());
  });

  app.post("/api/agendamentos/:id/cancelar", (req, res) => {
    const ok = db.cancelarAgendamentoPorId(parseInt(req.params.id, 10));
    res.json({ ok });
  });

  const porta = config.dashboardPorta || 3000;
  app.listen(porta, () => {
    console.log(`📊 Painel de agendamentos disponível em http://localhost:${porta}`);
    if (config.dashboardSenha) {
      console.log(`   Usuário: admin  |  Senha: (definida em config.js)`);
    }
  });
}

module.exports = { iniciarDashboard };
