# Como colocar o bot na nuvem (rodando 24h, sem depender do celular ligado)

O bot já vem pronto com um `Dockerfile`, então funciona em praticamente
qualquer hospedagem que aceite "deploy via Docker". Abaixo, o caminho mais
simples: **Railway** (tem plano gratuito com créditos de teste e é bem
amigável pra quem nunca fez deploy).

## Opção recomendada: Railway

1. Crie uma conta em https://railway.app (dá pra entrar com GitHub).
2. Suba esta pasta (`bot-agendamento-unhas`) para um repositório no GitHub
   (pode ser privado). Se nunca usou Git, o próprio Railway te guia por um
   upload direto de pasta também.
3. No Railway, clique em **New Project → Deploy from GitHub repo** e
   selecione o repositório.
4. O Railway vai detectar o `Dockerfile` automaticamente e começar o build.
5. **Importante — adicionar um volume persistente:**
   - Vá em **Settings** do serviço → **Volumes** → **New Volume**.
   - Monte o volume no caminho `/app/data`.
   - Isso garante que a sessão do WhatsApp (você não precisa escanear o QR
     de novo a cada deploy) e o banco de agendamentos não se percam quando o
     serviço reiniciar.
6. Depois do deploy, abra a aba **Logs/Deployments** do Railway — é lá que o
   QR code vai aparecer (em formato de texto). Escaneie com o WhatsApp que
   vai virar o número do bot.
7. Pronto! O bot fica rodando 24h por dia na nuvem, mesmo com seu celular
   desligado.

## Alternativas

- **Render.com** — mesma ideia, use "Web Service" ou "Background Worker" a
  partir do Dockerfile, e adicione um "Persistent Disk" montado em `/app/data`.
- **VPS próprio** (DigitalOcean, Oracle Cloud tier gratuito, Contabo, etc.) —
  mais controle, exige saber um pouco de Linux. Nesse caso:
  ```bash
  git clone <seu-repositorio>
  cd bot-agendamento-unhas
  docker build -t bot-unhas .
  docker run -d --name bot-unhas -v $(pwd)/data:/app/data bot-unhas
  docker logs -f bot-unhas   # pra ver o QR code
  ```

## Depois de conectado

- Se precisar trocar o número do bot, apague o conteúdo da pasta/volume
  `data/wwebjs_auth` e reinicie — um novo QR code vai ser gerado.
- Para ver os logs (incluindo erros e confirmações de agendamento), use a
  aba de logs da própria hospedagem escolhida.
