const fetch = require('node-fetch');

class RugcheckService {
  constructor() {
    this.baseUrl = 'https://api.rugcheck.xyz/v1';
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes cache
    this.requestDelay = 200; // 200ms delay between requests to avoid rate limiting
  }

  async checkToken(mintAddress) {
    try {
      // Check cache first
      const cached = this.cache.get(mintAddress);
      if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
        console.log(`🔍 Rugcheck cache hit for ${mintAddress}`);
        return cached.data;
      }

      // Add delay to avoid rate limiting
      await this.sleep(this.requestDelay);

      // Make API request to public endpoint (try both formats)
      let response = await fetch(`${this.baseUrl}/tokens/${mintAddress}/report`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'MoonFeed/1.0'
        },
        timeout: 10000 // 10 second timeout
      });

      // If report endpoint fails, try the base token endpoint
      if (!response.ok) {
        console.log(`🔄 Trying alternative endpoint for ${mintAddress}`);
        response = await fetch(`${this.baseUrl}/tokens/${mintAddress}`, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'MoonFeed/1.0'
          },
          timeout: 10000
        });
      }

      if (response.status === 429) {
        console.warn(`⏰ Rate limited on Rugcheck for ${mintAddress}, using fallback`);
        return this.createFallbackData();
      }

      if (!response.ok) {
        console.warn(`⚠️ Rugcheck API returned ${response.status} for ${mintAddress}`);
        return this.createFallbackData();
      }

      const data = await response.json();
      
      // Extract liquidity lock info from Rugcheck response
      const rugcheckData = {
        liquidityLocked: this.determineLiquidityLock(data),
        lockPercentage: this.extractLockPercentage(data),
        burnPercentage: this.extractBurnPercentage(data),
        freezeAuthority: data.tokenMeta?.freezeAuthority === null,
        mintAuthority: data.tokenMeta?.mintAuthority === null,
        topHolderPercent: data.topHolders?.[0]?.pct || 0,
        riskLevel: data.riskLevel || 'unknown',
        score: data.score || 0,
        isHoneypot: data.risks?.includes('honeypot') || false,
        rugcheckAvailable: true
      };

      // Cache the result
      this.cache.set(mintAddress, {
        data: rugcheckData,
        timestamp: Date.now()
      });

      console.log(`✅ Rugcheck data retrieved for ${mintAddress}: ${rugcheckData.liquidityLocked ? 'LOCKED' : 'UNLOCKED'}`);
      return rugcheckData;

    } catch (error) {
      console.error(`❌ Error checking token ${mintAddress} on Rugcheck:`, error.message);
      return this.createFallbackData();
    }
  }

  // Determine if liquidity is locked based on Rugcheck data
  determineLiquidityLock(data) {
    // Check multiple indicators for liquidity lock
    const markets = data.markets || [];
    
    for (const market of markets) {
      const lp = market.lp || {};
      
      // Consider locked if:
      // 1. More than 80% of LP tokens are locked
      // 2. More than 90% of LP tokens are burned
      // 3. LP lock until date is in the future
      const lockedPct = lp.lpLockedPct || 0;
      const burnedPct = lp.lpBurned || 0;
      const lockUntil = lp.lpLockUntil;

      if (lockedPct > 80) {
        return true;
      }
      
      if (burnedPct > 90) {
        return true;
      }

      if (lockUntil && new Date(lockUntil) > new Date()) {
        return true;
      }
    }

    return false;
  }

  extractLockPercentage(data) {
    const markets = data.markets || [];
    let maxLocked = 0;
    
    for (const market of markets) {
      const locked = market.lp?.lpLockedPct || 0;
      maxLocked = Math.max(maxLocked, locked);
    }
    
    return Math.round(maxLocked);
  }

  extractBurnPercentage(data) {
    const markets = data.markets || [];
    let maxBurned = 0;
    
    for (const market of markets) {
      const burned = market.lp?.lpBurned || 0;
      maxBurned = Math.max(maxBurned, burned);
    }
    
    return Math.round(maxBurned);
  }

  createFallbackData() {
    return {
      liquidityLocked: false,
      lockPercentage: 0,
      burnPercentage: 0,
      freezeAuthority: null,
      mintAuthority: null,
      topHolderPercent: 0,
      riskLevel: 'unknown',
      score: 0,
      isHoneypot: false,
      rugcheckAvailable: false
    };
  }

  // Batch check multiple tokens with proper rate limiting
  async checkMultipleTokens(mintAddresses, options = {}) {
    const { 
      maxConcurrent = 3, 
      batchDelay = 1000,
      maxTokens = 50 
    } = options;

    console.log(`🔍 Starting Rugcheck batch analysis for ${mintAddresses.length} tokens (max: ${maxTokens})`);
    
    // Limit the number of tokens to check
    const tokensToCheck = mintAddresses.slice(0, maxTokens);
    const results = [];

    // Process in small batches to avoid rate limiting
    for (let i = 0; i < tokensToCheck.length; i += maxConcurrent) {
      const batch = tokensToCheck.slice(i, i + maxConcurrent);
      
      console.log(`🔍 Processing Rugcheck batch ${Math.floor(i / maxConcurrent) + 1}/${Math.ceil(tokensToCheck.length / maxConcurrent)} (${batch.length} tokens)`);
      
      const batchPromises = batch.map(async (address) => {
        const data = await this.checkToken(address);
        return { address, ...data };
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Add delay between batches (except for the last batch)
      if (i + maxConcurrent < tokensToCheck.length) {
        console.log(`⏱️ Waiting ${batchDelay}ms before next Rugcheck batch...`);
        await this.sleep(batchDelay);
      }
    }

    const lockedCount = results.filter(r => r.liquidityLocked).length;
    console.log(`✅ Rugcheck batch complete: ${lockedCount}/${results.length} tokens have locked liquidity`);
    
    return results;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get cache statistics
  getCacheStats() {
    const now = Date.now();
    const validEntries = Array.from(this.cache.values())
      .filter(entry => now - entry.timestamp < this.cacheExpiry);
    
    return {
      totalEntries: this.cache.size,
      validEntries: validEntries.length,
      expiredEntries: this.cache.size - validEntries.length,
      cacheHitRate: this.cacheHits / (this.cacheHits + this.cacheMisses) || 0
    };
  }

  // Clear expired cache entries
  clearExpiredCache() {
    const now = Date.now();
    let cleared = 0;
    
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp >= this.cacheExpiry) {
        this.cache.delete(key);
        cleared++;
      }
    }
    
    if (cleared > 0) {
      console.log(`🧹 Cleared ${cleared} expired Rugcheck cache entries`);
    }
  }
}

