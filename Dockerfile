FROM node:20.19-alpine

# `pg_dump` y `psql` para backup/restore
RUN apk add --no-cache postgresql-client

# Instalar pnpm
RUN npm install -g pnpm

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY client/package.json ./client/package.json
COPY server/package.json ./server/package.json
COPY server/prisma ./server/prisma
COPY server/prisma.config.cjs ./server/prisma.config.cjs
RUN pnpm install && pnpm -C server exec prisma generate

COPY . .

EXPOSE 5000

CMD ["pnpm", "start"]
