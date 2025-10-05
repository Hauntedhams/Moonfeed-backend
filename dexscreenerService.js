/*
 * DEXSCREENER ENRICHMENT SERVICE
 * 
 * This service fetches missing token information from DexScreener API 
 * to supplement data from Solana Tracker (BitQuery alternative).
 * Specifically focuses on getting banner images and additional metadata.
 */

const fetch = require('node-fetch');

// DexScreener API configuration
const DEXSCREENER_API_BASE = 'https://api.dexscreener.com/latest';
const REQUEST_DELAY = 200; // 200ms delay between requests to be respectful
const MAX_RETRIES = 2;

// Cache for DexScreener data
let dexScreenerCache = new Map();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

// Helper function to add delay between requests
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Fetch token data from DexScreener for a single address with retries
async function fetchTokenFromDexScreener(tokenAddress, retryCount = 0) {
  try {
    // Check cache first
    const cached = dexScreenerCache.get(tokenAddress);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    console.log(`🔍 Fetching DexScreener data for ${tokenAddress}... (attempt ${retryCount + 1})`);
    
    const response = await fetch(`${DEXSCREENER_API_BASE}/dex/tokens/${tokenAddress}`, {
      headers: {
        'User-Agent': 'Moonfeed/1.0'
      }
    });
    
    if (!response.ok) {
      if (response.status === 429 && retryCount < MAX_RETRIES) {
        console.log(`⏳ Rate limited, waiting 2s before retry ${retryCount + 1}...`);
        await delay(2000);
        return await fetchTokenFromDexScreener(tokenAddress, retryCount + 1);
      }
      
      console.log(`⚠️ DexScreener API error ${response.status} for ${tokenAddress}`);
      return null;
    }

    const data = await response.json();
    
    // Cache the result
    dexScreenerCache.set(tokenAddress, {
      data,
      timestamp: Date.now()
    });

    return data;

  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      console.log(`🔄 Error fetching ${tokenAddress}, retrying in 1s...`);
      await delay(1000);
      return await fetchTokenFromDexScreener(tokenAddress, retryCount + 1);
    }
    
    console.error(`❌ Error fetching from DexScreener for ${tokenAddress}:`, error.message);
    return null;
  }
}

