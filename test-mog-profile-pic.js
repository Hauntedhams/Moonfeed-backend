/*
 * TEST: MOG COIN PROFILE PICTURE
 * 
 * Test the streamlined profile picture logic with MOG coin specifically
 * Address: 26VfKb7jjtdEdvfovoBijScoZmJbWWasFZkgfUD5w7cy
 */

const dexscreenerService = require('./dexscreenerService');

async function testMogProfilePic() {
  const mogAddress = '26VfKb7jjtdEdvfovoBijScoZmJbWWasFZkgfUD5w7cy';
  
  console.log('🧪 Testing MOG coin profile picture logic...');
  console.log(`📍 MOG Address: ${mogAddress}`);
  
  try {
    // Fetch raw Dexscreener data
    console.log('\n🔍 Step 1: Fetching raw Dexscreener data...');
    const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mogAddress}`);
    const data = await response.json();
    
    if (data.pairs && data.pairs.length > 0) {
      const pair = data.pairs[0];
      console.log('✅ Raw Dexscreener data found');
      console.log(`   Pair info imageUrl: ${pair.info?.imageUrl || 'NOT FOUND'}`);
      console.log(`   BaseToken image: ${pair.baseToken?.image || 'NOT FOUND'}`);
      console.log(`   BaseToken info imageUrl: ${pair.baseToken?.info?.imageUrl || 'NOT FOUND'}`);
    } else {
      console.log('❌ No pairs found in Dexscreener data');
      return;
    }
    
    // Test enrichment service
    console.log('\n🚀 Step 2: Testing enrichment service...');
    const mockCoin = {
      mintAddress: mogAddress,
      name: 'MOG',
      symbol: 'MOG',
      profileImage: null // No existing profile image
    };
    
    const enrichedCoin = await dexscreenerService.enrichCoin(mockCoin);
    
    console.log('\n📊 Results:');
    console.log(`   Original profileImage: ${mockCoin.profileImage}`);
    console.log(`   Enriched profileImage: ${enrichedCoin.profileImage || 'NOT FOUND'}`);
    console.log(`   Enriched image: ${enrichedCoin.image || 'NOT FOUND'}`);
    console.log(`   Enriched logo: ${enrichedCoin.logo || 'NOT FOUND'}`);
    
    if (enrichedCoin.profileImage) {
      console.log('\n✅ SUCCESS: Profile image found and set correctly!');
      console.log(`🖼️  Image URL: ${enrichedCoin.profileImage}`);
    } else {
      console.log('\n❌ ISSUE: No profile image was set');
    }
    
  } catch (error) {
    console.error('❌ Error testing MOG profile pic:', error.message);
  }
}

// Run the test
testMogProfilePic();
