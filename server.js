require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const CoinStorage = require('./coin-storage');
const dexscreenerService = require('./dexscreenerService');
const dexpaprikaService = require('./dexpaprikaService');
const heliusService = require('./heliusService');
const rugcheckService = require('./rugcheckService');
const RugcheckAutoProcessor = require('./rugcheckAutoProcessor');
const JupiterTokenService = require('./jupiterTokenService');
const JupiterDataService = require('./jupiterDataService');
const TokenMetadataService = require('./tokenMetadataService');

const app = express();
const PORT = process.env.PORT || 3001;
const coinStorage = new CoinStorage();

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173', 
    'http://localhost:5174', 
    'http://localhost:3000',
    'https://moonfeed.app',
    'https://www.moonfeed.app'
  ],
  credentials: true
}));
app.use(express.json());
app.use(express.json());

// Solana Tracker API Configuration
const SOLANA_TRACKER_API_KEY = process.env.SOLANA_TRACKER_API_KEY;
const SOLANA_TRACKER_BASE_URL = 'https://data.solanatracker.io';

// Current serving cache (from latest batch)
let currentCoins = [];

// Initialize Rugcheck auto-processor
const rugcheckAutoProcessor = new RugcheckAutoProcessor();

// Initialize Jupiter Token Service
const jupiterTokenService = new JupiterTokenService();

// Initialize Jupiter Data Service for market data
const jupiterDataService = new JupiterDataService();

// Initialize Token Metadata Service for metadata enrichment
const tokenMetadataService = new TokenMetadataService();

// Initialize with latest batch
function initializeWithLatestBatch() {
  const latestBatch = coinStorage.getLatestBatch();
  if (latestBatch.length > 0) {
    currentCoins = latestBatch;
    console.log(`🚀 Initialized with latest batch: ${latestBatch.length} coins`);
    
    // Start auto-processor for the loaded batch
    startRugcheckAutoProcessor();
  } else {
    console.log('📭 No saved batches found, using sample data');
    // Sample data as fallback
    currentCoins = [
      {
        mintAddress: "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr",
        name: "dogwifhat",
        symbol: "WIF",
        image: "https://pump.fun/_next/image?url=https%3A%2F%2Fipfs.io%2Fipfs%2FQmW8GFq&w=256&q=75",
        profileImage: "https://pump.fun/_next/image?url=https%3A%2F%2Fipfs.io%2Fipfs%2FQmW8GFq&w=256&q=75",
        logo: "https://pump.fun/_next/image?url=https%3A%2F%2Fipfs.io%2Fipfs%2FQmW8GFq&w=256&q=75",
        banner: dexscreenerService.generatePlaceholderBanner({ symbol: "WIF" }),
        price_usd: 0.00245,
        market_cap_usd: 2450000,
        volume_24h_usd: 1240000,
        liquidity_usd: 125000,
        description: "dogwifhat - the dog with a hat that everyone loves",
        socialLinks: {},
        socials: {}
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
        description: "BONK - the community coin that bonks back",
        socialLinks: {},
        socials: {}
      }
    ];
  }
}

// Make Solana Tracker API request
async function makeSolanaTrackerRequest(endpoint, params = {}) {
  if (!SOLANA_TRACKER_API_KEY) {
    throw new Error('SOLANA_TRACKER_API_KEY not configured');
  }

  const url = new URL(endpoint, SOLANA_TRACKER_BASE_URL);
  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== null) {
      url.searchParams.append(key, params[key]);
    }
  });

  console.log('🔗 Solana Tracker API call:', url.toString().replace(SOLANA_TRACKER_API_KEY, '[HIDDEN]'));

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
  console.log(`✅ Solana Tracker response: ${data.status}, ${data.data?.length || 0} tokens`);
  
  return data;
}

// Fetch ALL coins from Solana Tracker (no limit)
async function fetchFreshCoinBatch() {
  const searchParams = {
    minLiquidity: 50000,        // $50k minimum liquidity
    maxLiquidity: 500000,       // $500k maximum liquidity  
    minVolume: 50000,           // $50k minimum volume
    maxVolume: 5000000,         // $5M maximum volume
    volumeTimeframe: "24h",     // 24 hour timeframe
    minMarketCap: 300000,       // $300k minimum market cap
    maxMarketCap: 10000000,     // $10M maximum market cap
    // NO LIMIT - get all available coins that match criteria
    page: 1                     // First page
  };

  console.log(`🚨 ONE API CALL - Fetching ALL matching coins (no limit)`);
  const response = await makeSolanaTrackerRequest('/search', searchParams);
  
  if (response.status !== 'success' || !response.data) {
    throw new Error('Invalid response from Solana Tracker');
  }

  const tokens = response.data;
  console.log(`🌙 Got ${tokens.length} tokens in this batch`);

  // Format tokens for frontend
  const formattedTokens = tokens.map((token, index) => ({
    mintAddress: token.mint,
    name: token.name || 'Unknown',
    symbol: token.symbol || 'UNKNOWN',
    image: token.image || `https://via.placeholder.com/64/00d4ff/ffffff?text=${(token.symbol || 'T').charAt(0)}`,
    profileImage: token.image || `https://via.placeholder.com/64/00d4ff/ffffff?text=${(token.symbol || 'T').charAt(0)}`,
    logo: token.image || `https://via.placeholder.com/64/00d4ff/ffffff?text=${(token.symbol || 'T').charAt(0)}`,
    price_usd: token.priceUsd || 0,
    market_cap_usd: token.marketCapUsd || 0,
    volume_24h_usd: token.volume_24h || 0,
    liquidity: token.liquidity || 0,
    liquidity_usd: token.liquidityUsd || token.liquidity || 0,
    created_timestamp: token.createdAt ? new Date(token.createdAt).getTime() : Date.now(),
    description: token.description || '',
    // Additional fields for compatibility
    buys_24h: token.buys_24h || 0,
    sells_24h: token.sells_24h || 0,
    transactions_24h: (token.buys_24h || 0) + (token.sells_24h || 0),
    priority: index + 1 // Simple priority based on API order
  }));
  
  // Apply priority scoring like in trending endpoint
  const coinsWithPriority = rugcheckService.sortCoinsByPriority(formattedTokens);

  console.log(`🔍 Final result: ${coinsWithPriority.length} coins after priority sorting`);
  
  return coinsWithPriority;
}

// Enhanced enrichment function with Rugcheck integration
async function enrichCoinsWithRugcheck(coins) {
  console.log(`🔍 Checking ${coins.length} coins with Rugcheck for liquidity locks...`);
  
  // Extract mint addresses for batch checking
  const mintAddresses = coins.map(coin => 
    coin.mintAddress || coin.tokenAddress || coin.address
  ).filter(Boolean);

  if (mintAddresses.length === 0) {
    console.log('⚠️ No valid mint addresses found for Rugcheck analysis');
    return coins;
  }

  // Batch check with Rugcheck (limited to avoid rate limits)
  const rugcheckResults = await rugcheckService.checkMultipleTokens(mintAddresses, {
    maxConcurrent: 2,     // Lower concurrency to be respectful
    batchDelay: 1500,     // 1.5s between batches
    maxTokens: 30         // Limit to 30 tokens to avoid overwhelming the API
  });
  
  // Map results back to coins
  const enrichedCoins = coins.map(coin => {
    const mintAddress = coin.mintAddress || coin.tokenAddress || coin.address;
    const rugcheckData = rugcheckResults.find(r => r.address === mintAddress);
    
    if (rugcheckData && rugcheckData.rugcheckAvailable) {
      return {
        ...coin,
        // Rugcheck data takes precedence for liquidity lock status
        liquidityLocked: rugcheckData.liquidityLocked,
        lockPercentage: rugcheckData.lockPercentage,
        burnPercentage: rugcheckData.burnPercentage,
        rugcheckScore: rugcheckData.score,
        riskLevel: rugcheckData.riskLevel,
        freezeAuthority: rugcheckData.freezeAuthority,
        mintAuthority: rugcheckData.mintAuthority,
        topHolderPercent: rugcheckData.topHolderPercent,
        isHoneypot: rugcheckData.isHoneypot,
        rugcheckVerified: true
      };
    }
    
    // Keep existing data if Rugcheck is unavailable
    return {
      ...coin,
      rugcheckVerified: false
    };
  });

  const lockedCount = enrichedCoins.filter(coin => coin.liquidityLocked).length;
  const verifiedCount = enrichedCoins.filter(coin => coin.rugcheckVerified).length;
  
  console.log(`✅ Rugcheck enrichment complete: ${verifiedCount}/${enrichedCoins.length} verified, ${lockedCount} have locked liquidity`);
  
  return enrichedCoins;
}

// Start Rugcheck auto-processor
function startRugcheckAutoProcessor() {
  // Stop any existing processor
  rugcheckAutoProcessor.stop();
  
  // Start processor with reference to currentCoins
  rugcheckAutoProcessor.start(() => currentCoins);
  
  console.log('🔍 Rugcheck auto-processor started for current batch');
}

// Routes

// Health check
app.get('/health', (req, res) => {
  const stats = coinStorage.getStats();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'moonfeed-batch-backend',
    currentCoins: currentCoins.length,
    storage: stats,
    hasApiKey: !!SOLANA_TRACKER_API_KEY
  });
});

