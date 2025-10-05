require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const dexscreenerService = require('./dexscreenerService');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// Solana Tracker API Configuration
const SOLANA_TRACKER_API_KEY = process.env.SOLANA_TRACKER_API_KEY;
const SOLANA_TRACKER_BASE_URL = 'https://data.solanatracker.io';

if (!SOLANA_TRACKER_API_KEY) {
  console.warn('⚠️ SOLANA_TRACKER_API_KEY not found - running with sample data');
} else {
  console.log('✅ Solana Tracker API key loaded');
}

// Sample coin data for testing/demo
const sampleCoins = [
  {
    mintAddress: "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr",
    name: "dogwifhat",
    symbol: "WIF",
    image: "https://pump.fun/_next/image?url=https%3A%2F%2Fipfs.io%2Fipfs%2FQmW8GF5JsF4HnCuTm2VvF4oykY9eYTfA3Kp7gZqXqGxZ8Z&w=256&q=75",
    profileImage: "https://pump.fun/_next/image?url=https%3A%2F%2Fipfs.io%2Fipfs%2FQmW8GF5JsF4HnCuTm2VvF4oykY9eYTfA3Kp7gZqXqGxZ8Z&w=256&q=75",
    logo: "https://pump.fun/_next/image?url=https%3A%2F%2Fipfs.io%2Fipfs%2FQmW8GF5JsF4HnCuTm2VvF4oykY9eYTfA3Kp7gZqXqGxZ8Z&w=256&q=75",
    banner: dexscreenerService.generatePlaceholderBanner({ symbol: "WIF" }),
    price_usd: 0.00245,
    market_cap_usd: 2450000,
    volume_24h_usd: 1240000,
    liquidity_usd: 125000,
    priceChange24h: 12.5,
    age: 48,
    ageHours: 48,
    market: "pumpfun",
    source: "sample-data",
    rank: 1,
    buys: 1250,
    sells: 890,
    transactions: 2140,
    deployer: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
    isVerified: false,
    tags: ["pumpfun", "moonfeed", "meme"],
    description: "dogwifhat - the dog with a hat that everyone loves",
    socials: { twitter: "@dogwifcoin", telegram: "dogwifhat" },
    socialLinks: { twitter: "https://twitter.com/dogwifcoin" },
    holders: 15420,
    lpBurn: 0,
    freezeAuthority: null,
    mintAuthority: null,
    poolAddress: "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr",
    status: "active"
  },
  {
    mintAddress: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    name: "Bonk",
    symbol: "BONK",
    image: "https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I",
    profileImage: "https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I",
    logo: "https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I",
    banner: dexscreenerService.generatePlaceholderBanner({ symbol: "BONK" }),
    price_usd: 0.0000189,
    market_cap_usd: 1890000,
    volume_24h_usd: 890000,
    liquidity_usd: 95000,
    priceChange24h: -5.8,
    age: 72,
    ageHours: 72,
    market: "raydium",
    source: "sample-data",
    rank: 2,
    buys: 890,
    sells: 1120,
    transactions: 2010,
    deployer: "GDfnEsia2WLAW5t8yx2X5j2mkfA74i6fLnfgmeZiNPRG",
    isVerified: true,
    tags: ["raydium", "moonfeed", "meme"],
    description: "BONK - the community coin that bonks back",
    socials: { twitter: "@bonk_inu", telegram: "bonkinu_portal" },
    socialLinks: { twitter: "https://twitter.com/bonk_inu" },
    holders: 8540,
    lpBurn: 100,
    freezeAuthority: null,
    mintAuthority: null,
    poolAddress: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    status: "active"
  }
];

// Cache for tokens - never auto-expires
let moonfeedCache = {
  data: sampleCoins, // Start with sample data
  timestamp: Date.now()
};

// Make authenticated request to Solana Tracker API
async function makeSolanaTrackerRequest(endpoint, params = {}) {
  const url = new URL(endpoint, SOLANA_TRACKER_BASE_URL);
  
  // Add query parameters
  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== null) {
      url.searchParams.append(key, params[key]);
    }
  });

  console.log('🔗 Solana Tracker API call:', url.toString().replace(SOLANA_TRACKER_API_KEY, '[HIDDEN]'));

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-api-key': SOLANA_TRACKER_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Solana Tracker API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`✅ Solana Tracker response: ${data.status}, ${data.total || data.data?.length || 0} tokens`);
    
    return data;
    
  } catch (error) {
    console.error(`❌ Solana Tracker API error:`, error.message);
    throw error;
  }
}

// Get cached tokens only (no automatic refresh)
async function getMoonfeedTokens() {
  if (moonfeedCache.data.length > 0) {
    console.log('📊 Returning cached moonfeed data (no auto-refresh)');
    return moonfeedCache.data;
  }

  console.log('⚠️ No cached data available. Use /api/refresh endpoint to fetch new data.');
  return [];
}

