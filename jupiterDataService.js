const fetch = require('node-fetch');
const NodeCache = require('node-cache');

class JupiterDataService {
  constructor() {
    this.baseUrl = 'https://lite-api.jup.ag/tokens/v2';
    this.cache = new NodeCache({ 
      stdTTL: 300, // 5 minutes cache (Jupiter data is fresh)
      checkperiod: 60 
    });
    
    console.log('🪐 Jupiter Data Service initialized');
  }

  async enrichCoinWithJupiterData(coin) {
    const cacheKey = `jupiter_${coin.mintAddress || coin.address}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return { ...coin, ...cached, source: 'jupiter-cached' };
    }

    try {
      const mintAddress = coin.mintAddress || coin.address;
      if (!mintAddress) {
        console.warn('⚠️ No mint address found for coin:', coin.symbol);
        return coin;
      }

      console.log(`🪐 Fetching Jupiter data for ${coin.symbol} (${mintAddress})`);
      
      const response = await fetch(`${this.baseUrl}/search?query=${mintAddress}`, {
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'MoonFeed/1.0'
        }
      });
      
      if (!response.ok) {
        console.warn(`⚠️ Jupiter API error for ${coin.symbol}: ${response.status}`);
        return coin;
      }
      
      const tokens = await response.json();
      const jupiterToken = tokens.find(t => t.id === mintAddress);
      
      if (!jupiterToken) {
        console.warn(`⚠️ Token ${coin.symbol} not found in Jupiter`);
        return coin;
      }

      // Extract Jupiter data
      const jupiterData = this.extractJupiterData(jupiterToken);
      
      // Cache the data
      this.cache.set(cacheKey, jupiterData);
      
      // Merge with existing coin data, Jupiter data takes precedence for market metrics
      const enrichedCoin = {
        ...coin,
        ...jupiterData,
        
        // Keep original data as fallback
        originalPrice: coin.price_usd,
        originalMarketCap: coin.market_cap_usd,
        originalVolume: coin.volume_24h_usd,
        originalLiquidity: coin.liquidity_usd,
        
        // Mark as Jupiter-enriched
        jupiterEnriched: true,
        lastJupiterUpdate: new Date().toISOString()
      };
      
      console.log(`✅ ${coin.symbol}: Jupiter data applied (Price: $${jupiterData.price_usd}, MC: $${jupiterData.market_cap_usd?.toLocaleString()})`);
      
      return enrichedCoin;
      
    } catch (error) {
      console.error(`❌ Error enriching ${coin.symbol} with Jupiter:`, error.message);
      return coin;
    }
  }

  extractJupiterData(jupiterToken) {
    return {
      // Price and Market Data (Jupiter's real-time data)
      price_usd: jupiterToken.usdPrice || 0,
      market_cap_usd: jupiterToken.mcap || 0,
      volume_24h_usd: this.calculate24hVolume(jupiterToken.stats24h),
      liquidity_usd: jupiterToken.liquidity || 0,
      
      // Additional Jupiter-specific metrics
      holder_count: jupiterToken.holderCount,
      organic_score: jupiterToken.organicScore,
      organic_score_label: jupiterToken.organicScoreLabel,
      is_verified: jupiterToken.isVerified,
      
      // Security/Trust metrics
      mint_authority_disabled: jupiterToken.audit?.mintAuthorityDisabled,
      freeze_authority_disabled: jupiterToken.audit?.freezeAuthorityDisabled,
      top_holders_percentage: jupiterToken.audit?.topHoldersPercentage,
      
      // Trading stats
      price_change_24h: jupiterToken.stats24h?.priceChange,
      liquidity_change_24h: jupiterToken.stats24h?.liquidityChange,
      num_traders_24h: jupiterToken.stats24h?.numTraders,
      num_buys_24h: jupiterToken.stats24h?.numBuys,
      num_sells_24h: jupiterToken.stats24h?.numSells,
      
      // Exchange listings
      cex_listings: jupiterToken.cexes || [],
      
      // Tags and categorization
      jupiter_tags: jupiterToken.tags || [],
      
      // Supply info
      circulating_supply: jupiterToken.circSupply,
      total_supply: jupiterToken.totalSupply,
      fdv: jupiterToken.fdv,
      
      // Social metrics
      likes: jupiterToken.likes,
      smart_money_likes: jupiterToken.smartCtLikes,
      
      // Pool info
      first_pool_created: jupiterToken.firstPool?.createdAt,
      
      // Data source
      data_source: 'jupiter'
    };
  }

  calculate24hVolume(stats24h) {
    if (!stats24h) return 0;
    
    const buyVolume = stats24h.buyVolume || 0;
    const sellVolume = stats24h.sellVolume || 0;
    
    return buyVolume + sellVolume;
  }

  async batchEnrichCoins(coins, maxConcurrency = 5) {
    console.log(`🪐 Batch enriching ${coins.length} coins with Jupiter data...`);
    
    const results = [];
    const batchSize = maxConcurrency;
    
    for (let i = 0; i < coins.length; i += batchSize) {
      const batch = coins.slice(i, i + batchSize);
      
      console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(coins.length / batchSize)} (${batch.length} coins)`);
      
