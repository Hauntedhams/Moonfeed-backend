const BirdeyeService = require('./birdeyeService');

async function getFullBagworkPriceList() {
    console.log('📋 BAGWORK - Complete Price List (Last 60 Minutes)');
    console.log('=' .repeat(50));

    const birdeyeService = new BirdeyeService();
    const BAGWORK_ADDRESS = '7Pnqg1S6MYrL6AP1ZXcToTHfdBbTB77ze6Y33qBBpump';

    try {
        const result = await birdeyeService.getOneHourHistory(BAGWORK_ADDRESS);

        if (result.success) {
            const formattedData = birdeyeService.formatPriceData(result.data.items || result.data);
            
            console.log(`\n📊 Complete list of ${formattedData.length} prices:\n`);

            formattedData.forEach((point, index) => {
                console.log(`${(index + 1).toString().padStart(2)}: $${point.price.toFixed(8)} at ${point.formattedTime}`);
            });

            console.log('\n─'.repeat(50));
            console.log('📈 Price Summary:');
            const prices = formattedData.map(p => p.price);
            console.log(`First: $${prices[0].toFixed(8)}`);
            console.log(`Last:  $${prices[prices.length - 1].toFixed(8)}`);
            console.log(`Min:   $${Math.min(...prices).toFixed(8)}`);
            console.log(`Max:   $${Math.max(...prices).toFixed(8)}`);

            console.log('\n💰 Just the prices (comma-separated):');
            console.log(prices.map(p => p.toFixed(8)).join(', '));

            console.log('\n🕐 Just the times:');
            console.log(formattedData.map(p => p.formattedTime).join(', '));

        } else {
            console.log('❌ Failed to retrieve price data');
            console.log('Error:', result.error);
        }

    } catch (error) {
        console.error('💥 Error:', error.message);
    }
}

// Run the test
if (require.main === module) {
    getFullBagworkPriceList();
}

module.exports = getFullBagworkPriceList;