// Manual refresh function (requires explicit call)
async function refreshMoonfeedTokens() {
  try {
    if (!SOLANA_TRACKER_API_KEY) {
      throw new Error('SOLANA_TRACKER_API_KEY not configured. Cannot refresh from API.');
    }

    console.log('🚨 MANUAL REFRESH: Fetching fresh data from Solana Tracker... (CONSUMING CREDITS!)');
    
    const searchParams = {
      minLiquidity: 50000,        // $50k minimum liquidity
      maxLiquidity: 500000,       // $500k maximum liquidity  
      minVolume: 50000,           // $50k minimum volume
      maxVolume: 5000000,         // $5M maximum volume
      volumeTimeframe: "24h",     // 24 hour timeframe
      minMarketCap: 300000,       // $300k minimum market cap
      maxMarketCap: 10000000,     // $10M maximum market cap
      limit: 300,                 // Get up to 300 tokens
      page: 1                     // First page
    };

    const response = await makeSolanaTrackerRequest('/search', searchParams);
    
    if (response.status !== 'success' || !response.data) {
      throw new Error('Invalid response from Solana Tracker');
    }

    const tokens = response.data;
    console.log(`🌙 Got ${tokens.length} moonfeed tokens`);

    // Format tokens for frontend
    const formattedTokens = tokens.map((token, index) => ({
      mintAddress: token.mint,
      name: token.name || 'Unknown',
      symbol: token.symbol || 'UNKNOWN',
      image: token.image || `https://via.placeholder.com/64/00d4ff/ffffff?text=${(token.symbol || 'T').charAt(0)}`,
      profileImage: token.image || `https://via.placeholder.com/64/00d4ff/ffffff?text=${(token.symbol || 'T').charAt(0)}`,
      logo: token.image || `https://via.placeholder.com/64/00d4ff/ffffff?text=${(token.symbol || 'T').charAt(0)}`,
      banner: dexscreenerService.generatePlaceholderBanner({ symbol: token.symbol }), // <-- Add banner property
      price_usd: token.priceUsd || 0,
      market_cap_usd: token.marketCapUsd || 0,
      volume_24h_usd: token.volume_24h || 0,
      liquidity_usd: token.liquidityUsd || 0,
      priceChange24h: 0,
      age: Math.floor((Date.now() - token.createdAt) / (1000 * 60 * 60)),
      ageHours: Math.floor((Date.now() - token.createdAt) / (1000 * 60 * 60)),
      market: token.market || 'unknown',
      source: 'solana-tracker',
      rank: index + 1,
      buys: token.buys || 0,
      sells: token.sells || 0,
      transactions: token.totalTransactions || 0,
      deployer: token.deployer || null,
      isVerified: token.verified || false,
      tags: [token.market, 'moonfeed'].filter(Boolean),
      description: `${token.symbol} token on ${token.market}`,
      socials: {},
      socialLinks: {},
      holders: token.holders || 0,
      lpBurn: token.lpBurn || 0,
      freezeAuthority: token.freezeAuthority,
      mintAuthority: token.mintAuthority,
      poolAddress: token.poolAddress,
      status: token.status || 'default'
    }));

    // Update cache
    moonfeedCache = {
      data: formattedTokens,
      timestamp: Date.now()
    };

    console.log(`✅ Cache updated with ${formattedTokens.length} tokens`);
    return formattedTokens;
    
  } catch (error) {
    console.error('❌ Error refreshing tokens:', error.message);
    throw error;
  }
}

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'moonfeed-simple-backend',
    cache: {
      tokens: moonfeedCache.data.length,
      lastUpdated: moonfeedCache.timestamp ? new Date(moonfeedCache.timestamp).toISOString() : 'never'
    }
  });
});

