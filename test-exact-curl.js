const fetch = require('node-fetch');

async function testExactCurl() {
  console.log('=== Testing Exact Curl Command ===');
  
  // Use the exact same token from your successful curl command
  const apiKey = '3608fa10-5cdb-4f82-a5bb-8297a2cd433f';
  const token = '86xCnPeV69n6t3DnyGvkKobf9FdN2H9oiVDdaMpo2MMY';
  const url = `https://api.helius.xyz/v0/addresses/${token}/transactions?api-key=${apiKey}`;
  
  console.log('Fetching:', url.replace(apiKey, 'API_KEY_HIDDEN'));
  
  try {
    const startTime = Date.now();
    const response = await fetch(url);
    const endTime = Date.now();
    
    console.log(`Response time: ${endTime - startTime}ms`);
    console.log('Status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Success!');
      console.log('- Transactions:', data.length);
      
      if (data.length > 0) {
        console.log('- First transaction:', {
          type: data[0].type,
          source: data[0].source,
          timestamp: data[0].timestamp,
          signature: data[0].signature?.substring(0, 20) + '...'
        });
      }
    } else {
      const error = await response.text();
      console.log('❌ Error:', error);
    }
    
  } catch (error) {
    console.error('❌ Network Error:', error.message);
  }
}

testExactCurl();
