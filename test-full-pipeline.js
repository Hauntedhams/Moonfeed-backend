const heliusService = require('./heliusService');

async function testFullPipeline() {
  console.log('=== Testing Full Pipeline: Real Helius Data to Chart Format ===\n');
  
  const buckToken = 'FLqmVrv6cp7icjobpRMQJMEyjF3kF84QmC4HXpySpump';
  const currentPrice = 0.001234; // Example current price for BUCK
  
  try {
    // Get historical data with real current price
    const data = await heliusService.getHistoricalPriceData(buckToken, { 
      timeframe: '1h', 
      limit: 50, 
      currentPrice: currentPrice 
    });
    
    console.log('✅ Historical Data Result:');
    console.log('   - Success:', data.success);
    console.log('   - Source:', data.source);
    console.log('   - Real transactions:', data.metadata.real_transactions);
    console.log('   - Data points:', data.metadata.data_points);
    console.log('   - Current price:', data.current_price);
    
    // Convert to chart format
    const chartData = heliusService.getSimplePriceArray(data);
    console.log('\n📊 Chart Data:');
    console.log('   - Chart points:', chartData.length);
    
    if (chartData.length > 0) {
      console.log('   - First point:', {
        time: new Date(chartData[0].time * 1000).toISOString(),
        price: chartData[0].value,
        normalized: chartData[0].normalized.toFixed(2)
      });
      console.log('   - Last point:', {
        time: new Date(chartData[chartData.length-1].time * 1000).toISOString(),
        price: chartData[chartData.length-1].value,
        normalized: chartData[chartData.length-1].normalized.toFixed(2)
      });
      
      const prices = chartData.map(p => p.value);
      console.log('   - Price range: $' + Math.min(...prices).toFixed(8) + ' to $' + Math.max(...prices).toFixed(8));
      console.log('   - Ends at real price?', chartData[chartData.length-1].value === currentPrice ? 'YES' : 'NO');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testFullPipeline();
