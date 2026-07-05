const axios = require('axios');

async function test() {
    try {
        const res = await axios.post('http://localhost:5000/api/consolidar/church-attendance', {
            date: new Date().toISOString().split('T')[0],
            attendances: [
                { userId: 1, status: 'PRESENTE' }
            ]
        });
        console.log("Success:", res.data);
    } catch (err) {
        console.error("Error:", err.response ? err.response.data : err.message);
    }
}

test();
