const fetch = require('node-fetch');

async function testSpecificToken() {
  const targetToken = 'FfixAeHevSKBZWoXPTbLk4U4X9piqvzGKvQaFo3cpump';
  
  try {
    console.log('🔍 Fetching Jupiter token list...');
    
    const response = await fetch('https://token.jup.ag/all', {
      headers: {
        'User-Agent': 'MoonFeed/1.0',
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    console.log('✅ Successfully fetched token list');
    
    const tokens = await response.json();
    console.log(`📊 Total tokens in Jupiter: ${tokens.length}`);
    
    // Search for our specific token
    const token = tokens.find(t => t.address === targetToken);
    
    if (token) {
      console.log(`\n🎯 Found token: ${targetToken}`);
      console.log('📋 Token details:');
      console.log(JSON.stringify(token, null, 2));
      
      // Check for description in various fields
      console.log('\n🔍 Checking for descriptions:');
      if (token.description) {
        console.log(`✅ Description field: ${token.description}`);
      }
      if (token.extensions?.description) {
        console.log(`✅ Extensions.description: ${token.extensions.description}`);
      }
      if (token.extensions?.about) {
        console.log(`✅ Extensions.about: ${token.extensions.about}`);
      }
      if (token.extensions?.summary) {
        console.log(`✅ Extensions.summary: ${token.extensions.summary}`);
      }
      
      // Show all extension keys
      if (token.extensions) {
        console.log(`\n🔧 Available extension fields: ${Object.keys(token.extensions).join(', ')}`);
      }
      
    } else {
      console.log(`❌ Token ${targetToken} not found in Jupiter registry`);
      
      // Let's check a few tokens to see the structure
      console.log('\n📋 Sample token structures (first 3 tokens):');
      tokens.slice(0, 3).forEach((t, i) => {
        console.log(`\n${i + 1}. ${t.name} (${t.symbol})`);
        console.log(`   Address: ${t.address}`);
        console.log(`   Has extensions: ${!!t.extensions}`);
        if (t.extensions) {
          console.log(`   Extension keys: ${Object.keys(t.extensions).join(', ')}`);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testSpecificToken();
