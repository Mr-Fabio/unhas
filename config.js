// Todas as configurações do salão ficam aqui.
// Edite este arquivo pra ajustar serviços, horários e mensagens sem mexer no resto do código.

module.exports = {
  nomeSalao: "Studio de Unhas",

  // Lista de serviços oferecidos. Adicione, remova ou edite à vontade.
  servicos: [
    { nome: "Manicure", duracaoMin: 45, preco: 35 },
    { nome: "Pedicure", duracaoMin: 45, preco: 40 },
    { nome: "Manicure + Pedicure", duracaoMin: 90, preco: 65 },
    { nome: "Unha em gel", duracaoMin: 90, preco: 80 },
    { nome: "Manutenção de gel", duracaoMin: 60, preco: 50 },
  ],

  // Dias em que o salão funciona (0 = domingo, 1 = segunda, ..., 6 = sábado)
  diasFuncionamento: [1, 2, 3, 4, 5, 6],

  // Janela de atendimento
  horarioInicio: "09:00",
  horarioFim: "18:00",

  // Intervalo entre horários disponíveis (em minutos)
  intervaloSlotsMin: 60,

  // Quantos dias pra frente mostrar como opção de agendamento
  diasParaMostrar: 7,

  // Horário em que o bot dispara os lembretes automáticos do dia seguinte (formato 24h "HH:MM")
  horaEnvioLembrete: "18:00",

  // Painel web para visualizar os agendamentos pelo navegador
  dashboardPorta: 3000,
  // Troque essa senha! Usada no login (usuário: admin) pra acessar o painel.
  dashboardSenha: "unhas123",

  // Mensagem de saudação (aparece quando o cliente inicia a conversa)
  mensagemBoasVindas:
    "Olá! 💅 Bem-vinda(o) ao *{nomeSalao}*!\nVou te ajudar a marcar seu horário.",
};