// Manual refresh endpoint - requires explicit confirmation  
app.post('/api/refresh', async (req, res) => {
  try {
    const { confirm } = req.body;
    
    if (confirm !== 'yes') {
      return res.status(400).json({
        error: 'Manual confirmation required',
        message: 'Send POST request with body: {"confirm": "yes"} to refresh data',
        warning: 'This will consume API credits!',
        example: 'curl -X POST http://localhost:3001/api/refresh -H "Content-Type: application/json" -d \'{"confirm": "yes"}\''
      });
    }

    console.log('🚨 MANUAL REFRESH TRIGGERED - This will consume credits!');
    const tokens = await refreshMoonfeedTokens();
    
    res.json({
      success: true,
      message: 'Data refreshed successfully',
      count: tokens.length,
      timestamp: new Date().toISOString(),
      warning: 'API credits consumed',
      cacheInfo: {
        tokens: moonfeedCache.data.length,
        lastUpdated: new Date(moonfeedCache.timestamp).toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Manual refresh failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh data',
      details: error.message
    });
  }
});

// Main endpoint for trending coins
app.get('/api/coins/trending', async (req, res) => {
  try {
    console.log('🔥 /api/coins/trending endpoint called');
    
    const tokens = await getMoonfeedTokens();
    const limit = Math.min(parseInt(req.query.limit) || 50, 300);
    const limitedTokens = tokens.slice(0, limit);
    
    if (tokens.length === 0) {
      return res.json({
        success: true,
        coins: [],
        count: 0,
        message: 'No cached data. Use POST /api/refresh with {"confirm": "yes"} to fetch new data.',
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({
      success: true,
      coins: limitedTokens,
      count: limitedTokens.length,
      total: tokens.length,
      timestamp: new Date().toISOString(),
      cacheAge: moonfeedCache.timestamp ? Math.floor((Date.now() - moonfeedCache.timestamp) / 1000) : 0
    });
    
  } catch (error) {
    console.error('❌ Error in trending endpoint:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tokens',
      details: error.message
    });
  }
});

// Legacy endpoints for compatibility
app.get('/api/coins/volume-enriched', async (req, res) => {
  console.log('🔄 /api/coins/volume-enriched endpoint called (redirecting to trending)');
  
  const tokens = await getMoonfeedTokens();
  const limit = Math.min(parseInt(req.query.limit) || 30, 100);
  const limitedTokens = tokens.slice(0, limit);
  
  res.json({
    success: true,
    coins: limitedTokens,
    count: limitedTokens.length,
    timestamp: new Date().toISOString(),
    source: 'solana-tracker-cached'
  });
});

// Cache stats endpoint
app.get('/api/cache/stats', (req, res) => {
  res.json({
    cache: {
      tokens: moonfeedCache.data.length,
      lastUpdated: moonfeedCache.timestamp ? new Date(moonfeedCache.timestamp).toISOString() : 'never',
      cacheAge: moonfeedCache.timestamp ? Math.floor((Date.now() - moonfeedCache.timestamp) / 1000) : 0,
      autoRefresh: false,
      refreshMethod: 'manual only'
    },
    instructions: {
      refresh: 'POST /api/refresh with body: {"confirm": "yes"}',
      warning: 'Manual refresh will consume API credits'
    },
    timestamp: new Date().toISOString()
  });
});

// Enrich specific coins with DexScreener data for active viewing
app.post('/api/coins/enrich', async (req, res) => {
  try {
    const { mintAddresses } = req.body;
    
    if (!Array.isArray(mintAddresses) || mintAddresses.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'mintAddresses array is required'
      });
    }

    console.log(`🔍 Enriching ${mintAddresses.length} coins with DexScreener data...`);
    
    // Find coins from cache that match the requested addresses
    const coinsToEnrich = moonfeedCache.data.filter(coin => 
      mintAddresses.includes(coin.mintAddress)
    );

    if (coinsToEnrich.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No matching coins found in cache'
      });
    }

    // Enrich coins with DexScreener data
    const enrichedCoins = await Promise.all(
      coinsToEnrich.map(async (coin) => {
        try {
          console.log(`🚀 Enriching ${coin.symbol} (${coin.mintAddress})...`);
          const enrichedCoin = await dexscreenerService.enrichCoin(coin);
          
          // If no real banner was found, ensure we have a placeholder
          if (!enrichedCoin.banner) {
            enrichedCoin.banner = dexscreenerService.generatePlaceholderBanner({ symbol: coin.symbol });
          }
          
          return enrichedCoin;
        } catch (error) {
          console.error(`❌ Failed to enrich ${coin.symbol}:`, error.message);
          // Return original coin with placeholder banner if enrichment fails
          return {
            ...coin,
            banner: coin.banner || dexscreenerService.generatePlaceholderBanner({ symbol: coin.symbol })
          };
        }
      })
    );

    console.log(`✅ Successfully enriched ${enrichedCoins.length} coins`);

    res.json({
      success: true,
      coins: enrichedCoins,
      count: enrichedCoins.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error enriching coins:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to enrich coins',
      details: error.message
    });
  }
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log('🚀 Moonfeed Simple Backend (Credit-Safe Mode) started!');
    console.log(`📡 Server running on port ${PORT}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log(`🌙 Trending coins: http://localhost:${PORT}/api/coins/trending`);
    console.log(`🔄 Manual refresh: POST http://localhost:${PORT}/api/refresh`);
    console.log('⚠️  AUTO-REFRESH DISABLED - Manual refresh required');
    console.log('💰 API credits will only be used on manual refresh');
  });
}

module.exports = app;
