FROM node:18-alpine

RUN apk add --no-cache postgresql17-client

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev && npx prisma generate

COPY . .

EXPOSE 5000

CMD ["npm", "start"]