// Batch fetch multiple tokens efficiently (up to 30 tokens per request)
async function fetchTokensBatch(tokenAddresses, retryCount = 0) {
  try {
    // Limit to 30 addresses per batch as per API limit
    const batchAddresses = tokenAddresses.slice(0, 30);
    const addressesString = batchAddresses.join(',');
    
    console.log(`🔍 Batch fetching ${batchAddresses.length} tokens from DexScreener...`);
    
    const response = await fetch(`${DEXSCREENER_API_BASE}/dex/tokens/${addressesString}`, {
      headers: {
        'User-Agent': 'Moonfeed/1.0'
      }
    });
    
    if (!response.ok) {
      if (response.status === 429 && retryCount < MAX_RETRIES) {
        console.log(`⏳ Rate limited on batch request, waiting 2s before retry ${retryCount + 1}...`);
        await delay(2000);
        return await fetchTokensBatch(tokenAddresses, retryCount + 1);
      }
      
      console.log(`⚠️ DexScreener batch API error ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    // Cache individual results
    if (data.pairs) {
      data.pairs.forEach(pair => {
        const tokenAddr = pair.baseToken?.address;
        if (tokenAddr) {
          dexScreenerCache.set(tokenAddr, {
            data: { pairs: [pair] },
            timestamp: Date.now()
          });
        }
      });
    }

    return data;

  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      console.log(`🔄 Error in batch fetch, retrying in 1s...`);
      await delay(1000);
      return await fetchTokensBatch(tokenAddresses, retryCount + 1);
    }
    
    console.error(`❌ Error in batch fetch from DexScreener:`, error.message);
    return null;
  }
}

// Find the best pair from DexScreener data (highest liquidity)
function findBestPair(pairs) {
  if (!pairs || pairs.length === 0) return null;
  
  return pairs.reduce((best, current) => {
    const currentLiquidity = parseFloat(current.liquidity?.usd || '0');
    const bestLiquidity = parseFloat(best.liquidity?.usd || '0');
    return currentLiquidity > bestLiquidity ? current : best;
  });
}

// Extract enrichment data from DexScreener pair
function extractEnrichmentData(pair, tokenAddress) {
  if (!pair) return null;

  const baseToken = pair.baseToken || {};
  
  // Enhanced banner extraction - check multiple fields and CDN sources
  let banner = null;
  
  // Try different banner fields from DexScreener
  console.log(`🔍 Banner extraction debug for ${baseToken.symbol}:`, {
    header: pair.info?.header,
    imageUrl: pair.info?.imageUrl,
    websiteImageUrl: pair.info?.websites?.[0]?.imageUrl,
    baseTokenImage: baseToken.image
  });
  
  if (pair.info?.header) {
    banner = pair.info.header;
    console.log(`✅ Found header banner for ${baseToken.symbol}:`, banner);
  } else if (pair.info?.imageUrl && pair.info.imageUrl.includes('banner')) {
    banner = pair.info.imageUrl;
    console.log(`✅ Found imageUrl banner for ${baseToken.symbol}:`, banner);
  } else if (pair.info?.websites?.[0]?.imageUrl) {
    banner = pair.info.websites[0].imageUrl;
    console.log(`✅ Found website banner for ${baseToken.symbol}:`, banner);
  } else if (baseToken.image) {
    // Use token image as fallback banner if no dedicated banner found
    banner = baseToken.image;
    console.log(`✅ Using baseToken image as banner for ${baseToken.symbol}:`, banner);
  }
  
  // Enhanced social media parsing
  const socialLinks = {
    website: pair.info?.websites?.[0]?.url || pair.info?.websites?.[0] || null,
    twitter: null,
    telegram: null,
    discord: null
  };
  
  // Parse socials array for better extraction
  if (pair.info?.socials) {
    pair.info.socials.forEach(social => {
      const platform = (social.platform || social.type || '').toLowerCase();
      
      if (platform === 'twitter' || platform === 'x') {
        const handle = social.handle || social.url;
        if (handle) {
          // Format Twitter handles properly
          if (handle.startsWith('http')) {
            socialLinks.twitter = handle;
          } else {
            const cleanHandle = handle.replace('@', '').replace('twitter.com/', '').replace('x.com/', '');
            socialLinks.twitter = `https://twitter.com/${cleanHandle}`;
          }
        }
      } else if (platform === 'telegram' || platform === 'tg') {
        const handle = social.handle || social.url;
        if (handle) {
          // Format Telegram links properly
          if (handle.startsWith('http')) {
            socialLinks.telegram = handle;
          } else {
            const cleanHandle = handle.replace('@', '').replace('t.me/', '');
            socialLinks.telegram = `https://t.me/${cleanHandle}`;
          }
        }
      } else if (platform === 'discord') {
        socialLinks.discord = social.handle || social.url;
      } else if (platform === 'website' || platform === 'web') {
        socialLinks.website = socialLinks.website || social.url;
      }
    });
  }
  
  // Fallback to old format and additional sources
  socialLinks.twitter = socialLinks.twitter || pair.info?.twitter || baseToken.twitter || null;
  socialLinks.telegram = socialLinks.telegram || pair.info?.telegram || baseToken.telegram || null;
  socialLinks.discord = socialLinks.discord || pair.info?.discord || baseToken.discord || null;
  socialLinks.website = socialLinks.website || pair.info?.website || baseToken.website || null;
  
  // Additional URL formatting for any handles that might be raw
  if (socialLinks.twitter && !socialLinks.twitter.startsWith('http')) {
    const cleanHandle = socialLinks.twitter.replace('@', '');
    socialLinks.twitter = `https://twitter.com/${cleanHandle}`;
  }
  
  if (socialLinks.telegram && !socialLinks.telegram.startsWith('http')) {
    const cleanHandle = socialLinks.telegram.replace('@', '');
    socialLinks.telegram = `https://t.me/${cleanHandle}`;
  }
  
  // Debug log for social links detection
  if (socialLinks.twitter || socialLinks.telegram || socialLinks.website || socialLinks.discord) {
    console.log(`🔗 Social links detected for ${baseToken.symbol}:`, {
      twitter: socialLinks.twitter,
      telegram: socialLinks.telegram,
      website: socialLinks.website,
      discord: socialLinks.discord
    });
  }
  
  return {
    // Primary enrichment fields - ENHANCED BANNER SUPPORT
    banner: banner,
    profileImage: pair.info?.imageUrl || null,
    logo: pair.info?.imageUrl || null,
    
    // Enhanced social links
    socialLinks,
    
    // Enhanced description with better fallbacks
    description: pair.info?.description || 
      (baseToken.name ? `${baseToken.name} (${baseToken.symbol}) is trading on ${pair.dexId} with $${(parseFloat(pair.liquidity?.usd || '0') / 1000).toFixed(0)}K liquidity.` : 
      `${baseToken.symbol} is trading on ${pair.dexId} with $${(parseFloat(pair.liquidity?.usd || '0') / 1000).toFixed(0)}K liquidity.`),
    
    // Enhanced metadata for charts
    dexscreenerUrl: pair.url || `https://dexscreener.com/solana/${tokenAddress}`,
    pairAddress: pair.pairAddress,
    dexId: pair.dexId,
    chainId: pair.chainId || 'solana', // Extract chain ID from pair data
    
    // Basic trading metrics
    volume24h: parseFloat(pair.volume?.h24 || '0'),
    liquidity: parseFloat(pair.liquidity?.usd || '0'),
    priceChange24h: parseFloat(pair.priceChange?.h24 || '0'),
    fdv: parseFloat(pair.fdv || '0'),
    marketCap: parseFloat(pair.marketCap || '0'),
    
    // ENHANCED DATA FOR EXTRA INFO SECTION
    // Transaction count data across timeframes
    transactions: {
      buys5m: pair.txns?.m5?.buys || 0,
      sells5m: pair.txns?.m5?.sells || 0,
      buys1h: pair.txns?.h1?.buys || 0,
      sells1h: pair.txns?.h1?.sells || 0,
      buys6h: pair.txns?.h6?.buys || 0,
      sells6h: pair.txns?.h6?.sells || 0,
      buys24h: pair.txns?.h24?.buys || 0,
      sells24h: pair.txns?.h24?.sells || 0,
    },
    
    // Multiple timeframe price changes
    priceChanges: {
      change5m: parseFloat(pair.priceChange?.m5 || '0'),
      change1h: parseFloat(pair.priceChange?.h1 || '0'),
      change6h: parseFloat(pair.priceChange?.h6 || '0'),
      change24h: parseFloat(pair.priceChange?.h24 || '0'),
    },
    
    // Volume across timeframes
    volumes: {
      volume5m: parseFloat(pair.volume?.m5 || '0'),
      volume1h: parseFloat(pair.volume?.h1 || '0'),
      volume6h: parseFloat(pair.volume?.h6 || '0'),
      volume24h: parseFloat(pair.volume?.h24 || '0'),
    },
    
    // Pair creation age and pool info
    poolInfo: {
      createdAt: pair.pairCreatedAt,
      ageHours: pair.pairCreatedAt ? Math.floor((Date.now() / 1000 - pair.pairCreatedAt) / 3600) : null,
      ageDays: pair.pairCreatedAt ? Math.floor((Date.now() / 1000 - pair.pairCreatedAt) / 86400) : null,
      labels: pair.labels || [],
      isNew: pair.labels?.includes('new') || false,
    },
    
    // Enhanced liquidity data
    liquidityDetails: {
      usd: parseFloat(pair.liquidity?.usd || '0'),
      base: parseFloat(pair.liquidity?.base || '0'),
      quote: parseFloat(pair.liquidity?.quote || '0'),
    },
    
    // Market metrics
    marketMetrics: {
      fdv: parseFloat(pair.fdv || '0'),
      marketCap: parseFloat(pair.marketCap || '0'),
      fdvToMcapRatio: (pair.fdv && pair.marketCap) ? (parseFloat(pair.fdv) / parseFloat(pair.marketCap)) : null,
    },
    
    // Boost information (if available)
    boosts: pair.boosts?.active || 0,
    
    // Quality indicators
    hasImage: !!baseToken.image,
    hasSocials: !!(socialLinks.website || socialLinks.twitter || socialLinks.telegram),
    hasDescription: !!(pair.info?.description && pair.info.description.length > 50),
    
    source: 'dexscreener-enrichment'
  };
}

