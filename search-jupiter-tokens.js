const JupiterTokenService = require('./jupiterTokenService');

async function searchForToken() {
  const service = new JupiterTokenService();
  const targetToken = 'FfixAeHevSKBZWoXPTbLk4U4X9piqvzGKvQaFo3cpump';
  
  console.log(`🔍 Searching for token: ${targetToken}`);
  
  const tokens = await service.getTokenList();
  console.log(`📊 Total tokens available: ${tokens.length}`);
  
  // Search for exact match
  const exactMatch = tokens.find(t => t.address === targetToken);
  if (exactMatch) {
    console.log('\n✅ Found exact match!');
    console.log(JSON.stringify(exactMatch, null, 2));
    return;
  }
  
  // Search for partial matches
  const partialMatches = tokens.filter(t => 
    t.address.includes('Ffix') || 
    t.address.includes('cpump') ||
    t.name?.toLowerCase().includes('pump') ||
    t.symbol?.toLowerCase().includes('pump')
  );
  
  console.log(`\n🔍 Found ${partialMatches.length} tokens with 'pump' or similar addresses:`);
  partialMatches.slice(0, 10).forEach((token, i) => {
    console.log(`${i + 1}. ${token.name} (${token.symbol}) - ${token.address}`);
    if (token.extensions?.description) {
      console.log(`   Description: ${token.extensions.description.substring(0, 100)}...`);
    }
  });
  
  // Let's also look at some tokens with descriptions to see the structure
  const tokensWithDescriptions = tokens.filter(t => 
    t.extensions?.description || 
    t.description ||
    t.extensions?.about
  ).slice(0, 5);
  
  console.log(`\n📝 Sample tokens with descriptions (${tokensWithDescriptions.length}):`);
  tokensWithDescriptions.forEach((token, i) => {
    console.log(`\n${i + 1}. ${token.name} (${token.symbol})`);
    console.log(`   Address: ${token.address}`);
    
    if (token.extensions?.description) {
      console.log(`   Description: ${token.extensions.description.substring(0, 200)}...`);
    } else if (token.description) {
      console.log(`   Description: ${token.description.substring(0, 200)}...`);
    } else if (token.extensions?.about) {
      console.log(`   About: ${token.extensions.about.substring(0, 200)}...`);
    }
  });
  
  // Check token structure
  console.log('\n🔧 Sample token structure:');
  if (tokens.length > 0) {
    const sampleToken = tokens[0];
    console.log('Available fields:', Object.keys(sampleToken));
    if (sampleToken.extensions) {
      console.log('Extension fields:', Object.keys(sampleToken.extensions));
    }
  }
}

searchForToken().catch(console.error);
