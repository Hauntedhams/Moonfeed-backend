const fetch = require('node-fetch');
const NodeCache = require('node-cache');

class TokenMetadataService {
  constructor() {
    // Initialize caches with different TTL based on data volatility
    this.metadataCache = new NodeCache({ 
      stdTTL: 3600, // 1 hour for metadata (changes infrequently)
      checkperiod: 300 
    });
    
    this.socialCache = new NodeCache({ 
      stdTTL: 1800, // 30 minutes for social links
      checkperiod: 300 
    });
    
    this.descriptionCache = new NodeCache({ 
      stdTTL: 7200, // 2 hours for descriptions (rarely change)
      checkperiod: 600 
    });
    
    // Jupiter Token API endpoints for metadata
    this.jupiterTokenApi = 'https://lite-api.jup.ag/tokens/v2';
    this.jupiterSearchApi = 'https://lite-api.jup.ag/tokens/v2/search';
    
    console.log('📋 Token Metadata Service initialized');
  }

  /**
   * Get comprehensive metadata for a token using Jupiter as primary source
   */
  async getTokenMetadata(mintAddress, options = {}) {
    const cacheKey = `metadata_${mintAddress}`;
    
    // Check cache first
    const cached = this.metadataCache.get(cacheKey);
    if (cached && !options.forceRefresh) {
      return { ...cached, source: 'cached' };
    }

    try {
      console.log(`📋 Fetching metadata for ${mintAddress}`);
      
      // Get Jupiter token data first
      const jupiterMetadata = await this.getJupiterMetadata(mintAddress);
      
      // Get social links from multiple sources
      const socialData = await this.getSocialMetadata(mintAddress, options.chainId);
      
      // Get token description
      const descriptionData = await this.getTokenDescription(mintAddress, options.chainId);
      
      // Combine all metadata
      const metadata = {
        ...jupiterMetadata,
        ...socialData,
        ...descriptionData,
        mintAddress,
        lastUpdated: new Date().toISOString(),
        source: 'token-metadata-service'
      };
      
      // Cache the result
      this.metadataCache.set(cacheKey, metadata);
      
      return metadata;
      
    } catch (error) {
      console.error(`❌ Error fetching metadata for ${mintAddress}:`, error.message);
      return this.getBasicMetadata(mintAddress);
    }
  }

