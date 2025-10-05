const heliusService = require('./heliusService');

async function testBagwork() {
  const tokenAddress = '7Pnqg1S6MYrL6AP1ZXcToTHfdBbTB77ze6Y33qBBpump';
  
  console.log('Testing Bagwork price history with simplified logic...');
  console.log('Token:', tokenAddress);
  
  try {
    // Test with 5m intervals for 1D view (like DexScreener)
    const result = await heliusService.getHistoricalPriceData(tokenAddress, {
      timeframe: '5m',
      limit: 20, // Just 20 points for testing
      currentPrice: 0.001
    });
    
    console.log('\n=== RESULT ===');
    console.log('Success:', result.success);
    console.log('Data points:', result.data_points);
    console.log('Source:', result.source);
    console.log('Real transactions found:', result.metadata.real_transactions);
    
    if (result.simplePriceData && result.simplePriceData.length > 0) {
      console.log('\nFirst 5 price points:');
      result.simplePriceData.slice(0, 5).forEach((point, i) => {
        const date = new Date(point.time * 1000);
        console.log(`  ${i+1}. ${date.toLocaleTimeString()} - $${point.value.toFixed(8)}`);
      });
    }
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

testBagwork();
