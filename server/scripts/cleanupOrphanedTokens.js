const prisma = require('../utils/database');

// Clean orphaned refresh tokens (tokens without valid user)
const cleanupOrphanedTokens = async () => {
    try {
        // Find all refresh tokens and check if their users exist
        const allTokens = await prisma.refreshToken.findMany({
            select: {
                id: true,
                userId: true
            }
        });

        // Get all valid user IDs
        const validUserIds = await prisma.user.findMany({
            select: {
                id: true
            }
        }).then(users => users.map(u => u.id));

        // Filter tokens where userId doesn't exist in User table
        const orphanedTokens = allTokens.filter(token => 
            token.userId && !validUserIds.includes(token.userId)
        );

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