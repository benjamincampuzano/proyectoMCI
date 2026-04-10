FROM node:18-alpine

# `pg_dump` y `psql` para backup/restore
RUN apk add --no-cache postgresql-client

WORKDIR /app/server

# Instalar dependencias del backend
COPY server/package*.json ./
RUN npm ci --omit=dev

# Copiar código del backend y generar Prisma Client
COPY server/ ./
RUN npx prisma generate

EXPOSE 5000

CMD ["npm", "start"]