// Exact test using your provided Helius API code structure
// Testing with Bagwork token: 7Pnqg1S6MYrL6AP1ZXcToTHfdBbTB77ze6Y33qBBpump

const fetch = require('node-fetch');

const fetchWalletTransactions = async () => {
  const walletAddress = "7Pnqg1S6MYrL6AP1ZXcToTHfdBbTB77ze6Y33qBBpump"; // Bagwork token address
  const url = `https://api.helius.xyz/v0/addresses/${walletAddress}/transactions?api-key=26240c3d-8cce-414e-95f7-5c0c75c1a2cb`;
  
  console.log('🧪 EXACT HELIUS API TEST - BAGWORK TOKEN');
  console.log('='.repeat(60));
  console.log(`📍 Token Address: ${walletAddress}`);
  console.log(`🔗 API URL: ${url.replace('26240c3d-8cce-414e-95f7-5c0c75c1a2cb', 'API_KEY_HIDDEN')}`);
  console.log();
  
  try {
    console.log('📡 Making API request...');
    const response = await fetch(url);
    
    console.log(`📊 Response Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ Error Response: ${errorText}`);
      return;
    }
    
    const transactions = await response.json();
    
    console.log();
    console.log('✅ SUCCESS! Transaction Data Received:');
    console.log('='.repeat(40));
    console.log(`📦 Total Transactions: ${transactions.length}`);
    
    if (transactions.length === 0) {
      console.log('⚠️  No transactions found for this token address');
      return;
    }
    
    console.log();
    console.log('📋 DETAILED TRANSACTION ANALYSIS:');
    console.log('-'.repeat(40));
    
    // Analyze transaction types
    const transactionTypes = {};
    const sources = {};
    const timestamps = [];
    
    transactions.forEach((tx, index) => {
      // Count transaction types
      const type = tx.type || 'UNKNOWN';
      transactionTypes[type] = (transactionTypes[type] || 0) + 1;
      
      // Count sources
      const source = tx.source || 'UNKNOWN';
      sources[source] = (sources[source] || 0) + 1;
      
      // Collect timestamps
      if (tx.timestamp) {
        timestamps.push(tx.timestamp);
      }
      
      // Show first 3 transactions in detail
      if (index < 3) {
        console.log(`\n🔍 Transaction ${index + 1}:`);
        console.log(`   Signature: ${tx.signature ? tx.signature.substring(0, 16) + '...' : 'N/A'}`);
        console.log(`   Type: ${tx.type || 'UNKNOWN'}`);
        console.log(`   Source: ${tx.source || 'UNKNOWN'}`);
        console.log(`   Timestamp: ${tx.timestamp ? new Date(tx.timestamp * 1000).toISOString() : 'N/A'}`);
        console.log(`   Error: ${tx.transactionError ? 'YES' : 'NO'}`);
        
        // Look for any price-related data
        if (tx.tokenTransfers && tx.tokenTransfers.length > 0) {
          console.log(`   Token Transfers: ${tx.tokenTransfers.length}`);
          tx.tokenTransfers.slice(0, 2).forEach((transfer, i) => {
            console.log(`     Transfer ${i + 1}: ${transfer.tokenAmount || 'N/A'} ${transfer.mint?.substring(0, 8) || 'N/A'}...`);
          });
        }
        
        if (tx.nativeTransfers && tx.nativeTransfers.length > 0) {
          console.log(`   Native Transfers: ${tx.nativeTransfers.length}`);
          tx.nativeTransfers.slice(0, 2).forEach((transfer, i) => {
            console.log(`     Native ${i + 1}: ${transfer.amount || 'N/A'} SOL`);
          });
        }
      }
    });
    
    console.log();
    console.log('📊 TRANSACTION SUMMARY:');
    console.log('-'.repeat(30));
    console.log('Transaction Types:');
    Object.entries(transactionTypes).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });
    
    console.log('\nSources:');
    Object.entries(sources).forEach(([source, count]) => {
      console.log(`   ${source}: ${count}`);
    });
    
    // Time range analysis
    if (timestamps.length > 0) {
      const sortedTimestamps = timestamps.sort((a, b) => a - b);
      const oldestTime = new Date(sortedTimestamps[0] * 1000);
      const newestTime = new Date(sortedTimestamps[sortedTimestamps.length - 1] * 1000);
      const timeSpan = (sortedTimestamps[sortedTimestamps.length - 1] - sortedTimestamps[0]) / (60 * 60 * 24); // days
      
      console.log(`\n🕒 Time Range:`);
      console.log(`   Oldest: ${oldestTime.toISOString()}`);
      console.log(`   Newest: ${newestTime.toISOString()}`);
      console.log(`   Span: ${timeSpan.toFixed(1)} days`);
    }
    
    // Check for DEX/trading activity
    const tradingTransactions = transactions.filter(tx => 
      tx.type === 'SWAP' || 
      (tx.source && ['RAYDIUM', 'JUPITER', 'ORCA', 'SERUM'].includes(tx.source))
    );
    
    console.log(`\n💱 Trading Activity:`);
    console.log(`   DEX/Swap Transactions: ${tradingTransactions.length}`);
    console.log(`   Trading Percentage: ${((tradingTransactions.length / transactions.length) * 100).toFixed(1)}%`);
    
    if (tradingTransactions.length > 0) {
      console.log('\n🎯 Sample Trading Transaction:');
      const sampleTx = tradingTransactions[0];
      console.log(`   Type: ${sampleTx.type}`);
      console.log(`   Source: ${sampleTx.source}`);
      console.log(`   Time: ${new Date(sampleTx.timestamp * 1000).toISOString()}`);
      
      // Try to find any amount/price indicators
      if (sampleTx.tokenTransfers) {
        console.log(`   Token Transfers: ${sampleTx.tokenTransfers.length}`);
      }
      if (sampleTx.nativeTransfers) {
        console.log(`   Native Transfers: ${sampleTx.nativeTransfers.length}`);
      }
    }
    
    console.log();
    console.log('🎯 CONCLUSION:');
    console.log(`   We received ${transactions.length} transactions for Bagwork token`);
    console.log(`   ${tradingTransactions.length} of these are trading-related`);
    console.log(`   This ${tradingTransactions.length > 0 ? 'SHOULD' : 'MIGHT NOT'} provide enough data for price history`);
    
    // Full data dump for debugging (first transaction only)
    if (transactions.length > 0) {
      console.log();
      console.log('🔬 FULL FIRST TRANSACTION DATA:');
      console.log('-'.repeat(40));
      console.log(JSON.stringify(transactions[0], null, 2));
    }
    
  } catch (error) {
    console.error('❌ API Request Failed:', error.message);
  }
};

fetchWalletTransactions();
