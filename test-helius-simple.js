const fetch = require('node-fetch');

async function testSimpleHelius() {
  console.log('=== Testing Simple Helius API (like their docs) ===\n');
  
  const apiKey = '3608fa10-5cdb-4f82-a5bb-8297a2cd433f';
  const address = '86xCnPeV69n6t3DnyGvkKobf9FdN2H9oiVDdaMpo2MMY';
  
  // Exact same request as the cURL example
  const url = `https://api.helius.xyz/v0/addresses/${address}/transactions?api-key=${apiKey}`;
  
  console.log('Making simple request to:', url.replace(apiKey, 'API_KEY_HIDDEN'));
  console.log('Start time:', new Date().toISOString());
  
  try {
    const startTime = Date.now();
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    const endTime = Date.now();
    console.log(`Response time: ${endTime - startTime}ms`);
    console.log('Status:', response.status, response.statusText);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Success! Got ${Array.isArray(data) ? data.length : 'unknown'} transactions`);
      
      if (Array.isArray(data) && data.length > 0) {
        console.log('\n📋 First transaction sample:');
        const first = data[0];
        console.log('  Signature:', first.signature?.substring(0, 20) + '...');
        console.log('  Timestamp:', first.timestamp);
        console.log('  Type:', first.type);
        console.log('  Source:', first.source);
        console.log('  Description:', first.description?.substring(0, 50) + '...');
        console.log('  Token Transfers:', first.tokenTransfers?.length || 0);
        console.log('  Native Transfers:', first.nativeTransfers?.length || 0);
      }
    } else {
      const errorText = await response.text();
      console.log('❌ Error:', errorText);
    }
    
  } catch (error) {
    console.log('❌ Request failed:', error.message);
  }
}

testSimpleHelius();
