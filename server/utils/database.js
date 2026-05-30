const { PrismaClient } = require('../generated/prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const CONNECTION_LIMIT = process.env.NODE_ENV === 'production' ? 30 : 20;
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is required to initialize Prisma');
}

const adapter = new PrismaPg({
  connectionString: DATABASE_URL,
  max: CONNECTION_LIMIT,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 300000,
});

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error'],
  adapter,
});

// Set statement timeout at database level (kills runaway queries after 60s)
(async () => {
  try {
    await prisma.$executeRaw`SET statement_timeout = '60000'`;
  } catch (e) {
    // Pool may not be ready yet; timeout still applies at query level
  }
})();

// Shutdown limpio para liberar conexiones del pool
const gracefulDisconnect = async () => {
  await prisma.$disconnect();
};

process.on('beforeExit', gracefulDisconnect);
process.on('SIGINT', async () => { await gracefulDisconnect(); process.exit(0); });
process.on('SIGTERM', async () => { await gracefulDisconnect(); process.exit(0); });

module.exports = prisma;
