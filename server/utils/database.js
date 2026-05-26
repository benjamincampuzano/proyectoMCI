const { PrismaClient } = require('@prisma/client');

const CONNECTION_LIMIT = process.env.NODE_ENV === 'production' ? 30 : 20;

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error'],
  datasources: {
    db: {
      url: (() => {
        const url = new URL(process.env.DATABASE_URL);
        url.searchParams.set('connection_limit', String(CONNECTION_LIMIT));
        url.searchParams.set('pool_timeout', '30');
        url.searchParams.set('connect_timeout', '10');
        url.searchParams.set('idle_in_transaction_session_timeout', '60000');
        url.searchParams.set('statement_timeout', '60000');
        return url.toString();
      })()
    }
  }
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
