const fetch = require('node-fetch');

async function testBasicHeliusConnectivity() {
  console.log('=== Testing Basic Helius API Connectivity ===\n');
  
  const apiKey = process.env.HELIUS_API_KEY || '3608fa10-5cdb-4f82-a5bb-8297a2cd433f';
  
  // Test a simple, fast endpoint first
  const testCases = [
    {
      name: 'Health Check',
      url: `https://api.helius.xyz/v0/health?api-key=${apiKey}`,
      timeout: 5000
    },
    {
      name: 'Simple Transaction Query (limit 1)',
      url: `https://api.helius.xyz/v0/addresses/So11111111111111111111111111111111111111112/transactions?api-key=${apiKey}&limit=1`,
      timeout: 10000
    }
  ];
  
  for (const test of testCases) {
    console.log(`🔍 Testing: ${test.name}`);
    console.log(`📡 URL: ${test.url.replace(apiKey, 'API_KEY_HIDDEN')}`);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), test.timeout);
      
      const startTime = Date.now();
      
      const response = await fetch(test.url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const endTime = Date.now();
      
      console.log(`⏱️  Response time: ${endTime - startTime}ms`);
      console.log(`📊 Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Success!`);
        
        if (Array.isArray(data)) {
          console.log(`📋 Array with ${data.length} items`);
          if (data.length > 0) {
            console.log(`📄 Sample item keys: ${Object.keys(data[0]).slice(0, 5).join(', ')}...`);
          }
        } else if (typeof data === 'object') {
          console.log(`📋 Object with keys: ${Object.keys(data).slice(0, 5).join(', ')}...`);
        }
      } else {
        const errorText = await response.text();
        console.log(`❌ Error: ${errorText.substring(0, 200)}...`);
      }
      
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log(`⏰ Request timed out after ${test.timeout}ms`);
      } else {
        console.log(`❌ Request failed: ${error.message}`);
      }
    }
    
    console.log(''); // Empty line
  }
}

testBasicHeliusConnectivity().catch(console.error);
