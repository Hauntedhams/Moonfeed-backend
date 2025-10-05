const fetch = require('node-fetch');

class JupiterTokenService {
  constructor() {
    // Try multiple Jupiter API endpoints
    this.apiEndpoints = [
      'https://token.jup.ag/all',
      'https://cache.jup.ag/tokens',
      'https://tokens.jup.ag/tokens',
      'https://api.jup.ag/tokens/all'
    ];
    
    this.tokensCache = null;
    this.lastFetch = 0;
    this.cacheDuration = 30 * 60 * 1000; // 30 minutes
  }

  async getTokenList() {
    const now = Date.now();
    
    if (!this.tokensCache || (now - this.lastFetch) > this.cacheDuration) {
      for (const endpoint of this.apiEndpoints) {
        try {
          console.log(`📥 Trying Jupiter endpoint: ${endpoint}`);
          
          const response = await fetch(endpoint, {
            timeout: 15000,
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'MoonFeed/1.0'
            }
          });
          
          if (response.ok) {
            this.tokensCache = await response.json();
            this.lastFetch = now;
            console.log(`✅ Successfully loaded ${this.tokensCache.length} tokens from ${endpoint}`);
            break;
          } else {
            console.warn(`⚠️ Failed to fetch from ${endpoint}: ${response.status}`);
          }
        } catch (error) {
          console.warn(`⚠️ Error with ${endpoint}:`, error.message);
          continue;
        }
      }
      
      if (!this.tokensCache) {
        console.error('❌ All Jupiter endpoints failed');
        return [];
      }
    }
    
    return this.tokensCache || [];
  }

  async getTokenInfo(mintAddress) {
    try {
      const tokens = await this.getTokenList();
      const token = tokens.find(t => t.address === mintAddress);
      
      if (token) {
        return {
          address: token.address,
          name: token.name,
          symbol: token.symbol,
          description: this.extractDescription(token),
          image: token.logoURI,
          decimals: token.decimals,
          tags: token.tags || [],
          extensions: token.extensions || {},
          links: this.extractLinks(token),
          source: 'jupiter',
          rawToken: token // Include raw data for debugging
        };
      }
    } catch (error) {
      console.error(`❌ Error fetching Jupiter token info for ${mintAddress}:`, error.message);
    }
    
    return null;
  }

  extractDescription(token) {
    // Try multiple fields where description might be stored
    const descriptionFields = [
      'description',
      'about',
      'summary',
      'details'
    ];
    
    // Check direct fields first
    for (const field of descriptionFields) {
      if (token[field]) {
        return token[field];
      }
    }
    
    // Check extensions
    if (token.extensions) {
      for (const field of descriptionFields) {
        if (token.extensions[field]) {
          return token.extensions[field];
        }
      }
      
      // Check other common extension fields
      if (token.extensions.coingeckoId) {
        return `Token listed on CoinGecko with ID: ${token.extensions.coingeckoId}`;
      }
    }
    
    // Generate description from available data
    if (token.name && token.symbol) {
      let desc = `${token.name} (${token.symbol})`;
      if (token.tags && token.tags.length > 0) {
        desc += ` - Tagged as: ${token.tags.join(', ')}`;
      }
      return desc;
    }
    
    return null;
  }

  extractLinks(token) {
    const links = {};
    
    if (token.extensions) {
      const ext = token.extensions;
      
      // Map common social link fields
      const linkMappings = {
        website: ['website', 'homepage', 'url'],
        twitter: ['twitter', 'twitterHandle'],
        telegram: ['telegram', 'telegramChannel'],
        discord: ['discord', 'discordUrl'],
        github: ['github', 'githubUrl'],
        medium: ['medium', 'mediumHandle'],
        reddit: ['reddit', 'redditUrl']
      };
      
      for (const [linkType, possibleFields] of Object.entries(linkMappings)) {
        for (const field of possibleFields) {
          if (ext[field]) {
            links[linkType] = ext[field];
            break;
          }
        }
      }
    }
    
    return links;
  }

  getCacheStats() {
    return {
      cached_tokens: this.tokensCache?.length || 0,
      last_fetch: new Date(this.lastFetch).toISOString(),
      cache_age_minutes: Math.round((Date.now() - this.lastFetch) / (1000 * 60)),
      cache_valid: (Date.now() - this.lastFetch) < this.cacheDuration
    };
  }
}

// Test with the specific token
async function testSpecificToken() {
  const service = new JupiterTokenService();
  const targetToken = 'FfixAeHevSKBZWoXPTbLk4U4X9piqvzGKvQaFo3cpump';
  
  console.log(`🎯 Testing Jupiter service for token: ${targetToken}`);
  
  const tokenInfo = await service.getTokenInfo(targetToken);
  
  if (tokenInfo) {
    console.log('\n✅ Token found in Jupiter!');
    console.log('📋 Token Info:');
    console.log(`   Name: ${tokenInfo.name}`);
    console.log(`   Symbol: ${tokenInfo.symbol}`);
    console.log(`   Description: ${tokenInfo.description || 'None'}`);
    console.log(`   Image: ${tokenInfo.image || 'None'}`);
    console.log(`   Tags: ${tokenInfo.tags.join(', ') || 'None'}`);
    console.log(`   Links: ${Object.keys(tokenInfo.links).length} social links`);
    
    if (Object.keys(tokenInfo.links).length > 0) {
      console.log('   Social Links:', tokenInfo.links);
    }
    
    console.log('\n🔧 Raw token data:');
    console.log(JSON.stringify(tokenInfo.rawToken, null, 2));
    
  } else {
    console.log('❌ Token not found in Jupiter registry');
  }
  
  console.log('\n📊 Cache stats:', service.getCacheStats());
}

if (require.main === module) {
  testSpecificToken().catch(console.error);
}

module.exports = JupiterTokenService;