// Get current coins with Jupiter enhancement
app.get('/api/coins/trending', async (req, res) => {
  try {
    console.log('🔥 /api/coins/trending endpoint called (Jupiter-enhanced)');
    
    const limit = parseInt(req.query.limit) || 50;
    const useJupiterPrimary = req.query.jupiter !== 'false'; // Default to true
    const fallbackToStored = req.query.fallback !== 'false'; // Default to true
    
    let coins = [];
    let dataSource = 'unknown';
    
    if (useJupiterPrimary) {
      try {
        console.log('🪐 Fetching trending tokens from Jupiter API...');
        
        // Get high-quality tokens from Jupiter
        const jupiterCoins = await jupiterDataService.getTopTokensByCategory(
          'toporganicscore', 
          '24h', 
          Math.min(limit * 2, 100) // Get more to filter better ones
        );
        
        if (jupiterCoins && jupiterCoins.length > 0) {
          // Filter for meme/trading tokens (exclude major stablecoins/wrapped tokens)
          const filteredCoins = jupiterCoins.filter(coin => {
            // Skip major stablecoins and wrapped tokens for meme feed
            const skipSymbols = ['SOL', 'USDC', 'USDT', 'WBTC', 'ETH'];
            return !skipSymbols.includes(coin.symbol) && 
                   coin.market_cap_usd < 100000000 && // Under $100M market cap
                   coin.holder_count > 100; // At least 100 holders
          });
          
          coins = filteredCoins.slice(0, limit);
          dataSource = 'jupiter-primary';
          console.log(`✅ Got ${coins.length} filtered Jupiter coins`);
        }
      } catch (jupiterError) {
        console.warn('⚠️ Jupiter API failed, falling back to stored coins:', jupiterError.message);
      }
    }
    
    // Fallback to current stored coins enhanced with Jupiter data
    if (coins.length === 0 && fallbackToStored && currentCoins.length > 0) {
      console.log('📦 Using stored coins enhanced with Jupiter data...');
      
      try {
        // Take current coins and enhance with Jupiter
        const coinsToEnhance = rugcheckService.sortCoinsByPriority(currentCoins)
          .slice(0, Math.min(limit, 20)); // Limit Jupiter API calls
        
        const enhancedCoins = await jupiterDataService.batchEnrichCoins(coinsToEnhance, 3);
        
        // Sort enhanced coins by Jupiter metrics if available
        coins = enhancedCoins.sort((a, b) => {
          // Prioritize Jupiter-enhanced coins
          if (a.jupiterEnriched && !b.jupiterEnriched) return -1;
          if (!a.jupiterEnriched && b.jupiterEnriched) return 1;
          
          // Sort by organic score if available
          if (a.organic_score && b.organic_score) {
            return b.organic_score - a.organic_score;
          }
          
          // Fallback to priority score or market cap
          if (a.priorityScore?.score && b.priorityScore?.score) {
            return b.priorityScore.score - a.priorityScore.score;
          }
          
          return (b.market_cap_usd || 0) - (a.market_cap_usd || 0);
        });
        
        dataSource = 'hybrid-jupiter-enhanced';
        console.log(`✅ Enhanced ${coins.length} stored coins with Jupiter data`);
        
      } catch (enhanceError) {
        console.warn('⚠️ Jupiter enhancement failed, using raw stored coins:', enhanceError.message);
        
        // Final fallback: use raw stored coins
        coins = rugcheckService.sortCoinsByPriority(currentCoins)
          .slice(0, limit);
        dataSource = 'stored-fallback';
      }
    }
    
    // Last resort: empty result
    if (coins.length === 0) {
      console.warn('⚠️ No coins available from any source');
      coins = [];
      dataSource = 'none';
    }
    
    const enhancedCount = coins.filter(coin => coin.jupiterEnriched).length;
    const jupiterPrimaryCount = coins.filter(coin => coin.source === 'jupiter').length;
    
    console.log(`📊 Trending result: ${coins.length} coins, ${enhancedCount} Jupiter-enhanced, ${jupiterPrimaryCount} Jupiter-primary`);
    
    res.json({
      success: true,
      coins: coins,
      count: coins.length,
      total: currentCoins.length,
      jupiter_enhanced: enhancedCount,
      jupiter_primary: jupiterPrimaryCount,
      enhancement_rate: coins.length > 0 ? `${((enhancedCount / coins.length) * 100).toFixed(1)}%` : '0%',
      data_source: dataSource,
      timestamp: new Date().toISOString(),
      // Legacy compatibility
      source: dataSource
    });
    
  } catch (error) {
    console.error('❌ Error in trending endpoint:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trending tokens',
      details: error.message
    });
  }
});

// Volume-based coins with Jupiter enhancement
app.get('/api/coins/solana-volume', async (req, res) => {
  try {
    console.log('📊 /api/coins/solana-volume endpoint called (Jupiter-enhanced)');
    
    const limit = parseInt(req.query.limit) || 50;
    const useJupiterPrimary = req.query.jupiter !== 'false';
    
    let coins = [];
    let dataSource = 'unknown';
    
    if (useJupiterPrimary) {
      try {
        console.log('🪐 Fetching volume-focused tokens from Jupiter...');
        
        // Get tokens with high trading activity
        const jupiterCoins = await jupiterDataService.getTopTokensByCategory(
          'toptraded', 
          '24h', 
          Math.min(limit * 2, 100)
        );
        
        if (jupiterCoins && jupiterCoins.length > 0) {
          // Filter and sort by volume
          const volumeCoins = jupiterCoins
            .filter(coin => {
              const skipSymbols = ['SOL', 'USDC', 'USDT'];
              return !skipSymbols.includes(coin.symbol) && 
                     coin.volume_24h_usd > 10000 && // Minimum $10k volume
                     coin.market_cap_usd < 50000000; // Under $50M for meme focus
            })
            .sort((a, b) => (b.volume_24h_usd || 0) - (a.volume_24h_usd || 0))
            .slice(0, limit);
          
          coins = volumeCoins;
          dataSource = 'jupiter-volume-primary';
          console.log(`✅ Got ${coins.length} volume-focused Jupiter coins`);
        }
      } catch (jupiterError) {
        console.warn('⚠️ Jupiter volume API failed:', jupiterError.message);
      }
    }
    
    // Fallback to enhanced stored coins
    if (coins.length === 0 && currentCoins.length > 0) {
      console.log('📦 Using stored coins with Jupiter volume enhancement...');
      
      try {
        const coinsToEnhance = rugcheckService.sortCoinsByPriority(currentCoins)
          .slice(0, Math.min(limit, 15));
        
        const enhancedCoins = await jupiterDataService.batchEnrichCoins(coinsToEnhance, 3);
        
        // Sort by volume (Jupiter data preferred)
        coins = enhancedCoins.sort((a, b) => {
          const aVolume = a.volume_24h_usd || a.volume_24h || 0;
          const bVolume = b.volume_24h_usd || b.volume_24h || 0;
          return bVolume - aVolume;
        });
        
        dataSource = 'hybrid-volume-enhanced';
        
      } catch (enhanceError) {
        console.warn('⚠️ Enhancement failed, using raw coins:', enhanceError.message);
        coins = rugcheckService.sortCoinsByPriority(currentCoins).slice(0, limit);
        dataSource = 'stored-volume-fallback';
      }
    }
    
    const enhancedCount = coins.filter(coin => coin.jupiterEnriched).length;
    
    res.json({
      success: true,
      coins: coins,
      count: coins.length,
      total: currentCoins.length,
      jupiter_enhanced: enhancedCount,
      data_source: dataSource,
      timestamp: new Date().toISOString(),
      source: dataSource // Legacy compatibility
    });
    
  } catch (error) {
    console.error('❌ Error in volume endpoint:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch volume tokens',
      details: error.message
    });
  }
});

// Latest coins (sort by age/creation time)
app.get('/api/coins/solana-latest', (req, res) => {
  try {
    console.log('🆕 /api/coins/solana-latest endpoint called');
    
    const limit = parseInt(req.query.limit) || currentCoins.length;
    
    // Filter for newer coins (less than 7 days old) then apply priority sorting
    const recentCoins = currentCoins.filter(coin => (coin.age || 0) < 168); // 168 hours = 7 days
    const coins = rugcheckService.sortCoinsByPriority(recentCoins)
      .slice(0, limit);
    
    console.log(`🆕 First recent coin after priority sorting: ${coins[0]?.symbol} (Age: ${coins[0]?.age}h, Score: ${coins[0]?.priorityScore?.score?.toFixed(1)})`);
    
    res.json({
      success: true,
      coins: coins,
      count: coins.length,
      total: currentCoins.length,
      timestamp: new Date().toISOString(),
      source: 'batch-storage-latest'
    });
    
  } catch (error) {
    console.error('❌ Error in latest endpoint:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch latest tokens',
      details: error.message
    });
  }
});

// Fast coins endpoint - serves raw data immediately (no enrichment)
app.get('/api/coins/fast', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    
    console.log(`⚡ Fast endpoint: Serving ${Math.min(limit, currentCoins.length)} coins (raw data, no enrichment)`);
    
    if (currentCoins.length === 0) {
      return res.json({
        success: true,
        coins: [],
        count: 0,
        total: 0,
        message: 'No coins currently loaded',
        timestamp: new Date().toISOString(),
        source: 'fast-raw'
      });
    }
    
    // Serve coins as-is from Solana Tracker (no enrichment)
    const fastCoins = currentCoins.slice(0, limit).map(coin => ({
      // Essential data for immediate UI display
      mintAddress: coin.mintAddress,
      address: coin.mintAddress,
      symbol: coin.symbol,
      name: coin.name,
      image: coin.image || coin.profileImage || coin.logo,
      
      // Market data from Solana Tracker
      price_usd: coin.price_usd || coin.priceUsd || coin.price || 0,
      market_cap_usd: coin.market_cap_usd || coin.marketCap || 0,
      liquidity_usd: coin.liquidity_usd || coin.liquidity?.usd || 0,
      volume_24h_usd: coin.volume_24h_usd || coin.volume24h || coin.volume || 0,
      
      // Price changes
      priceChange24h: coin.priceChange24h || 0,
      priceChange1h: coin.priceChange1h || 0,
      priceChange5m: coin.priceChange5m || 0,
      
      // Transaction data
      buys_24h: coin.buys_24h || 0,
      sells_24h: coin.sells_24h || 0,
      transactions_24h: coin.transactions_24h || (coin.buys_24h || 0) + (coin.sells_24h || 0),
      
      // Basic metadata
      created_timestamp: coin.created_timestamp,
      createdAt: coin.createdAt,
      description: coin.description || '',
      website: coin.website,
      twitter: coin.twitter,
      telegram: coin.telegram,
      
      // Flags
      isScam: coin.isScam || false,
      isPumpFun: coin.isPumpFun || false,
      
      // Source tracking
      source: 'solana-tracker-raw',
      enriched: false, // Mark as not enriched
      lastUpdated: coin.lastUpdated || new Date().toISOString()
    }));
    
    res.json({
      success: true,
      coins: fastCoins,
      count: fastCoins.length,
      total: currentCoins.length,
      message: 'Raw coin data served for fast UI loading',
      enrichment: {
        status: 'pending',
        note: 'Use /api/coins/enrich endpoint to get enriched data with banners and security analysis'
      },
      timestamp: new Date().toISOString(),
      source: 'fast-raw'
    });
    
  } catch (error) {
    console.error('❌ Error in fast endpoint:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to serve fast coin data',
      details: error.message
    });
  }
});

// Main curated coins endpoint (alias for trending)
app.get('/api/coins/curated', (req, res) => {
  try {
    console.log('🔍 /api/coins/curated endpoint called');
    
    const limit = parseInt(req.query.limit) || currentCoins.length;
    
    // Use priority sorting for curated coins
    const coins = rugcheckService.sortCoinsByPriority(currentCoins)
      .slice(0, limit);
    
    console.log(`📊 Serving ${coins.length} curated coins`);
    
    res.json({
      success: true,
      coins: coins,
      count: coins.length,
      total: currentCoins.length,
      timestamp: new Date().toISOString(),
      source: 'curated-batch'
    });
    
  } catch (error) {
    console.error('❌ Error in curated endpoint:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch curated coins',
      details: error.message
    });
  }
});

