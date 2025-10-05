// Test the REAL price extraction with Bagwork token
const heliusService = require('./heliusService');

async function testRealPriceExtraction() {
  const bagworkToken = "7Pnqg1S6MYrL6AP1ZXcToTHfdBbTB77ze6Y33qBBpump";
  
  console.log('🧪 TESTING REAL PRICE EXTRACTION FROM BAGWORK TOKEN');
  console.log('='.repeat(60));
  
  try {
    // Test the consolidated method with real price extraction
    const result = await heliusService.getHistoricalPriceData(bagworkToken, {
      timeframe: '1h',
      limit: 20,
      currentPrice: 0.003729 // Price from your DexScreener screenshot
    });
    
    console.log('\n✅ CONSOLIDATED RESULT:');
    console.log(`Success: ${result.success}`);
    console.log(`Data points: ${result.data_points}`);
    console.log(`Source: ${result.source}`);
    console.log(`Real transactions: ${result.metadata.real_transactions}`);
    
    if (result.chartData && result.chartData.length > 0) {
      console.log('\n📈 REAL PRICE DATA POINTS:');
      result.chartData.forEach((point, i) => {
        const date = new Date(point.time * 1000).toISOString();
        console.log(`  ${i + 1}. ${date}: $${point.value.toFixed(8)}`);
      });
      
      // Check if we got real prices (non-generated)
      const hasRealPrices = result.source.includes('Real');
      console.log(`\n🎯 REAL PRICE STATUS: ${hasRealPrices ? '✅ REAL DATA' : '❌ GENERATED DATA'}`);
      
      if (hasRealPrices) {
        const prices = result.chartData.map(p => p.value);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
        
        console.log(`📊 Price Range:`);
        console.log(`   Min: $${minPrice.toFixed(8)}`);
        console.log(`   Max: $${maxPrice.toFixed(8)}`);
        console.log(`   Avg: $${avgPrice.toFixed(8)}`);
        console.log(`   DexScreener comparison: $0.003729`);
        console.log(`   Price similarity: ${Math.abs(avgPrice - 0.003729) < 0.001 ? '✅ CLOSE' : '⚠️ DIFFERENT'}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testRealPriceExtraction();
