const prisma = require('./server/utils/database');
const { searchUsers } = require('./server/controllers/userController');

const testSearch = async () => {
    try {
        console.log('Testing searchUsers with excludeRoles and empty search...');
        
        // Mock request for an ADMIN user
        const req = {
            query: {
                search: '',
                excludeRoles: 'PASTOR,ADMIN'
            },
            user: {
                id: 1, // Assuming admin user ID 1
                roles: ['ADMIN']
            }
        };

        const res = {
            json: (data) => {
                console.log('Success! Received results:', data.length);
                if (data.length > 0) {
                    const roles = data.flatMap(u => u.roles.map(r => r.role.name));
                    const containsExcluded = roles.some(r => ['PASTOR', 'ADMIN'].includes(r));
                    console.log('Contains excluded roles?', containsExcluded);
                }
            },
            status: (code) => ({
                json: (err) => {
                    console.error(`Failed with status ${code}:`, err.message);
                }
            })
        };

        await searchUsers(req, res);
        
    } catch (error) {
        console.error('Test error:', error);
    } finally {
        await prisma.$disconnect();
    }
};

testSearch();
