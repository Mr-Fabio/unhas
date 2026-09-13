// Tudo relacionado ao banco de dados fica isolado aqui.
// Usamos SQLite (better-sqlite3): não precisa instalar nenhum servidor de banco,
// os dados ficam salvos num único arquivo "agendamentos.db" nesta pasta.

const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

// Tudo que precisa sobreviver a reinícios (banco de dados, sessão do WhatsApp)
// fica dentro de "data/", que é a pasta que devemos apontar como volume
// persistente na hospedagem em nuvem (Railway, Render, VPS, etc.)
const dataDir = path.join(__dirname, "data");
fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, "agendamentos.db"));

db.exec(`
  CREATE TABLE IF NOT EXISTS agendamentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telefone TEXT NOT NULL,
    nome_cliente TEXT,
    servico TEXT NOT NULL,
    data TEXT NOT NULL,        -- formato YYYY-MM-DD
    horario TEXT NOT NULL,     -- formato HH:MM
    status TEXT NOT NULL DEFAULT 'confirmado', -- confirmado | cancelado
    lembrete_enviado INTEGER NOT NULL DEFAULT 0,
    criado_em TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );
`);

function listarHorariosOcupados(data) {
  const linhas = db
    .prepare(
      `SELECT horario FROM agendamentos WHERE data = ? AND status = 'confirmado'`
    )
    .all(data);
  return linhas.map((l) => l.horario);
}

function criarAgendamento({ telefone, nomeCliente, servico, data, horario }) {
  const stmt = db.prepare(`
    INSERT INTO agendamentos (telefone, nome_cliente, servico, data, horario)
    VALUES (?, ?, ?, ?, ?)
  `);
  const info = stmt.run(telefone, nomeCliente, servico, data, horario);
  return info.lastInsertRowid;
}

function listarAgendamentosPorTelefone(telefone) {
  return db
    .prepare(
      `SELECT * FROM agendamentos
       WHERE telefone = ? AND status = 'confirmado' AND date(data) >= date('now', 'localtime')
       ORDER BY data, horario`
    )
    .all(telefone);
}

function cancelarAgendamento(id, telefone) {
  const info = db
    .prepare(
      `UPDATE agendamentos SET status = 'cancelado' WHERE id = ? AND telefone = ?`
    )
    .run(id, telefone);
  return info.changes > 0;
}

function listarAgendamentosParaLembrete(data) {
  return db
    .prepare(
      `SELECT * FROM agendamentos
       WHERE data = ? AND status = 'confirmado' AND lembrete_enviado = 0`
    )
    .all(data);
}

function marcarLembreteEnviado(id) {
  db.prepare(`UPDATE agendamentos SET lembrete_enviado = 1 WHERE id = ?`).run(id);
}

// Usado pelo painel web: traz agendamentos futuros + dos últimos 30 dias,
// de todas as clientes, pra dona do salão acompanhar.
function listarTodosAgendamentos() {
  return db
    .prepare(
      `SELECT * FROM agendamentos
       WHERE date(data) >= date('now', 'localtime', '-30 days')
       ORDER BY data DESC, horario DESC`
    )
    .all();
}

// Cancelamento feito pelo painel (dona do salão), sem precisar bater com o telefone
function cancelarAgendamentoPorId(id) {
  const info = db
    .prepare(`UPDATE agendamentos SET status = 'cancelado' WHERE id = ?`)
    .run(id);
  return info.changes > 0;
}

module.exports = {
  listarHorariosOcupados,
  criarAgendamento,
  listarAgendamentosPorTelefone,
  cancelarAgendamento,
  listarAgendamentosParaLembrete,
  marcarLembreteEnviado,
  listarTodosAgendamentos,
  cancelarAgendamentoPorId,
};