// Background enrichment endpoint - progressively enriches coins with banners and security data
app.post('/api/coins/background-enrich', async (req, res) => {
  try {
    const { 
      startIndex = 0, 
      batchSize = 10,
      includeBanners = true,
      includeRugcheck = true 
    } = req.body;
    
    if (currentCoins.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No coins currently loaded'
      });
    }

    const totalCoins = currentCoins.length;
    const remainingCoins = totalCoins - startIndex;
    const coinsToProcess = Math.min(batchSize, remainingCoins);
    
    if (startIndex >= totalCoins) {
      return res.json({
        success: true,
        message: 'All coins have been enriched',
        progress: {
          processed: totalCoins,
          total: totalCoins,
          percentage: 100,
          completed: true
        }
      });
    }

    console.log(`🎨 Background enrichment: Processing batch starting at index ${startIndex} (${coinsToProcess} coins)`);
    
    // Get the batch of coins to enrich
    const batchToProcess = currentCoins.slice(startIndex, startIndex + coinsToProcess);
    
    // Enrich this batch with DexScreener (banners) and Rugcheck (security)
    let enrichedBatch = [...batchToProcess];
    
    if (includeBanners) {
      console.log(`🎨 Adding banners to ${enrichedBatch.length} coins...`);
      enrichedBatch = await Promise.all(enrichedBatch.map(async (coin) => {
        try {
          if (!coin.banner && !coin.enriched) {
            const enrichedCoin = await dexscreenerService.enrichCoin(coin, {
              includeBanners: true,
              forceBannerEnrichment: true
            });
            return enrichedCoin;
          }
          return coin;
        } catch (error) {
          console.log(`⚠️ Banner enrichment failed for ${coin.symbol}: ${error.message}`);
          return {
            ...coin,
            banner: coin.banner || dexscreenerService.generatePlaceholderBanner({ symbol: coin.symbol })
          };
        }
      }));
    }
    
    if (includeRugcheck) {
      console.log(`🔒 Adding security analysis to ${enrichedBatch.length} coins...`);
      const mintAddresses = enrichedBatch.map(coin => coin.mintAddress).filter(Boolean);
      
      try {
        const rugcheckResults = await rugcheckService.checkMultipleTokens(mintAddresses, {
          maxConcurrent: 2,
          batchDelay: 1000,
          maxTokens: coinsToProcess
        });
        
        // Update batch with Rugcheck data
        enrichedBatch = enrichedBatch.map(coin => {
          const rugcheckData = rugcheckResults.find(r => r.address === coin.mintAddress);
          if (rugcheckData && rugcheckData.rugcheckAvailable) {
            return {
              ...coin,
              liquidityLocked: rugcheckData.liquidityLocked,
              lockPercentage: rugcheckData.lockPercentage,
              burnPercentage: rugcheckData.burnPercentage,
              rugcheckScore: rugcheckData.score,
              riskLevel: rugcheckData.riskLevel,
              rugcheckVerified: true,
              rugcheckProcessedAt: new Date().toISOString()
            };
          }
          return coin;
        });
      } catch (rugcheckError) {
        console.log(`⚠️ Rugcheck batch failed: ${rugcheckError.message}`);
      }
    }
    
    // Update the current coins array with enriched data
    for (let i = 0; i < enrichedBatch.length; i++) {
      currentCoins[startIndex + i] = enrichedBatch[i];
    }
    
    // Calculate progress
    const processedSoFar = startIndex + coinsToProcess;
    const progressPercentage = Math.round((processedSoFar / totalCoins) * 100);
    const nextIndex = processedSoFar;
    const hasMore = nextIndex < totalCoins;
    
    // Count enrichment stats
    const bannersAdded = enrichedBatch.filter(coin => coin.banner).length;
    const rugcheckAdded = enrichedBatch.filter(coin => coin.rugcheckVerified).length;
    const locksFound = enrichedBatch.filter(coin => coin.liquidityLocked).length;

    console.log(`✅ Background enrichment batch complete: ${bannersAdded} banners, ${rugcheckAdded} rugcheck, ${locksFound} locks`);

    res.json({
      success: true,
      message: `Background enrichment batch ${Math.ceil(processedSoFar / batchSize)} completed`,
      batch: {
        startIndex,
        processed: coinsToProcess,
        bannersAdded,
        rugcheckAdded,
        locksFound
      },
      progress: {
        processed: processedSoFar,
        total: totalCoins,
        percentage: progressPercentage,
        completed: !hasMore
      },
      next: hasMore ? {
        startIndex: nextIndex,
        remaining: totalCoins - processedSoFar,
        estimatedBatches: Math.ceil((totalCoins - processedSoFar) / batchSize)
      } : null,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error in background enrichment:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to perform background enrichment',
      details: error.message
    });
  }
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
    
    // Find coins from current cache that match the requested addresses
    const coinsToEnrich = currentCoins.filter(coin => 
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
    console.error('❌ Error in enrichment endpoint:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to enrich coins',
      details: error.message
    });
  }
});

// Force enrichment of all current coins with DexScreener data (including banners and market data)
app.post('/api/coins/force-enrich', async (req, res) => {
  try {
    const { includeBanners = true, includeMarketData = true } = req.body;
    
    console.log(`🎨 Force enriching ${currentCoins.length} coins with DexScreener data...`);
    console.log(`📊 Include banners: ${includeBanners}, Include market data: ${includeMarketData}`);
    
    if (currentCoins.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No coins available to enrich'
      });
    }

    // Enrich all current coins with enhanced options
    const enrichedCoins = await dexscreenerService.enrichCoins(currentCoins, {
      useBatchApi: true,
      batchSize: 25,
      batchDelay: 1200,
      maxToEnrich: currentCoins.length, // Enrich all coins
      forceBannerEnrichment: includeBanners
    });

    console.log(`🔍 Adding Rugcheck verification to enriched coins...`);
    
    // Add Rugcheck enrichment for liquidity lock verification
    const finalEnrichedCoins = await enrichCoinsWithRugcheck(enrichedCoins);

    // Update current serving coins with enriched data
    currentCoins = finalEnrichedCoins;
    
    // Detailed analytics
    const coinsWithBanners = finalEnrichedCoins.filter(coin => coin.banner).length;
    const coinsWithRealBanners = finalEnrichedCoins.filter(coin => 
      coin.banner && !coin.banner.includes('dicebear.com') && !coin.banner.includes('placeholder')
    ).length;
    
    const coinsWithMarketData = finalEnrichedCoins.filter(coin => 
      coin.market_cap_usd || coin.volume_24h_usd || coin.liquidity_usd
    ).length;
    
    const coinsWithDexScreenerData = finalEnrichedCoins.filter(coin => coin.dexscreener).length;
    const coinsWithRugcheckData = finalEnrichedCoins.filter(coin => coin.rugcheckVerified).length;
    const coinsWithLockedLiquidity = finalEnrichedCoins.filter(coin => coin.liquidityLocked).length;
    
    const enrichmentQuality = finalEnrichedCoins.reduce((acc, coin) => {
      if (coin.enrichmentQuality) {
        acc.withImage += coin.enrichmentQuality.hasImage ? 1 : 0;
        acc.withSocials += coin.enrichmentQuality.hasSocials ? 1 : 0;
        acc.withDescription += coin.enrichmentQuality.hasDescription ? 1 : 0;
        acc.withMarketData += coin.enrichmentQuality.hasMarketData ? 1 : 0;
      }
      return acc;
    }, { withImage: 0, withSocials: 0, withDescription: 0, withMarketData: 0 });

    console.log(`✅ Successfully enriched ${finalEnrichedCoins.length} coins`);
    console.log(`🎨 Banners: ${coinsWithBanners} total, ${coinsWithRealBanners} real (from DexScreener)`);
    console.log(`📊 Market data: ${coinsWithMarketData}/${finalEnrichedCoins.length} coins have enhanced market metrics`);
    console.log(`🔍 Rugcheck: ${coinsWithRugcheckData}/${finalEnrichedCoins.length} verified, ${coinsWithLockedLiquidity} have locked liquidity`);

    res.json({
      success: true,
      message: 'All coins enriched with comprehensive DexScreener and Rugcheck data',
      stats: {
        total: finalEnrichedCoins.length,
        enriched: finalEnrichedCoins.filter(coin => coin.enriched).length,
        withDexScreenerData: coinsWithDexScreenerData,
        withRugcheckData: coinsWithRugcheckData,
        withLockedLiquidity: coinsWithLockedLiquidity,
        banners: {
          total: coinsWithBanners,
          real: coinsWithRealBanners,
          placeholder: coinsWithBanners - coinsWithRealBanners
        },
        marketData: {
          enhanced: coinsWithMarketData,
          percentage: Math.round((coinsWithMarketData / finalEnrichedCoins.length) * 100)
        },
        rugcheck: {
          verified: coinsWithRugcheckData,
          verificationRate: Math.round((coinsWithRugcheckData / finalEnrichedCoins.length) * 100),
          lockedLiquidity: coinsWithLockedLiquidity,
          lockRate: Math.round((coinsWithLockedLiquidity / finalEnrichedCoins.length) * 100)
        },
        quality: enrichmentQuality
      },
      sampleEnrichedCoin: finalEnrichedCoins.find(coin => coin.enriched && coin.dexscreener) || null,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error in force enrichment:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to enrich coins',
      details: error.message
    });
  }
});

// Manual refresh - ONE API call, save as new batch
app.post('/api/refresh', async (req, res) => {
  try {
    const { confirm } = req.body;
    
    if (confirm !== 'yes') {
      return res.status(400).json({
        error: 'Manual confirmation required',
        message: 'Send POST request with body: {"confirm": "yes"} to fetch new batch',
        warning: 'This will consume API credits!',
        example: 'curl -X POST http://localhost:3001/api/refresh -H "Content-Type: application/json" -d \'{"confirm": "yes"}\''
      });
    }

    if (!SOLANA_TRACKER_API_KEY) {
      return res.status(400).json({
        error: 'API key not configured',
        message: 'SOLANA_TRACKER_API_KEY environment variable is required'
      });
    }

    console.log('🚨 MANUAL BATCH REFRESH - ONE API CALL for ALL coins!');
    const freshCoinBatch = await fetchFreshCoinBatch();
    
    // Save as new batch (auto-rotates old ones)
    coinStorage.saveBatch(freshCoinBatch);
    
    // Update current serving coins
    currentCoins = freshCoinBatch;
    
    // Start Rugcheck auto-processor for new batch
    startRugcheckAutoProcessor();
    
    res.json({
      success: true,
      message: 'New batch fetched and saved, Rugcheck auto-processor started',
      batchSize: freshCoinBatch.length,
      timestamp: new Date().toISOString(),
      warning: 'API credits consumed',
      storage: coinStorage.getStats()
    });
    
  } catch (error) {
    console.error('❌ Batch refresh failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh batch',
      details: error.message
    });
  }
});

