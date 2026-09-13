# Bot de Agendamento de Unhas para WhatsApp

Bot que atende no WhatsApp e permite que suas clientes marquem horário sozinhas,
sem você precisar ficar respondendo mensagem por mensagem.

## O que ele faz

- ✅ Menu automático com os serviços do salão
- ✅ Mostra os próximos dias disponíveis
- ✅ Mostra só os horários **realmente livres** (não deixa marcar em cima de outro horário)
- ✅ Pede o nome da cliente e confirma tudo antes de salvar
- ✅ Salva os agendamentos num banco de dados local (arquivo `agendamentos.db`)
- ✅ Cliente pode ver `meus agendamentos` e `cancelar [número]`
- ✅ Envia lembrete automático um dia antes do horário marcado
- ✅ Funciona com um número de WhatsApp comum (não precisa de conta comercial da Meta)
- ✅ Painel web pra dona do salão ver e cancelar agendamentos pelo navegador

## Painel de agendamentos (navegador)

Além do WhatsApp, o bot sobe automaticamente um painel web na porta `3000`
(ajustável em `config.js`). Pra acessar:

1. Localmente: abra `http://localhost:3000` no navegador.
2. Na nuvem: use o endereço público que a hospedagem te der (ex: Railway
   gera algo como `https://seu-bot.up.railway.app`).
3. Vai pedir usuário e senha — usuário é `admin`, a senha é a que estiver em
   `dashboardSenha` dentro de `config.js` (**troque essa senha antes de usar
   em produção!**).

O painel mostra todos os agendamentos dos últimos 30 dias + futuros, atualiza
sozinho a cada 30 segundos, e permite cancelar um agendamento com um clique —
tudo isso lendo direto do banco de dados real do bot (não guarda nada no
navegador), então funciona igual em qualquer computador ou celular.


## Como instalar

1. Instale o [Node.js](https://nodejs.org) (versão 18 ou mais recente) se ainda não tiver.
2. Abra um terminal dentro desta pasta e rode:

   ```bash
   npm install
   ```

   (isso vai baixar as dependências, incluindo um navegador Chromium — pode
   demorar alguns minutos e a primeira vez precisa de internet)

3. Inicie o bot:

   ```bash
   npm start
   ```

4. Um QR code vai aparecer no terminal. Abra o WhatsApp no celular que vai ser
   o número do bot → **Aparelhos conectados** → **Conectar um aparelho** → escaneie o QR code.

5. Pronto! Depois de conectar, mande uma mensagem de teste pra esse número
   de um outro celular e o bot já responde.

Nas próximas vezes, basta rodar `npm start` de novo — ele guarda a sessão
conectada numa pasta local (`.wwebjs_auth`), sem precisar escanear o QR toda vez.

## Como personalizar

Quase tudo pode ser ajustado sem mexer na lógica do bot, só editando o
arquivo **`config.js`**:

- Nome do salão
- Lista de serviços, preços e duração
- Dias e horário de funcionamento
- Intervalo entre os horários (ex: de 30 em 30 minutos, de hora em hora)
- Horário em que os lembretes são disparados

## Rodando 24h na nuvem (sem depender do celular ligado)

Se você quer que o bot funcione o tempo todo, mesmo com o computador ou
celular desligados, veja o passo a passo em **`DEPLOY.md`** (recomendo o
Railway, é o mais simples).

## Observações importantes

- Esse bot usa uma biblioteca **não-oficial** (`whatsapp-web.js`), que simula
  o WhatsApp Web. É ótima para testar e usar em pequena escala, mas o número
  fica sujeito às regras normais de uso do WhatsApp — evite mandar muita
  mensagem em massa pra não correr risco de bloqueio.
- Se no futuro você quiser algo mais robusto (múltiplos atendentes, alto
  volume de mensagens, garantias contra bloqueio), o caminho é migrar para a
  **API Oficial da Meta (WhatsApp Business Cloud API)** — aí sim é preciso
  verificar um número comercial junto à Meta. Me chama que ajudo a migrar
  quando chegar a hora.
- Os dados ficam salvos localmente no arquivo `agendamentos.db`. Faça backup
  desse arquivo de vez em quando (é só copiar o arquivo).

## Estrutura dos arquivos

```
bot-agendamento-unhas/
├── index.js      → lógica principal do bot (conversa + WhatsApp)
├── db.js         → acesso ao banco de dados (SQLite)
├── config.js     → configurações do salão (edite aqui!)
├── package.json  → dependências do projeto
└── README.md     → este arquivo
``
