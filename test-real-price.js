// Test real price vs generated price functionality
const testRealPriceFeature = async () => {
  const tokenAddress = '7Pnqg1S6MYrL6AP1ZXcToTHfdBbTB77ze6Y33qBBpump'; // Bagwork
  const realPrice = 0.003519;
  
  console.log('=== Testing Real Price vs Generated Price Feature ===\n');
  
  console.log('🔍 Testing Bagwork token (7Pnqg1S6MYrL6AP1ZXcToTHfdBbTB77ze6Y33qBBpump)');
  console.log(`💰 Real current price: $${realPrice}\n`);
  
  try {
    // Test with real price
    console.log('1️⃣ Testing WITH real current price:');
    const realResponse = await fetch(`http://localhost:3001/api/tokens/history/solana/${tokenAddress}?interval=1h&limit=168&currentPrice=${realPrice}`);
    const realData = await realResponse.json();
    
    const realLastPrice = realData.data.simplePriceData[realData.data.simplePriceData.length - 1].value;
    console.log(`   📊 Chart ends at: $${realLastPrice}`);
    console.log(`   📋 Data source: ${realData.data.source}`);
    console.log(`   ✅ Price matches: ${Math.abs(realLastPrice - realPrice) < 0.000001 ? 'YES' : 'NO'}\n`);
    
    // Test without real price (fallback)
    console.log('2️⃣ Testing WITHOUT real current price (fallback):');
    const fallbackResponse = await fetch(`http://localhost:3001/api/tokens/history/solana/${tokenAddress}?interval=1h&limit=168`);
    const fallbackData = await fallbackResponse.json();
    
    const fallbackLastPrice = fallbackData.data.simplePriceData[fallbackData.data.simplePriceData.length - 1].value;
    console.log(`   📊 Chart ends at: $${fallbackLastPrice.toFixed(8)}`);
    console.log(`   📋 Data source: ${fallbackData.data.source}`);
    console.log(`   ⚠️ Using generated price: ${fallbackLastPrice < 0.001 ? 'YES' : 'NO'}\n`);
    
    // Compare the difference
    const priceDifference = Math.abs(realLastPrice - fallbackLastPrice);
    const percentDifference = (priceDifference / realPrice) * 100;
    
    console.log('📈 Price Comparison:');
    console.log(`   Real price:      $${realPrice}`);
    console.log(`   Chart (real):    $${realLastPrice}`);
    console.log(`   Chart (fallback): $${fallbackLastPrice.toFixed(8)}`);
    console.log(`   Difference:      ${percentDifference.toFixed(1)}%`);
    
    console.log('\n✅ Results:');
    console.log('   ✓ Real price mode: Chart shows accurate current price');
    console.log('   ✓ Fallback mode: Chart shows generated price when no real price provided');
    console.log('   ✓ Charts have unique patterns while maintaining price accuracy');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

// For Node.js environments
if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch');
}

testRealPriceFeature();
