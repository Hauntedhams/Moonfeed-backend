const axios = require('axios');

class GeckoTerminalService {
  constructor() {
    this.baseURL = 'https://api.geckoterminal.com/api/v2';
    this.rateLimitDelay = 200; // 200ms between requests to respect rate limits
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache
    this.requestCount = 0;
    this.lastRequestTime = 0;
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async makeRequest(endpoint, params = {}) {
    // Rate limiting
    const now = Date.now();
    if (now - this.lastRequestTime < this.rateLimitDelay) {
      await this.delay(this.rateLimitDelay - (now - this.lastRequestTime));
    }
    this.lastRequestTime = Date.now();

    // Check cache
    const cacheKey = `${endpoint}_${JSON.stringify(params)}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      console.log(`[GeckoTerminal] Cache hit for ${endpoint}`);
      return cached.data;
    }

    try {
      const url = `${this.baseURL}${endpoint}`;
      console.log(`[GeckoTerminal] Making request to: ${url}`);
      
      // Use node-fetch with browser-like headers to bypass Cloudflare
      const fetch = require('node-fetch');
      const response = await fetch(url + (Object.keys(params).length > 0 ? '?' + new URLSearchParams(params) : ''), {
        method: 'GET',
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
          'Referer': 'https://www.geckoterminal.com/',
          'Origin': 'https://www.geckoterminal.com',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-site'
        },
        timeout: 15000
      });
      
      this.requestCount++;
      
      if (response.ok) {
        const data = await response.json();
        
        // Cache the response
        this.cache.set(cacheKey, { 
          data: data, 
          timestamp: Date.now() 
        });
        
        // Limit cache size
        if (this.cache.size > 100) {
          const firstKey = this.cache.keys().next().value;
          this.cache.delete(firstKey);
        }
        
        console.log(`[GeckoTerminal] ✅ Success: ${response.status}`);
        return data;
      } else {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }
    } catch (error) {
      console.error(`[GeckoTerminal] ❌ Error fetching ${endpoint}:`, error.message);
      if (error.code === 'ENOTFOUND') {
        throw new Error('Network error: Unable to reach GeckoTerminal API');
      }
      throw error;
    }
  }

  // Get pools for a token
  async getTokenPools(network, tokenAddress, limit = 20) {
    const endpoint = `/networks/${network}/tokens/${tokenAddress}/pools`;
    const params = { limit };
    
    try {
      const response = await this.makeRequest(endpoint, params);
      return response.data || [];
    } catch (error) {
      console.error(`[GeckoTerminal] Error fetching pools for ${tokenAddress}:`, error.message);
      return [];
    }
  }

  // Get OHLCV data for a pool
  async getPoolOHLCV(network, poolAddress, timeframe = '1h', limit = 300) {
    const endpoint = `/networks/${network}/pools/${poolAddress}/ohlcv/${timeframe}`;
    const params = { limit };
    
    try {
      const response = await this.makeRequest(endpoint, params);
      return response.data || [];
    } catch (error) {
      console.error(`[GeckoTerminal] Error fetching OHLCV for pool ${poolAddress}:`, error.message);
      return [];
    }
  }

  // Get best pool for a token (highest liquidity/volume)
  async getBestPool(network, tokenAddress) {
    try {
      const pools = await this.getTokenPools(network, tokenAddress, 10);
      
      if (!pools || pools.length === 0) {
        throw new Error('No pools found for token');
      }

      console.log(`[GeckoTerminal] Found ${pools.length} pools for token ${tokenAddress}`);
      
      // Sort pools by reserve_in_usd (liquidity) and volume_24h
      const bestPool = pools
        .filter(pool => pool.attributes && pool.attributes.reserve_in_usd > 1000) // Minimum $1k liquidity
        .sort((a, b) => {
          const aLiquidity = parseFloat(a.attributes.reserve_in_usd || 0);
          const bLiquidity = parseFloat(b.attributes.reserve_in_usd || 0);
          const aVolume = parseFloat(a.attributes.volume_usd?.h24 || 0);
          const bVolume = parseFloat(b.attributes.volume_usd?.h24 || 0);
          
          // Prioritize liquidity, then volume
          const liquidityDiff = bLiquidity - aLiquidity;
          if (Math.abs(liquidityDiff) > 1000) return liquidityDiff;
          return bVolume - aVolume;
        })[0];

      if (!bestPool) {
        throw new Error('No suitable pool found with sufficient liquidity');
      }

      console.log(`[GeckoTerminal] Using pool: ${bestPool.id} with liquidity: $${bestPool.attributes.reserve_in_usd}`);
      return bestPool;
      
    } catch (error) {
      console.error(`[GeckoTerminal] Error finding best pool:`, error.message);
      throw error;
    }
  }

  // Get historical data for a token (main method)
  async getTokenHistoricalData(network, tokenAddress, options = {}) {
    try {
      const {
        timeframe = '1h',
        limit = 200
      } = options;

      console.log(`[GeckoTerminal] Getting historical data for token: ${tokenAddress} on ${network}`);
      
      // Find the best pool for this token
      const bestPool = await this.getBestPool(network, tokenAddress);
      
      // Get OHLCV data from the best pool
      const ohlcvData = await this.getPoolOHLCV(network, bestPool.id, timeframe, limit);
      
      if (!ohlcvData || ohlcvData.length === 0) {
        throw new Error('No OHLCV data found');
      }

      console.log(`[GeckoTerminal] Retrieved ${ohlcvData.length} OHLCV data points`);

      return {
        token_address: tokenAddress,
        network: network,
        pool_used: {
          id: bestPool.id,
          name: bestPool.attributes.name,
          address: bestPool.attributes.address,
          liquidity_usd: parseFloat(bestPool.attributes.reserve_in_usd || 0),
          volume_24h: parseFloat(bestPool.attributes.volume_usd?.h24 || 0),
          base_token: bestPool.relationships?.base_token?.data,
          quote_token: bestPool.relationships?.quote_token?.data
        },
        historical_data: ohlcvData,
        timeframe: timeframe,
        data_points: ohlcvData.length,
        source: 'GeckoTerminal'
      };

    } catch (error) {
      console.error(`[GeckoTerminal] Error getting historical data:`, error.message);
      throw error;
    }
  }

  // Format data for charts (compatible with existing chart components)
  formatChartData(historicalData) {
    if (!historicalData || !historicalData.historical_data) {
      return [];
    }

    return historicalData.historical_data.map(ohlcv => {
      // GeckoTerminal OHLCV format: [timestamp, open, high, low, close, volume]
      const [timestamp, open, high, low, close, volume] = ohlcv;
      
      return {
        timestamp: timestamp * 1000, // Convert to milliseconds
        open: parseFloat(open),
        high: parseFloat(high),
        low: parseFloat(low),
        close: parseFloat(close),
        volume: parseFloat(volume),
        price: parseFloat(close), // Use close as main price
        date: new Date(timestamp * 1000).toISOString()
      };
    }).sort((a, b) => a.timestamp - b.timestamp); // Ensure chronological order
  }

  // Get simple price array for basic line charts
  getSimplePriceArray(historicalData) {
    const chartData = this.formatChartData(historicalData);
    return chartData.map(point => ({
      time: point.timestamp,
      price: point.price,
      date: point.date
    }));
  }

  // Map timeframes to GeckoTerminal supported intervals
  mapTimeframe(timeframe) {
    const mapping = {
      '1m': '1m',
      '5m': '5m', 
      '15m': '15m',
      '1h': '1h',
      '4h': '4h',
      '1d': '1d',
      '24h': '1d',
      '1w': '1d' // Use daily for weekly view
    };
    return mapping[timeframe] || '1h';
  }

  // Get statistics
  getStats() {
    return {
      totalRequests: this.requestCount,
      cacheSize: this.cache.size,
      lastRequestTime: this.lastRequestTime
    };
  }
}

module.exports = new GeckoTerminalService();
