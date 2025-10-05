const rugcheckService = require('./rugcheckService');

async function testRugcheckIntegration() {
  console.log('🧪 Testing Rugcheck Integration...\n');

  // Test with a popular Solana token (WIF)
  const testTokens = [
    '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr', // WIF 
    'So11111111111111111111111111111111111111112',   // SOL
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'  // USDC
  ];

  console.log('🔍 Testing individual token check...');
  try {
    const result = await rugcheckService.checkToken(testTokens[0]);
    console.log('Single token result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error in single token test:', error.message);
  }

  console.log('\n🔍 Testing batch token check...');
  try {
    const batchResults = await rugcheckService.checkMultipleTokens(testTokens, {
      maxConcurrent: 1,
      batchDelay: 1000,
      maxTokens: 3
    });
    
    console.log('\nBatch results:');
    batchResults.forEach((result, index) => {
      console.log(`\nToken ${index + 1}: ${result.address}`);
      console.log(`  Liquidity Locked: ${result.liquidityLocked}`);
      console.log(`  Lock %: ${result.lockPercentage}%`);
      console.log(`  Burn %: ${result.burnPercentage}%`);
      console.log(`  Risk Level: ${result.riskLevel}`);
      console.log(`  Score: ${result.score}`);
      console.log(`  Rugcheck Available: ${result.rugcheckAvailable}`);
    });
    
  } catch (error) {
    console.error('Error in batch test:', error.message);
  }

  console.log('\n✅ Rugcheck integration test complete!');
}

// Run the test
testRugcheckIntegration().catch(console.error);
