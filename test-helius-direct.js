const fetch = require('node-fetch');

async function testHeliusDirectly() {
  try {
    console.log('Testing Helius API directly...\n');
    
    const apiKey = '3608fa10-5cdb-4f82-a5bb-8297a2cd433f';
    const tokenAddress = 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm'; // WIF
    
    // Test the exact endpoint from the docs
    const url = `https://api.helius.xyz/v0/addresses/${tokenAddress}/transactions?api-key=${apiKey}`;
    
    console.log('Making request to:', url.replace(apiKey, 'API_KEY_HIDDEN'));
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers.raw());
    
    if (response.ok) {
      const data = await response.json();
      console.log('Success! Got', Array.isArray(data) ? data.length : 'unknown', 'items');
      console.log('Sample data:', JSON.stringify(data.slice(0, 1), null, 2));
    } else {
      const errorText = await response.text();
      console.log('Error response:', errorText);
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testHeliusDirectly();
