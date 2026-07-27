FROM node:lts-alpine 

WORKDIR /app

COPY ./dist ./
COPY package*.json ./
COPY config.json ./
COPY ./prisma ./prisma

RUN npm install

CMD ["node", "src/index.js"]