// Enhanced social scraper that extracts social links from multiple sources
const fetch = (...args) => import('node-fetch').then(m => m.default(...args));

// Helper function to validate and clean URLs
function cleanUrl(url) {
  if (!url || typeof url !== 'string') return null;
  url = url.trim();
  if (!url) return null;
  
  // Basic URL validation
  try {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    new URL(url);
    return url;
  } catch {
    return null;
  }
}

// Helper function to check if URL is likely an official project website
function isLikelyOfficialWebsite(url) {
  if (!url) return false;
  
  // Exclude all exchange and trading platforms
  const exchangePatterns = [
    'mexc.com', 'binance.com', 'coinbase.com', 'gate.io', 'okx.com', 'kucoin.com',
    'huobi.com', 'bybit.com', 'kraken.com', 'bitget.com', 'crypto.com', 'gemini.com',
    'pancakeswap.finance', 'uniswap.org', '1inch.io', 'jupiter.ag', 'jup.ag',
    'orca.so', 'serum.so', 'mango.so', 'solflare.com', 'phantom.app',
    'coingecko.com', 'coinmarketcap.com', 'dextools.io', 'birdeye.so',
    'dexscreener.com', 'pump.fun', 'raydium.io', 'googletagmanager.com',
    'google-analytics.com', 'googleapis.com', 'fonts.google.com', 'google.com',
    'cloudflare.com', 'jsdelivr.net', 'unpkg.com', 'cdnjs.com', 'facebook.com',
    'instagram.com', 'linkedin.com', 'youtube.com', 'tiktok.com', 'github.com',
    'reddit.com', 'medium.com', 'moralis.io', 'alchemy.com', 'infura.io',
    'etherscan.io', 'bscscan.com', 'solscan.io', 'polygonscan.com', 'arbiscan.io',
    'optimistic.etherscan.io', 'twitter.com', 'x.com', 't.me', 'discord.gg'
  ];
  
  // Check if URL contains any exchange domains
  for (const pattern of exchangePatterns) {
    if (url.toLowerCase().includes(pattern)) {
      return false;
    }
  }
  
  // Look for indicators of official project websites
  const officialIndicators = [
    // Common project domain patterns
    /\.io$/i, /\.app$/i, /\.xyz$/i, /\.finance$/i, /\.money$/i, /\.fund$/i,
    /\.dao$/i, /\.protocol$/i, /\.network$/i, /\.exchange$/i, /\.meme$/i,
    /\.fun$/i, /\.gg$/i, /\.wtf$/i, /\.lol$/i, /\.wiki$/i,
    // Project-specific patterns
    /^https?:\/\/(?:www\.)?[a-zA-Z0-9\-]+\.(com|org|net|io|app|xyz|meme|fun|gg|wtf|lol|wiki)(?:\/.*)?$/i
  ];
  
  // Check for official indicators
  for (const pattern of officialIndicators) {
    if (pattern.test(url)) {
      return true;
    }
  }
  
  // If domain is short and simple, likely official
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace('www.', '');
    const parts = domain.split('.');
    
    // Simple domain with common TLD
    if (parts.length === 2 && ['com', 'org', 'net', 'io', 'app', 'xyz', 'meme', 'fun', 'gg', 'wtf', 'lol', 'wiki'].includes(parts[1])) {
      return true;
    }
  } catch {
    return false;
  }
  
  return false;
}

