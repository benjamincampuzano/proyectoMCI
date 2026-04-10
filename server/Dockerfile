FROM node:18-bookworm

RUN apt-get update && apt-get install -y postgresql-client-18 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev && npx prisma generate

COPY . .

EXPOSE 5000

CMD ["npm", "start"]