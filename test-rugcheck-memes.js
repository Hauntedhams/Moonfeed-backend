const rugcheckService = require('./rugcheckService');

async function testWithRealMemeCoins() {
  console.log('🧪 Testing Rugcheck with real meme coins...\n');

  // Test with some popular Solana meme coins that might be in Rugcheck
  const testTokens = [
    'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // Bonk
    'Saber2gLauYim4Mvftnrasomsv6NvAuncvMEZwcLpD1', // SBR
    'MangoCzJ36AjZyKwVj3VnYU4GTonjfVEnJmvvWaxLac',  // MNGO
    '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', // ORCA
    'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'  // USDT
  ];

  console.log('🔍 Testing individual token check...');
  for (const token of testTokens) {
    try {
      console.log(`\n🔍 Checking ${token}...`);
      const result = await rugcheckService.checkToken(token);
      
      if (result.rugcheckAvailable) {
        console.log(`✅ SUCCESS: Liquidity Locked: ${result.liquidityLocked}`);
        console.log(`   Lock %: ${result.lockPercentage}%, Burn %: ${result.burnPercentage}%`);
        console.log(`   Risk: ${result.riskLevel}, Score: ${result.score}`);
        break; // Found a working token, stop here
      } else {
        console.log(`❌ Not available in Rugcheck database`);
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Error checking ${token}:`, error.message);
    }
  }

  console.log('\n✅ Rugcheck meme coin test complete!');
}

// Run the test
testWithRealMemeCoins().catch(console.error);
