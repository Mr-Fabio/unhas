# Imagem enxuta do Node.js
FROM node:20-slim

# Instala o Chromium do sistema (mais leve e rápido que deixar o Puppeteer baixar o dele)
RUN apt-get update \
  && apt-get install -y --no-install-recommends chromium \
  && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

# Pasta onde ficam a sessão do WhatsApp e o banco de dados.
# Aponte isso como volume persistente na hospedagem escolhida.
VOLUME ["/app/data"]

# Porta do painel web (ajuste se mudar dashboardPorta em config.js)
EXPOSE 3000

CMD ["npm", "start"]
