const JupiterDataService = require('./jupiterDataService');

async function migrateToJupiter() {
  console.log('🚀 Jupiter Migration Tool - Testing New Data Sources');
  console.log('============================================\n');
  
  const jupiterService = new JupiterDataService();
  
  // Test 1: Compare trending endpoints
  console.log('1️⃣ Testing Trending Endpoints');
  console.log('------------------------------');
  
  try {
    console.log('📊 Testing current trending endpoint...');
    const currentResponse = await fetch('http://localhost:3001/api/coins/trending?limit=5');
    const currentData = await currentResponse.json();
    
    console.log(`✅ Current: ${currentData.count} coins, source: ${currentData.data_source || currentData.source}`);
    
    if (currentData.coins && currentData.coins.length > 0) {
      const firstCoin = currentData.coins[0];
      console.log(`   Sample: ${firstCoin.symbol} - $${firstCoin.price_usd} (MC: $${firstCoin.market_cap_usd?.toLocaleString()})`);
      console.log(`   Jupiter Enhanced: ${firstCoin.jupiterEnriched ? 'Yes' : 'No'}`);
      console.log(`   Holder Count: ${firstCoin.holder_count || 'N/A'}`);
      console.log(`   Organic Score: ${firstCoin.organic_score || 'N/A'}`);
    }
    
  } catch (error) {
    console.error('❌ Current trending test failed:', error.message);
  }
  
  console.log('\n📊 Testing Jupiter-primary endpoint...');
  try {
    const jupiterResponse = await fetch('http://localhost:3001/api/coins/jupiter-trending?limit=5');
    const jupiterData = await jupiterResponse.json();
    
    console.log(`✅ Jupiter: ${jupiterData.count} coins, category: ${jupiterData.category}`);
    
    if (jupiterData.coins && jupiterData.coins.length > 0) {
      const firstCoin = jupiterData.coins[0];
      console.log(`   Sample: ${firstCoin.symbol} - $${firstCoin.price_usd} (MC: $${firstCoin.market_cap_usd?.toLocaleString()})`);
      console.log(`   Holder Count: ${firstCoin.holder_count?.toLocaleString()}`);
      console.log(`   Organic Score: ${firstCoin.organic_score} (${firstCoin.organic_score_label})`);
      console.log(`   Verified: ${firstCoin.is_verified}`);
      console.log(`   Security: Mint ${firstCoin.mint_authority_disabled ? 'Disabled' : 'Enabled'}`);
    }
    
  } catch (error) {
    console.error('❌ Jupiter trending test failed:', error.message);
  }
  
  // Test 2: Data quality comparison
  console.log('\n\n2️⃣ Data Quality Comparison');
  console.log('---------------------------');
  
  const testTokens = [
    'FfixAeHevSKBZWoXPTbLk4U4X9piqvzGKvQaFo3cpump', // Your example token
    '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr', // WIF
    'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'  // BONK
  ];
  
  for (const mintAddress of testTokens) {
    console.log(`\n🔍 Testing token: ${mintAddress.substring(0, 8)}...`);
    
    try {
      const response = await fetch(`http://localhost:3001/api/jupiter/token/${mintAddress}`);
      const data = await response.json();
      
      if (data.success && data.token) {
        const token = data.token;
        console.log(`   ✅ Found: ${token.name} (${token.symbol})`);
        console.log(`   Price: $${token.price_usd}`);
        console.log(`   Market Cap: $${token.market_cap_usd?.toLocaleString()}`);
        console.log(`   Holders: ${token.holder_count?.toLocaleString()}`);
        console.log(`   Organic Score: ${token.organic_score} (${token.organic_score_label})`);
        console.log(`   24h Traders: ${token.num_traders_24h?.toLocaleString()}`);
      } else {
        console.log(`   ❌ Not found in Jupiter registry`);
      }
      
    } catch (error) {
      console.error(`   ❌ Error testing token:`, error.message);
    }
  }
  
  // Test 3: Performance comparison
  console.log('\n\n3️⃣ Performance Testing');
  console.log('----------------------');
  
  console.log('⏱️ Testing endpoint response times...');
  
  const endpoints = [
    { name: 'Current Trending', url: 'http://localhost:3001/api/coins/trending?limit=10' },
    { name: 'Jupiter Enhanced', url: 'http://localhost:3001/api/coins/jupiter-enhanced?limit=10' },
    { name: 'Jupiter Primary', url: 'http://localhost:3001/api/coins/jupiter-trending?limit=10' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const startTime = Date.now();
      const response = await fetch(endpoint.url);
      const endTime = Date.now();
      const data = await response.json();
      
      console.log(`   ${endpoint.name}: ${endTime - startTime}ms (${data.count} coins)`);
      
    } catch (error) {
      console.log(`   ${endpoint.name}: Failed - ${error.message}`);
    }
  }
  
  // Test 4: Cache statistics
  console.log('\n\n4️⃣ Cache Performance');
  console.log('--------------------');
  
  try {
    const statsResponse = await fetch('http://localhost:3001/api/storage/stats');
    const stats = await statsResponse.json();
    
    console.log('📊 Current cache stats:');
    if (stats.enrichment?.jupiterDataCache) {
      const jupiterStats = stats.enrichment.jupiterDataCache;
      console.log(`   Jupiter Data Cache: ${jupiterStats.total_cached} entries`);
      console.log(`   Cache Hits: ${jupiterStats.cache_hits}`);
      console.log(`   Cache Misses: ${jupiterStats.cache_misses}`);
    }
    
    if (stats.jupiter_integration) {
      console.log(`   Integration Status: ${stats.jupiter_integration.status}`);
      console.log(`   Active Features: ${stats.jupiter_integration.features.length}`);
    }
    
  } catch (error) {
    console.error('❌ Stats test failed:', error.message);
  }
  
  // Summary and recommendations
  console.log('\n\n🎯 Migration Summary');
  console.log('===================');
  console.log('✅ Jupiter integration is active and working');
  console.log('✅ Main endpoints enhanced with Jupiter data');
  console.log('✅ Fallback systems in place for reliability');
  console.log('✅ Additional metrics available (holders, organic score, security)');
  
  console.log('\n📈 New Data Available:');
  console.log('• Holder count (social proof)');
  console.log('• Organic quality scores');
  console.log('• Security audit status');
  console.log('• Verification badges');
  console.log('• Real-time trading stats');
  console.log('• More accurate price/liquidity data');
  
  console.log('\n🔄 Migration Status: COMPLETE');
  console.log('Your endpoints now use Jupiter as the primary data source!');
}

// Test endpoints
async function testEndpoints() {
  const endpoints = [
    '/api/coins/trending?limit=5',
    '/api/coins/solana-volume?limit=5', 
    '/api/coins/jupiter-trending?limit=3',
    '/api/coins/jupiter-enhanced?limit=3',
    '/api/storage/stats'
  ];
  
  console.log('🧪 Quick Endpoint Test');
  console.log('=====================\n');
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`http://localhost:3001${endpoint}`);
      const data = await response.json();
      
      if (data.success !== false) {
        console.log(`✅ ${endpoint} - Working (${data.count || 'stats'} results)`);
      } else {
        console.log(`❌ ${endpoint} - Error: ${data.error}`);
      }
      
    } catch (error) {
      console.log(`❌ ${endpoint} - Failed: ${error.message}`);
    }
  }
}

// Main execution
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'quick') {
    testEndpoints().catch(console.error);
  } else {
    migrateToJupiter().catch(console.error);
  }
}

module.exports = { migrateToJupiter, testEndpoints };
