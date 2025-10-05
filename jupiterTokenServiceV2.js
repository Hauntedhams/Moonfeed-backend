const fetch = require('node-fetch');

class JupiterTokenServiceV2 {
  constructor() {
    this.baseUrl = 'https://lite-api.jup.ag/tokens/v2';
    this.cache = new Map();
    this.cacheDuration = 30 * 60 * 1000; // 30 minutes
  }

  async searchToken(mintAddress) {
    try {
      console.log(`🔍 Searching Jupiter v2 for token: ${mintAddress}`);
      
      const response = await fetch(`${this.baseUrl}/search?query=${mintAddress}`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'MoonFeed/1.0'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const tokens = await response.json();
      console.log(`📊 Found ${tokens.length} tokens`);
      
      // Find exact match
      const exactMatch = tokens.find(token => token.id === mintAddress);
      
      if (exactMatch) {
        console.log('✅ Found exact match!');
        return this.formatTokenInfo(exactMatch);
      } else if (tokens.length > 0) {
        console.log('⚠️ No exact match, but found similar tokens');
        return tokens.map(token => this.formatTokenInfo(token));
      } else {
        console.log('❌ No tokens found');
        return null;
      }
      
    } catch (error) {
      console.error('❌ Error searching token:', error.message);
      return null;
    }
  }

  formatTokenInfo(token) {
    return {
      // Basic token info
      address: token.id,
      name: token.name,
      symbol: token.symbol,
      icon: token.icon,
      decimals: token.decimals,
      
      // Supply info
      circSupply: token.circSupply,
      totalSupply: token.totalSupply,
      
      // Market data
      usdPrice: token.usdPrice,
      marketCap: token.mcap,
      fdv: token.fdv,
      liquidity: token.liquidity,
      
      // Trust indicators
      organicScore: token.organicScore,
      organicScoreLabel: token.organicScoreLabel,
      isVerified: token.isVerified,
      holderCount: token.holderCount,
      
      // Pool info
      firstPool: token.firstPool,
      
      // Audit info
      audit: token.audit,
      
      // Exchange listings
      cexes: token.cexes || [],
      
      // Tags
      tags: token.tags || [],
      
      // Trading stats
      stats5m: token.stats5m,
      stats1h: token.stats1h,
      stats6h: token.stats6h,
      stats24h: token.stats24h,
      
      // Social indicators
      likes: token.likes,
      ctLikes: token.ctLikes,
      smartCtLikes: token.smartCtLikes,
      
      // Timestamps
      updatedAt: token.updatedAt,
      
      // Source
      source: 'jupiter-v2'
    };
  }

  async getRecentTokens(limit = 30) {
    try {
      console.log(`🆕 Getting ${limit} recent tokens from Jupiter v2`);
      
      const response = await fetch(`${this.baseUrl}/recent?limit=${limit}`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'MoonFeed/1.0'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const tokens = await response.json();
      console.log(`✅ Got ${tokens.length} recent tokens`);
      
      return tokens.map(token => this.formatTokenInfo(token));
      
    } catch (error) {
      console.error('❌ Error getting recent tokens:', error.message);
      return [];
    }
  }

  async getTopTokens(category = 'toporganicscore', interval = '24h', limit = 50) {
    try {
      console.log(`📈 Getting top ${category} tokens (${interval}) from Jupiter v2`);
      
      const response = await fetch(`${this.baseUrl}/${category}/${interval}?limit=${limit}`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'MoonFeed/1.0'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const tokens = await response.json();
      console.log(`✅ Got ${tokens.length} top tokens`);
      
      return tokens.map(token => this.formatTokenInfo(token));
      
    } catch (error) {
      console.error('❌ Error getting top tokens:', error.message);
      return [];
    }
  }

  async getVerifiedTokens() {
    try {
      console.log('✅ Getting verified tokens from Jupiter v2');
      
      const response = await fetch(`${this.baseUrl}/tag?query=verified`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'MoonFeed/1.0'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const tokens = await response.json();
      console.log(`✅ Got ${tokens.length} verified tokens`);
      
      return tokens.map(token => this.formatTokenInfo(token));
      
    } catch (error) {
      console.error('❌ Error getting verified tokens:', error.message);
      return [];
    }
  }
}

// Test with the specific token
async function testSpecificToken() {
  const service = new JupiterTokenServiceV2();
  const targetToken = 'FfixAeHevSKBZWoXPTbLk4U4X9piqvzGKvQaFo3cpump';
  
  console.log(`🎯 Testing Jupiter v2 API for token: ${targetToken}\n`);
  
  // Search for the specific token
  const result = await service.searchToken(targetToken);
  
  if (result) {
    if (Array.isArray(result)) {
      console.log(`📋 Found multiple tokens (${result.length}):`);
      result.forEach((token, i) => {
        console.log(`\n${i + 1}. ${token.name} (${token.symbol})`);
        console.log(`   Address: ${token.address}`);
        console.log(`   Verified: ${token.isVerified}`);
        console.log(`   Organic Score: ${token.organicScore} (${token.organicScoreLabel})`);
        console.log(`   Holder Count: ${token.holderCount}`);
        console.log(`   Market Cap: $${token.marketCap?.toLocaleString()}`);
        console.log(`   Tags: ${token.tags.join(', ')}`);
      });
    } else {
      console.log('\n✅ Token Details:');
      console.log(`   Name: ${result.name}`);
      console.log(`   Symbol: ${result.symbol}`);
      console.log(`   Address: ${result.address}`);
      console.log(`   Icon: ${result.icon}`);
      console.log(`   Verified: ${result.isVerified}`);
      console.log(`   Organic Score: ${result.organicScore} (${result.organicScoreLabel})`);
      console.log(`   Holder Count: ${result.holderCount?.toLocaleString()}`);
      console.log(`   Market Cap: $${result.marketCap?.toLocaleString()}`);
      console.log(`   Price: $${result.usdPrice}`);
      console.log(`   Liquidity: $${result.liquidity?.toLocaleString()}`);
      console.log(`   Tags: ${result.tags.join(', ')}`);
      console.log(`   CEX Listings: ${result.cexes.join(', ')}`);
      
      if (result.audit) {
        console.log('\n🔒 Audit Info:');
        console.log(`   Mint Authority Disabled: ${result.audit.mintAuthorityDisabled}`);
        console.log(`   Freeze Authority Disabled: ${result.audit.freezeAuthorityDisabled}`);
        console.log(`   Top Holders %: ${result.audit.topHoldersPercentage?.toFixed(2)}%`);
      }
      
      if (result.stats24h) {
        console.log('\n📊 24h Stats:');
        console.log(`   Price Change: ${result.stats24h.priceChange?.toFixed(2)}%`);
        console.log(`   Volume: $${(result.stats24h.buyVolume + result.stats24h.sellVolume)?.toLocaleString()}`);
        console.log(`   Traders: ${result.stats24h.numTraders?.toLocaleString()}`);
      }
    }
  } else {
    console.log('❌ Token not found in Jupiter v2 API');
  }
  
  // Also test recent tokens to see the structure
  console.log('\n\n🆕 Testing recent tokens...');
  const recentTokens = await service.getRecentTokens(3);
  
  recentTokens.forEach((token, i) => {
    console.log(`\n${i + 1}. ${token.name} (${token.symbol})`);
    console.log(`   Address: ${token.address}`);
    console.log(`   Organic Score: ${token.organicScore} (${token.organicScoreLabel})`);
    console.log(`   Market Cap: $${token.marketCap?.toLocaleString()}`);
    console.log(`   First Pool: ${token.firstPool?.createdAt}`);
  });
}

if (require.main === module) {
  testSpecificToken().catch(console.error);
}

module.exports = JupiterTokenServiceV2;