// Get storage/batch stats
app.get('/api/storage/stats', (req, res) => {
  const stats = coinStorage.getStats();
  const dexCacheStats = dexscreenerService.getCacheStats();
  const jupiterCacheStats = jupiterTokenService.getCacheStats();
  const jupiterDataStats = jupiterDataService.getCacheStats();
  const metadataStats = tokenMetadataService.getCacheStats();
  
  res.json({
    storage: stats,
    currentServing: currentCoins.length,
    enrichment: {
      dexscreenerCache: dexCacheStats,
      jupiterTokenCache: jupiterCacheStats,
      jupiterDataCache: jupiterDataStats,
      metadataCache: metadataStats,
      enrichedCoins: currentCoins.filter(coin => coin.enriched).length,
      jupiterEnhancedCoins: currentCoins.filter(coin => coin.jupiterEnriched).length,
      metadataEnhancedCoins: currentCoins.filter(coin => coin.metadataEnriched).length
    },
    jupiter_integration: {
      status: 'active',
      primary_endpoints: [
        '/api/coins/trending (Jupiter-enhanced)',
        '/api/coins/solana-volume (Jupiter-enhanced)',
        '/api/coins/jupiter-trending (Jupiter-primary)',
        '/api/coins/jupiter-enhanced (Hybrid)',
        '/api/coins/metadata-enhanced (Metadata-focused)',
        '/api/tokens/:mintAddress/metadata (Individual metadata)'
      ],
      features: [
        'Real-time price/market data',
        'Holder count tracking',
        'Organic quality scores',
        'Security audit status',
        'Verification badges',
        'Trading analytics',
        'Comprehensive metadata',
        'Social media links',
        'Token descriptions',
        'Official website detection'
      ]
    },
    instructions: {
      refresh: 'POST /api/refresh with body: {"confirm": "yes"}',
      warning: 'ONE API call will fetch ALL matching coins and save as new batch'
    },
    timestamp: new Date().toISOString()
  });
});

// Clean DexScreener cache endpoint
app.post('/api/cache/clean', (req, res) => {
  const cleaned = dexscreenerService.cleanCache();
  res.json({
    success: true,
    message: `Cleaned ${cleaned} expired cache entries`,
    cacheStats: dexscreenerService.getCacheStats(),
    timestamp: new Date().toISOString()
  });
});

// Jupiter Token API Endpoints

