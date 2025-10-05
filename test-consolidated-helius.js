// Test script for consolidated Helius price data integration
const heliusService = require('./heliusService');

// Test with a popular Solana token (WIF)
const testTokenAddress = "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr";

async function testConsolidatedHelius() {
  console.log('🧪 Testing Consolidated Helius Price Data Integration');
  console.log('='.repeat(60));
  
  try {
    console.log(`\n📊 Testing token: ${testTokenAddress.substring(0, 8)}...`);
    
    // Test the consolidated method
    const result = await heliusService.getHistoricalPriceData(testTokenAddress, {
      timeframe: '1h',
      limit: 24,
      currentPrice: 0.002
    });
    
    console.log('\n✅ CONSOLIDATED HELIUS RESULTS:');
    console.log('Success:', result.success);
    console.log('Data points:', result.data_points);
    console.log('Source:', result.source);
    console.log('Current price:', result.current_price);
    console.log('Real transactions:', result.metadata.real_transactions);
    
    if (result.chartData && result.chartData.length > 0) {
      console.log('\n📈 Sample chart data points:');
      result.chartData.slice(0, 3).forEach((point, i) => {
        const date = new Date(point.time * 1000).toISOString();
        console.log(`  ${i + 1}. Time: ${date}, Price: $${point.value.toFixed(6)}`);
      });
      
      if (result.chartData.length > 3) {
        console.log(`  ... and ${result.chartData.length - 3} more points`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Test different timeframes
async function testMultipleTimeframes() {
  console.log('\n🔄 Testing Multiple Timeframes');
  console.log('-'.repeat(40));
  
  const timeframes = ['1m', '5m', '1h', '1d'];
  
  for (const timeframe of timeframes) {
    try {
      console.log(`\nTesting ${timeframe} timeframe...`);
      
      const result = await heliusService.getHistoricalPriceData(testTokenAddress, {
        timeframe: timeframe,
        limit: 10,
        currentPrice: 0.002
      });
      
      console.log(`✅ ${timeframe}: ${result.data_points} points, source: ${result.source}`);
      
    } catch (error) {
      console.log(`❌ ${timeframe}: ${error.message}`);
    }
  }
}

// Run tests
async function runAllTests() {
  await testConsolidatedHelius();
  await testMultipleTimeframes();
  
  console.log('\n🏁 Testing complete!');
  console.log('\nTo test with frontend:');
  console.log('1. Start backend: npm run dev (in backend folder)');
  console.log('2. Start frontend: npm run dev (in frontend folder)');
  console.log('3. Look for "CONSOLIDATED" logs in browser console');
}

runAllTests().catch(console.error);
