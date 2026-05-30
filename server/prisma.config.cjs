require('dotenv/config');

const { defineConfig, env } = require('prisma/config');

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

module.exports = defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  ...(hasDatabaseUrl
    ? {
        datasource: {
          url: env('DATABASE_URL'),
        },
      }
    : {}),
});
