// Test script to verify timeframe configurations
const testTimeframes = async () => {
  const baseUrl = 'http://localhost:3001/api/tokens/history/solana/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
  const timeframes = [
    { name: '5m', expected: 144, coverage: '12 hours' },
    { name: '15m', expected: 96, coverage: '24 hours' },
    { name: '1h', expected: 168, coverage: '7 days' },
    { name: '4h', expected: 180, coverage: '30 days' },
    { name: '1d', expected: 90, coverage: '3 months' }
  ];
  
  console.log('=== Testing Timeframe Configurations ===\n');
  
  for (const tf of timeframes) {
    try {
      const response = await fetch(`${baseUrl}?interval=${tf.name}&limit=${tf.expected}`);
      const data = await response.json();
      
      const actualPoints = data.data?.simplePriceData?.length || 0;
      const firstTime = data.data?.simplePriceData?.[0]?.time;
      const lastTime = data.data?.simplePriceData?.[actualPoints - 1]?.time;
      
      const timeDiff = lastTime - firstTime;
      const hours = Math.round(timeDiff / 3600);
      const days = Math.round(hours / 24);
      
      console.log(`${tf.name.padEnd(4)} | Expected: ${tf.expected.toString().padEnd(3)} | Actual: ${actualPoints.toString().padEnd(3)} | Coverage: ${tf.coverage.padEnd(12)} | Actual: ${days > 1 ? `${days} days` : `${hours} hours`}`);
      
    } catch (error) {
      console.log(`${tf.name.padEnd(4)} | ERROR: ${error.message}`);
    }
  }
};

// For Node.js environments
if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch');
}

testTimeframes();
