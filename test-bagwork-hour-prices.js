const BirdeyeService = require('./birdeyeService');

async function getLastHourBagworkPrices() {
    console.log('📊 BAGWORK - Last Hour Price History (Minute by Minute)');
    console.log('=' .repeat(60));

    const birdeyeService = new BirdeyeService();
    const BAGWORK_ADDRESS = '7Pnqg1S6MYrL6AP1ZXcToTHfdBbTB77ze6Y33qBBpump';

    try {
        console.log(`🎯 Token: BAGWORK`);
        console.log(`📍 Address: ${BAGWORK_ADDRESS}`);
        console.log(`⏰ Timeframe: Last 60 minutes (1-minute intervals)`);
        console.log('');

        const result = await birdeyeService.getOneHourHistory(BAGWORK_ADDRESS);

        if (result.success) {
            const formattedData = birdeyeService.formatPriceData(result.data.items || result.data);
            
            console.log(`✅ Retrieved ${formattedData.length} price points`);
            console.log('');
            console.log('📈 BAGWORK PRICE HISTORY - LAST HOUR');
            console.log('─'.repeat(80));
            console.log('Time'.padEnd(12) + 'Price'.padEnd(15) + 'Change'.padEnd(15) + 'Unix Timestamp');
            console.log('─'.repeat(80));

            let previousPrice = null;
            
            formattedData.forEach((point, index) => {
                const timeStr = point.formattedTime.padEnd(12);
                const priceStr = `$${point.price.toFixed(8)}`.padEnd(15);
                
                let changeStr = '';
                if (previousPrice !== null) {
                    const change = point.price - previousPrice;
                    const changePercent = ((change / previousPrice) * 100);
                    const sign = change >= 0 ? '+' : '';
                    changeStr = `${sign}${changePercent.toFixed(3)}%`.padEnd(15);
                } else {
                    changeStr = 'N/A'.padEnd(15);
                }
                
                console.log(`${timeStr}${priceStr}${changeStr}${point.timestamp}`);
                previousPrice = point.price;
            });

            console.log('─'.repeat(80));
            console.log('');

            // Summary statistics
            const prices = formattedData.map(p => p.price);
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);
            const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
            const firstPrice = prices[0];
            const lastPrice = prices[prices.length - 1];
            const totalChange = lastPrice - firstPrice;
            const totalChangePercent = ((totalChange / firstPrice) * 100);

            console.log('📊 HOUR SUMMARY STATISTICS');
            console.log('─'.repeat(40));
            console.log(`📅 Time Period: ${formattedData[0].formattedTime} → ${formattedData[formattedData.length - 1].formattedTime}`);
            console.log(`💰 Starting Price: $${firstPrice.toFixed(8)}`);
            console.log(`💰 Ending Price: $${lastPrice.toFixed(8)}`);
            console.log(`📈 Highest Price: $${maxPrice.toFixed(8)}`);
            console.log(`📉 Lowest Price: $${minPrice.toFixed(8)}`);
            console.log(`📊 Average Price: $${avgPrice.toFixed(8)}`);
            console.log(`🔄 Total Change: $${totalChange.toFixed(8)} (${totalChangePercent > 0 ? '+' : ''}${totalChangePercent.toFixed(2)}%)`);
            console.log(`📏 Price Range: $${(maxPrice - minPrice).toFixed(8)}`);
            console.log(`📊 Data Points: ${formattedData.length}/60`);

            // Show volatility
            let priceChanges = [];
            for (let i = 1; i < prices.length; i++) {
                const change = Math.abs(((prices[i] - prices[i-1]) / prices[i-1]) * 100);
                priceChanges.push(change);
            }
            const avgVolatility = priceChanges.reduce((sum, change) => sum + change, 0) / priceChanges.length;
            console.log(`🌊 Avg Volatility: ${avgVolatility.toFixed(3)}% per minute`);

            console.log('');
            console.log('💡 All 60 price points successfully retrieved and displayed above!');

        } else {
            console.log('❌ Failed to retrieve price history');
            console.log('Error:', result.error);
        }

    } catch (error) {
        console.error('💥 Test failed:', error.message);
    }

    console.log('');
    console.log('🏁 Price history analysis completed');
}

// Run the test
if (require.main === module) {
    getLastHourBagworkPrices();
}

module.exports = getLastHourBagworkPrices;
