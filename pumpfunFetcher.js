// Fetches and normalizes coins from pump.fun for use in the main API
const fetch = (...args) => import('node-fetch').then(m => m.default(...args));

async function fetchPumpFunCoins() {
  console.log('🔍 Attempting to fetch pump.fun graduation data...');
  
  // Try multiple pump.fun API endpoints that might work
  const endpoints = [
    'https://api.pump.fun/coins/list',
    'https://api.pump.fun/api/coins/list', 
    'https://pump.fun/api/coins',
    'https://frontend-api.pump.fun/coins/list',
    'https://api.pump.fun/coins/migrating',
    'https://api.pump.fun/api/coins/migrating'
  ];
  
  let data = [];
  let workingEndpoint = null;
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Trying pump.fun endpoint: ${endpoint}`);
      const res = await fetch(endpoint);
      if (res.ok) {
        const responseData = await res.json();
        if (Array.isArray(responseData) && responseData.length > 0) {
          data = responseData;
          workingEndpoint = endpoint;
          console.log(`✅ Success! Found ${data.length} coins from ${endpoint}`);
          break;
        }
      } else {
        console.log(`❌ ${endpoint} returned status ${res.status}`);
      }
    } catch (error) {
      console.log(`❌ ${endpoint} failed:`, error.message);
    }
  }
  
  if (data.length === 0) {
    console.log('⚠️ No pump.fun API endpoints working. This is likely due to API changes.');
    console.log('💡 Graduation data will need to come from other sources like DexScreener.');
    return [];
  }
  
  console.log(`📊 Processing ${data.length} pump.fun coins for graduation data...`);
  
  // Include ALL coins that have graduation data or are in graduation process
  const processedCoins = data
    .filter(c => {
      const progress = c.graduationPercent ?? c.pumpProgress ?? c.progress ?? c.percentage;
      const migrating = c.migrationStatus === 'migrating' || c.isMigrating === true || c.status === 'migrating';
      const graduating = c.isGraduating === true || c.aboutToGraduate === true;
      
      // Include if:
      // 1. Has any graduation percentage data
      // 2. Is explicitly marked as migrating/graduating
      // 3. Has graduation-related status
      const hasGraduationInfo = (typeof progress === 'number' && progress >= 0) || migrating || graduating;
      
      if (hasGraduationInfo) {
        console.log(`✅ Including ${c.symbol || c.name}: progress=${progress}%, migrating=${migrating}, graduating=${graduating}`);
      }
      
      return hasGraduationInfo;
    })
    .map((c, i) => {
      // Use the EXACT graduation percentage from the API - no estimation
      const graduationPercent = c.graduationPercent ?? c.pumpProgress ?? c.progress ?? c.percentage ?? null;
      
      // Only mark as graduating/graduated based on REAL data, not estimates
      const isGraduating = (typeof graduationPercent === 'number' && graduationPercent > 0 && graduationPercent < 100) || 
                          c.isGraduating === true || 
                          c.migrationStatus === 'migrating' || 
                          c.isMigrating === true;
      
      const isAboutToGraduate = typeof graduationPercent === 'number' && graduationPercent >= 90 && graduationPercent < 100;
      const isGraduated = typeof graduationPercent === 'number' && graduationPercent >= 100;
      
      const coin = {
        id: c.address || `pumpfun-${i}`,
        tokenAddress: c.address,
        chainId: 'solana',
        name: c.name,
        symbol: c.symbol,
        priceUsd: c.priceUsd || c.price || 0,
        marketCap: c.marketCap || 0,
        liquidity: c.liquidity || 0,
        volume: c.volume24h || c.volume || 0,
        chartUrl: '',
        socials: {
          twitter: c.twitter,
          telegram: c.telegram,
          website: c.website
        },
        profilePic: c.icon || '',
        banner: c.banner || '',
        description: c.description || '',
        source: 'pump.fun',
        // Pass through the REAL graduation data
        graduationPercent: graduationPercent, // Exact percentage from API
        pumpProgress: c.pumpProgress, // Keep original field
        progress: c.progress, // Keep original field
        percentage: c.percentage, // Keep original field
        migrationStatus: c.migrationStatus, // Keep migration status
        isGraduating,
        isAboutToGraduate,
        isGraduated,
        isMigrating: c.isMigrating || c.migrationStatus === 'migrating',
        launchTime: c.launchTime || c.createdAt || null
      };
      
      console.log(`📊 Processed pump.fun coin: ${coin.symbol} - ${graduationPercent}% graduation`);
      return coin;
    });
  
  console.log(`🎯 Returning ${processedCoins.length} pump.fun coins with graduation data`);
  return processedCoins;
}

module.exports = { fetchPumpFunCoins };