  /**
   * Get token metadata from Jupiter API v2
   */
  async getJupiterMetadata(mintAddress) {
    try {
      const response = await fetch(`${this.jupiterSearchApi}?query=${mintAddress}`, {
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'MoonFeed/1.0'
        }
      });
      
      if (response.status === 429) {
        console.warn(`⚠️ Jupiter API rate limited for ${mintAddress}, using fallback`);
        return {};
      }
      
      if (!response.ok) {
        throw new Error(`Jupiter API returned ${response.status}`);
      }
      
      const tokens = await response.json();
      const token = tokens.find(t => t.id === mintAddress);
      
      if (!token) {
        console.warn(`⚠️ Token ${mintAddress} not found in Jupiter`);
        return {};
      }

      return {
        // Basic token info
        name: token.name,
        symbol: token.symbol,
        icon: token.icon,
        decimals: token.decimals,
        
        // Verification and trust indicators
        isVerified: token.isVerified || false,
        isStrict: token.isStrict || false,
        isCommunity: token.isCommunity || false,
        
        // Metadata from Jupiter
        description: token.description,
        website: token.website,
        
        // Supply information
        totalSupply: token.totalSupply,
        circulatingSupply: token.circSupply,
        
        // Tags and categorization
        tags: token.tags || [],
        
        // Additional Jupiter metadata
        jupiterMetadata: {
          organicScore: token.organicScore,
          organicScoreLabel: token.organicScoreLabel,
          holderCount: token.holderCount,
          likes: token.likes,
          smartMoneyLikes: token.smartCtLikes,
          cexListings: token.cexes || [],
          
          // Audit information
          audit: token.audit ? {
            mintAuthorityDisabled: token.audit.mintAuthorityDisabled,
            freezeAuthorityDisabled: token.audit.freezeAuthorityDisabled,
            topHoldersPercentage: token.audit.topHoldersPercentage
          } : null,
          
          // First pool information
          firstPool: token.firstPool ? {
            createdAt: token.firstPool.createdAt,
            type: token.firstPool.type
          } : null
        }
      };
      
    } catch (error) {
      console.error(`❌ Error fetching Jupiter metadata for ${mintAddress}:`, error.message);
      return {};
    }
  }

  /**
   * Get social links metadata from multiple sources
   */
  async getSocialMetadata(mintAddress, chainId = 'solana') {
    const cacheKey = `social_${mintAddress}`;
    
    // Check cache first
    const cached = this.socialCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const socials = {};
      
      // Try Dexscreener API first (most reliable)
      const dexscreenerSocials = await this.getDexscreenerSocials(mintAddress);
      Object.assign(socials, dexscreenerSocials);
      
      // If it's a pump.fun token, try pump.fun data
      if (mintAddress.endsWith('pump')) {
        const pumpSocials = await this.getPumpFunSocials(mintAddress);
        Object.assign(socials, pumpSocials);
      }
      
      // Clean and validate URLs
      const cleanedSocials = this.cleanSocialUrls(socials);
      
      // Cache the result
      this.socialCache.set(cacheKey, cleanedSocials);
      
      return cleanedSocials;
      
    } catch (error) {
      console.error(`❌ Error fetching social metadata for ${mintAddress}:`, error.message);
      return {};
    }
  }

  /**
   * Get token description from various sources
   */
  async getTokenDescription(mintAddress, chainId = 'solana') {
    const cacheKey = `description_${mintAddress}`;
    
    // Check cache first
    const cached = this.descriptionCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      let description = null;
      let descriptionSource = null;
      
      // Try Dexscreener for description
      const dexscreenerDesc = await this.getDexscreenerDescription(mintAddress);
      if (dexscreenerDesc) {
        description = dexscreenerDesc;
        descriptionSource = 'dexscreener';
      }
      
      // If no description found and it's a pump.fun token, try pump.fun
      if (!description && mintAddress.endsWith('pump')) {
        const pumpDesc = await this.getPumpFunDescription(mintAddress);
        if (pumpDesc) {
          description = pumpDesc;
          descriptionSource = 'pump.fun';
        }
      }
      
      const result = {
        description,
        descriptionSource,
        hasDescription: !!description
      };
      
      // Cache the result
      this.descriptionCache.set(cacheKey, result);
      
      return result;
      
    } catch (error) {
      console.error(`❌ Error fetching description for ${mintAddress}:`, error.message);
      return { description: null, descriptionSource: null, hasDescription: false };
    }
  }

  /**
   * Get social links from Dexscreener API
   */
  async getDexscreenerSocials(mintAddress) {
    try {
      const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mintAddress}`, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      });
      
      if (!response.ok) {
        return {};
      }
      
      const data = await response.json();
      const socials = {};
      
      if (data.pairs && data.pairs.length > 0) {
        for (const pair of data.pairs) {
          if (pair.info) {
            // Extract websites
            if (pair.info.websites && pair.info.websites.length > 0) {
              const officialSite = pair.info.websites.find(site => 
                site.url && this.isOfficialWebsite(site.url)
              );
              if (officialSite) {
                socials.website = officialSite.url;
              }
            }
            
            // Extract social media links
            if (pair.info.socials && pair.info.socials.length > 0) {
              for (const social of pair.info.socials) {
                if (social.url) {
                  if (social.type === 'twitter' || social.url.includes('twitter.com') || social.url.includes('x.com')) {
                    socials.twitter = social.url;
                  } else if (social.type === 'telegram' || social.url.includes('t.me')) {
                    socials.telegram = social.url;
                  } else if (social.type === 'discord' || social.url.includes('discord.gg')) {
                    socials.discord = social.url;
                  }
                }
              }
            }
            
            // Break if we found sufficient data
            if (Object.keys(socials).length > 0) {
              break;
            }
          }
        }
      }
      
      return socials;
      
    } catch (error) {
      console.error(`❌ Error fetching Dexscreener socials for ${mintAddress}:`, error.message);
      return {};
    }
  }

  /**
   * Get description from Dexscreener
   */
  async getDexscreenerDescription(mintAddress) {
    try {
      const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mintAddress}`, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      });
      
      if (!response.ok) {
        return null;
      }
      
      const data = await response.json();
      
      if (data.pairs && data.pairs.length > 0) {
        for (const pair of data.pairs) {
          if (pair.info && pair.info.description) {
            return pair.info.description;
          }
        }
      }
      
      return null;
      
    } catch (error) {
      console.error(`❌ Error fetching Dexscreener description for ${mintAddress}:`, error.message);
      return null;
    }
  }

  /**
   * Get social links from Pump.fun (placeholder for future implementation)
   */
  async getPumpFunSocials(mintAddress) {
    try {
      // This would implement pump.fun scraping/API if available
      // For now, return empty object
      return {};
    } catch (error) {
      return {};
    }
  }

  /**
   * Get description from Pump.fun (placeholder for future implementation)
   */
  async getPumpFunDescription(mintAddress) {
    try {
      // This would implement pump.fun description fetching if available
      // For now, return null
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Clean and validate social URLs
   */
  cleanSocialUrls(socials) {
    const cleaned = {};
    
    Object.keys(socials).forEach(key => {
      const url = this.cleanUrl(socials[key]);
      if (url) {
        cleaned[key] = url;
      }
    });
    
    return cleaned;
  }

  /**
   * Clean and validate a single URL
   */
  cleanUrl(url) {
    if (!url || typeof url !== 'string') return null;
    
    url = url.trim();
    if (!url) return null;
    
    // Remove quotes
    url = url.replace(/^["']|["']$/g, '');
    
    // Skip tracking URLs and invalid patterns
    if (url.includes('googletagmanager.com') || 
        url.includes('google-analytics.com') ||
        url.includes('facebook.com/tr') ||
        url.length < 4) {
      return null;
    }
    
    // Ensure protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    
    // Validate URL format
    try {
      new URL(url);
      return url;
    } catch {
      return null;
    }
  }

  /**
   * Check if URL is likely an official project website
   */
  isOfficialWebsite(url) {
    if (!url) return false;
    
    const blacklist = [
      'googletagmanager.com',
      'google-analytics.com',
      'facebook.com',
      'instagram.com',
      'youtube.com',
      'linkedin.com',
      'discord.gg',
      't.me',
      'twitter.com',
      'x.com'
    ];
    
    return !blacklist.some(domain => url.includes(domain));
  }

  /**
   * Get basic metadata structure for fallback
   */
  getBasicMetadata(mintAddress) {
    return {
      mintAddress,
      name: null,
      symbol: null,
      icon: null,
      description: null,
      website: null,
      twitter: null,
      telegram: null,
      discord: null,
      isVerified: false,
      hasDescription: false,
      lastUpdated: new Date().toISOString(),
      source: 'fallback'
    };
  }

  /**
   * Batch enrich multiple tokens with metadata
   */
  async batchEnrichWithMetadata(tokens, maxConcurrency = 3) {
    console.log(`📋 Batch enriching ${tokens.length} tokens with metadata...`);
    
    const results = [];
    const batchSize = maxConcurrency;
    
    for (let i = 0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize);
      
      console.log(`📦 Processing metadata batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(tokens.length / batchSize)} (${batch.length} tokens)`);
      
      const batchPromises = batch.map(async (token) => {
        try {
          const metadata = await this.getTokenMetadata(
            token.mintAddress || token.address,
            { chainId: token.chainId || 'solana' }
          );
          
          return {
            ...token,
            ...metadata,
            metadataEnriched: true,
            metadataSource: 'token-metadata-service'
          };
        } catch (error) {
          console.error(`❌ Failed to enrich metadata for ${token.symbol}:`, error.message);
          return token; // Return original token on failure
        }
      });
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error(`❌ Failed to process ${batch[index].symbol}:`, result.reason?.message);
          results.push(batch[index]); // Return original token on failure
        }
      });
      
      // Rate limiting delay between batches
      if (i + batchSize < tokens.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    const enrichedCount = results.filter(token => token.metadataEnriched).length;
    console.log(`✅ Metadata enrichment complete: ${enrichedCount}/${results.length} tokens enhanced`);
    
    return results;
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      metadata: {
        total_cached: this.metadataCache.keys().length,
        hits: this.metadataCache.getStats().hits,
        misses: this.metadataCache.getStats().misses
      },
      social: {
        total_cached: this.socialCache.keys().length,
        hits: this.socialCache.getStats().hits,
        misses: this.socialCache.getStats().misses
      },
      description: {
        total_cached: this.descriptionCache.keys().length,
        hits: this.descriptionCache.getStats().hits,
        misses: this.descriptionCache.getStats().misses
      }
    };
  }

  /**
   * Clear all caches
   */
  clearCaches() {
    this.metadataCache.flushAll();
    this.socialCache.flushAll();
    this.descriptionCache.flushAll();
    console.log('🗑️ All metadata caches cleared');
  }

  /**
   * Get metadata for display in frontend
   */
  formatMetadataForFrontend(metadata) {
    return {
      // Basic info
      name: metadata.name,
      symbol: metadata.symbol,
      icon: metadata.icon || metadata.profileImage,
      description: metadata.description,
      
      // Social links
      socials: {
        website: metadata.website,
        twitter: metadata.twitter,
        telegram: metadata.telegram,
        discord: metadata.discord
      },
      
      // Trust indicators
      isVerified: metadata.isVerified,
      isStrict: metadata.isStrict,
      isCommunity: metadata.isCommunity,
      
      // Additional metadata
      tags: metadata.tags || [],
      holderCount: metadata.jupiterMetadata?.holderCount,
      organicScore: metadata.jupiterMetadata?.organicScore,
      organicScoreLabel: metadata.jupiterMetadata?.organicScoreLabel,
      
      // Audit info
      audit: metadata.jupiterMetadata?.audit,
      
      // Metadata status
      hasDescription: metadata.hasDescription,
      hasSocials: !!(metadata.website || metadata.twitter || metadata.telegram),
      metadataSource: metadata.source,
      lastUpdated: metadata.lastUpdated
    };
  }
}

module.exports = TokenMetadataService;
