const heliusService = require('./heliusService');

async function testBagworkHourly() {
  console.log('Testing Bagwork 1-hour price history (60 minutes)...');
  
  const tokenAddress = '7Pnqg1S6MYrL6AP1ZXcToTHfdBbTB77ze6Y33qBBpump';
  
  try {
    const result = await heliusService.getHistoricalPriceData(tokenAddress, {
      timeframe: '1m',
      limit: 60,
      currentPrice: 0.001
    });
    
    console.log('\n=== BAGWORK HOURLY RESULTS ===');
    console.log('Success:', result.success);
    console.log('Data points:', result.data_points);
    console.log('Real transactions:', result.metadata.real_transactions);
    console.log('Source:', result.source);
    
    if (result.simplePriceData && result.simplePriceData.length > 0) {
      console.log('\nFirst 10 minute-by-minute prices:');
      result.simplePriceData.slice(0, 10).forEach((point, i) => {
        const date = new Date(point.time * 1000);
        console.log(`${i+1}. ${date.toLocaleTimeString()} - $${point.value.toFixed(8)}`);
      });
      
      console.log('\nLast 10 minute-by-minute prices:');
      result.simplePriceData.slice(-10).forEach((point, i) => {
        const date = new Date(point.time * 1000);
        const position = result.simplePriceData.length - 9 + i;
        console.log(`${position}. ${date.toLocaleTimeString()} - $${point.value.toFixed(8)}`);
      });
      
      const prices = result.simplePriceData.map(p => p.value);
      console.log(`\nPrice range: $${Math.min(...prices).toFixed(8)} - $${Math.max(...prices).toFixed(8)}`);
    }
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

testBagworkHourly();
