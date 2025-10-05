const JupiterDataService = require('./jupiterDataService');

async function compareDataSources() {
  console.log('🧪 Testing Jupiter Data Service vs Current Data');
  
  const jupiterService = new JupiterDataService();
  
  // Test with some sample coins
  const testCoins = [
    {
      mintAddress: 'FfixAeHevSKBZWoXPTbLk4U4X9piqvzGKvQaFo3cpump',
      name: 'Polyfactual',
      symbol: 'POLYFACTS',
      price_usd: 0.004, // Sample current data
      market_cap_usd: 4000000,
      volume_24h_usd: 300000,
      liquidity_usd: 250000
    },
    {
      mintAddress: '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr',
      name: 'dogwifhat',
      symbol: 'WIF',
      price_usd: 2.45,
      market_cap_usd: 2450000000,
      volume_24h_usd: 124000000,
      liquidity_usd: 12500000
    }
  ];
  
  console.log('\n📊 Testing individual coin enhancement...');
  
  for (const coin of testCoins) {
    console.log(`\n🔍 Testing ${coin.symbol}:`);
    console.log('Current Data:');
    console.log(`  Price: $${coin.price_usd}`);
    console.log(`  Market Cap: $${coin.market_cap_usd?.toLocaleString()}`);
    console.log(`  Volume 24h: $${coin.volume_24h_usd?.toLocaleString()}`);
    console.log(`  Liquidity: $${coin.liquidity_usd?.toLocaleString()}`);
    console.log(`  Holder Count: ${coin.holder_count || 'Unknown'}`);
    
    const enhanced = await jupiterService.enrichCoinWithJupiterData(coin);
    
    if (enhanced.jupiterEnriched) {
      console.log('\n🪐 Jupiter Enhanced Data:');
      console.log(`  Price: $${enhanced.price_usd} ${enhanced.price_usd !== coin.price_usd ? '📈 UPDATED' : '✓'}`);
      console.log(`  Market Cap: $${enhanced.market_cap_usd?.toLocaleString()} ${enhanced.market_cap_usd !== coin.market_cap_usd ? '📈 UPDATED' : '✓'}`);
      console.log(`  Volume 24h: $${enhanced.volume_24h_usd?.toLocaleString()} ${enhanced.volume_24h_usd !== coin.volume_24h_usd ? '📈 UPDATED' : '✓'}`);
      console.log(`  Liquidity: $${enhanced.liquidity_usd?.toLocaleString()} ${enhanced.liquidity_usd !== coin.liquidity_usd ? '📈 UPDATED' : '✓'}`);
      console.log(`  Holder Count: ${enhanced.holder_count?.toLocaleString()} 🆕`);
      console.log(`  Organic Score: ${enhanced.organic_score} (${enhanced.organic_score_label}) 🆕`);
      console.log(`  Verified: ${enhanced.is_verified} 🆕`);
      console.log(`  Mint Authority: ${enhanced.mint_authority_disabled ? 'Disabled ✅' : 'Enabled ⚠️'} 🆕`);
      console.log(`  Price Change 24h: ${enhanced.price_change_24h?.toFixed(2)}% 🆕`);
      console.log(`  Traders 24h: ${enhanced.num_traders_24h?.toLocaleString()} 🆕`);
      
      if (enhanced.cex_listings?.length > 0) {
        console.log(`  CEX Listings: ${enhanced.cex_listings.join(', ')} 🆕`);
      }
    } else {
      console.log('\n❌ Not found in Jupiter registry');
    }
  }
  
  console.log('\n\n📈 Testing Jupiter trending tokens...');
  
  const trendingTokens = await jupiterService.getTopTokensByCategory('toporganicscore', '24h', 5);
  
  console.log(`✅ Got ${trendingTokens.length} trending tokens from Jupiter:`);
  
  trendingTokens.forEach((token, i) => {
    console.log(`\n${i + 1}. ${token.name} (${token.symbol})`);
    console.log(`   Price: $${token.price_usd}`);
    console.log(`   Market Cap: $${token.market_cap_usd?.toLocaleString()}`);
    console.log(`   Liquidity: $${token.liquidity_usd?.toLocaleString()}`);
    console.log(`   Holders: ${token.holder_count?.toLocaleString()}`);
    console.log(`   Organic Score: ${token.organic_score} (${token.organic_score_label})`);
    console.log(`   Verified: ${token.is_verified}`);
    console.log(`   Security: Mint ${token.mint_authority_disabled ? 'Disabled' : 'Enabled'}, Freeze ${token.freeze_authority_disabled ? 'Disabled' : 'Enabled'}`);
  });
  
  console.log('\n📊 Cache stats:', jupiterService.getCacheStats());
  
  console.log('\n✅ Comparison complete!');
  console.log('\n🎯 Key Benefits of Jupiter Data:');
  console.log('  • Real-time, accurate price/market data');
  console.log('  • Holder count (social proof)');
  console.log('  • Organic score (quality rating)');
  console.log('  • Security audit info (mint/freeze authority)');
  console.log('  • Verification status');
  console.log('  • CEX listings');
  console.log('  • More accurate liquidity data');
  console.log('  • Trading stats (traders, buys/sells)');
}

if (require.main === module) {
  compareDataSources().catch(console.error);
}

module.exports = compareDataSources;
