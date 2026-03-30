const axios = require('axios');

async function testNetworkAPI() {
  try {
    // Primero intentar hacer login para obtener token
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'pastor_margarita@gmail.com',
      password: 'password123' // Necesitamos saber la contraseña real
    }).catch(async (err) => {
      // Si falla el login, intentar con otro usuario
      console.log('Login failed with Margarita, trying with Octavio...');
      return await axios.post('http://localhost:5000/api/auth/login', {
        email: 'pastor_octavio@gmail.com', 
        password: 'password123'
      }).catch(() => {
        console.log('Login failed. Trying without authentication...');
        return null;
      });
    });

    let token = null;
    if (loginResponse && loginResponse.data.token) {
      token = loginResponse.data.token;
      console.log('Login successful, token obtained');
    }

    // Probar el endpoint de red
    const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
    
    const networkResponse = await axios.get('http://localhost:5000/api/network', config);
    
    console.log('=== NETWORK API RESPONSE ===');
    console.log(JSON.stringify(networkResponse.data, null, 2));

    // Buscar específicamente la información de los pastores
    function findCouple(node, targetNames) {
      if (node.partners && node.partners.some(p => 
        targetNames.some(name => p.fullName && p.fullName.toLowerCase().includes(name.toLowerCase()))
      )) {
        return node;
      }
      
      if (node.disciples) {
        for (const disciple of node.disciples) {
          const found = findCouple(disciple, targetNames);
          if (found) return found;
        }
      }
      
      return null;
    }

    const couple = findCouple(networkResponse.data, ['Margarita', 'Octavio']);
    
    if (couple) {
      console.log('\n=== PAREJA ENCONTRADA ===');
      console.log('Partners:', couple.partners.map(p => p.fullName).join(' y '));
      console.log('Roles:', couple.roles);
    } else {
      console.log('\n=== PAREJA NO ENCONTRADA ===');
    }

  } catch (error) {
    console.error('Error testing network API:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testNetworkAPI();
