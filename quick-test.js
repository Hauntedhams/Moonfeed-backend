const fetch = require('node-fetch');

async function quickTest() {
  try {
    console.log('Testing Helius API...');
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 8000);
    
    const response = await fetch('https://api.helius.xyz/v0/addresses/7Pnqg1S6MYrL6AP1ZXcToTHfdBbTB77ze6Y33qBBpump/transactions?api-key=3608fa10-5cdb-4f82-a5bb-8297a2cd433f&limit=3', {
      signal: controller.signal
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('SUCCESS! Got', Array.isArray(data) ? data.length : 'unknown', 'items');
      if (Array.isArray(data) && data.length > 0) {
        console.log('Sample transaction:', {
          signature: data[0].signature,
          timestamp: data[0].timestamp,
          type: data[0].type,
          source: data[0].source
        });
      }
    } else {
      console.log('Error:', response.status, await response.text());
    }
  } catch (error) {
    console.log('Failed:', error.name === 'AbortError' ? 'Timeout after 8s' : error.message);
  }
}

quickTest();
