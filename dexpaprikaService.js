const axios = require('axios');

class DexPaprikaService {
  constructor() {
    this.baseURL = 'https://api.dexpaprika.com';
    this.rateLimitDelay = 100; // 100ms between requests to respect rate limits
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getCacheKey(endpoint, params) {
    return `${endpoint}_${JSON.stringify(params)}`;
  }

  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  setCache(key, data) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  async makeRequest(endpoint, params = {}) {
    const cacheKey = this.getCacheKey(endpoint, params);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log(`[DexPaprika] Cache hit for ${endpoint}`);
      return cached;
    }

    try {
      await this.delay(this.rateLimitDelay);
      
      const url = `${this.baseURL}${endpoint}`;
      console.log(`[DexPaprika] Making request to: ${url}`);
      
      const response = await axios.get(url, { params });
      
      if (response.status === 200) {
        this.setCache(cacheKey, response.data);
        return response.data;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`[DexPaprika] Error fetching ${endpoint}:`, error.message);
      if (error.response) {
        console.error(`[DexPaprika] Response status: ${error.response.status}`);
        console.error(`[DexPaprika] Response data:`, error.response.data);
      }
      throw error;
    }
  }

  // Get token information including current price and metadata
  async getTokenInfo(network, tokenAddress) {
    const endpoint = `/networks/${network}/tokens/${tokenAddress}`;
    return await this.makeRequest(endpoint);
  }

  // Get top pools for a token
  async getTokenPools(network, tokenAddress, limit = 10) {
    const endpoint = `/networks/${network}/tokens/${tokenAddress}/pools`;
    return await this.makeRequest(endpoint, { limit });
  }

  // Get OHLCV data for a specific pool
  async getPoolOHLCV(network, poolAddress, options = {}) {
    const {
      start = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 days ago (increased from 30)
      end,
      limit = 200,  // Increased default limit
      interval = '1h',
      inversed = false
    } = options;

    const endpoint = `/networks/${network}/pools/${poolAddress}/ohlcv`;
    const params = { start, limit, interval, inversed };
    
    if (end) {
      params.end = end;
    }

    return await this.makeRequest(endpoint, params);
  }

  // Get historical price data for a token (finds best pool automatically)
  async getTokenHistoricalData(network, tokenAddress, options = {}) {
    try {
      console.log(`[DexPaprika] Getting historical data for token: ${tokenAddress} on ${network}`);
      
      // First, get the token's top pools
      const poolsData = await this.getTokenPools(network, tokenAddress, 5);
      
      if (!poolsData || !poolsData.pools || poolsData.pools.length === 0) {
        throw new Error('No pools found for this token');
      }

      // Debug: Log all available pools
      console.log(`[DexPaprika] Found ${poolsData.pools.length} pools for token ${tokenAddress}:`);
      poolsData.pools.forEach((pool, index) => {
        console.log(`[DexPaprika] Pool ${index + 1}: ${pool.id}, Liquidity: $${pool.liquidity_usd?.toLocaleString() || 'N/A'}, Volume 24h: $${pool['24h']?.volume_usd?.toLocaleString() || 'N/A'}`);
      });

      // Sort pools by liquidity and volume to find the best one - remove filter to see all pools
      const bestPool = poolsData.pools
        .sort((a, b) => {
          // Sort by liquidity first, then by 24h volume
          const liquidityDiff = (b.liquidity_usd || 0) - (a.liquidity_usd || 0);
          if (liquidityDiff !== 0) return liquidityDiff;
          return (b['24h']?.volume_usd || 0) - (a['24h']?.volume_usd || 0);
        })[0];

      if (!bestPool) {
        throw new Error('No suitable pool found with sufficient liquidity');
      }

      console.log(`[DexPaprika] Using pool: ${bestPool.id} with liquidity: $${bestPool.liquidity_usd?.toLocaleString()}`);

      // Get OHLCV data from the best pool
      const ohlcvData = await this.getPoolOHLCV(network, bestPool.id, options);

      // Transform the data to include metadata about the pool used
      return {
        token_address: tokenAddress,
        network: network,
        pool_used: {
          id: bestPool.id,
          pair: bestPool.pair,
          liquidity_usd: bestPool.liquidity_usd,
          volume_24h: bestPool['24h']?.volume_usd || 0
        },
        historical_data: ohlcvData || [],
        options_used: options
      };

    } catch (error) {
      console.error(`[DexPaprika] Error getting historical data:`, error.message);
      throw error;
    }
  }

  // Search for tokens, pools, and DEXes
  async search(query, limit = 10) {
    const endpoint = '/search';
    return await this.makeRequest(endpoint, { query, limit });
  }

  // Get current price for a token (simpler method)
  async getCurrentPrice(network, tokenAddress) {
    try {
      const tokenData = await this.getTokenInfo(network, tokenAddress);
      return {
        price_usd: tokenData.summary?.price_usd || 0,
        last_updated: tokenData.last_updated,
        symbol: tokenData.symbol,
        name: tokenData.name
      };
    } catch (error) {
      console.error(`[DexPaprika] Error getting current price:`, error.message);
      throw error;
    }
  }

  // Format OHLCV data for charts (compatible with existing chart components)
  formatChartData(historicalData, tokenSupply = null) {
    if (!historicalData || !historicalData.historical_data) {
      return [];
    }

    return historicalData.historical_data.map(candle => {
      const chartPoint = {
        timestamp: new Date(candle.time_open).getTime(),
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
        // Additional formatted fields for easier use
        date: candle.time_open,
        price: candle.close, // Use close price as the main price
        time_open: candle.time_open,
        time_close: candle.time_close
      };

      // Calculate market cap if token supply is provided
      if (tokenSupply && tokenSupply > 0) {
        chartPoint.market_cap = candle.close * tokenSupply;
        chartPoint.market_cap_open = candle.open * tokenSupply;
        chartPoint.market_cap_high = candle.high * tokenSupply;
        chartPoint.market_cap_low = candle.low * tokenSupply;
      }

      return chartPoint;
    });
  }

  // Get simple price array for basic line charts
  getSimplePriceArray(historicalData) {
    const chartData = this.formatChartData(historicalData);
    return chartData.map(point => ({
      timestamp: point.timestamp,
      price: point.price,
      date: point.date
    }));
  }
}

module.exports = new DexPaprikaService();
