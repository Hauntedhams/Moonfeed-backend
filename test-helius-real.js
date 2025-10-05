const heliusService = require('./heliusService');

async function testRealTransactionData() {
  console.log('=== Testing Real Transaction Data from Helius ===\n');
  
  // Test with a few different popular tokens
  const testTokens = [
    {
      name: 'Bagwork',
      address: '7Pnqg1S6MYrL6AP1ZXcToTHfdBbTB77ze6Y33qBBpump',
      currentPrice: 0.003519
    },
    {
      name: 'Popular SOL Token',
      address: 'So11111111111111111111111111111111111111112', // Wrapped SOL
      currentPrice: 250.50
    },
    {
      name: 'Random Pump.fun Token',
      address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // Bonk
      currentPrice: 0.000045
    }
  ];
  
  for (const token of testTokens) {
    console.log(`🔍 Testing ${token.name} (${token.address.substring(0, 8)}...)`);
    console.log(`💰 Expected current price: $${token.currentPrice}`);
    
    try {
      // Test getting transaction history directly
      console.log('   📡 Fetching transaction history...');
      const transactions = await heliusService.getTokenTransactionHistory(token.address, { limit: 100 });
      
      if (transactions && transactions.length > 0) {
        console.log(`   ✅ Found ${transactions.length} real transactions`);
        console.log(`   📊 Sample transactions:`);
        
        // Show first few transactions
        for (let i = 0; i < Math.min(3, transactions.length); i++) {
          const tx = transactions[i];
          const date = new Date(tx.timestamp).toISOString();
          console.log(`      ${i+1}. $${tx.price.toFixed(8)} at ${date} (vol: ${tx.volume.toFixed(2)})`);
        }
      } else {
        console.log('   ❌ No real transactions found');
      }
      
      // Test getting historical price data with real current price
      console.log('   📈 Testing historical price data...');
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
        
        // Show first and last data points
        if (priceData.historical_data.length > 0) {
          const first = priceData.historical_data[0];
          const last = priceData.historical_data[priceData.historical_data.length - 1];
          console.log(`   📅 Time range: ${new Date(first.timestamp).toLocaleString()} to ${new Date(last.timestamp).toLocaleString()}`);
          console.log(`   📈 Price range: $${first.price.toFixed(8)} to $${last.price.toFixed(8)}`);
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

testRealTransactionData().catch(console.error);
