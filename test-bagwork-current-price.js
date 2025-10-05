const BirdeyeService = require('./birdeyeService');

async function getCurrentBagworkPrice() {
    console.log('💰 Getting Current BAGWORK Price');
    console.log('=' .repeat(40));

    const birdeyeService = new BirdeyeService();
    const BAGWORK_ADDRESS = '7Pnqg1S6MYrL6AP1ZXcToTHfdBbTB77ze6Y33qBBpump';

    try {
        console.log(`📊 Fetching current price for BAGWORK...`);
        console.log(`Token Address: ${BAGWORK_ADDRESS}`);
        console.log('');

        const result = await birdeyeService.getCurrentPrice(BAGWORK_ADDRESS);

        if (result.success) {
            const data = result.data;
            
            console.log('✅ Current BAGWORK Price Data:');
            console.log('─'.repeat(50));
            console.log(`💲 Current Price: $${data.price ? data.price.toFixed(8) : 'N/A'}`);
            console.log(`📈 24h Change: ${data.priceChange24h ? '$' + data.priceChange24h.toFixed(8) : 'N/A'}`);
            console.log(`📊 24h Change %: ${data.priceChange24hPercent ? data.priceChange24hPercent.toFixed(2) + '%' : 'N/A'}`);
            console.log(`💹 24h Volume: ${data.volume24h ? '$' + data.volume24h.toLocaleString() : 'N/A'}`);
            console.log(`🏦 Market Cap: ${data.marketCap ? '$' + data.marketCap.toLocaleString() : 'N/A'}`);
            console.log(`🏷️ Symbol: ${data.symbol || 'N/A'}`);
            console.log(`📛 Name: ${data.name || 'N/A'}`);
            console.log(`🕐 Last Updated: ${data.lastUpdated}`);
            console.log('');

            if (data.price) {
                console.log('🎯 Price Summary:');
                console.log(`Current: $${data.price.toFixed(8)}`);
                if (data.priceChange24hPercent) {
                    const trend = data.priceChange24hPercent > 0 ? '📈 UP' : '📉 DOWN';
                    console.log(`24h Trend: ${trend} ${Math.abs(data.priceChange24hPercent).toFixed(2)}%`);
                }
            }

        } else {
            console.log('❌ Failed to get current price');
            console.log('Error:', result.error);
        }

    } catch (error) {
        console.error('💥 Test failed:', error.message);
    }

    console.log('');
    console.log('🏁 Price check completed');
}

// Run the test
if (require.main === module) {
    getCurrentBagworkPrice();
}

module.exports = getCurrentBagworkPrice;
