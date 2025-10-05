const JupiterTokenService = require('./jupiterTokenService');

async function testJupiterService() {
  console.log('🧪 Testing Jupiter Token Service');
  
  const service = new JupiterTokenService();
  
  // Test well-known tokens
  const testTokens = [
    '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr', // WIF
    'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // BONK
    'So11111111111111111111111111111111111111112',     // SOL
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',     // USDC
    'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN'      // JUP
  ];
  
  console.log('\n📝 Testing individual token lookups...');
  
  for (const mintAddress of testTokens) {
    console.log(`\n🔍 Testing ${mintAddress}`);
    
    try {
      const tokenInfo = await service.getTokenInfo(mintAddress);
      
      if (tokenInfo) {
        console.log(`✅ Found: ${tokenInfo.name} (${tokenInfo.symbol})`);
        console.log(`   Description: ${tokenInfo.description || 'None'}`);
        console.log(`   Tags: ${tokenInfo.tags.join(', ') || 'None'}`);
        console.log(`   Links: ${Object.keys(tokenInfo.links).length} social links`);
        console.log(`   Image: ${tokenInfo.image ? 'Yes' : 'No'}`);
      } else {
        console.log(`❌ Not found in Jupiter registry`);
      }
      
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n🔍 Testing search functionality...');
  
  const searchQueries = ['bonk', 'jupiter', 'meme'];
  
  for (const query of searchQueries) {
    try {
      console.log(`\n🔎 Searching for "${query}"`);
      const results = await service.searchTokens(query, 5);
      
      console.log(`✅ Found ${results.length} tokens matching "${query}"`);
      results.forEach((token, i) => {
        if (token && token.name) {
          console.log(`   ${i + 1}. ${token.name} (${token.symbol || 'N/A'})`);
        }
      });
      
    } catch (error) {
      console.error(`❌ Search error: ${error.message}`);
    }
  }
  
  console.log('\n🏷️ Testing tag-based lookup...');
  
  const tags = ['meme', 'verified', 'solana-ecosystem'];
  
  for (const tag of tags) {
    try {
      console.log(`\n🏷️ Getting tokens with tag "${tag}"`);
      const results = await service.getTokensByTag(tag, 3);
      
      console.log(`✅ Found ${results.length} tokens with tag "${tag}"`);
      results.forEach((token, i) => {
        if (token && token.name) {
          console.log(`   ${i + 1}. ${token.name} (${token.symbol || 'N/A'})`);
        }
      });
      
    } catch (error) {
      console.error(`❌ Tag lookup error: ${error.message}`);
    }
  }
  
  console.log('\n📚 Testing batch lookup...');
  
  try {
    const batchTokens = testTokens.slice(0, 3);
    const batchResults = await service.batchGetTokens(batchTokens);
    
    console.log(`✅ Batch results for ${batchTokens.length} tokens:`);
    batchResults.forEach((result, i) => {
      if (result.found !== false) {
        console.log(`   ${i + 1}. ${result.name} (${result.symbol}) - ${result.description ? 'Has description' : 'No description'}`);
      } else {
        console.log(`   ${i + 1}. ${result.address} - Not found`);
      }
    });
    
  } catch (error) {
    console.error(`❌ Batch lookup error: ${error.message}`);
  }
  
  console.log('\n📊 Cache stats:', service.getCacheStats());
  
  console.log('\n🧪 Test complete!');
}

// Run the test
if (require.main === module) {
  testJupiterService().catch(console.error);
}

module.exports = testJupiterService;