      const batchPromises = batch.map(coin => 
        this.enrichCoinWithJupiterData(coin)
      );
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error(`❌ Failed to enrich ${batch[index].symbol}:`, result.reason?.message);
          results.push(batch[index]); // Return original coin on failure
        }
      });
      
      // Rate limiting delay between batches
      if (i + batchSize < coins.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    const enrichedCount = results.filter(coin => coin.jupiterEnriched).length;
    console.log(`✅ Jupiter enrichment complete: ${enrichedCount}/${results.length} coins enhanced`);
    
    return results;
  }

  async getTopTokensByCategory(category = 'toporganicscore', interval = '24h', limit = 100) {
    try {
      console.log(`📈 Fetching top ${limit} ${category} tokens (${interval}) from Jupiter`);
      
      const response = await fetch(`${this.baseUrl}/${category}/${interval}?limit=${limit}`, {
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
      console.log(`✅ Got ${tokens.length} top tokens from Jupiter`);
      
      return tokens.map(token => this.formatJupiterTokenForFeed(token));
      
    } catch (error) {
      console.error(`❌ Error fetching top tokens from Jupiter:`, error.message);
      return [];
    }
  }

  formatJupiterTokenForFeed(jupiterToken) {
    return {
      mintAddress: jupiterToken.id,
      name: jupiterToken.name,
      symbol: jupiterToken.symbol,
      image: jupiterToken.icon,
      profileImage: jupiterToken.icon,
      logo: jupiterToken.icon,
      
      // Market data from Jupiter
      price_usd: jupiterToken.usdPrice || 0,
      market_cap_usd: jupiterToken.mcap || 0,
      volume_24h_usd: this.calculate24hVolume(jupiterToken.stats24h),
      liquidity_usd: jupiterToken.liquidity || 0,
      
      // Jupiter-specific enhancements
      ...this.extractJupiterData(jupiterToken),
      
      // Standard fields for compatibility
      created_timestamp: jupiterToken.firstPool?.createdAt ? 
        new Date(jupiterToken.firstPool.createdAt).getTime() : Date.now(),
      
      source: 'jupiter',
      enriched: true,
      enrichmentSource: 'jupiter'
    };
  }

  getCacheStats() {
    const keys = this.cache.keys();
    return {
      total_cached: keys.length,
      cache_hits: this.cache.getStats().hits,
      cache_misses: this.cache.getStats().misses
    };
  }

  clearCache() {
    this.cache.flushAll();
    console.log('🗑️ Jupiter cache cleared');
  }
}

module.exports = JupiterDataService;