// Priority scoring function for coins
function calculatePriorityScore(coin) {
  let score = 0;
  let maxScore = 0;

  // Banner (20)
  maxScore += 20;
  if (coin.banner || coin.bannerUrl || coin.imageUrl) score += 20;

  // Profile pic (15)
  maxScore += 15;
  if (coin.profilePic || coin.profileImage || coin.logo || coin.image) score += 15;

  // Locked liquidity (25)
  maxScore += 25;
  if (coin.liquidityLocked === true) score += 25;
  else if (coin.lockPercentage > 50) score += 15;
  else if (coin.burnPercentage > 50) score += 10;

  // Volume (20)
  maxScore += 20;
  const volume = Number(coin.volume24h || coin.volume_24h_usd || coin.volume || 0);
  if (volume > 1000000) score += 20;
  else if (volume > 500000) score += 15;
  else if (volume > 100000) score += 10;
  else if (volume > 50000) score += 5;

  // Market cap (10)
  maxScore += 10;
  const marketCap = Number(coin.marketCap || coin.market_cap_usd || 0);
  if (marketCap > 10000000) score += 10;
  else if (marketCap > 5000000) score += 7;
  else if (marketCap > 1000000) score += 5;

  // Socials (10)
  maxScore += 10;
  let socialScore = 0;
  if (coin.twitter || coin.socials?.twitter) socialScore += 3;
  if (coin.telegram || coin.socials?.telegram) socialScore += 3;
  if (coin.website || coin.socials?.website) socialScore += 4;
  score += socialScore;

  // Rugcheck verified (5)
  maxScore += 5;
  if (coin.rugcheckVerified) score += 5;

  // Penalty for high risk (-10)
  if (coin.riskLevel === 'high') score -= 10;

  // Percentage score
  const percentageScore = (score / maxScore) * 100;
  // Volume weight
  const volumeWeight = Math.log10(Math.max(volume, 1)) * 10;
  // Final score
  const finalScore = percentageScore + volumeWeight;

  return {
    score: finalScore,
    percentageScore,
    volumeWeight,
    hasAllFeatures: score === maxScore
  };
}

// Sort coins by priority score
function sortCoinsByPriority(coins) {
  return coins.map(coin => ({
    ...coin,
    priorityScore: calculatePriorityScore(coin)
  })).sort((a, b) => {
    // Prioritize coins with all features
    if (a.priorityScore.hasAllFeatures && !b.priorityScore.hasAllFeatures) return -1;
    if (!a.priorityScore.hasAllFeatures && b.priorityScore.hasAllFeatures) return 1;
    // Then by score
    return b.priorityScore.score - a.priorityScore.score;
  });
}

module.exports = new RugcheckService();
module.exports.calculatePriorityScore = calculatePriorityScore;
module.exports.sortCoinsByPriority = sortCoinsByPriority;
