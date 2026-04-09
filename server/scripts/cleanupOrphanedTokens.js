const prisma = require('../utils/database');

// Clean orphaned refresh tokens (tokens without valid user)
const cleanupOrphanedTokens = async () => {
    try {
        // Find tokens where userId doesn't exist in User table
        const orphanedTokens = await prisma.refreshToken.findMany({
            where: {
                user: null
            },
            select: {
                id: true
            }
        });

        if (orphanedTokens.length > 0) {
            const tokenIds = orphanedTokens.map(t => t.id);
            await prisma.refreshToken.deleteMany({
                where: {
                    id: {
                        in: tokenIds
                    }
                }
            });
            console.log(`✅ Cleaned up ${tokenIds.length} orphaned refresh tokens`);
            return tokenIds.length;
        }

        console.log('✅ No orphaned refresh tokens found');
        return 0;
    } catch (error) {
        console.error('❌ Error cleaning up orphaned tokens:', error);
        throw error;
    }
};

// Run cleanup if called directly
if (require.main === module) {
    cleanupOrphanedTokens()
        .then(count => {
            console.log(`Cleanup completed. Removed ${count} orphaned tokens.`);
            process.exit(0);
        })
        .catch(error => {
            console.error('Cleanup failed:', error);
            process.exit(1);
        });
}

module.exports = { cleanupOrphanedTokens };