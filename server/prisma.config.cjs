require('dotenv/config');

const { defineConfig, env } = require('prisma/config');

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
const hasDirectUrl = Boolean(process.env.DIRECT_URL);

module.exports = defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  ...(hasDirectUrl || hasDatabaseUrl
    ? {
        datasource: {
          url: hasDirectUrl ? env('DIRECT_URL') : env('DATABASE_URL'),
        },
      }
    : {}),
});
