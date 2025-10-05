const heliusService = require('./heliusService');

async function testBuckToken() {
  console.log('=== Testing BUCK Token with Simplified Helius API ===\n');
  
  const buckToken = {
    name: 'GME MASCOT (BUCK)',
    address: 'FLqmVrv6cp7icjobpRMQJMEyjF3kF84QmC4HXpySpump',
    currentPrice: 0.001702700918392338
  };
  
  console.log(`🔍 Testing ${buckToken.name}`);
  console.log(`💰 Current price: $${buckToken.currentPrice}`);
  console.log(`📍 Address: ${buckToken.address}`);
  
  try {
    console.log('\n1️⃣ Testing simple transaction fetch...');
    const startTime = Date.now();
    
    const transactions = await heliusService.getTokenTransactionHistory(buckToken.address, { limit: 10 });
    
    const endTime = Date.now();
    console.log(`⏱️  Request completed in ${endTime - startTime}ms`);
    
    if (transactions && transactions.length > 0) {
      console.log(`✅ Success! Got ${transactions.length} transactions`);
      console.log('\n📊 Sample transactions:');
      
      for (let i = 0; i < Math.min(3, transactions.length); i++) {
        const tx = transactions[i];
        console.log(`   ${i+1}. Signature: ${tx.signature ? tx.signature.substring(0, 20) + '...' : 'N/A'}`);
        console.log(`      Timestamp: ${tx.timestamp ? new Date(tx.timestamp * 1000).toISOString() : 'N/A'}`);
        console.log(`      Type: ${tx.type || 'N/A'}`);
        console.log(`      Source: ${tx.source || 'N/A'}`);
        console.log(`      Success: ${!tx.transactionError ? 'YES' : 'NO'}`);
        console.log('');
      }
    } else {
      console.log('❌ No transactions found');
    }
    
    console.log('\n2️⃣ Testing historical price data...');
    const priceData = await heliusService.getHistoricalPriceData(buckToken.address, {
      timeframe: '1h',
      limit: 50,
      currentPrice: buckToken.currentPrice
    });
    
    if (priceData && priceData.success) {
      console.log(`✅ Historical data success!`);
      console.log(`📊 Data points: ${priceData.metadata.data_points}`);
      console.log(`🏷️  Source: ${priceData.source}`);
      console.log(`💲 Final price: $${priceData.current_price}`);
      console.log(`🔄 Real transactions: ${priceData.metadata.real_transactions}`);
    } else {
      console.log('❌ Failed to get historical data');
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    console.log(`🕐 Error occurred after: ${Date.now() - Date.now()}ms`);
  }
}

testBuckToken().catch(console.error);