// Enrich a single coin with DexScreener data
async function enrichCoin(coin) {
  const tokenAddress = coin.mintAddress || coin.tokenAddress || coin.address;
  
  if (!tokenAddress) {
    console.log('⚠️ No token address found for coin:', coin.symbol);
    return coin;
  }

  try {
    const dexData = await fetchTokenFromDexScreener(tokenAddress);
    
    if (!dexData || !dexData.pairs || dexData.pairs.length === 0) {
      return coin; // Return original coin if no DexScreener data
    }

    const bestPair = findBestPair(dexData.pairs);
    const enrichmentData = extractEnrichmentData(bestPair, tokenAddress);
    
    if (!enrichmentData) {
      return coin;
    }

    // Create enriched coin object
    const enrichedCoin = { ...coin };
    
    // Always use DexScreener banner when available (prioritize over placeholder banners)
    if (enrichmentData.banner) {
      enrichedCoin.banner = enrichmentData.banner;
      console.log(`🖼️ Updated banner for ${coin.symbol} from DexScreener`);
    }
    
    // Always use DexScreener profile image when available (prioritize over placeholder images)
    if (enrichmentData.profileImage) {
      enrichedCoin.profileImage = enrichmentData.profileImage;
      enrichedCoin.image = enrichmentData.profileImage;
      enrichedCoin.logo = enrichmentData.profileImage;
      console.log(`🖼️ Updated profile image for ${coin.symbol} from DexScreener`);
    }
    
    // Enhance social links
    if (enrichmentData.socialLinks) {
      enrichedCoin.socialLinks = {
        ...coin.socialLinks,
        ...enrichmentData.socialLinks
      };
      
      // Also update legacy socials format
      enrichedCoin.socials = {
        ...coin.socials,
        ...enrichmentData.socialLinks
      };
    }
    
    // Enhance description if original is generic
    if (!coin.description || coin.description.includes('token on unknown') || coin.description.length < 50) {
      enrichedCoin.description = enrichmentData.description;
    }
    
    // Add DexScreener metadata
    enrichedCoin.dexscreenerUrl = enrichmentData.dexscreenerUrl;
    enrichedCoin.chartUrl = enrichmentData.dexscreenerUrl;
    enrichedCoin.pairAddress = enrichmentData.pairAddress;
    
    // Mark as enriched
    enrichedCoin.enriched = true;
    enrichedCoin.enrichmentSource = 'dexscreener';
    
    console.log(`✅ Enriched ${coin.symbol} with DexScreener data`);
    return enrichedCoin;
    
  } catch (error) {
    console.error(`❌ Error enriching ${coin.symbol}:`, error.message);
    return coin; // Return original coin on error
  }
}

