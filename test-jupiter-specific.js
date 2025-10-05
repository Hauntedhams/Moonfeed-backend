const fetch = require('node-fetch');

async function testJupiterSpecificToken() {
  const targetToken = 'FfixAeHevSKBZWoXPTbLk4U4X9piqvzGKvQaFo3cpump';
  
  console.log(`🔍 Searching for token: ${targetToken}`);
  console.log('📥 Fetching Jupiter token list...');
  
  try {
    const response = await fetch('https://token.jup.ag/all', {
      timeout: 15000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'MoonFeed/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const tokens = await response.json();
    console.log(`✅ Loaded ${tokens.length} tokens from Jupiter`);
    
    // Search for the specific token
    const targetTokenInfo = tokens.find(token => token.address === targetToken);
    
    if (targetTokenInfo) {
      console.log('\n🎯 Found target token! Full info:');
      console.log(JSON.stringify(targetTokenInfo, null, 2));
      
      console.log('\n📋 Summary:');
      console.log(`Name: ${targetTokenInfo.name || 'N/A'}`);
      console.log(`Symbol: ${targetTokenInfo.symbol || 'N/A'}`);
      console.log(`Decimals: ${targetTokenInfo.decimals || 'N/A'}`);
      console.log(`Logo URI: ${targetTokenInfo.logoURI || 'N/A'}`);
      console.log(`Tags: ${targetTokenInfo.tags ? targetTokenInfo.tags.join(', ') : 'None'}`);
      
      if (targetTokenInfo.extensions) {
        console.log('\n🔗 Extensions:');
        console.log(JSON.stringify(targetTokenInfo.extensions, null, 2));
      }
      
    } else {
      console.log('\n❌ Token not found in Jupiter registry');
      
      // Let's search for similar addresses or partial matches
      console.log('\n🔍 Searching for partial matches...');
      const partialMatches = tokens.filter(token => 
        token.address.includes(targetToken.substring(0, 10)) ||
        token.address.includes(targetToken.substring(-10))
      );
      
      if (partialMatches.length > 0) {
        console.log(`Found ${partialMatches.length} partial matches:`);
        partialMatches.slice(0, 5).forEach(token => {
          console.log(`  ${token.address} - ${token.name} (${token.symbol})`);
        });
      }
      
      // Let's also search by name if it contains "pump"
      console.log('\n🔍 Searching for tokens with "pump" in name...');
      const pumpTokens = tokens.filter(token => 
        token.name?.toLowerCase().includes('pump') ||
        token.symbol?.toLowerCase().includes('pump')
      );
      
      console.log(`Found ${pumpTokens.length} tokens with "pump":`);
      pumpTokens.slice(0, 10).forEach(token => {
        console.log(`  ${token.address} - ${token.name} (${token.symbol})`);
      });
    }
    
    // Let's also show some example tokens to see the data structure
    console.log('\n📝 Example tokens from Jupiter (first 3):');
    tokens.slice(0, 3).forEach((token, i) => {
      console.log(`\n${i + 1}. ${token.name} (${token.symbol})`);
      console.log(`   Address: ${token.address}`);
      console.log(`   Logo: ${token.logoURI || 'None'}`);
      console.log(`   Tags: ${token.tags ? token.tags.join(', ') : 'None'}`);
      if (token.extensions) {
        console.log(`   Extensions: ${Object.keys(token.extensions).join(', ')}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching from Jupiter:', error.message);
  }
}

// Run the test
testJupiterSpecificToken().catch(console.error);
