const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  try {
    const user = await prisma.user.findFirst({
        where: { isDeleted: false },
        include: { roles: { include: { role: true } } }
    });

    if (!user) {
        console.log('No user found');
        return;
    }

    const roles = user.roles.map(ur => ur.role.name);
    const token = jwt.sign(
        { id: user.id, email: user.email, roles: roles },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );

    console.log('Token for user', user.email, '(', roles.join(','), '):');
    console.log(token);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