// Enrich multiple coins with DexScreener data (with efficient batch processing)
async function enrichCoins(coins, options = {}) {
  const {
    useBatchApi = true,   // Use batch API for efficiency
    batchSize = 25,       // Tokens per batch (under 30 limit)
    batchDelay = 1000,    // Delay between batches
    maxToEnrich = 100,    // Max coins to enrich
    forceBannerEnrichment = false // Force enrichment even if coin already has banner
  } = options;

  console.log(`🚀 Starting DexScreener enrichment for ${Math.min(coins.length, maxToEnrich)} coins...`);
  console.log(`🎨 Banner enrichment mode: ${forceBannerEnrichment ? 'FORCE' : 'STANDARD'}`);
  
  const coinsToEnrich = coins.slice(0, maxToEnrich);
  const enrichedCoins = [];
  
  if (useBatchApi) {
    // Use efficient batch API processing
    for (let i = 0; i < coinsToEnrich.length; i += batchSize) {
      const batch = coinsToEnrich.slice(i, i + batchSize);
      const tokenAddresses = batch.map(coin => 
        coin.mintAddress || coin.tokenAddress || coin.address
      ).filter(Boolean);
      
      if (tokenAddresses.length === 0) continue;
      
      console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(coinsToEnrich.length / batchSize)} (${tokenAddresses.length} tokens)...`);
      
      // Fetch batch data
      const batchData = await fetchTokensBatch(tokenAddresses);
      
      if (batchData && batchData.pairs) {
        // Process each coin in the batch
        for (const coin of batch) {
          const tokenAddress = coin.mintAddress || coin.tokenAddress || coin.address;
          if (!tokenAddress) {
            enrichedCoins.push(coin);
            continue;
          }
          
          // Find matching pairs for this token
          const tokenPairs = batchData.pairs.filter(pair => 
            pair.baseToken?.address === tokenAddress
          );
          
          if (tokenPairs.length > 0) {
            const bestPair = findBestPair(tokenPairs);
            const enrichmentData = extractEnrichmentData(bestPair, tokenAddress);
            
            if (enrichmentData) {
              const enrichedCoin = await applyEnrichmentData(coin, enrichmentData, { forceBannerEnrichment });
              enrichedCoins.push(enrichedCoin);
              continue;
            }
          }
          
          // If no enrichment data found and forceBannerEnrichment is true, ensure we have a banner
          if (forceBannerEnrichment && !coin.banner) {
            enrichedCoins.push({
              ...coin,
              banner: generatePlaceholderBanner(coin)
            });
          } else {
            enrichedCoins.push(coin);
          }
        }
      } else {
        // Fallback: ensure all coins have banners if forceBannerEnrichment is true
        if (forceBannerEnrichment) {
          const coinsWithBanners = batch.map(coin => ({
            ...coin,
            banner: coin.banner || generatePlaceholderBanner(coin)
          }));
          enrichedCoins.push(...coinsWithBanners);
        } else {
          enrichedCoins.push(...batch);
        }
      }
      
      // Add delay between batches
      if (i + batchSize < coinsToEnrich.length) {
        console.log(`⏳ Waiting ${batchDelay}ms before next batch...`);
        await delay(batchDelay);
      }
    }
  } else {
    // Fallback to individual enrichment
    const maxConcurrent = 5;
    for (let i = 0; i < coinsToEnrich.length; i += maxConcurrent) {
      const batch = coinsToEnrich.slice(i, i + maxConcurrent);
      const batchPromises = batch.map(coin => enrichCoin(coin));
      const batchResults = await Promise.all(batchPromises);
      enrichedCoins.push(...batchResults);
      
      if (i + maxConcurrent < coinsToEnrich.length) {
        await delay(1000);
      }
    }
  }
  
  // Add remaining coins that weren't enriched
  if (coins.length > maxToEnrich) {
    enrichedCoins.push(...coins.slice(maxToEnrich));
  }
  
  const enrichedCount = enrichedCoins.filter(coin => coin.enriched).length;
  console.log(`✅ DexScreener enrichment complete: ${enrichedCount}/${coinsToEnrich.length} coins enriched`);
  
  return enrichedCoins;
}

// Helper function to apply enrichment data to a coin
async function applyEnrichmentData(coin, enrichmentData, options = {}) {
  const { forceBannerEnrichment = false } = options;
  const enrichedCoin = { ...coin };
  
  // Apply banner enrichment with enhanced logic
  console.log(`🔍 Banner application debug for ${coin.symbol}:`, {
    currentBanner: coin.banner,
    enrichmentBanner: enrichmentData.banner,
    forceBannerEnrichment: forceBannerEnrichment,
    condition1: forceBannerEnrichment || !coin.banner,
    condition2: enrichmentData.banner,
    willOverwrite: (forceBannerEnrichment || !coin.banner) && enrichmentData.banner
  });
  
  if (forceBannerEnrichment || !coin.banner) {
    if (enrichmentData.banner) {
      enrichedCoin.banner = enrichmentData.banner;
      console.log(`✅ Applied real banner for ${coin.symbol}:`, enrichmentData.banner);
    } else if (forceBannerEnrichment && !coin.banner) {
      // Generate a high-quality placeholder banner if no real banner found
      enrichedCoin.banner = generatePlaceholderBanner(coin);
      console.log(`⚠️ Applied placeholder banner for ${coin.symbol}:`, enrichedCoin.banner);
    }
  } else {
    console.log(`⏭️ Skipped banner update for ${coin.symbol} (already has banner)`);
  }
  
  // Apply profile image enrichment
  if (!coin.profileImage && enrichmentData.profileImage) {
    enrichedCoin.profileImage = enrichmentData.profileImage;
    enrichedCoin.image = enrichmentData.profileImage;
    enrichedCoin.logo = enrichmentData.profileImage;
  }
  
  // Enhanced social links
  if (enrichmentData.socialLinks) {
    enrichedCoin.socialLinks = {
      ...coin.socialLinks,
      ...enrichmentData.socialLinks
    };
    enrichedCoin.socials = {
      ...coin.socials,
      ...enrichmentData.socialLinks
    };
  }
  
  // Enhanced description
  if (!coin.description || coin.description.includes('token on unknown') || coin.description.length < 50) {
    enrichedCoin.description = enrichmentData.description;
  }
  
  // ENHANCED MARKET DATA MERGING - Use DexScreener data when available as it's more accurate
  if (enrichmentData.marketCap && enrichmentData.marketCap > 0) {
    enrichedCoin.market_cap_usd = enrichmentData.marketCap;
    enrichedCoin.marketCap = enrichmentData.marketCap;
    enrichedCoin.market_cap = enrichmentData.marketCap;
  }
  
  if (enrichmentData.volume24h && enrichmentData.volume24h > 0) {
    enrichedCoin.volume_24h_usd = enrichmentData.volume24h;
    enrichedCoin.volume24h = enrichmentData.volume24h;
    enrichedCoin.volume_24h = enrichmentData.volume24h;
  }
  
  if (enrichmentData.liquidity && enrichmentData.liquidity > 0) {
    enrichedCoin.liquidity_usd = enrichmentData.liquidity;
    enrichedCoin.liquidityUsd = enrichmentData.liquidity;
    enrichedCoin.liquidity = enrichmentData.liquidity;
  }
  
  if (enrichmentData.priceChange24h !== undefined) {
    enrichedCoin.priceChange24h = enrichmentData.priceChange24h;
    enrichedCoin.change_24h = enrichmentData.priceChange24h;
    enrichedCoin.change24h = enrichmentData.priceChange24h;
  }
  
  // Add DexScreener metadata for charts
  enrichedCoin.dexscreenerUrl = enrichmentData.dexscreenerUrl;
  enrichedCoin.chartUrl = enrichmentData.dexscreenerUrl;
  enrichedCoin.pairAddress = enrichmentData.pairAddress;
  enrichedCoin.chainId = enrichmentData.chainId || 'solana'; // Default to Solana
  enrichedCoin.dexId = enrichmentData.dexId;
  enrichedCoin.dexId = enrichmentData.dexId;
  
  // ADD ALL ENHANCED DATA FOR EXTRA INFO SECTION
  enrichedCoin.dexscreener = {
    transactions: enrichmentData.transactions,
    priceChanges: enrichmentData.priceChanges,
    volumes: enrichmentData.volumes,
    poolInfo: enrichmentData.poolInfo,
    liquidityDetails: enrichmentData.liquidityDetails,
    marketMetrics: enrichmentData.marketMetrics,
    boosts: enrichmentData.boosts,
    qualityScore: {
      hasImage: enrichmentData.hasImage,
      hasSocials: enrichmentData.hasSocials,
      hasDescription: enrichmentData.hasDescription,
      hasMarketData: !!(enrichmentData.marketCap || enrichmentData.volume24h || enrichmentData.liquidity)
    }
  };
  
  // Mark as enriched
  enrichedCoin.enriched = true;
  enrichedCoin.enrichmentSource = 'dexscreener';
  
  console.log(`✅ Enriched ${coin.symbol} with enhanced DexScreener data`);
  return enrichedCoin;
}

// Fetch boosted tokens from DexScreener
async function fetchBoostedTokens(type = 'latest', retryCount = 0) {
  try {
    const endpoint = type === 'top' ? '/token-boosts/top/v1' : '/token-boosts/latest/v1';
    
    console.log(`🚀 Fetching ${type} boosted tokens from DexScreener...`);
    
    const response = await fetch(`${DEXSCREENER_API_BASE}${endpoint}`, {
      headers: {
        'User-Agent': 'Moonfeed/1.0'
      }
    });
    
    if (!response.ok) {
      if (response.status === 429 && retryCount < MAX_RETRIES) {
        console.log(`⏳ Rate limited on boosted tokens, waiting 2s before retry ${retryCount + 1}...`);
        await delay(2000);
        return await fetchBoostedTokens(type, retryCount + 1);
      }
      
      console.log(`⚠️ DexScreener boosted tokens API error ${response.status}`);
      return null;
    }

    const data = await response.json();
    console.log(`✅ Fetched ${data.length || 0} boosted tokens`);
    
    return data;

  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      console.log(`🔄 Error fetching boosted tokens, retrying in 1s...`);
      await delay(1000);
      return await fetchBoostedTokens(type, retryCount + 1);
    }
    
    console.error(`❌ Error fetching boosted tokens:`, error.message);
    return null;
  }
}

// Generate placeholder banner based on coin data (fallback when no real banner available)
function generatePlaceholderBanner(coin) {
  const colors = [
    'ff6b6b,4ecdc4', 'ff9ff3,54a0ff', '45b7d1,96ceb4', 
    'feca57,ff6b6b', '5f27cd,dda0dd', '00d2d3,ff9f43',
    'ff3838,ff9500', '7bed9f,70a1ff', 'a4b0be,747d8c'
  ];
  
  const colorPair = colors[Math.abs(coin.symbol?.charCodeAt(0) || 0) % colors.length];
  const symbol = encodeURIComponent(coin.symbol || 'TOKEN');
  
  return `https://api.dicebear.com/7.x/shapes/svg?seed=${symbol}&backgroundColor=${colorPair}&scale=120`;
}

// Get cache statistics
function getCacheStats() {
  return {
    size: dexScreenerCache.size,
    oldestEntry: dexScreenerCache.size > 0 ? 
      Math.min(...Array.from(dexScreenerCache.values()).map(entry => entry.timestamp)) : null,
    newestEntry: dexScreenerCache.size > 0 ? 
      Math.max(...Array.from(dexScreenerCache.values()).map(entry => entry.timestamp)) : null,
    ttlMinutes: CACHE_TTL / (60 * 1000)
  };
}

// Clear old cache entries
function cleanCache() {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [key, value] of dexScreenerCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      dexScreenerCache.delete(key);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(`🧹 Cleaned ${cleaned} expired cache entries`);
  }
  
  return cleaned;
}

