const axios = require('axios');

async function testPastorNetwork() {
  try {
    // Primero obtener la lista de pastores para ver sus IDs
    const pastoresResponse = await axios.get('http://localhost:5000/api/network/pastores', {
      headers: { 'Authorization': 'Bearer fake-token-for-testing' }
    }).catch(() => {
      console.log('Intentando sin autenticación para desarrollo...');
      return axios.get('http://localhost:5000/api/network/pastores');
    });

    console.log('=== PASTORES DISPONIBLES ===');
    pastoresResponse.data.forEach(pastor => {
      console.log(`ID: ${pastor.id}, Nombre: ${pastor.fullName}, Es Pareja: ${pastor.isCouple}`);
      if (pastor.partners) {
        console.log(`  Partners: ${pastor.partners.map(p => p.fullName).join(' & ')}`);
      }
    });

    // Probar el network endpoint para el primer pastor
    if (pastoresResponse.data.length > 0) {
      const firstPastor = pastoresResponse.data[0];
      console.log(`\n=== PROBANDO NETWORK ENDPOINT PARA ${firstPastor.fullName} (ID: ${firstPastor.id}) ===`);
      
      const networkResponse = await axios.get(`http://localhost:5000/api/network/${firstPastor.id}`)
        .catch(() => {
          return axios.get(`http://localhost:5000/api/network/${firstPastor.id}`);
        });

      console.log('Network Response:', JSON.stringify(networkResponse.data, null, 2));

      // Verificar si tiene partners
      if (networkResponse.data.partners) {
        console.log('\n=== PARTNERS EN NETWORK RESPONSE ===');
        console.log('Partners:', networkResponse.data.partners.map(p => p.fullName).join(' & '));
      } else {
        console.log('\n❌ NO HAY PARTNERS EN NETWORK RESPONSE');
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testPastorNetwork();
