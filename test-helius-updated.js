const heliusService = require('./heliusService');

async function testUpdatedHeliusAPI() {
  console.log('=== Testing Updated Helius API Implementation ===\n');
  
  // Test with a popular token that should have lots of transactions
  const testTokens = [
    {
      name: 'Wrapped SOL',
      address: 'So11111111111111111111111111111111111111112',
      currentPrice: 250.50
    },
    {
      name: 'Bonk Token',
      address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
      currentPrice: 0.000045
    },
    {
      name: 'Test Pump.fun Token',
      address: '7Pnqg1S6MYrL6AP1ZXcToTHfdBbTB77ze6Y33qBBpump',
      currentPrice: 0.003519
    }
  ];
  
  for (const token of testTokens) {
    console.log(`🔍 Testing ${token.name} (${token.address.substring(0, 8)}...)`);
    console.log(`💰 Expected current price: $${token.currentPrice}`);
    
    try {
      // Test getting transaction history directly with new format
      console.log('   📡 Fetching transaction history with updated API...');
      const startTime = Date.now();
      
      const transactions = await heliusService.getTokenTransactionHistory(token.address, { limit: 50 });
      
      const endTime = Date.now();
      console.log(`   ⏱️  API response time: ${endTime - startTime}ms`);
      
      if (transactions && transactions.length > 0) {
        console.log(`   ✅ Found ${transactions.length} real transactions`);
        console.log(`   📊 Sample transactions:`);
        
        // Show first few transactions with more detail
        for (let i = 0; i < Math.min(3, transactions.length); i++) {
          const tx = transactions[i];
          const date = new Date(tx.timestamp).toISOString();
          console.log(`      ${i+1}. $${tx.price.toFixed(8)} | ${tx.source} | ${tx.type || 'UNKNOWN'} | ${date}`);
          console.log(`         Vol: ${tx.volume.toFixed(2)} | Hash: ${tx.txHash.substring(0, 8)}...`);
        }
      } else {
        console.log('   ❌ No real transactions found');
      }
      
      // Test getting historical price data
      console.log('   📈 Testing historical price data generation...');
      const priceData = await heliusService.getHistoricalPriceData(token.address, {
        timeframe: '1h',
        limit: 50,
        currentPrice: token.currentPrice
      });
      
      if (priceData && priceData.success) {
        console.log(`   ✅ Historical data: ${priceData.metadata.data_points} points`);
        console.log(`   📊 Real transactions used: ${priceData.metadata.real_transactions}`);
        console.log(`   🏷️  Data source: ${priceData.source}`);
        console.log(`   💲 Final price: $${priceData.current_price}`);
        console.log(`   🎯 Price accuracy: ${priceData.current_price === token.currentPrice ? 'EXACT' : 'DIFFERS'}`);
        
        // Show price trend
        if (priceData.historical_data.length > 0) {
          const first = priceData.historical_data[0];
          const last = priceData.historical_data[priceData.historical_data.length - 1];
          const change = ((last.price - first.price) / first.price) * 100;
          console.log(`   📈 Price trend: ${change > 0 ? '+' : ''}${change.toFixed(2)}% over period`);
        }
      } else {
        console.log('   ❌ Failed to get historical price data');
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    console.log(''); // Empty line for separation
  }
}

testUpdatedHeliusAPI().catch(console.error);
