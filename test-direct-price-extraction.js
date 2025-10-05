// Test price extraction directly with the transaction data we know exists
const heliusService = require('./heliusService');

// This is the first transaction from our successful API call
const sampleTransaction = {
  "description": "",
  "type": "UNKNOWN",
  "source": "JUPITER",
  "fee": 301073,
  "signature": "4sAXgVLmUc7B7v5kSA63b5MWSNSNQXNcGGg5jZGJLUpHurL3JL6kRnHTDjg1KaqHmqA2vwd8wtTpoiwvPdbxy1jE",
  "timestamp": 1759353476,
  "tokenTransfers": [
    {
      "fromTokenAccount": "FsTawEzfNstmbeBNmtFw83xwRK9Cz2L2G1rnhP6wPJHJ",
      "toTokenAccount": "6T4wC2D36SoNgPL8pb42qqvKu97cac3dCLyZyNbPFAqT",
      "fromUserAccount": "69yhtoJR4JYPPABZcSNkzuqbaFbwHsCkja1sP1Q2aVT5",
      "toUserAccount": "3qnxuKZc3oF5N5yzYCNs9S5tuurk6QYhPqaf7ny9DapT",
      "tokenAmount": 1663.291783,
      "mint": "7Pnqg1S6MYrL6AP1ZXcToTHfdBbTB77ze6Y33qBBpump",
      "tokenStandard": "Fungible"
    },
    {
      "fromTokenAccount": "H6TBhSGnWaba55kzLy758TVZWc8dLVL4Z7hcR2Hzszb8",
      "toTokenAccount": "qqdJ4z1yu4sTbAitwXZsGNDoGZFgL2HfVKSVwAXWCfq",
      "fromUserAccount": "3qnxuKZc3oF5N5yzYCNs9S5tuurk6QYhPqaf7ny9DapT",
      "toUserAccount": "69yhtoJR4JYPPABZcSNkzuqbaFbwHsCkja1sP1Q2aVT5",
      "tokenAmount": 0.025543926,
      "mint": "So11111111111111111111111111111111111111112",
      "tokenStandard": "Fungible"
    }
  ],
  "nativeTransfers": [
    {
      "fromUserAccount": "5evPDdeStGRrExj4g3FQRSCyKNj9UAq7bY9PQt8PxuMm",
      "toUserAccount": "Daj1Ui3uiLUNvqfiEpj8DYj9BT4LHEpQ3UMFyKbrutUk",
      "amount": 2039280
    }
  ],
  "transactionError": null
};

function testPriceExtraction() {
  console.log('🧪 TESTING PRICE EXTRACTION LOGIC DIRECTLY');
  console.log('='.repeat(60));
  
  const bagworkToken = "7Pnqg1S6MYrL6AP1ZXcToTHfdBbTB77ze6Y33qBBpump";
  
  console.log(`📊 Target Token: ${bagworkToken}`);
  console.log('📋 Transaction Data:');
  console.log(`   Type: ${sampleTransaction.type}`);
  console.log(`   Source: ${sampleTransaction.source}`);
  console.log(`   Token Transfers: ${sampleTransaction.tokenTransfers.length}`);
  console.log(`   Native Transfers: ${sampleTransaction.nativeTransfers.length}`);
  
  // Find our token transfer
  const bagworkTransfer = sampleTransaction.tokenTransfers.find(t => t.mint === bagworkToken);
  const solTransfer = sampleTransaction.tokenTransfers.find(t => t.mint === 'So11111111111111111111111111111111111111112');
  
  console.log('\n🔍 TRANSFER ANALYSIS:');
  if (bagworkTransfer) {
    console.log(`✅ Found Bagwork transfer: ${bagworkTransfer.tokenAmount} tokens`);
    console.log(`   From: ${bagworkTransfer.fromUserAccount.substring(0, 8)}...`);
    console.log(`   To: ${bagworkTransfer.toUserAccount.substring(0, 8)}...`);
  } else {
    console.log('❌ No Bagwork transfer found');
  }
  
  if (solTransfer) {
    console.log(`✅ Found SOL transfer: ${solTransfer.tokenAmount} SOL`);
    console.log(`   From: ${solTransfer.fromUserAccount.substring(0, 8)}...`);
    console.log(`   To: ${solTransfer.toUserAccount.substring(0, 8)}...`);
  } else {
    console.log('❌ No SOL transfer found');
  }
  
  // Test our extraction function
  console.log('\n💰 PRICE CALCULATION:');
  try {
    const realPrice = heliusService.extractRealPriceFromTransaction(sampleTransaction, bagworkToken);
    
    if (realPrice) {
      console.log('✅ REAL PRICE EXTRACTED:');
      console.log(`   Price: $${realPrice.price.toFixed(8)}`);
      console.log(`   Token Amount: ${realPrice.tokenAmount}`);
      console.log(`   SOL Amount: ${realPrice.solAmount}`);
      console.log(`   Volume: $${realPrice.volume.toFixed(2)}`);
      console.log(`   Source: ${realPrice.source}`);
      
      // Compare with DexScreener price
      const dexScreenerPrice = 0.003729;
      const priceDiff = Math.abs(realPrice.price - dexScreenerPrice);
      const percentDiff = (priceDiff / dexScreenerPrice) * 100;
      
      console.log('\n📊 COMPARISON WITH DEXSCREENER:');
      console.log(`   DexScreener: $${dexScreenerPrice}`);
      console.log(`   Our Price: $${realPrice.price.toFixed(8)}`);
      console.log(`   Difference: $${priceDiff.toFixed(8)} (${percentDiff.toFixed(1)}%)`);
      console.log(`   Status: ${percentDiff < 10 ? '✅ CLOSE MATCH' : '⚠️ SIGNIFICANT DIFFERENCE'}`);
      
    } else {
      console.log('❌ No real price could be extracted');
    }
  } catch (error) {
    console.error('❌ Price extraction failed:', error.message);
  }
  
  // Test with array of transactions (simulating the full extraction)
  console.log('\n🔄 TESTING FULL EXTRACTION PROCESS:');
  try {
    const pricePoints = heliusService.extractPriceHistoryFromTransactions([sampleTransaction], bagworkToken);
    console.log(`✅ Extracted ${pricePoints.length} price points`);
    
    if (pricePoints.length > 0) {
      const point = pricePoints[0];
      console.log(`   Price: $${point.price.toFixed(8)}`);
      console.log(`   Volume: $${point.volume.toFixed(2)}`);
      console.log(`   Source: ${point.source}`);
      console.log(`   Timestamp: ${new Date(point.timestamp).toISOString()}`);
    }
  } catch (error) {
    console.error('❌ Full extraction failed:', error.message);
  }
}

testPriceExtraction();
