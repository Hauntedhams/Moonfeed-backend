const BirdeyeService = require('./birdeyeService');

/**
 * Test integration with SimpleChart format
 * This shows how to format Birdeye data for your existing chart components
 */
async function testSimpleChartIntegration() {
    console.log('🎨 Testing Birdeye → SimpleChart Integration');
    console.log('=' .repeat(50));

    const birdeyeService = new BirdeyeService();
    const BAGWORK_ADDRESS = '7Pnqg1S6MYrL6AP1ZXcToTHfdBbTB77ze6Y33qBBpump';

    try {
        // Get historical data
        const result = await birdeyeService.getOneHourHistory(BAGWORK_ADDRESS);
        
        if (!result.success) {
            throw new Error(result.error);
        }

        const formattedData = birdeyeService.formatPriceData(result.data.items || result.data);

        // Convert to SimpleChart format
        const chartData = formatForSimpleChart(formattedData);

        console.log('📊 Chart Data Summary:');
        console.log(`Total Points: ${chartData.length}`);
        console.log(`Time Range: ${chartData[0].time} → ${chartData[chartData.length - 1].time}`);
        console.log(`Price Range: $${Math.min(...chartData.map(d => d.price)).toFixed(8)} → $${Math.max(...chartData.map(d => d.price)).toFixed(8)}`);
        
        console.log('\n🎯 SimpleChart Ready Data (first 5 points):');
        console.log(JSON.stringify(chartData.slice(0, 5), null, 2));

        console.log('\n📈 Ready for Frontend Integration!');
        console.log('This data can be directly used in your SimpleChart component');

        return chartData;

    } catch (error) {
        console.error('❌ Integration test failed:', error.message);
        return null;
    }
}

/**
 * Format Birdeye data for SimpleChart component
 * @param {Array} birdeyeData - Formatted data from BirdeyeService
 * @returns {Array} Data formatted for SimpleChart
 */
function formatForSimpleChart(birdeyeData) {
    return birdeyeData.map((point, index) => ({
        time: point.formattedTime,
        price: point.price,
        timestamp: point.timestamp,
        date: point.date,
        x: index, // For chart positioning
        y: point.price // For chart rendering
    }));
}

/**
 * API endpoint handler example
 * This shows how you could integrate this into your Express server
 */
async function handleHistoricalPriceRequest(req, res) {
    try {
        const { address, hours = 1 } = req.query;
        
        if (!address) {
            return res.status(400).json({ 
                success: false, 
                error: 'Token address is required' 
            });
        }

        const birdeyeService = new BirdeyeService();
        const result = await birdeyeService.getOneHourHistory(address);

        if (result.success) {
            const formattedData = birdeyeService.formatPriceData(result.data.items || result.data);
            const chartData = formatForSimpleChart(formattedData);

            res.json({
                success: true,
                data: {
                    token: address,
                    timeframe: '1h',
                    points: chartData.length,
                    prices: chartData
                }
            });
        } else {
            res.status(500).json({
                success: false,
                error: result.error
            });
        }

    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}

// Run the test if this file is executed directly
if (require.main === module) {
    testSimpleChartIntegration();
}

module.exports = {
    testSimpleChartIntegration,
    formatForSimpleChart,
    handleHistoricalPriceRequest
};
