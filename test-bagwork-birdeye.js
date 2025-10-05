const BirdeyeService = require('./birdeyeService');

async function testBagworkHistoricalData() {
    console.log('🚀 Testing Birdeye Historical Data for BAGWORK');
    console.log('=' .repeat(50));

    const birdeyeService = new BirdeyeService();
    const BAGWORK_ADDRESS = '7Pnqg1S6MYrL6AP1ZXcToTHfdBbTB77ze6Y33qBBpump';

    try {
        console.log(`📊 Fetching 1 hour of price history for BAGWORK...`);
        console.log(`Token Address: ${BAGWORK_ADDRESS}`);
        console.log(`Requesting 60 minutes of 1-minute interval data`);
        console.log('');

        const result = await birdeyeService.getOneHourHistory(BAGWORK_ADDRESS);

        if (result.success) {
            console.log('✅ Successfully retrieved price data!');
            console.log('');

            const formattedData = birdeyeService.formatPriceData(result.data.items || result.data);
            
            console.log(`📈 Data Points Received: ${formattedData.length}`);
            console.log('');

            if (formattedData.length > 0) {
                console.log('📊 Sample Data Points:');
                console.log('─'.repeat(80));
                
                // Show first 5 data points
                const sampleSize = Math.min(5, formattedData.length);
                for (let i = 0; i < sampleSize; i++) {
                    const point = formattedData[i];
                    console.log(`${i + 1}. Time: ${point.formattedTime} | Price: $${point.price.toFixed(8)} | Unix: ${point.timestamp}`);
                }

                if (formattedData.length > 5) {
                    console.log('   ...');
                    const lastPoint = formattedData[formattedData.length - 1];
                    console.log(`${formattedData.length}. Time: ${lastPoint.formattedTime} | Price: $${lastPoint.price.toFixed(8)} | Unix: ${lastPoint.timestamp}`);
                }

                console.log('');
                console.log('📈 Price Analysis:');
                console.log('─'.repeat(40));
                
                const prices = formattedData.map(p => p.price);
                const minPrice = Math.min(...prices);
                const maxPrice = Math.max(...prices);
                const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
                const firstPrice = prices[0];
                const lastPrice = prices[prices.length - 1];
                const priceChange = lastPrice - firstPrice;
                const priceChangePercent = ((priceChange / firstPrice) * 100);

                console.log(`Min Price: $${minPrice.toFixed(8)}`);
                console.log(`Max Price: $${maxPrice.toFixed(8)}`);
                console.log(`Avg Price: $${avgPrice.toFixed(8)}`);
                console.log(`First Price: $${firstPrice.toFixed(8)}`);
                console.log(`Last Price: $${lastPrice.toFixed(8)}`);
                console.log(`Price Change: $${priceChange.toFixed(8)} (${priceChangePercent > 0 ? '+' : ''}${priceChangePercent.toFixed(2)}%)`);

                console.log('');
                console.log('🎯 Data Ready for SimpleChart Integration!');
                console.log('Format: { timestamp, price, date, formattedTime }');
                
                // Show the data structure that can be used for the chart
                console.log('');
                console.log('📋 Chart Data Structure (first 3 points):');
                console.log(JSON.stringify(formattedData.slice(0, 3), null, 2));

            } else {
                console.log('⚠️ No price data received');
            }

        } else {
            console.log('❌ Failed to retrieve price data');
            console.log('Error:', result.error);
        }

    } catch (error) {
        console.error('💥 Test failed with error:', error.message);
        console.error('Stack:', error.stack);
    }

    console.log('');
    console.log('🏁 Test completed');
}

// Run the test
if (require.main === module) {
    testBagworkHistoricalData();
}

module.exports = testBagworkHistoricalData;