// Fetch chart data for a specific pair address
async function fetchChartData(pairAddress, timeframe = '1h') {
  try {
    console.log(`📊 Fetching chart data for pair ${pairAddress} (${timeframe})`);
    
    // For now, fetch the pair data which includes current price and changes
    const response = await fetch(`${DEXSCREENER_API_BASE}/dex/pairs/solana/${pairAddress}`, {
      headers: {
        'User-Agent': 'Moonfeed/1.0'
      }
    });
    
    if (!response.ok) {
      console.log(`⚠️ DexScreener chart API error ${response.status} for ${pairAddress}`);
      return null;
    }
    
    const data = await response.json();
    const pair = data.pair;
    
    if (!pair) {
      console.log(`❌ No pair data found for ${pairAddress}`);
      return null;
    }
    
    // Return relevant price data
    return {
      priceUsd: pair.priceUsd,
      priceChange: {
        m5: pair.priceChange?.m5 || 0,
        h1: pair.priceChange?.h1 || 0,
        h6: pair.priceChange?.h6 || 0,
        h24: pair.priceChange?.h24 || 0
      },
      volume: {
        h24: pair.volume?.h24 || 0,
        h6: pair.volume?.h6 || 0,
        h1: pair.volume?.h1 || 0,
        m5: pair.volume?.m5 || 0
      },
      liquidity: pair.liquidity?.usd || 0,
      fdv: pair.fdv || 0,
      baseToken: pair.baseToken,
      chainId: pair.chainId,
      pairAddress: pair.pairAddress
    };
    
  } catch (error) {
    console.error(`💥 Error fetching chart data for ${pairAddress}:`, error.message);
    return null;
  }
}

module.exports = {
  enrichCoin,
  enrichCoins,
  fetchTokenFromDexScreener,
  fetchTokensBatch,
  generatePlaceholderBanner,
  getCacheStats,
  cleanCache,
  fetchBoostedTokens,
  fetchChartData
};
