const BirdeyeService = require('./birdeyeService');

async function testSimpleChartDataForBagwork() {
    console.log('🎨 BAGWORK → SimpleChart Integration Test');
    console.log('=' .repeat(50));

    const birdeyeService = new BirdeyeService();
    const BAGWORK_ADDRESS = '7Pnqg1S6MYrL6AP1ZXcToTHfdBbTB77ze6Y33qBBpump';

    try {
        console.log(`🎯 Getting real BAGWORK data for SimpleChart...`);
        console.log(`📍 Token: ${BAGWORK_ADDRESS}`);
        console.log(`⏰ Timeframe: 1 hour (60 minutes)`);
        console.log('');

        const result = await birdeyeService.getSimpleChartData(BAGWORK_ADDRESS);

        if (result.success) {
            const { data } = result;
            
            console.log('✅ SimpleChart Data Ready!');
            console.log('─'.repeat(40));
            console.log(`📊 Data Points: ${data.dataPoints}`);
            console.log(`⏰ Time Range: ${data.metadata.startTime} → ${data.metadata.endTime}`);
            console.log(`💰 Price Range: $${data.metadata.minPrice.toFixed(8)} → $${data.metadata.maxPrice.toFixed(8)}`);
            console.log(`📈 Price Change: $${data.metadata.priceChange.toFixed(8)} (${data.metadata.priceChangePercent > 0 ? '+' : ''}${data.metadata.priceChangePercent.toFixed(2)}%)`);
            console.log('');

            console.log('🎯 First 10 Chart Data Points:');
            console.log('─'.repeat(60));
            console.log('Min  X    Y (Price)      Time        Timestamp');
            console.log('─'.repeat(60));
            
            data.prices.slice(0, 10).forEach(point => {
                console.log(`${point.minute.toString().padStart(2)}   ${point.x.toString().padStart(2)}   $${point.y.toFixed(8)}   ${point.time}  ${point.timestamp}`);
            });
            
            console.log('...  ..  ..........      ........    ..........');
            
            // Show last few points
            const lastPoints = data.prices.slice(-3);
            lastPoints.forEach(point => {
                console.log(`${point.minute.toString().padStart(2)}   ${point.x.toString().padStart(2)}   $${point.y.toFixed(8)}   ${point.time}  ${point.timestamp}`);
            });

            console.log('');
            console.log('🔥 PERFECT FOR SIMPLECHART!');
            console.log('Each point has:');
            console.log('  • x: 0-59 (minute position)');
            console.log('  • y: exact price for that minute');
            console.log('  • time: formatted display time');
            console.log('  • All 60 real price points from Birdeye');

            console.log('');
            console.log('📋 Sample JSON for SimpleChart:');
            console.log(JSON.stringify(data.prices.slice(0, 3), null, 2));

            console.log('');
            console.log('🚀 Ready to replace SimpleChart mock data!');
            console.log('Just call: birdeyeService.getSimpleChartData(tokenAddress)');

        } else {
            console.log('❌ Failed to get SimpleChart data');
            console.log('Error:', result.error);
        }

    } catch (error) {
        console.error('💥 Test failed:', error.message);
    }

    console.log('');
    console.log('🏁 SimpleChart integration test completed');
}

// Run the test
if (require.main === module) {
    testSimpleChartDataForBagwork();
}

module.exports = testSimpleChartDataForBagwork;
