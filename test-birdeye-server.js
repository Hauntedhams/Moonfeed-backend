const express = require('express');
const BirdeyeService = require('./birdeyeService');

const app = express();
const PORT = 3002;

// Initialize Birdeye service
const birdeyeService = new BirdeyeService();

/**
 * Format Birdeye data for SimpleChart component
 */
function formatForSimpleChart(birdeyeData) {
    return birdeyeData.map((point, index) => ({
        time: point.formattedTime,
        price: point.price,
        timestamp: point.timestamp,
        date: point.date,
        x: index,
        y: point.price
    }));
}

// CORS middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// Test endpoint for BAGWORK historical data
app.get('/api/test/bagwork-history', async (req, res) => {
    try {
        console.log('🚀 Testing BAGWORK historical data endpoint...');
        
        const BAGWORK_ADDRESS = '7Pnqg1S6MYrL6AP1ZXcToTHfdBbTB77ze6Y33qBBpump';
        const result = await birdeyeService.getOneHourHistory(BAGWORK_ADDRESS);

        if (result.success) {
            const formattedData = birdeyeService.formatPriceData(result.data.items || result.data);
            const chartData = formatForSimpleChart(formattedData);

            console.log(`✅ Successfully returned ${chartData.length} data points`);

            res.json({
                success: true,
                token: {
                    address: BAGWORK_ADDRESS,
                    symbol: 'BAGWORK'
                },
                timeframe: '1h',
                dataPoints: chartData.length,
                priceData: chartData,
                metadata: {
                    minPrice: Math.min(...chartData.map(d => d.price)),
                    maxPrice: Math.max(...chartData.map(d => d.price)),
                    startTime: chartData[0].time,
                    endTime: chartData[chartData.length - 1].time
                }
            });
        } else {
            console.log('❌ Failed to get price data:', result.error);
            res.status(500).json({
                success: false,
                error: result.error
            });
        }

    } catch (error) {
        console.error('💥 API Error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// Generic historical data endpoint
app.get('/api/price-history/:address', async (req, res) => {
    try {
        const { address } = req.params;
        const { timeframe = '1h', type = '1m' } = req.query;

        console.log(`📊 Getting price history for ${address} (${timeframe})`);

        let result;
        if (timeframe === '1h') {
            result = await birdeyeService.getOneHourHistory(address);
        } else {
            // Could extend for other timeframes
            return res.status(400).json({
                success: false,
                error: 'Currently only 1h timeframe is supported'
            });
        }

        if (result.success) {
            const formattedData = birdeyeService.formatPriceData(result.data.items || result.data);
            const chartData = formatForSimpleChart(formattedData);

            res.json({
                success: true,
                token: {
                    address: address
                },
                timeframe: timeframe,
                dataPoints: chartData.length,
                priceData: chartData
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
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        service: 'Birdeye Historical Data API',
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Birdeye Test Server running on http://localhost:${PORT}`);
    console.log('📊 Test endpoints:');
    console.log(`   GET http://localhost:${PORT}/api/test/bagwork-history`);
    console.log(`   GET http://localhost:${PORT}/api/price-history/7Pnqg1S6MYrL6AP1ZXcToTHfdBbTB77ze6Y33qBBpump`);
    console.log(`   GET http://localhost:${PORT}/api/health`);
});
