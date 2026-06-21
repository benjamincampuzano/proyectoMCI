const prisma = require('./utils/database');
prisma.convention.findMany({ select: { id: true, type: true, year: true, cost: true } })
  .then(r => { r.forEach(c => console.log(c.id, c.type, c.year, c.cost)); })
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
