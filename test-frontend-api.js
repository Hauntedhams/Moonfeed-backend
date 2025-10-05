// Test the exact API endpoint the frontend is calling
const fetch = require('node-fetch');

async function testAPIEndpoint() {
  console.log('=== Testing Frontend API Endpoint ===\n');
  
  const buckToken = {
    address: 'FLqmVrv6cp7icjobpRMQJMEyjF3kF84QmC4HXpySpump',
    currentPrice: 0.001702700918392338
  };
  
  // This is the exact URL the frontend is calling
  const url = `http://localhost:3001/api/tokens/history/solana/${buckToken.address}?interval=1h&limit=168&currentPrice=${buckToken.currentPrice}`;
  
  console.log('🔍 Testing URL:', url);
  
  try {
    const response = await fetch(url);
    console.log('📊 Status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Response structure:');
      console.log('   success:', data.success);
      console.log('   data keys:', Object.keys(data.data || {}));
      console.log('   simplePriceData length:', data.data?.simplePriceData?.length || 0);
      console.log('   source:', data.data?.source);
      console.log('   realTransactions:', data.data?.realTransactions);
      
      if (data.data?.simplePriceData?.length > 0) {
        console.log('\n📈 Sample price data:');
        const sample = data.data.simplePriceData.slice(0, 3);
        sample.forEach((point, i) => {
          console.log(`   ${i+1}. time: ${point.time}, value: ${point.value}, normalized: ${point.normalized}`);
        });
      }
    } else {
      const errorText = await response.text();
      console.log('❌ Error:', errorText);
    }
  } catch (error) {
    console.log('❌ Network error:', error.message);
    console.log('💡 Is the backend server running? Try: node server.js');
  }
}

testAPIEndpoint();
