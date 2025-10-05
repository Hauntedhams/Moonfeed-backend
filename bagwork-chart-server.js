const express = require('express');
const cors = require('cors');
const { getBagworkChartData, formatPriceDataForChart } = require('./test-bagwork-hourly-list');
const BirdeyeService = require('./birdeyeService');

const app = express();
const PORT = 3005;

// Enable CORS for frontend requests
app.use(cors());
app.use(express.json());

// Bagwork token address
const BAGWORK_ADDRESS = '7Pnqg1S6MYrL6AP1ZXcToTHfdBbTB77ze6Y33qBBpump';

/**
 * GET /api/bagwork-basic-chart
 * Returns chart-ready data for BAGWORK token (1 hour timeframe)
 */
app.get('/api/bagwork-basic-chart', async (req, res) => {
    try {
        console.log('📊 [API] Request for BAGWORK basic chart data');
        
        const birdeyeService = new BirdeyeService();
        
        // Get 1-hour price history from Birdeye
        const result = await birdeyeService.getOneHourHistory(BAGWORK_ADDRESS);
        
        if (result.success) {
            const priceData = result.data.items || result.data;
            
            if (priceData && priceData.length > 0) {
                // Format the data for chart consumption
                const chartData = formatPriceDataForChart(priceData);
                
                if (chartData) {
                    // Calculate additional info for frontend
                    const prices = priceData.map(p => parseFloat(p.value));
                    const minPrice = Math.min(...prices);
                    const maxPrice = Math.max(...prices);
                    const startPrice = prices[0];
                    const endPrice = prices[prices.length - 1];
                    const totalChange = ((endPrice - startPrice) / startPrice) * 100;
                    
                    // Transform to format expected by frontend
                    const responseData = {
                        success: true,
                        chart: {
                            points: priceData.map((point, index) => ({
                                time: point.unixTime * 1000, // Convert to milliseconds
                                price: parseFloat(point.value),
                                index: index
                            })),
                            priceInfo: {
                                min: minPrice,
                                max: maxPrice,
                                start: startPrice,
                                end: endPrice,
                                change: totalChange,
                                range: maxPrice - minPrice
                            },
                            metadata: {
                                dataPoints: priceData.length,
                                timeframe: '1h',
                                interval: '1m',
                                tokenAddress: BAGWORK_ADDRESS,
                                source: 'birdeye'
                            }
                        },
                        svgData: {
                            path: chartData.svgPath,
                            dimensions: chartData.dimensions,
                            chartPoints: chartData.chartPoints
                        }
                    };
                    
                    console.log(`✅ [API] Returning ${priceData.length} BAGWORK price points`);
                    console.log(`📈 [API] Price range: $${minPrice.toFixed(8)} → $${maxPrice.toFixed(8)}`);
                    console.log(`📊 [API] Change: ${totalChange > 0 ? '+' : ''}${totalChange.toFixed(4)}%`);
                    
                    res.json(responseData);
                } else {
                    console.error('❌ [API] Failed to format chart data');
                    res.status(500).json({
                        success: false,
                        error: 'Failed to format chart data'
                    });
                }
            } else {
                console.error('❌ [API] No price data available');
                res.status(404).json({
                    success: false,
                    error: 'No price data available'
                });
            }
        } else {
            console.error('❌ [API] Birdeye API error:', result.error);
            res.status(500).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        console.error('❌ [API] Server error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/bagwork-price-list
 * Returns the raw 60-minute price list for debugging
 */
app.get('/api/bagwork-price-list', async (req, res) => {
    try {
        const { getBagworkHourlyPriceList } = require('./test-bagwork-hourly-list');
        const result = await getBagworkHourlyPriceList();
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /health
 * Health check endpoint
 */
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        service: 'BAGWORK Chart API',
        port: PORT,
        timestamp: new Date().toISOString()
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`🚀 BAGWORK Chart API Server running on http://localhost:${PORT}`);
    console.log(`📊 Chart endpoint: http://localhost:${PORT}/api/bagwork-basic-chart`);
    console.log(`📋 Price list endpoint: http://localhost:${PORT}/api/bagwork-price-list`);
    console.log(`❤️ Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
