const BirdeyeService = require('./birdeyeService');

async function getCurrentBagworkPriceFromHistory() {
    console.log('💰 Getting Current BAGWORK Price (from recent history)');
    console.log('=' .repeat(55));

    const birdeyeService = new BirdeyeService();
    const BAGWORK_ADDRESS = '7Pnqg1S6MYrL6AP1ZXcToTHfdBbTB77ze6Y33qBBpump';

    try {
        console.log(`📊 Fetching most recent price for BAGWORK...`);
        console.log(`Token Address: ${BAGWORK_ADDRESS}`);
        console.log('Method: Using recent 5-minute historical data');
        console.log('');

        const result = await birdeyeService.getCurrentPriceFromHistory(BAGWORK_ADDRESS);

        if (result.success) {
            const data = result.data;
            
            console.log('✅ Current BAGWORK Price (Most Recent):');
            console.log('─'.repeat(50));
            console.log(`💲 Current Price: $${data.currentPrice.toFixed(8)}`);
            console.log(`🕐 Price Time: ${data.formattedTime}`);
            console.log(`📅 ISO Date: ${data.date}`);
            console.log(`⏰ Unix Timestamp: ${data.timestamp}`);
            console.log(`📊 Data Points Used: ${data.dataPoints}`);
            console.log(`🔧 Method: ${data.method}`);
            console.log('');

            console.log('🎯 Quick Summary:');
            console.log(`BAGWORK is currently trading at $${data.currentPrice.toFixed(8)}`);
            console.log(`Last updated: ${data.formattedTime}`);

        } else {
            console.log('❌ Failed to get current price from history');
            console.log('Error:', result.error);
        }

    } catch (error) {
        console.error('💥 Test failed:', error.message);
    }

    console.log('');
    console.log('🏁 Current price check completed');
}

// Run the test
if (require.main === module) {
    getCurrentBagworkPriceFromHistory();
}

module.exports = getCurrentBagworkPriceFromHistory;
