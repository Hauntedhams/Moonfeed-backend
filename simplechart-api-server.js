const express = require('express');
const BirdeyeService = require('./birdeyeService');

const app = express();
const PORT = 3003;

// Initialize Birdeye service
const birdeyeService = new BirdeyeService();

// CORS middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

/**
 * 🎯 MAIN ENDPOINT: Get SimpleChart data for any token
 * This is what your frontend will call to get real price data
 */
app.get('/api/simplechart/:address', async (req, res) => {
    try {
        const { address } = req.params;
        
        console.log(`📊 SimpleChart request for token: ${address}`);
        
        const result = await birdeyeService.getSimpleChartData(address);

        if (result.success) {
            console.log(`✅ Returning ${result.data.dataPoints} price points for SimpleChart`);
            
            res.json({
                success: true,
                token: {
                    address: address,
                    timeframe: result.data.timeframe,
                    interval: result.data.interval
                },
                chart: {
                    dataPoints: result.data.dataPoints,
                    prices: result.data.prices, // This is your x,y data for the chart!
                    metadata: result.data.metadata
                },
                timestamp: new Date().toISOString()
            });
        } else {
            console.log(`❌ Failed to get data: ${result.error}`);
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

/**
 * 🎯 BAGWORK SPECIFIC ENDPOINT (for testing)
 */
app.get('/api/bagwork-chart', async (req, res) => {
    try {
        const BAGWORK_ADDRESS = '7Pnqg1S6MYrL6AP1ZXcToTHfdBbTB77ze6Y33qBBpump';
        
        console.log('🚀 Getting BAGWORK chart data...');
        
        const result = await birdeyeService.getSimpleChartData(BAGWORK_ADDRESS);

        if (result.success) {
            res.json({
                success: true,
                token: {
                    name: 'BAGWORK',
                    address: BAGWORK_ADDRESS,
                    symbol: 'BAGWORK'
                },
                chart: {
                    dataPoints: result.data.dataPoints,
                    prices: result.data.prices, // 60 real price points!
                    metadata: result.data.metadata
                },
                message: `Real ${result.data.dataPoints} minute price data ready for SimpleChart!`
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

/**
 * 🎯 QUICK TEST ENDPOINT
 */
app.get('/api/test-chart-data', async (req, res) => {
    try {
        const BAGWORK_ADDRESS = '7Pnqg1S6MYrL6AP1ZXcToTHfdBbTB77ze6Y33qBBpump';
        const result = await birdeyeService.getSimpleChartData(BAGWORK_ADDRESS);

        if (result.success) {
            // Show just the chart format your SimpleChart needs
            const chartPoints = result.data.prices.map(point => ({
                x: point.x,
                y: point.y,
                time: point.time
            }));

            res.json({
                success: true,
                message: 'Perfect for SimpleChart integration!',
                totalPoints: chartPoints.length,
                samplePoints: chartPoints.slice(0, 5), // First 5 points
                allPoints: chartPoints, // All 60 points in x,y format
                priceRange: {
                    min: result.data.metadata.minPrice,
                    max: result.data.metadata.maxPrice,
                    change: `${result.data.metadata.priceChangePercent > 0 ? '+' : ''}${result.data.metadata.priceChangePercent.toFixed(2)}%`
                }
            });
        } else {
            res.status(500).json({ success: false, error: result.error });
        }

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        service: 'SimpleChart Data API',
        endpoints: [
            'GET /api/simplechart/:address',
            'GET /api/bagwork-chart',
            'GET /api/test-chart-data'
        ],
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log(`🎨 SimpleChart API Server running on http://localhost:${PORT}`);
    console.log('');
    console.log('📊 Available endpoints:');
    console.log(`   🎯 GET http://localhost:${PORT}/api/bagwork-chart`);
    console.log(`   📈 GET http://localhost:${PORT}/api/simplechart/[TOKEN_ADDRESS]`);
    console.log(`   🧪 GET http://localhost:${PORT}/api/test-chart-data`);
    console.log(`   ❤️  GET http://localhost:${PORT}/api/health`);
    console.log('');
    console.log('🚀 Ready to serve real BAGWORK price data to SimpleChart!');
});
