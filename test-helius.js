const heliusService = require('./heliusService');

async function testHelius() {
  try {
    console.log('Testing Helius API...\n');
    
    // Test with WIF token
    const tokenAddress = 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm';
    console.log(`Testing with token: ${tokenAddress}\n`);
    
    const result = await heliusService.getHistoricalPriceData(tokenAddress, {
      timeframe: '1h',
      limit: 10
    });
    
    console.log('Result:');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('Test error:', error.message);
  }
}

testHelius();
