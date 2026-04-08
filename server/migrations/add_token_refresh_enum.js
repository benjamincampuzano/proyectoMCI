const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addTokenRefreshToAuditAction() {
  try {
    console.log('Adding TOKEN_REFRESH to AuditAction enum...');
    
    // Check if TOKEN_REFRESH already exists by trying to use it
    try {
      await prisma.auditLog.create({
        data: {
          userId: 1, // This will fail but we're just testing the enum
          action: 'TOKEN_REFRESH',
          entityType: 'USER',
          entityId: 1
        }
      });
    } catch (error) {
      if (error.message.includes('Invalid value for argument `action`')) {
        console.log('TOKEN_REFRESH not in enum, need to migrate...');
        
        // For PostgreSQL, we need to recreate the enum
        await prisma.$executeRaw`
          -- Create new enum type with TOKEN_REFRESH
          CREATE TYPE "AuditAction_new" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'CONSOLIDATE', 'EXPORT', 'BACKUP_DOWNLOAD', 'BACKUP_RESTORE', 'TOKEN_REFRESH');
        `;
        
        await prisma.$executeRaw`
          -- Update the column to use the new enum type
          ALTER TABLE "AuditLog" ALTER COLUMN "action" TYPE "AuditAction_new" USING "action"::text::"AuditAction_new";
        `;
        
        await prisma.$executeRaw`
          -- Drop the old enum type
          DROP TYPE "AuditAction";
        `;
        
        await prisma.$executeRaw`
          -- Rename the new enum type to the original name
          ALTER TYPE "AuditAction_new" RENAME TO "AuditAction";
        `;
        
        console.log('Successfully added TOKEN_REFRESH to AuditAction enum');
      } else {
        console.log('TOKEN_REFRESH already exists in enum');
      }
    }
    
  } catch (error) {
    console.error('Error adding TOKEN_REFRESH to enum:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  addTokenRefreshToAuditAction()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { addTokenRefreshToAuditAction };
