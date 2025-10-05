const express = require('express');
const BirdeyeService = require('./birdeyeService');

const app = express();
const PORT = 3004;

// Initialize Birdeye service
const birdeyeService = new BirdeyeService();

// CORS middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

/**
 * 🎯 MAIN ENDPOINT: Get properly scaled chart data
 */
app.get('/api/chart/:address', async (req, res) => {
    try {
        const { address } = req.params;
        
        console.log(`📈 Chart request for token: ${address}`);
        
        const result = await birdeyeService.getBasicChartData(address);

        if (result.success) {
            console.log(`✅ Returning scaled chart data with ${result.data.chartPoints.length} points`);
            
            res.json({
                success: true,
                token: {
                    address: address
                },
                chart: {
                    // Simple x,y coordinates for line chart
                    points: result.data.chartPoints.map(p => ({
                        x: p.x,
                        y: p.y,
                        price: p.actualPrice,
                        time: p.timeShort
                    })),
                    // Price information
                    priceInfo: result.data.priceInfo,
                    // Chart configuration
                    config: {
                        xAxisLabels: result.data.chartConfig.xLabels,
                        yMin: 0,
                        yMax: 100,
                        totalPoints: result.data.chartPoints.length
                    }
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
 * 🎯 BAGWORK SPECIFIC ENDPOINT
 */
app.get('/api/bagwork-basic-chart', async (req, res) => {
    try {
        const BAGWORK_ADDRESS = '7Pnqg1S6MYrL6AP1ZXcToTHfdBbTB77ze6Y33qBBpump';
        
        console.log('🚀 Getting BAGWORK basic chart data...');
        
        const result = await birdeyeService.getBasicChartData(BAGWORK_ADDRESS);

        if (result.success) {
            const chartPoints = result.data.chartPoints.map(p => ({
                x: p.x,
                y: p.y,
                price: p.actualPrice,
                time: p.timeShort
            }));

            res.json({
                success: true,
                token: {
                    name: 'BAGWORK',
                    address: BAGWORK_ADDRESS,
                    symbol: 'BAGWORK'
                },
                chart: {
                    points: chartPoints,
                    priceInfo: {
                        current: result.data.priceInfo.endPrice,
                        min: result.data.priceInfo.minPrice,
                        max: result.data.priceInfo.maxPrice,
                        change: result.data.priceInfo.priceChangePercent,
                        range: result.data.priceInfo.priceRange
                    },
                    timeframe: '1 Hour',
                    dataPoints: chartPoints.length
                },
                message: 'Real BAGWORK price data - properly scaled for line chart!'
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
 * 🎯 SVG PATH ENDPOINT (for advanced charts)
 */
app.get('/api/bagwork-svg', async (req, res) => {
    try {
        const BAGWORK_ADDRESS = '7Pnqg1S6MYrL6AP1ZXcToTHfdBbTB77ze6Y33qBBpump';
        const width = parseInt(req.query.width) || 300;
        const height = parseInt(req.query.height) || 150;
        
        console.log(`🎨 Getting SVG path for BAGWORK (${width}x${height})...`);
        
        const result = await birdeyeService.getChartSVGPath(BAGWORK_ADDRESS, width, height);

        if (result.success) {
            res.json({
                success: true,
                svg: {
                    path: result.data.svgPath,
                    width: width,
                    height: height
                },
                priceInfo: result.data.chartData.priceInfo,
                message: 'SVG path ready for line chart rendering!'
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
        service: 'Basic Chart Data API',
        endpoints: [
            'GET /api/chart/:address',
            'GET /api/bagwork-basic-chart',
            'GET /api/bagwork-svg?width=300&height=150'
        ],
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log(`📈 Basic Chart API Server running on http://localhost:${PORT}`);
    console.log('');
    console.log('📊 Available endpoints:');
    console.log(`   🎯 GET http://localhost:${PORT}/api/bagwork-basic-chart`);
    console.log(`   📈 GET http://localhost:${PORT}/api/chart/[TOKEN_ADDRESS]`);
    console.log(`   🎨 GET http://localhost:${PORT}/api/bagwork-svg?width=300&height=150`);
    console.log(`   ❤️  GET http://localhost:${PORT}/api/health`);
    console.log('');
    console.log('🚀 Real price data with proper scaling for line charts!');
});
