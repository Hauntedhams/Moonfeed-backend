const fetch = require('node-fetch');

async function testSupeSimple() {
  console.log('=== Super Simple Direct Test ===');
  
  const apiKey = '3608fa10-5cdb-4f82-a5bb-8297a2cd433f';
  const buckToken = 'FLqmVrv6cp7icjobpRMQJMEyjF3kF84QmC4HXpySpump';
  const url = `https://api.helius.xyz/v0/addresses/${buckToken}/transactions?api-key=${apiKey}&limit=10`;
  
  console.log('Fetching:', url.replace(apiKey, 'API_KEY_HIDDEN'));
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('✅ Success!');
    console.log('- Transactions:', data.length);
    console.log('- First transaction type:', data[0]?.type);
    console.log('- First transaction source:', data[0]?.source);
    console.log('- First transaction timestamp:', data[0]?.timestamp);
    
    // See if we can extract price data
    let swapCount = 0;
    for (const tx of data) {
      if (tx.type === 'SWAP') {
        swapCount++;
        console.log(`- SWAP #${swapCount}: ${tx.source} at ${new Date(tx.timestamp * 1000).toISOString()}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testSupeSimple();