// Extract social links from HTML content
function extractSocialsFromHtml(html) {
  const socials = {};
  
  // Twitter patterns
  const twitterPatterns = [
    /href=["']?(https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/[^"'\s<>]+)["']?/gi,
    /["'](https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/[^"'\s<>]+)["']/gi,
    /@([a-zA-Z0-9_]+)/g // Twitter handles
  ];
  
  // Telegram patterns
  const telegramPatterns = [
    /href=["']?(https?:\/\/(?:www\.)?t\.me\/[^"'\s<>]+)["']?/gi,
    /["'](https?:\/\/(?:www\.)?t\.me\/[^"'\s<>]+)["']/gi
  ];
  
  // Discord patterns
  const discordPatterns = [
    /href=["']?(https?:\/\/(?:www\.)?discord\.gg\/[^"'\s<>]+)["']?/gi,
    /["'](https?:\/\/(?:www\.)?discord\.gg\/[^"'\s<>]+)["']/gi
  ];
  
  // Website patterns - prioritize official website indicators
  const websitePatterns = [
    // Look for URLs with "website", "official", "home" keywords first
    /href=["']?(https?:\/\/(?:www\.)?[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,}(?:\/[^"'\s<>]*)?)["']?[^>]*(?:website|official|home|www\.|\.com|\.org|\.net)/gi,
    // Generic pattern as fallback
    /href=["']?(https?:\/\/(?:www\.)?[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,}(?:\/[^"'\s<>]*)?)["']?/gi
  ];
  
  // Extract Twitter
  for (const pattern of twitterPatterns) {
    const matches = html.matchAll(pattern);
    for (const match of matches) {
      const url = cleanUrl(match[1]);
      if (url && (url.includes('twitter.com') || url.includes('x.com'))) {
        socials.twitter = url;
        break;
      }
    }
    if (socials.twitter) break;
  }
  
  // Extract Telegram
  for (const pattern of telegramPatterns) {
    const matches = html.matchAll(pattern);
    for (const match of matches) {
      const url = cleanUrl(match[1]);
      if (url && url.includes('t.me')) {
        socials.telegram = url;
        break;
      }
    }
    if (socials.telegram) break;
  }
  
  // Extract Discord
  for (const pattern of discordPatterns) {
    const matches = html.matchAll(pattern);
    for (const match of matches) {
      const url = cleanUrl(match[1]);
      if (url && url.includes('discord.gg')) {
        socials.discord = url;
        break;
      }
    }
    if (socials.discord) break;
  }
  
  // Extract website (prioritize official websites over exchange links)
  for (const pattern of websitePatterns) {
    const matches = html.matchAll(pattern);
    for (const match of matches) {
      const url = cleanUrl(match[1]);
      if (url && isLikelyOfficialWebsite(url)) {
        socials.website = url;
        break;
      }
    }
    if (socials.website) break; // Stop after finding first valid official website
  }
  
  return socials;
}