// Get token info from Jupiter
app.get('/api/jupiter/token/:mintAddress', async (req, res) => {
  try {
    const { mintAddress } = req.params;
    
    if (!mintAddress) {
      return res.status(400).json({
        error: 'Mint address required'
      });
    }

    console.log(`🪐 Getting Jupiter token info for ${mintAddress}`);
    
    const tokenInfo = await jupiterTokenService.getTokenInfo(mintAddress);
    
    if (!tokenInfo) {
      return res.status(404).json({
        error: 'Token not found in Jupiter registry',
        mintAddress
      });
    }
    
    res.json({
      success: true,
      token: tokenInfo,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error getting Jupiter token info:', error);
    res.status(500).json({
      error: 'Failed to get token info',
      details: error.message
    });
  }
});

// Search Jupiter tokens
app.get('/api/jupiter/search', async (req, res) => {
  try {
    const { q: query, limit = 20 } = req.query;
    
    if (!query) {
      return res.status(400).json({
        error: 'Query parameter "q" required'
      });
    }

    console.log(`🔍 Searching Jupiter tokens for: ${query}`);
    
    const results = await jupiterTokenService.searchTokens(query, parseInt(limit));
    
    res.json({
      success: true,
      query,
      results,
      count: results.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error searching Jupiter tokens:', error);
    res.status(500).json({
      error: 'Failed to search tokens',
      details: error.message
    });
  }
});

// Get tokens by tag from Jupiter
app.get('/api/jupiter/tags/:tag', async (req, res) => {
  try {
    const { tag } = req.params;
    const { limit = 50 } = req.query;
    
    console.log(`🏷️ Getting Jupiter tokens with tag: ${tag}`);
    
    const results = await jupiterTokenService.getTokensByTag(tag, parseInt(limit));
    
    res.json({
      success: true,
      tag,
      results,
      count: results.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error getting tokens by tag:', error);
    res.status(500).json({
      error: 'Failed to get tokens by tag',
      details: error.message
    });
  }
});

// Batch get Jupiter token info
app.post('/api/jupiter/batch', async (req, res) => {
  try {
    const { mintAddresses, limit = 10 } = req.body;
    
    if (!mintAddresses || !Array.isArray(mintAddresses)) {
      return res.status(400).json({
        error: 'mintAddresses array required'
      });
    }

    if (mintAddresses.length > limit) {
      return res.status(400).json({
        error: `Too many addresses. Maximum ${limit} allowed per batch`
      });
    }

    console.log(`📚 Batch getting Jupiter info for ${mintAddresses.length} tokens`);
    
    const results = await jupiterTokenService.batchGetTokens(mintAddresses);
    
    res.json({
      success: true,
      results,
      count: results.length,
      found: results.filter(r => r.found !== false).length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error in batch Jupiter request:', error);
    res.status(500).json({
      error: 'Failed to batch get token info',
      details: error.message
    });
  }
});

// Get Jupiter cache stats
app.get('/api/jupiter/cache/stats', (req, res) => {
  try {
    const stats = jupiterTokenService.getCacheStats();
    
    res.json({
      success: true,
      cache: stats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error getting Jupiter cache stats:', error);
    res.status(500).json({
      error: 'Failed to get cache stats',
      details: error.message
    });
  }
});

// Clear Jupiter cache
app.post('/api/jupiter/cache/clear', (req, res) => {
  try {
    jupiterTokenService.clearCache();
    
    res.json({
      success: true,
      message: 'Jupiter token cache cleared',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error clearing Jupiter cache:', error);
    res.status(500).json({
      error: 'Failed to clear cache',
      details: error.message
    });
  }
});

// Jupiter Data Service Endpoints (Enhanced Market Data)

// Get trending coins using Jupiter as primary data source
app.get('/api/coins/jupiter-trending', async (req, res) => {
  try {
    const { 
      limit = 50, 
      category = 'toporganicscore', 
      interval = '24h' 
    } = req.query;
    
    console.log(`🪐 Getting trending coins from Jupiter (${category}, ${interval})`);
    
    const jupiterCoins = await jupiterDataService.getTopTokensByCategory(
      category, 
      interval, 
      parseInt(limit)
    );
    
    res.json({
      success: true,
      coins: jupiterCoins,
      count: jupiterCoins.length,
      category,
      interval,
      source: 'jupiter-primary',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error in Jupiter trending endpoint:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Jupiter trending tokens',
      details: error.message
    });
  }
});

// Enhance existing coins with Jupiter data
app.post('/api/coins/enhance-with-jupiter', async (req, res) => {
  try {
    const { coins, maxConcurrency = 5 } = req.body;
    
    if (!coins || !Array.isArray(coins)) {
      return res.status(400).json({
        error: 'coins array required'
      });
    }
    
    console.log(`🪐 Enhancing ${coins.length} coins with Jupiter data`);
    
    const enhancedCoins = await jupiterDataService.batchEnrichCoins(coins, maxConcurrency);
    
    const enhancedCount = enhancedCoins.filter(coin => coin.jupiterEnriched).length;
    
    res.json({
      success: true,
      coins: enhancedCoins,
      count: enhancedCoins.length,
      enhanced_count: enhancedCount,
      enhancement_rate: `${((enhancedCount / enhancedCoins.length) * 100).toFixed(1)}%`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error enhancing coins with Jupiter:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to enhance coins with Jupiter data',
      details: error.message
    });
  }
});

// Get hybrid data (current coins enhanced with Jupiter)
app.get('/api/coins/jupiter-enhanced', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    
    console.log(`🪐 Getting current coins enhanced with Jupiter data`);
    
    // Take current coins and enhance them with Jupiter
    const coinsToEnhance = currentCoins.slice(0, parseInt(limit));
    const enhancedCoins = await jupiterDataService.batchEnrichCoins(coinsToEnhance);
    
    // Sort by Jupiter metrics if available
    const sortedCoins = enhancedCoins.sort((a, b) => {
      // Prioritize Jupiter-enhanced coins
      if (a.jupiterEnriched && !b.jupiterEnriched) return -1;
      if (!a.jupiterEnriched && b.jupiterEnriched) return 1;
      
      // Sort by organic score if available
      if (a.organic_score && b.organic_score) {
        return b.organic_score - a.organic_score;
      }
      
      // Fallback to market cap
      return (b.market_cap_usd || 0) - (a.market_cap_usd || 0);
    });
    
    const enhancedCount = sortedCoins.filter(coin => coin.jupiterEnriched).length;
    
    res.json({
      success: true,
      coins: sortedCoins,
      count: sortedCoins.length,
      enhanced_count: enhancedCount,
      enhancement_rate: `${((enhancedCount / sortedCoins.length) * 100).toFixed(1)}%`,
      source: 'hybrid-jupiter-enhanced',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error in Jupiter enhanced endpoint:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get Jupiter enhanced coins',
      details: error.message
    });
  }
});

// Get tokens enriched with comprehensive metadata
app.get('/api/coins/metadata-enhanced', async (req, res) => {
  try {
    console.log('📋 /api/coins/metadata-enhanced endpoint called');
    
    const limit = parseInt(req.query.limit) || 50;
    const source = req.query.source || 'current'; // 'current' or 'jupiter'
    
    let baseCoins = [];
    
    if (source === 'jupiter') {
      // Get fresh tokens from Jupiter
      baseCoins = await jupiterDataService.getTopTokensByCategory('toporganicscore', '24h', limit);
    } else {
      // Use current coins and enhance with metadata
      baseCoins = currentCoins.slice(0, limit * 2); // Get more for filtering
    }
    
    // Enrich with metadata
    console.log(`📋 Enriching ${baseCoins.length} tokens with metadata...`);
    const enrichedCoins = await tokenMetadataService.batchEnrichWithMetadata(baseCoins, 3);
    
    // Sort by metadata quality and market data
    const sortedCoins = enrichedCoins
      .sort((a, b) => {
        // Prioritize tokens with good metadata
        const aScore = (a.metadataEnriched ? 100 : 0) + 
                      (a.website ? 20 : 0) + 
                      (a.twitter ? 15 : 0) + 
                      (a.telegram ? 15 : 0) + 
                      (a.description ? 25 : 0) + 
                      (a.isVerified ? 30 : 0) +
                      (a.jupiterMetadata?.organicScore || 0);
        
        const bScore = (b.metadataEnriched ? 100 : 0) + 
                      (b.website ? 20 : 0) + 
                      (b.twitter ? 15 : 0) + 
                      (b.telegram ? 15 : 0) + 
                      (b.description ? 25 : 0) + 
                      (b.isVerified ? 30 : 0) +
                      (b.jupiterMetadata?.organicScore || 0);
        
        return bScore - aScore;
      })
      .slice(0, limit);
    
    const metadataEnhancedCount = sortedCoins.filter(coin => coin.metadataEnriched).length;
    const hasSocialsCount = sortedCoins.filter(coin => coin.website || coin.twitter || coin.telegram).length;
    const hasDescriptionCount = sortedCoins.filter(coin => coin.description).length;
    
    res.json({
      success: true,
      coins: sortedCoins,
      count: sortedCoins.length,
      metadata_enhanced_count: metadataEnhancedCount,
      has_socials_count: hasSocialsCount,
      has_description_count: hasDescriptionCount,
      enhancement_rate: `${((metadataEnhancedCount / sortedCoins.length) * 100).toFixed(1)}%`,
      source: `metadata-enhanced-${source}`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error in metadata enhanced endpoint:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get metadata enhanced coins',
      details: error.message
    });
  }
});

// Get metadata for a specific token
app.get('/api/tokens/:mintAddress/metadata', async (req, res) => {
  try {
    const { mintAddress } = req.params;
    const forceRefresh = req.query.refresh === 'true';
    
    console.log(`📋 Getting metadata for ${mintAddress} (refresh: ${forceRefresh})`);
    
    const metadata = await tokenMetadataService.getTokenMetadata(mintAddress, {
      forceRefresh,
      chainId: req.query.chain || 'solana'
    });
    
    // Format for frontend
    const frontendMetadata = tokenMetadataService.formatMetadataForFrontend(metadata);
    
    res.json({
      success: true,
      metadata: frontendMetadata,
      raw_metadata: metadata,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(`❌ Error getting metadata for ${req.params.mintAddress}:`, error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get token metadata',
      details: error.message
    });
  }
});

// Batch enrich existing coins with metadata
app.post('/api/coins/enrich-metadata', async (req, res) => {
  try {
    const { tokens, maxConcurrency = 3 } = req.body;
    
    if (!tokens || !Array.isArray(tokens)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid tokens array provided'
      });
    }
    
    console.log(`📋 Batch enriching ${tokens.length} tokens with metadata...`);
    
    const enrichedTokens = await tokenMetadataService.batchEnrichWithMetadata(tokens, maxConcurrency);
    
    const enrichedCount = enrichedTokens.filter(token => token.metadataEnriched).length;
    
    res.json({
      success: true,
      tokens: enrichedTokens,
      count: enrichedTokens.length,
      enriched_count: enrichedCount,
      enhancement_rate: `${((enrichedCount / enrichedTokens.length) * 100).toFixed(1)}%`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error in batch metadata enrichment:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to enrich tokens with metadata',
      details: error.message
    });
  }
});

// Get metadata service statistics
app.get('/api/metadata/stats', (req, res) => {
  try {
    const stats = tokenMetadataService.getCacheStats();
    
    res.json({
      success: true,
      cache: stats,
      service: 'token-metadata-service',
      features: [
        'Jupiter metadata integration',
        'Dexscreener social links',
        'Token descriptions',
        'Social media validation',
        'Official website detection',
        'Multi-level caching'
      ],
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error getting metadata stats:', error);
    res.status(500).json({
      error: 'Failed to get metadata stats',
      details: error.message
    });
  }
});

// Rugcheck auto-processor status endpoint (must come before /:mintAddress route)
app.get('/api/rugcheck/auto-status', (req, res) => {
  try {
    const status = rugcheckAutoProcessor.getStatus();
    
    res.json({
      success: true,
      autoProcessor: status,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error getting auto-processor status:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get auto-processor status',
      details: error.message
    });
  }
});

// Manually trigger Rugcheck auto-processor (must come before /:mintAddress route)
app.post('/api/rugcheck/auto-trigger', async (req, res) => {
  try {
    const result = await rugcheckAutoProcessor.triggerProcessing();
    
    res.json({
      success: result.success,
      message: result.message,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error triggering auto-processor:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger auto-processor',
      details: error.message
    });
  }
});

// Start/stop Rugcheck auto-processor (must come before /:mintAddress route)
app.post('/api/rugcheck/auto-control', (req, res) => {
  try {
    const { action } = req.body; // 'start' or 'stop'
    
    if (action === 'start') {
      startRugcheckAutoProcessor();
      res.json({
        success: true,
        message: 'Rugcheck auto-processor started',
        timestamp: new Date().toISOString()
      });
    } else if (action === 'stop') {
      rugcheckAutoProcessor.stop();
      res.json({
        success: true,
        message: 'Rugcheck auto-processor stopped',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Invalid action. Use "start" or "stop"'
      });
    }
    
  } catch (error) {
    console.error('❌ Error controlling auto-processor:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to control auto-processor',
      details: error.message
    });
  }
});

// Get current Rugcheck verification progress/status (must come before /:mintAddress route)
app.get('/api/rugcheck/progress', (req, res) => {
  try {
    const totalCoins = currentCoins.length;
    const processedCoins = currentCoins.filter(coin => coin.rugcheckProcessedAt).length;
    const verifiedCoins = currentCoins.filter(coin => coin.rugcheckVerified).length;
    const lockedCoins = currentCoins.filter(coin => coin.liquidityLocked && coin.rugcheckVerified).length;
    
    const unprocessedCoins = currentCoins.filter(coin => !coin.rugcheckProcessedAt);
    const nextBatchStart = totalCoins - unprocessedCoins.length;
    
    res.json({
      success: true,
      progress: {
        total: totalCoins,
        processed: processedCoins,
        verified: verifiedCoins,
        locked: lockedCoins,
        percentage: totalCoins > 0 ? Math.round((processedCoins / totalCoins) * 100) : 0,
        completed: processedCoins === totalCoins
      },
      stats: {
        verificationRate: verifiedCoins > 0 ? Math.round((verifiedCoins / processedCoins) * 100) : 0,
        lockRate: processedCoins > 0 ? Math.round((lockedCoins / processedCoins) * 100) : 0,
        lockedOfVerified: verifiedCoins > 0 ? Math.round((lockedCoins / verifiedCoins) * 100) : 0
      },
      next: unprocessedCoins.length > 0 ? {
        startIndex: nextBatchStart,
        remaining: unprocessedCoins.length,
        estimatedBatches: Math.ceil(unprocessedCoins.length / 30)
      } : null,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error getting Rugcheck progress:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get progress',
      details: error.message
    });
  }
});

// Rugcheck batch verification endpoint (must come before /:mintAddress route)
app.get('/api/rugcheck/batch', async (req, res) => {
  try {
    const { addresses } = req.query;
    
    if (!addresses) {
      return res.status(400).json({
        success: false,
        error: 'addresses parameter is required (comma-separated)'
      });
    }
    
    const mintAddresses = addresses.split(',').map(addr => addr.trim()).slice(0, 10); // Limit to 10
    
    console.log(`🔍 Rugcheck batch verification for ${mintAddresses.length} tokens`);
    
    const results = await rugcheckService.checkMultipleTokens(mintAddresses, {
      maxConcurrent: 2,
      batchDelay: 1000,
      maxTokens: 10
    });
    
    res.json({
      success: true,
      data: results.map(result => ({
        mintAddress: result.address,
        liquidityLocked: result.liquidityLocked,
        lockPercentage: result.lockPercentage,
        burnPercentage: result.burnPercentage,
        riskLevel: result.riskLevel,
        score: result.score,
        verified: result.rugcheckAvailable
      })),
      metadata: {
        totalChecked: results.length,
        lockedCount: results.filter(r => r.liquidityLocked).length,
        source: 'Rugcheck.xyz',
        checkedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Error in Rugcheck batch verification:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to perform batch Rugcheck verification',
      details: error.message
    });
  }
});

// Get Rugcheck statistics for current coins
app.get('/api/rugcheck/stats', (req, res) => {
  try {
    const stats = {
      totalCoins: currentCoins.length,
      rugcheckVerified: currentCoins.filter(coin => coin.rugcheckVerified).length,
      liquidityLocked: currentCoins.filter(coin => coin.liquidityLocked).length,
      unlocked: currentCoins.filter(coin => coin.rugcheckVerified && !coin.liquidityLocked).length,
      riskLevels: {
        high: currentCoins.filter(coin => coin.riskLevel === 'high').length,
        medium: currentCoins.filter(coin => coin.riskLevel === 'medium').length,
        low: currentCoins.filter(coin => coin.riskLevel === 'low').length,
        unknown: currentCoins.filter(coin => !coin.riskLevel || coin.riskLevel === 'unknown').length
      },
      honeypots: currentCoins.filter(coin => coin.isHoneypot).length,
      averageScore: currentCoins
        .filter(coin => coin.rugcheckScore > 0)
        .reduce((sum, coin) => sum + coin.rugcheckScore, 0) / 
        currentCoins.filter(coin => coin.rugcheckScore > 0).length || 0
    };

    // Top 10 safest coins (highest lock percentage + lowest risk)
    const safestCoins = currentCoins
      .filter(coin => coin.rugcheckVerified)
      .sort((a, b) => {
        // Sort by lock percentage (desc) then by risk level (low=3, medium=2, high=1, unknown=0)
        const riskScore = (risk) => risk === 'low' ? 3 : risk === 'medium' ? 2 : risk === 'high' ? 1 : 0;
        const aScore = (a.lockPercentage || 0) + riskScore(a.riskLevel) * 10;
        const bScore = (b.lockPercentage || 0) + riskScore(b.riskLevel) * 10;
        return bScore - aScore;
      })
      .slice(0, 10)
      .map(coin => ({
        symbol: coin.symbol,
        name: coin.name,
        mintAddress: coin.mintAddress,
        lockPercentage: coin.lockPercentage,
        riskLevel: coin.riskLevel,
        score: coin.rugcheckScore,
        marketCap: coin.market_cap_usd
      }));

    res.json({
      success: true,
      stats,
      safestCoins,
      metadata: {
        verificationRate: Math.round((stats.rugcheckVerified / stats.totalCoins) * 100),
        lockRate: Math.round((stats.liquidityLocked / stats.totalCoins) * 100),
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error generating Rugcheck stats:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to generate Rugcheck statistics',
      details: error.message
    });
  }
});

// Rugcheck liquidity lock verification endpoint
app.get('/api/rugcheck/:mintAddress', async (req, res) => {
  try {
    const { mintAddress } = req.params;
    
    console.log(`🔍 Rugcheck verification requested for: ${mintAddress}`);
    
    const rugcheckData = await rugcheckService.checkToken(mintAddress);
    
    if (!rugcheckData || !rugcheckData.rugcheckAvailable) {
      return res.status(404).json({
        success: false,
        error: 'Token not found or Rugcheck API unavailable',
        mintAddress,
        fallbackUsed: true
      });
    }

    res.json({
      success: true,
      data: {
        mintAddress,
        liquidityLocked: rugcheckData.liquidityLocked,
        lockPercentage: rugcheckData.lockPercentage,
        burnPercentage: rugcheckData.burnPercentage,
        riskLevel: rugcheckData.riskLevel,
        score: rugcheckData.score,
        freezeAuthority: rugcheckData.freezeAuthority,
        mintAuthority: rugcheckData.mintAuthority,
        topHolderPercent: rugcheckData.topHolderPercent,
        isHoneypot: rugcheckData.isHoneypot,
        verified: rugcheckData.rugcheckAvailable
      },
      metadata: {
        source: 'Rugcheck.xyz',
        checkedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching Rugcheck data:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Rugcheck verification',
      details: error.message,
      mintAddress: req.params.mintAddress
    });
  }
});

// Rugcheck verification for ALL current coins
app.post('/api/rugcheck/verify-all', async (req, res) => {
  try {
    if (currentCoins.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No coins currently loaded'
      });
    }

    console.log(`🔍 Starting Rugcheck verification for ALL ${currentCoins.length} current coins...`);
    
    // Re-enrich current coins with Rugcheck data
    const rugcheckEnrichedCoins = await enrichCoinsWithRugcheck(currentCoins);
    
    // Update the current coins with new Rugcheck data
    currentCoins = rugcheckEnrichedCoins;
    
    // Generate statistics
    const stats = {
      totalCoins: rugcheckEnrichedCoins.length,
      rugcheckVerified: rugcheckEnrichedCoins.filter(coin => coin.rugcheckVerified).length,
      liquidityLocked: rugcheckEnrichedCoins.filter(coin => coin.liquidityLocked).length,
      highRisk: rugcheckEnrichedCoins.filter(coin => coin.riskLevel === 'high').length,
      mediumRisk: rugcheckEnrichedCoins.filter(coin => coin.riskLevel === 'medium').length,
      lowRisk: rugcheckEnrichedCoins.filter(coin => coin.riskLevel === 'low').length,
      honeypots: rugcheckEnrichedCoins.filter(coin => coin.isHoneypot).length
    };

    // Sample of verified coins with locked liquidity
    const sampleLockedCoins = rugcheckEnrichedCoins
      .filter(coin => coin.liquidityLocked && coin.rugcheckVerified)
      .slice(0, 5)
      .map(coin => ({
        symbol: coin.symbol,
        name: coin.name,
        mintAddress: coin.mintAddress,
        lockPercentage: coin.lockPercentage,
        burnPercentage: coin.burnPercentage,
        riskLevel: coin.rugcheckScore,
        score: coin.rugcheckScore
      }));

    console.log(`✅ Rugcheck verification complete for all coins`);
    console.log(`🔒 ${stats.liquidityLocked}/${stats.totalCoins} coins have locked liquidity`);
    console.log(`✅ ${stats.rugcheckVerified}/${stats.totalCoins} coins verified by Rugcheck`);

    res.json({
      success: true,
      message: `Rugcheck verification completed for all ${stats.totalCoins} coins`,
      stats,
      sampleLockedCoins,
      metadata: {
        verificationRate: Math.round((stats.rugcheckVerified / stats.totalCoins) * 100),
        lockRate: Math.round((stats.liquidityLocked / stats.totalCoins) * 100),
        source: 'Rugcheck.xyz',
        completedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Error in verify-all endpoint:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to verify all coins with Rugcheck',
      details: error.message
    });
  }
});

// Progressive Rugcheck verification - processes ALL coins in batches of 30
app.post('/api/rugcheck/verify-all-progressive', async (req, res) => {
  try {
    const { startIndex = 0, batchSize = 30 } = req.body;
    
    if (currentCoins.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No coins loaded to verify'
      });
    }

    const totalCoins = currentCoins.length;
    const remainingCoins = totalCoins - startIndex;
    const coinsToProcess = Math.min(batchSize, remainingCoins);
    
    if (startIndex >= totalCoins) {
      return res.json({
        success: true,
        message: 'All coins have been processed',
        progress: {
          processed: totalCoins,
          total: totalCoins,
          percentage: 100,
          completed: true
        }
      });
    }

    console.log(`🔍 Progressive Rugcheck: Processing batch starting at index ${startIndex} (${coinsToProcess} coins)`);
    
    // Get the batch of coins to process
    const batchToProcess = currentCoins.slice(startIndex, startIndex + coinsToProcess);
    const mintAddresses = batchToProcess.map(coin => 
      coin.mintAddress || coin.tokenAddress || coin.address
    ).filter(Boolean);

    // Process this batch
    const rugcheckResults = await rugcheckService.checkMultipleTokens(mintAddresses, {
      maxConcurrent: 2,
      batchDelay: 1500,
      maxTokens: coinsToProcess
    });

    // Update the coins in currentCoins with Rugcheck data
    let updatedCount = 0;
    for (let i = 0; i < batchToProcess.length; i++) {
      const coinIndex = startIndex + i;
      const coin = currentCoins[coinIndex];
      const mintAddress = coin.mintAddress || coin.tokenAddress || coin.address;
      const rugcheckData = rugcheckResults.find(r => r.address === mintAddress);
      
      if (rugcheckData && rugcheckData.rugcheckAvailable) {
        currentCoins[coinIndex] = {
          ...coin,
          liquidityLocked: rugcheckData.liquidityLocked,
          lockPercentage: rugcheckData.lockPercentage,
          burnPercentage: rugcheckData.burnPercentage,
          rugcheckScore: rugcheckData.score,
          riskLevel: rugcheckData.riskLevel,
          freezeAuthority: rugcheckData.freezeAuthority,
          mintAuthority: rugcheckData.mintAuthority,
          topHolderPercent: rugcheckData.topHolderPercent,
          isHoneypot: rugcheckData.isHoneypot,
          rugcheckVerified: true,
          rugcheckProcessedAt: new Date().toISOString()
        };
        updatedCount++;
      } else {
        // Mark as processed but not verified
        currentCoins[coinIndex] = {
          ...coin,
          rugcheckVerified: false,
          rugcheckProcessedAt: new Date().toISOString()
        };
      }
    }

    // Calculate overall progress
    const processedSoFar = startIndex + coinsToProcess;
    const progressPercentage = Math.round((processedSoFar / totalCoins) * 100);
    const verifiedCount = rugcheckResults.filter(r => r.rugcheckAvailable).length;
    const lockedCount = rugcheckResults.filter(r => r.liquidityLocked).length;
    
    // Calculate next batch info
    const nextIndex = processedSoFar;
    const hasMore = nextIndex < totalCoins;
    const remainingAfterThis = totalCoins - processedSoFar;

    console.log(`✅ Batch complete: ${verifiedCount}/${coinsToProcess} verified, ${lockedCount} locked. Progress: ${progressPercentage}%`);

    res.json({
      success: true,
      message: `Processed batch ${Math.ceil(processedSoFar / batchSize)} of ${Math.ceil(totalCoins / batchSize)}`,
      batch: {
        startIndex,
        processed: coinsToProcess,
        verified: verifiedCount,
        locked: lockedCount,
        updated: updatedCount
      },
      progress: {
        processed: processedSoFar,
        total: totalCoins,
        percentage: progressPercentage,
        completed: !hasMore
      },
      next: hasMore ? {
        startIndex: nextIndex,
        remaining: remainingAfterThis,
        estimatedBatches: Math.ceil(remainingAfterThis / batchSize)
      } : null,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error in progressive Rugcheck verification:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to perform progressive Rugcheck verification',
      details: error.message
    });
  }
});

// Filtered coins based on custom criteria - makes fresh API call to Solana Tracker
app.post('/api/coins/filtered', async (req, res) => {
  try {
    console.log('🔍 /api/coins/filtered endpoint called');
    console.log('🔍 Filter criteria:', req.body);
    
    const filters = req.body;
    
    // Build search parameters for Solana Tracker (same approach as trending)
    const searchParams = {
      // Default parameters (similar to trending but with user customization)
      limit: 50,
      page: 1
    };
    
    // Apply liquidity filters
    if (filters.minLiquidity !== undefined) {
      searchParams.minLiquidity = filters.minLiquidity;
      console.log(`🔍 Added minLiquidity: ${filters.minLiquidity}`);
    }
    if (filters.maxLiquidity !== undefined) {
      searchParams.maxLiquidity = filters.maxLiquidity;
      console.log(`🔍 Added maxLiquidity: ${filters.maxLiquidity}`);
    }
    
    // Apply market cap filters
    if (filters.minMarketCap !== undefined) {
      searchParams.minMarketCap = filters.minMarketCap;
      console.log(`🔍 Added minMarketCap: ${filters.minMarketCap}`);
    }
    if (filters.maxMarketCap !== undefined) {
      searchParams.maxMarketCap = filters.maxMarketCap;
      console.log(`🔍 Added maxMarketCap: ${filters.maxMarketCap}`);
    }
    
    // Apply volume filters with timeframe
    const volumeTimeframe = filters.volumeTimeframe || '24h';
    searchParams.volumeTimeframe = volumeTimeframe;
    console.log(`🔍 Volume timeframe: ${volumeTimeframe}`);
    
    if (filters.minVolume !== undefined) {
      searchParams.minVolume = filters.minVolume;
      console.log(`🔍 Added minVolume: ${filters.minVolume}`);
    }
    if (filters.maxVolume !== undefined) {
      searchParams.maxVolume = filters.maxVolume;
      console.log(`🔍 Added maxVolume: ${filters.maxVolume}`);
    }
    
    // Apply transaction filters
    if (filters.minBuys !== undefined) {
      searchParams.minBuys = filters.minBuys;
      console.log(`🔍 Added minBuys: ${filters.minBuys}`);
    }
    if (filters.minSells !== undefined) {
      searchParams.minSells = filters.minSells;
      console.log(`🔍 Added minSells: ${filters.minSells}`);
    }
    if (filters.minTotalTransactions !== undefined) {
      searchParams.minTransactions = filters.minTotalTransactions;
      console.log(`🔍 Added minTransactions: ${filters.minTotalTransactions}`);
    }
    
    // Apply date filters
    if (filters.minCreatedAt) {
      searchParams.minCreatedAt = filters.minCreatedAt;
      console.log(`🔍 Added minCreatedAt: ${filters.minCreatedAt}`);
    }
    if (filters.maxCreatedAt) {
      searchParams.maxCreatedAt = filters.maxCreatedAt;
      console.log(`🔍 Added maxCreatedAt: ${filters.maxCreatedAt}`);
    }
    
    console.log('🚀 Making API call to Solana Tracker /search endpoint');
    console.log('🔍 Search params:', searchParams);
    
    // Use the same makeSolanaTrackerRequest function as trending
    const response = await makeSolanaTrackerRequest('/search', searchParams);
    
    if (response.status !== 'success' || !response.data) {
      console.error('❌ Invalid response from Solana Tracker:', response);
      return res.status(500).json({ 
        success: false,
        error: 'Invalid response from Solana Tracker',
        details: response 
      });
    }
    
    const tokens = response.data;
    console.log(`✅ Fetched ${tokens.length} filtered coins from Solana Tracker`);
    
    // Format tokens to match the expected structure (same as trending)
    const formattedTokens = tokens.map((token, index) => {
      // Ensure all necessary fields exist with proper structure
      return {
        mintAddress: token.mint || token.address,
        address: token.mint || token.address,
        name: token.name || 'Unknown',
        symbol: token.symbol || 'UNKNOWN',
        image: token.image || `https://via.placeholder.com/64/00d4ff/ffffff?text=${(token.symbol || 'T').charAt(0)}`,
        profileImage: token.image || `https://via.placeholder.com/64/00d4ff/ffffff?text=${(token.symbol || 'T').charAt(0)}`,
        logo: token.image || `https://via.placeholder.com/64/00d4ff/ffffff?text=${(token.symbol || 'T').charAt(0)}`,
        
        // Price data
        price_usd: token.priceUsd || 0,
        priceUsd: token.priceUsd || 0,
        price: token.priceUsd || 0,
        priceChange24h: token.priceChange24h || 0,
        priceChange1h: token.priceChange1h || 0,
        priceChange5m: token.priceChange5m || 0,
        
        // Market data
        market_cap_usd: token.marketCapUsd || 0,
        marketCap: token.marketCapUsd || 0,
        fdv: token.fdv || token.marketCapUsd || 0,
        liquidity_usd: token.liquidityUsd || token.liquidity || 0,
        liquidity: {
          usd: token.liquidityUsd || token.liquidity || 0,
          quote: token.liquidity?.quote || 0
        },
        
        // Volume data with multiple timeframes
        volume_24h_usd: token.volume_24h || token.volume || 0,
        volume: token.volume_24h || token.volume || 0,
        volume24h: token.volume_24h || token.volume || 0,
        volume6h: token.volume_6h || 0,
        volume1h: token.volume_1h || 0,
        
        // Transaction data
        buys_24h: token.buys_24h || 0,
        sells_24h: token.sells_24h || 0,
        transactions_24h: (token.buys_24h || 0) + (token.sells_24h || 0),
        txns: {
          buy: token.buys_24h || 0,
          sell: token.sells_24h || 0,
          total: (token.buys_24h || 0) + (token.sells_24h || 0)
        },
        
        // Additional data
        created_timestamp: token.createdAt ? new Date(token.createdAt).getTime() : Date.now(),
        createdAt: token.createdAt || new Date().toISOString(),
        poolId: token.poolId || token.pairAddress || null,
        dexId: token.dexId || 'raydium',
        description: token.description || '',
        
        // Social/metadata
        twitter: token.twitter || null,
        telegram: token.telegram || null,
        website: token.website || null,
        
        // Flags
        isScam: token.isScam || false,
        isPumpFun: token.isPumpFun || false,
        hasGraduated: token.hasGraduated || false,
        
        // Source tracking
        source: 'solana-tracker-filtered',
        lastUpdated: new Date().toISOString(),
        priority: index + 1 // Initial priority based on API order
      };
    });

    // Apply priority scoring (same as trending)
    const prioritizedCoins = formattedTokens.map(coin => {
      let priority = 0;
      
      // Market cap priority
      if (coin.market_cap_usd > 1000000) priority += 30;
      else if (coin.market_cap_usd > 500000) priority += 20;
      else if (coin.market_cap_usd > 100000) priority += 10;
      
      // Liquidity priority
      if (coin.liquidity_usd > 100000) priority += 20;
      else if (coin.liquidity_usd > 50000) priority += 15;
      else if (coin.liquidity_usd > 10000) priority += 10;
      
      // Volume priority
      if (coin.volume > 100000) priority += 15;
      else if (coin.volume > 50000) priority += 10;
      else if (coin.volume > 10000) priority += 5;
      
      // Recent activity bonus
      const ageInHours = (Date.now() - new Date(coin.createdAt).getTime()) / (1000 * 60 * 60);
      if (ageInHours < 24) priority += 20;
      else if (ageInHours < 72) priority += 10;
      else if (ageInHours < 168) priority += 5;
      
      // Transaction activity
      const totalTransactions = coin.transactions_24h || 0;
      if (totalTransactions > 1000) priority += 15;
      else if (totalTransactions > 500) priority += 10;
      else if (totalTransactions > 100) priority += 5;
      
      return {
        ...coin,
        priority
      };
    });

    // Sort by priority
    prioritizedCoins.sort((a, b) => b.priority - a.priority);
    
    console.log(`🔍 ${prioritizedCoins.length} coins after priority sorting, now applying FULL enrichment...`);
    
    // 🌟 USE THE EXACT SAME ENRICHMENT AS TRENDING TAB
    console.log(`🎨 Applying UNIVERSAL enrichment (same pipeline as trending tab)...`);
    
    const finalEnrichedCoins = await applyUniversalEnrichment(prioritizedCoins, {
      includeDexScreener: true,
      includeRugcheck: true,
      includeBanners: true,
      includeMarketData: true,
      logProgress: true
    });
    
    const coinsWithBanners = finalEnrichedCoins.filter(coin => coin.banner).length;
    const coinsWithRugcheck = finalEnrichedCoins.filter(coin => coin.rugcheckVerified).length;
    const coinsWithLocks = finalEnrichedCoins.filter(coin => coin.liquidityLocked).length;
    
    console.log(`🎉 FULL ENRICHMENT COMPLETE for custom filtered coins:`);
    console.log(`   📊 Total coins: ${finalEnrichedCoins.length}`);
    console.log(`   🎨 With banners: ${coinsWithBanners}/${finalEnrichedCoins.length} (${Math.round(coinsWithBanners/finalEnrichedCoins.length*100)}%)`);
    console.log(`   🔒 Rugcheck verified: ${coinsWithRugcheck}/${finalEnrichedCoins.length} (${Math.round(coinsWithRugcheck/finalEnrichedCoins.length*100)}%)`);
    console.log(`   🔐 Liquidity locked: ${coinsWithLocks}/${finalEnrichedCoins.length} (${Math.round(coinsWithLocks/finalEnrichedCoins.length*100)}%)`);
    
    res.json({
      success: true,
      coins: finalEnrichedCoins,
      count: finalEnrichedCoins.length,
      total: tokens.length,
      appliedFilters: filters,
      enrichment: {
        dexscreenerEnriched: finalEnrichedCoins.filter(c => c.enriched).length,
        withBanners: finalEnrichedCoins.filter(c => c.banner).length,
        rugcheckVerified: finalEnrichedCoins.filter(c => c.rugcheckVerified).length,
        liquidityLocked: finalEnrichedCoins.filter(c => c.liquidityLocked).length,
        enrichmentRate: Math.round((finalEnrichedCoins.filter(c => c.enriched).length / finalEnrichedCoins.length) * 100)
      },
      timestamp: new Date().toISOString(),
      source: 'solana-tracker-search-fully-enriched'
    });
    
  } catch (error) {
    console.error('❌ Error in filtered endpoint:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch filtered tokens from Solana Tracker',
      details: error.message
    });
  }
});

// Test endpoint to verify backend is working
app.get('/api/coins/test-filter', (req, res) => {
  try {
    console.log('🧪 Test filter endpoint called');
    console.log('🧪 Current coins available:', currentCoins.length);
    
    if (currentCoins.length > 0) {
      console.log('🧪 Sample coin data:', {
        symbol: currentCoins[0].symbol,
        liquidity: currentCoins[0].liquidity,
        market_cap_usd: currentCoins[0].market_cap_usd,
        volume: currentCoins[0].volume,
        volumeFields: Object.keys(currentCoins[0]).filter(key => key.includes('volume'))
      });
    }
    
    res.json({
      success: true,
      coins: currentCoins.slice(0, 10), // Return first 10 for testing
      count: Math.min(10, currentCoins.length),
      total: currentCoins.length,
      timestamp: new Date().toISOString(),
      source: 'test-unfiltered'
    });
    
  } catch (error) {
    console.error('❌ Error in test filter endpoint:', error.message);
    res.status(500).json({
      success: false,
      error: 'Test failed',
      details: error.message
    });
  }
});

// 🌟 UNIVERSAL ENRICHMENT FUNCTION - Apply full multi-source enrichment to ANY coins
async function applyUniversalEnrichment(coins, options = {}) {
  const {
    includeDexScreener = true,
    includeRugcheck = true,
    includeBanners = true,
    includeMarketData = true,
    maxConcurrent = 3,
    logProgress = true
  } = options;
  
  if (!Array.isArray(coins) || coins.length === 0) {
    console.log('⚠️ No coins provided for enrichment');
    return [];
  }
  
  console.log(`🌟 UNIVERSAL ENRICHMENT: Starting full enrichment for ${coins.length} coins`);
  console.log(`   📊 DexScreener: ${includeDexScreener ? 'YES' : 'NO'}`);
  console.log(`   🔒 Rugcheck: ${includeRugcheck ? 'YES' : 'NO'}`);
  console.log(`   🎨 Banners: ${includeBanners ? 'YES' : 'NO'}`);
  console.log(`   📈 Market Data: ${includeMarketData ? 'YES' : 'NO'}`);
  
  let enrichedCoins = [...coins];
  
  // Step 1: DexScreener enrichment (banners, metadata, market data)
  if (includeDexScreener) {
    console.log(`🎨 Step 1: DexScreener enrichment for ${enrichedCoins.length} coins...`);
    
    enrichedCoins = await Promise.all(enrichedCoins.map(async (coin, index) => {
      try {
        if (logProgress && index % 10 === 0) {
          console.log(`   🔍 Enriching coin ${index + 1}/${enrichedCoins.length}: ${coin.symbol}`);
        }
        
        const enrichedData = await dexscreenerService.enrichCoin(coin, {
          includeBanners,
          includeMarketData,
          forceBannerEnrichment: includeBanners
        });
        
        // Ensure we always have a banner
        if (includeBanners && !enrichedData.banner) {
          enrichedData.banner = dexscreenerService.generatePlaceholderBanner({ symbol: coin.symbol });
        }
        
        return enrichedData;
        
      } catch (error) {
        console.log(`⚠️ DexScreener failed for ${coin.symbol}: ${error.message}`);
        return {
          ...coin,
          banner: includeBanners ? (coin.banner || dexscreenerService.generatePlaceholderBanner({ symbol: coin.symbol })) : coin.banner
        };
      }
    }));
    
    const dexEnrichedCount = enrichedCoins.filter(c => c.enriched).length;
    console.log(`   ✅ DexScreener complete: ${dexEnrichedCount}/${enrichedCoins.length} enriched`);
  }
  
  // Step 2: Rugcheck security analysis
  if (includeRugcheck) {
    console.log(`🔒 Step 2: Rugcheck security analysis for ${enrichedCoins.length} coins...`);
    
    try {
      enrichedCoins = await enrichCoinsWithRugcheck(enrichedCoins);
      const rugcheckCount = enrichedCoins.filter(c => c.rugcheckVerified).length;
      const lockedCount = enrichedCoins.filter(c => c.liquidityLocked).length;
      console.log(`   ✅ Rugcheck complete: ${rugcheckCount}/${enrichedCoins.length} verified, ${lockedCount} with locked liquidity`);
    } catch (error) {
      console.log(`⚠️ Rugcheck analysis failed: ${error.message}`);
    }
  }
  
  // Final statistics
  const stats = {
    total: enrichedCoins.length,
    dexscreenerEnriched: enrichedCoins.filter(c => c.enriched).length,
    withBanners: enrichedCoins.filter(c => c.banner).length,
    rugcheckVerified: enrichedCoins.filter(c => c.rugcheckVerified).length,
    liquidityLocked: enrichedCoins.filter(c => c.liquidityLocked).length
  };
  
  console.log(`🎉 UNIVERSAL ENRICHMENT COMPLETE:`);
  console.log(`   📊 Total coins: ${stats.total}`);
  console.log(`   🎨 DexScreener enriched: ${stats.dexscreenerEnriched}/${stats.total} (${Math.round(stats.dexscreenerEnriched/stats.total*100)}%)`);
  console.log(`   🖼️ With banners: ${stats.withBanners}/${stats.total} (${Math.round(stats.withBanners/stats.total*100)}%)`);
  console.log(`   🔒 Rugcheck verified: ${stats.rugcheckVerified}/${stats.total} (${Math.round(stats.rugcheckVerified/stats.total*100)}%)`);
  console.log(`   🔐 Liquidity locked: ${stats.liquidityLocked}/${stats.total} (${Math.round(stats.liquidityLocked/stats.total*100)}%)`);
  
  // Add enrichment metadata to each coin
  return enrichedCoins.map(coin => ({
    ...coin,
    enrichmentApplied: {
      dexscreener: includeDexScreener,
      rugcheck: includeRugcheck,
      banners: includeBanners,
      timestamp: new Date().toISOString()
    }
  }));
}

// 🌟 UNIVERSAL ENRICHMENT ENDPOINT - Enrich ANY coins with full multi-source pipeline
app.post('/api/coins/universal-enrich', async (req, res) => {
  try {
    const { 
      coins = [], 
      mintAddresses = [], 
      includeDexScreener = true,
      includeRugcheck = true,
      includeBanners = true,
      includeMarketData = true 
    } = req.body;
    
    let coinsToEnrich = [];
    
    // Handle two input modes: direct coins array or mint addresses to lookup
    if (coins.length > 0) {
      coinsToEnrich = coins;
      console.log(`🌟 Enriching ${coins.length} coins provided directly`);
    } else if (mintAddresses.length > 0) {
      // Find coins from current cache that match the requested addresses
      coinsToEnrich = currentCoins.filter(coin => 
        mintAddresses.includes(coin.mintAddress)
      );
      console.log(`🌟 Enriching ${coinsToEnrich.length}/${mintAddresses.length} coins found in cache`);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Either coins array or mintAddresses array is required'
      });
    }
    
    if (coinsToEnrich.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No coins found to enrich'
      });
    }
    
    // Apply universal enrichment
    const enrichedCoins = await applyUniversalEnrichment(coinsToEnrich, {
      includeDexScreener,
      includeRugcheck,
      includeBanners,
      includeMarketData,
      logProgress: true
    });
    
    res.json({
      success: true,
      coins: enrichedCoins,
      count: enrichedCoins.length,
      enrichment: {
        dexscreenerEnriched: enrichedCoins.filter(c => c.enriched).length,
        withBanners: enrichedCoins.filter(c => c.banner).length,
        rugcheckVerified: enrichedCoins.filter(c => c.rugcheckVerified).length,
        liquidityLocked: enrichedCoins.filter(c => c.liquidityLocked).length,
        enrichmentRate: Math.round((enrichedCoins.filter(c => c.enriched).length / enrichedCoins.length) * 100)
      },
      timestamp: new Date().toISOString(),
      source: 'universal-enrichment'
    });
    
  } catch (error) {
    console.error('❌ Error in universal enrichment:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to apply universal enrichment',
      details: error.message
    });
  }
});

// Get top traders for a specific token
app.get('/api/top-traders/:token', async (req, res) => {
  const { token } = req.params;
  
  if (!token) {
    return res.status(400).json({
      success: false,
      error: 'Token address is required'
    });
  }

  try {
    console.log(`🔍 Fetching top traders for token: ${token}`);
    
    if (!SOLANA_TRACKER_API_KEY) {
      console.warn('⚠️ SOLANA_TRACKER_API_KEY not configured, returning mock data');
      
      // Return mock data when API key is not available
      const mockTraders = [
        {
          wallet: "7xKXm3GfJ8gM2...HjLp",
          held: 0,
          sold: 25000000,
          holding: 15000000,
          realized: 187.3,
          unrealized: 0,
          total: 187.3,
          total_invested: 1200.50
        },
        {
          wallet: "9bVqR2nL4jL8...3kM9",
          held: 0,
          sold: 18000000,
          holding: 12000000,
          realized: 134.7,
          unrealized: 0,
          total: 134.7,
          total_invested: 890.25
        },
        {
          wallet: "3nRtP5kM9kP4...7vX2",
          held: 0,
          sold: 12000000,
          holding: 8000000,
          realized: 89.2,
          unrealized: 0,
          total: 89.2,
          total_invested: 650.75
        }
      ];
      
      return res.json({
        success: true,
        data: mockTraders,
        count: mockTraders.length,
        source: 'mock',
        timestamp: new Date().toISOString()
      });
    }

    // Make request to Solana Tracker API
    const response = await makeSolanaTrackerRequest(`/top-traders/${token}`);
    
    if (!response || !Array.isArray(response)) {
      throw new Error('Invalid response format from Solana Tracker API');
    }

    console.log(`✅ Successfully fetched ${response.length} top traders for ${token}`);
    
    res.json({
      success: true,
      data: response,
      count: response.length,
      source: 'solana-tracker',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(`❌ Error fetching top traders for ${token}:`, error.message);
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch top traders',
      details: error.message,
      token: token
    });
  }
});

// Individual coin lookup endpoint - fetch coin by address with full enrichment
app.get('/api/coin/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!address || address.length < 20) {
      return res.status(400).json({
        success: false,
        error: 'Valid token address is required'
      });
    }

    console.log(`🔍 Looking up individual coin: ${address}`);

    // First check if coin exists in curated list
    const curatedCoin = currentCoins.find(coin => 
      coin.mintAddress?.toLowerCase() === address.toLowerCase() || 
      coin.tokenAddress?.toLowerCase() === address.toLowerCase() ||
      coin.id?.toLowerCase() === address.toLowerCase()
    );

    if (curatedCoin) {
      console.log(`✅ Found in curated list: ${curatedCoin.symbol}`);
      return res.json({
        success: true,
        coin: curatedCoin,
        source: 'curated'
      });
    }

    // If not in curated list, try to fetch from external APIs
    console.log(`🔍 Not in curated list, fetching from external APIs...`);
    
    try {
      // Create a basic coin object with the address
      const basicCoin = {
        mintAddress: address,
        tokenAddress: address,
        id: address,
        symbol: 'UNKNOWN',
        name: 'Unknown Token',
        description: 'Token found via address lookup'
      };

      // Try to enrich with DexScreener first
      let enrichedCoin = await dexscreenerService.enrichCoin(basicCoin);
      
      if (!enrichedCoin.enriched) {
        // If DexScreener fails, try other sources
        console.log('🔄 DexScreener enrichment failed, trying other sources...');
        
        // Try to get basic token info from Helius or other services
        try {
          const heliusData = await heliusService.getTokenMetadata(address);
          if (heliusData) {
            enrichedCoin = {
              ...basicCoin,
              ...heliusData,
              source: 'helius'
            };
          }
        } catch (heliusError) {
          console.log('⚠️ Helius lookup failed:', heliusError.message);
        }
      }

      // Apply rugcheck verification
      try {
        const rugcheckData = await rugcheckService.checkToken(address);
        if (rugcheckData) {
          enrichedCoin = {
            ...enrichedCoin,
            liquidityLocked: rugcheckData.liquidityLocked,
            lockPercentage: rugcheckData.lockPercentage,
            burnPercentage: rugcheckData.burnPercentage,
            rugcheckScore: rugcheckData.score,
            riskLevel: rugcheckData.riskLevel,
            rugcheckVerified: true
          };
        }
      } catch (rugcheckError) {
        console.log('⚠️ Rugcheck verification failed:', rugcheckError.message);
      }

      // Ensure we have a banner
      if (!enrichedCoin.banner) {
        enrichedCoin.banner = dexscreenerService.generatePlaceholderBanner({ 
          symbol: enrichedCoin.symbol || 'UNKNOWN' 
        });
      }

      // If we got some data, return it
      if (enrichedCoin.name !== 'Unknown Token' || enrichedCoin.symbol !== 'UNKNOWN') {
        console.log(`✅ Successfully enriched external token: ${enrichedCoin.symbol}`);
        return res.json({
          success: true,
          coin: enrichedCoin,
          source: 'external-enriched'
        });
      }

      // If no enrichment worked, return error
      throw new Error('Unable to find token data from any source');

    } catch (enrichmentError) {
      console.error('❌ Failed to enrich external token:', enrichmentError.message);
      return res.status(404).json({
        success: false,
        error: 'Token not found or unable to fetch data',
        details: enrichmentError.message,
        address: address
      });
    }

  } catch (error) {
    console.error('❌ Error in individual coin lookup:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to lookup coin',
      details: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  initializeWithLatestBatch();
  
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔄 Health check: http://localhost:${PORT}/health`);
  console.log(`📊 Trending coins: http://localhost:${PORT}/api/coins/trending`);
  console.log(`🔍 Rugcheck progress: http://localhost:${PORT}/api/rugcheck/progress`);
  console.log(`🤖 Rugcheck auto-status: http://localhost:${PORT}/api/rugcheck/auto-status`);
  console.log(`🔄 Batch refresh: POST http://localhost:${PORT}/api/refresh`);
  console.log(`🔍 Progressive Rugcheck: POST http://localhost:${PORT}/api/rugcheck/verify-all-progressive`);
});
