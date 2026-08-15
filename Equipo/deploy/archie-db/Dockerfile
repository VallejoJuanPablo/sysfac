FROM node:22-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY archie-db-server.js ./

EXPOSE 3456

CMD ["node", "archie-db-server.js"]