// Fetch social links from Dexscreener API (more reliable than scraping)
async function fetchDexscreenerAPI(tokenAddress) {
  try {
    const url = `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`;
    const res = await fetch(url, { 
      headers: { 
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 10000
    });
    
    if (res.ok) {
      const data = await res.json();
      const socials = {};
      
      // Process all pairs to find the most complete info
      if (data.pairs && data.pairs.length > 0) {
        for (const pair of data.pairs) {
          if (pair.info) {
            // Extract websites
            if (pair.info.websites && pair.info.websites.length > 0) {
              for (const site of pair.info.websites) {
                if (site.url && isLikelyOfficialWebsite(site.url)) {
                  socials.website = cleanUrl(site.url);
                  break; // Take the first official website
                }
              }
            }
            
            // Extract social media
            if (pair.info.socials && pair.info.socials.length > 0) {
              for (const social of pair.info.socials) {
                if (social.url) {
                  const url = cleanUrl(social.url);
                  if (url) {
                    if (social.type === 'twitter' || url.includes('twitter.com') || url.includes('x.com')) {
                      socials.twitter = url;
                    } else if (social.type === 'telegram' || url.includes('t.me')) {
                      socials.telegram = url;
                    } else if (social.type === 'discord' || url.includes('discord.gg')) {
                      socials.discord = url;
                    }
                  }
                }
              }
            }
            
            // If we found data, break (prioritize first pair with info)
            if (Object.keys(socials).length > 0) {
              break;
            }
          }
        }
      }
      
      return socials;
    } else {
      console.log(`⚠️ DexScreener API returned status ${res.status} for ${tokenAddress}`);
    }
  } catch (e) {
    console.log(`⚠️ Failed to fetch from DexScreener API for ${tokenAddress}:`, e.message);
  }
  return {};
}

// Scrape Dexscreener token page for social links (fallback method)
async function scrapeDexscreener(chainId, tokenAddress) {
  try {
    const url = `https://dexscreener.com/${chainId.toLowerCase()}/${tokenAddress}`;
    const res = await fetch(url, { 
      headers: { 
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'accept-language': 'en-US,en;q=0.5',
        'accept-encoding': 'gzip, deflate, br',
        'referer': 'https://dexscreener.com/',
        'origin': 'https://dexscreener.com',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'same-origin'
      },
      timeout: 15000
    });
    
    if (res.ok) {
      const html = await res.text();
      
      // Check if we got a Cloudflare challenge page
      if (html.includes('challenge-platform') || html.includes('Just a moment')) {
        console.log(`🛡️ Cloudflare protection detected for DexScreener ${tokenAddress}`);
        return {};
      }
      
      return extractSocialsFromHtml(html);
    } else {
      console.log(`⚠️ DexScreener returned status ${res.status} for ${tokenAddress}`);
    }
  } catch (e) {
    console.log(`⚠️ Failed to scrape Dexscreener for ${tokenAddress}:`, e.message);
  }
  return {};
}

// Scrape Pump.fun token page for social links
async function scrapePumpFun(tokenAddress) {
  try {
    const url = `https://pump.fun/coin/${tokenAddress}`;
    const res = await fetch(url, { 
      headers: { 
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });
    
    if (res.ok) {
      const html = await res.text();
      return extractSocialsFromHtml(html);
    }
  } catch (e) {
    console.log(`⚠️ Failed to scrape Pump.fun for ${tokenAddress}:`, e.message);
  }
  return {};
}

// Enhanced social scraper that tries multiple sources
async function scrapeSocials({ chainId, tokenAddress, knownLinks = {}, isPumpFun = false }) {
  const socials = { ...knownLinks };
  
  if (!tokenAddress) return socials;
  
  console.log(`🔍 Scraping social links for ${tokenAddress}...`);
  
  try {
    // Try DexScreener API first (most reliable)
    const apiSocials = await fetchDexscreenerAPI(tokenAddress);
    Object.assign(socials, apiSocials);
    console.log(`📡 DexScreener API socials for ${tokenAddress}:`, apiSocials);
    
    // If API didn't provide website info and we have chainId, try scraping as fallback
    if (!socials.website && chainId) {
      const scrapedSocials = await scrapeDexscreener(chainId, tokenAddress);
      // Only use scraped website if we didn't get one from API
      if (scrapedSocials.website && !socials.website) {
        socials.website = scrapedSocials.website;
      }
      // Merge other socials from scraping if not already present
      Object.keys(scrapedSocials).forEach(key => {
        if (!socials[key]) {
          socials[key] = scrapedSocials[key];
        }
      });
      console.log(`�️ DexScreener scraping socials for ${tokenAddress}:`, scrapedSocials);
    }
    
    // If it's a pump.fun token, also try pump.fun page
    if (isPumpFun) {
      const pumpSocials = await scrapePumpFun(tokenAddress);
      // Pump.fun socials take priority if they exist
      Object.assign(socials, pumpSocials);
      console.log(`🚀 Pump.fun socials for ${tokenAddress}:`, pumpSocials);
    }
    
  } catch (e) {
    console.log(`❌ Error scraping socials for ${tokenAddress}:`, e.message);
  }
  
  // Clean and validate all URLs
  Object.keys(socials).forEach(key => {
    socials[key] = cleanUrl(socials[key]);
    if (!socials[key]) delete socials[key];
  });
  
  console.log(`✅ Final socials for ${tokenAddress}:`, socials);
  return socials;
}

module.exports = { scrapeSocials, cleanUrl, extractSocialsFromHtml, isLikelyOfficialWebsite, fetchDexscreenerAPI };