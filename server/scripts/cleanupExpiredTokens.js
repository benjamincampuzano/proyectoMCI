const prisma = require('../utils/database');

// Clean expired refresh tokens
const cleanupExpiredTokens = async () => {
    try {
        const result = await prisma.refreshToken.deleteMany({
            where: {
                expiresAt: {
                    lt: new Date()
                }
            }
        });
        
        console.log(`✅ Cleaned up ${result.count} expired refresh tokens`);
        return result.count;
    } catch (error) {
        console.error('❌ Error cleaning up expired tokens:', error);
        throw error;
    }
};

// Run cleanup if called directly
if (require.main === module) {
    cleanupExpiredTokens()
        .then(count => {
            console.log(`Cleanup completed. Removed ${count} expired tokens.`);
            process.exit(0);
        })
        .catch(error => {
            console.error('Cleanup failed:', error);
            process.exit(1);
        });
}

module.exports = { cleanupExpiredTokens };
