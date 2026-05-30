FROM node:20.19-bookworm

RUN apt-get update && apt-get install -y curl ca-certificates gnupg && \
    curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /usr/share/keyrings/postgresql.gpg && \
    echo "deb [signed-by=/usr/share/keyrings/postgresql.gpg] http://apt.postgresql.org/pub/repos/apt bookworm-pgdg main" > /etc/apt/sources.list.d/postgresql.list && \
    apt-get update && apt-get install -y postgresql-client-18 && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm

WORKDIR /app

COPY package.json ./
COPY prisma ./prisma/
COPY prisma.config.cjs ./prisma.config.cjs
RUN pnpm install --prod && pnpm exec prisma generate

COPY . .

EXPOSE 5000

CMD ["pnpm", "start"]
