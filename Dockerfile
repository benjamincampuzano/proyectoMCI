FROM node:18-alpine

# `pg_dump` y `psql` para backup/restore
RUN apk add --no-cache postgresql-client

# Instalar pnpm
RUN npm install -g pnpm

WORKDIR /app/server

# Instalar dependencias del backend
COPY server/package.json ./
RUN pnpm install --prod

# Copiar código del backend y generar Prisma Client
COPY server/ ./
RUN pnpm exec prisma generate

EXPOSE 5000

CMD ["pnpm", "start"]