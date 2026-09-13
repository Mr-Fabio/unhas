const path = require("path");
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const cron = require("node-cron");

const config = require("./config");
const db = require("./db");
const { iniciarDashboard } = require("./server");

// ----------------------------------------------------------------------
// SESSÕES: guarda em qual etapa da conversa cada cliente está.
// Como é em memória, se o bot reiniciar as conversas em andamento se perdem
// (mas os agendamentos já confirmados continuam salvos no banco).
// ----------------------------------------------------------------------
const sessoes = new Map();

function novaSessao() {
  return { etapa: "MENU", dados: {} };
}

function getSessao(telefone) {
  if (!sessoes.has(telefone)) sessoes.set(telefone, novaSessao());
  return sessoes.get(telefone);
}

function resetarSessao(telefone) {
  sessoes.set(telefone, novaSessao());
}

// ----------------------------------------------------------------------
// UTILITÁRIOS DE DATA/HORA
// ----------------------------------------------------------------------
const DIAS_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function formatarDataISO(date) {
  const ano = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, "0");
  const dia = String(date.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function formatarDataBR(iso) {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

function proximosDiasUteis() {
  const dias = [];
  const hoje = new Date();
  let cursor = new Date(hoje);
  while (dias.length < config.diasParaMostrar) {
    if (config.diasFuncionamento.includes(cursor.getDay())) {
      dias.push({
        iso: formatarDataISO(cursor),
        label: `${DIAS_SEMANA[cursor.getDay()]} ${formatarDataBR(
          formatarDataISO(cursor)
        )}`,
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return dias;
}

function gerarTodosOsSlots() {
  const slots = [];
  const [hIni, mIni] = config.horarioInicio.split(":").map(Number);
  const [hFim, mFim] = config.horarioFim.split(":").map(Number);
  let atual = hIni * 60 + mIni;
  const fim = hFim * 60 + mFim;
  while (atual < fim) {
    const h = String(Math.floor(atual / 60)).padStart(2, "0");
    const m = String(atual % 60).padStart(2, "0");
    slots.push(`${h}:${m}`);
    atual += config.intervaloSlotsMin;
  }
  return slots;
}

function horariosDisponiveis(dataISO) {
  const ocupados = new Set(db.listarHorariosOcupados(dataISO));
  const todos = gerarTodosOsSlots();

  const hojeISO = formatarDataISO(new Date());
  const agoraMin = new Date().getHours() * 60 + new Date().getMinutes();

  return todos.filter((slot) => {
    if (ocupados.has(slot)) return false;
    if (dataISO === hojeISO) {
      const [h, m] = slot.split(":").map(Number);
      if (h * 60 + m <= agoraMin) return false; // não oferece horário que já passou
    }
    return true;
  });
}

// ----------------------------------------------------------------------
// MENSAGENS
// ----------------------------------------------------------------------
function msgMenu() {
  let texto = config.mensagemBoasVindas.replace("{nomeSalao}", config.nomeSalao);
  texto += "\n\nEscolha o serviço digitando o número:\n";
  config.servicos.forEach((s, i) => {
    texto += `${i + 1}. ${s.nome} - R$${s.preco} (${s.duracaoMin}min)\n`;
  });
  texto += "\nOutras opções:\n";
  texto += "📅 *meus agendamentos* - ver seus horários marcados\n";
  texto += "❌ *cancelar* - cancelar um agendamento";
  return texto;
}

function msgEscolherData() {
  const dias = proximosDiasUteis();
  let texto = "Perfeito! Para qual dia você quer agendar?\n\n";
  dias.forEach((d, i) => {
    texto += `${i + 1}. ${d.label}\n`;
  });
  texto += "\nDigite *menu* a qualquer momento para voltar ao início.";
  return texto;
}

function msgEscolherHorario(dataISO) {
  const livres = horariosDisponiveis(dataISO);
  if (livres.length === 0) {
    return {
      texto:
        `Poxa, não tem mais vaga em ${formatarDataBR(
          dataISO
        )} 😕\nDigite *menu* pra escolher outro dia.`,
      semVagas: true,
    };
  }
  let texto = `Horários livres em ${formatarDataBR(dataISO)}:\n\n`;
  livres.forEach((h, i) => {
    texto += `${i + 1}. ${h}\n`;
  });
  texto += "\nDigite o número do horário desejado.";
  return { texto, semVagas: false, livres };
}

function msgConfirmacao(dados) {
  return (
    `Confirme seu agendamento:\n\n` +
    `💅 Serviço: ${dados.servico}\n` +
    `📅 Data: ${formatarDataBR(dados.data)}\n` +
    `🕐 Horário: ${dados.horario}\n` +
    `👤 Nome: ${dados.nomeCliente}\n\n` +
    `Está correto?\n1. Sim, confirmar ✅\n2. Não, cancelar ❌`
  );
}

// ----------------------------------------------------------------------
// CLIENTE WHATSAPP
// ----------------------------------------------------------------------
const client = new Client({
  // Guarda a sessão conectada em data/wwebjs_auth, dentro do volume persistente
  authStrategy: new LocalAuth({
    dataPath: path.join(__dirname, "data", "wwebjs_auth"),
  }),
  puppeteer: {
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    // Em produção (Docker) usamos o Chromium instalado no sistema, definido
    // pela variável de ambiente PUPPETEER_EXECUTABLE_PATH no Dockerfile.
    // Localmente essa variável não existe, então usa o Chromium baixado pelo npm install.
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
  },
});

client.on("qr", (qr) => {
  console.log("Escaneie o QR code abaixo com o WhatsApp do número do bot:\n");
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("✅ Bot conectado e pronto para receber mensagens!");
  agendarLembretes();
});

client.on("message", async (msg) => {
  try {
    await tratarMensagem(msg);
  } catch (err) {
    console.error("Erro ao tratar mensagem:", err);
    await msg.reply(
      "Ops, deu um errinho aqui 🙏 Digite *menu* para começar de novo."
    );
  }
});

// ----------------------------------------------------------------------
// MÁQUINA DE ESTADOS DA CONVERSA
// ----------------------------------------------------------------------
async function tratarMensagem(msg) {
  const telefone = msg.from;
  const texto = msg.body.trim();
  const textoLower = texto.toLowerCase();

  // Comandos globais, funcionam em qualquer etapa
  if (textoLower === "menu") {
    resetarSessao(telefone);
    return msg.reply(msgMenu());
  }

  if (textoLower === "meus agendamentos") {
    const lista = db.listarAgendamentosPorTelefone(telefone);
    if (lista.length === 0) {
      return msg.reply(
        "Você não tem nenhum agendamento marcado.\nDigite *menu* para agendar."
      );
    }
    let texto2 = "Seus agendamentos:\n\n";
    lista.forEach((a) => {
      texto2 += `#${a.id} - ${a.servico} em ${formatarDataBR(a.data)} às ${
        a.horario
      }\n`;
    });
    texto2 += "\nPara cancelar, digite: *cancelar [número]* (ex: cancelar 3)";
    return msg.reply(texto2);
  }

  if (textoLower.startsWith("cancelar")) {
    const partes = texto.split(" ");
    const id = parseInt(partes[1], 10);
    if (!id) {
      return msg.reply(
        "Para cancelar, digite *cancelar [número]* (veja o número em *meus agendamentos*)."
      );
    }
    const ok = db.cancelarAgendamento(id, telefone);
    return msg.reply(
      ok
        ? `Agendamento #${id} cancelado com sucesso. ✅`
        : `Não encontrei o agendamento #${id} no seu nome.`
    );
  }

  const sessao = getSessao(telefone);

  switch (sessao.etapa) {
    case "MENU": {
      const idx = parseInt(texto, 10) - 1;
      const servico = config.servicos[idx];
      if (!servico) {
        return msg.reply(
          "Não entendi 🙁 Digite o número de um dos serviços abaixo:\n\n" +
            msgMenu()
        );
      }
      sessao.dados.servico = servico.nome;
      sessao.etapa = "ESCOLHER_DATA";
      return msg.reply(msgEscolherData());
    }

    case "ESCOLHER_DATA": {
      const dias = proximosDiasUteis();
      const idx = parseInt(texto, 10) - 1;
      const dia = dias[idx];
      if (!dia) {
        return msg.reply(
          "Não entendi 🙁 Digite o número de um dos dias:\n\n" +
            msgEscolherData()
        );
      }
      sessao.dados.data = dia.iso;
      const resultado = msgEscolherHorario(dia.iso);
      if (resultado.semVagas) {
        sessao.etapa = "ESCOLHER_DATA";
        return msg.reply(resultado.texto);
      }
      sessao.etapa = "ESCOLHER_HORARIO";
      return msg.reply(resultado.texto);
    }

    case "ESCOLHER_HORARIO": {
      const livres = horariosDisponiveis(sessao.dados.data);
      const idx = parseInt(texto, 10) - 1;
      const horario = livres[idx];
      if (!horario) {
        return msg.reply(
          "Não entendi 🙁 Digite o número de um dos horários listados."
        );
      }
      sessao.dados.horario = horario;
      sessao.etapa = "NOME_CLIENTE";
      return msg.reply("Show! Qual o seu nome completo?");
    }

    case "NOME_CLIENTE": {
      sessao.dados.nomeCliente = texto;
      sessao.etapa = "CONFIRMAR";
      return msg.reply(msgConfirmacao(sessao.dados));
    }

    case "CONFIRMAR": {
      if (texto === "1") {
        // Antes de salvar, confere de novo se o horário ainda está livre
        // (evita corrida caso dois clientes escolham o mesmo horário ao mesmo tempo)
        const aindaLivre = horariosDisponiveis(sessao.dados.data).includes(
          sessao.dados.horario
        );
        if (!aindaLivre) {
          resetarSessao(telefone);
          return msg.reply(
            "Ih, esse horário acabou de ser ocupado por outra pessoa 😕\nDigite *menu* para escolher outro."
          );
        }
        const id = db.criarAgendamento({
          telefone,
          nomeCliente: sessao.dados.nomeCliente,
          servico: sessao.dados.servico,
          data: sessao.dados.data,
          horario: sessao.dados.horario,
        });
        resetarSessao(telefone);
        return msg.reply(
          `Agendamento confirmado! ✅\n\n` +
            `#${id} - ${sessao.dados.servico}\n` +
            `📅 ${formatarDataBR(sessao.dados.data)} às ${
              sessao.dados.horario
            }\n\n` +
            `Te esperamos no ${config.nomeSalao}! 💅`
        );
      }
      if (texto === "2") {
        resetarSessao(telefone);
        return msg.reply(
          "Agendamento cancelado. Digite *menu* para começar de novo."
        );
      }
      return msg.reply("Digite 1 para confirmar ou 2 para cancelar.");
    }

    default: {
      resetarSessao(telefone);
      return msg.reply(msgMenu());
    }
  }
}

// ----------------------------------------------------------------------
// LEMBRETES AUTOMÁTICOS
// Todo dia, no horário definido em config.horaEnvioLembrete, o bot avisa
// os clientes que têm agendamento para o DIA SEGUINTE.
// ----------------------------------------------------------------------
function agendarLembretes() {
  const [hora, minuto] = config.horaEnvioLembrete.split(":");
  const expressaoCron = `${minuto} ${hora} * * *`; // minuto hora * * * (todo dia)

  cron.schedule(expressaoCron, async () => {
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    const amanhaISO = formatarDataISO(amanha);

    const agendamentos = db.listarAgendamentosParaLembrete(amanhaISO);
    for (const ag of agendamentos) {
      try {
        await client.sendMessage(
          ag.telefone,
          `Oi, ${ag.nome_cliente}! Passando pra lembrar do seu horário amanhã 😊\n\n` +
            `💅 ${ag.servico}\n📅 ${formatarDataBR(ag.data)} às ${ag.horario}\n\n` +
            `Até lá! Se precisar remarcar, é só me chamar.`
        );
        db.marcarLembreteEnviado(ag.id);
      } catch (err) {
        console.error(`Erro ao enviar lembrete para ${ag.telefone}:`, err);
      }
    }
    console.log(
      `Lembretes enviados: ${agendamentos.length} (para ${amanhaISO})`
    );
  });

  console.log(
    `⏰ Lembretes automáticos agendados para todo dia às ${config.horaEnvioLembrete}`
  );
}

iniciarDashboard();
client.initialize();
