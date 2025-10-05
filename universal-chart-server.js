const express = require('express');
const cors = require('cors');
const { formatPriceDataForChart } = require('./test-bagwork-hourly-list');
const BirdeyeService = require('./birdeyeService');
const axios = require('axios');

const app = express();
const PORT = 3005;

// Enable CORS for frontend requests
app.use(cors());
app.use(express.json());

// Initialize Birdeye service
const birdeyeService = new BirdeyeService();

/**
 * Get DexScreener data for a token
 * @param {string} tokenAddress - Token mint address
 * @returns {Promise<Object>} DexScreener token data
 */
async function getDexScreenerTokenData(tokenAddress) {
    try {
        console.log(`🔍 [API] Getting DexScreener data for ${tokenAddress.substring(0, 8)}...`);
        const response = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`);
        
        if (response.data && response.data.pairs && response.data.pairs.length > 0) {
            const pair = response.data.pairs[0];
            return {
                success: true,
                data: {
                    price: parseFloat(pair.priceUsd),
                    symbol: pair.baseToken.symbol,
                    name: pair.baseToken.name,
                    dex: pair.dexId,
                    volume24h: parseFloat(pair.volume?.h24 || 0),
                    priceChange24h: parseFloat(pair.priceChange?.h24 || 0),
                    liquidity: parseFloat(pair.liquidity?.usd || 0),
                    marketCap: parseFloat(pair.marketCap || 0),
                    pairAddress: pair.pairAddress
                }
            };
        }
        throw new Error('No pairs found');
    } catch (error) {
        console.error(`❌ [API] DexScreener error for ${tokenAddress}:`, error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get chart data for any token using Birdeye historical data
 * @param {string} tokenAddress - Token mint address
 * @returns {Promise<Object>} Chart-ready data
 */
async function getTokenChartData(tokenAddress) {
    try {
        console.log(`📊 [API] Getting chart data for ${tokenAddress.substring(0, 8)}...`);
        
        // Get current token info from DexScreener
        const dexScreenerResult = await getDexScreenerTokenData(tokenAddress);
        
        // Get historical data from Birdeye
        const historyResult = await birdeyeService.getOneHourHistory(tokenAddress);
        
        if (historyResult.success) {
            const priceData = historyResult.data.items || historyResult.data;
            
            if (priceData && priceData.length > 0) {
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
                    tokenAddress: tokenAddress,
                    tokenInfo: dexScreenerResult.success ? dexScreenerResult.data : null,
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
                            tokenAddress: tokenAddress,
                            source: 'birdeye'
                        }
                    }
                };
                
                console.log(`✅ [API] Returning ${priceData.length} price points for ${dexScreenerResult.data?.symbol || 'token'}`);
                console.log(`📈 [API] Price range: $${minPrice.toFixed(8)} → $${maxPrice.toFixed(8)}`);
                console.log(`📊 [API] Change: ${totalChange > 0 ? '+' : ''}${totalChange.toFixed(4)}%`);
                
                return responseData;
            } else {
                throw new Error('No price data available from Birdeye');
            }
        } else {
            throw new Error(historyResult.error || 'Failed to get historical data');
        }
    } catch (error) {
        console.error(`❌ [API] Chart data error for ${tokenAddress}:`, error.message);
        throw error;
    }
}

/**
 * GET /api/token-chart/:address
 * Returns chart-ready data for any token (1 hour timeframe)
 */
app.get('/api/token-chart/:address', async (req, res) => {
    try {
        const tokenAddress = req.params.address;
        
        if (!tokenAddress || tokenAddress.length < 32) {
            return res.status(400).json({
                success: false,
                error: 'Invalid token address'
            });
        }
        
        console.log(`🎯 [API] Chart request for token: ${tokenAddress}`);
        
        const chartData = await getTokenChartData(tokenAddress);
        res.json(chartData);
        
    } catch (error) {
        console.error('❌ [API] Server error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/bagwork-basic-chart
 * Returns chart-ready data for BAGWORK token (1 hour timeframe)
 * LEGACY ENDPOINT - redirects to generic endpoint
 */
app.get('/api/bagwork-basic-chart', async (req, res) => {
    const BAGWORK_ADDRESS = '7Pnqg1S6MYrL6AP1ZXcToTHfdBbTB77ze6Y33qBBpump';
    try {
        console.log('📊 [API] Legacy BAGWORK endpoint - redirecting to generic...');
        const chartData = await getTokenChartData(BAGWORK_ADDRESS);
        res.json(chartData);
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
        service: 'Universal Token Chart API',
        port: PORT,
        endpoints: [
            '/api/token-chart/:address',
            '/api/bagwork-basic-chart (legacy)',
            '/health'
        ],
        timestamp: new Date().toISOString()
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`🚀 Universal Token Chart API Server running on http://localhost:${PORT}`);
    console.log(`📊 Generic chart endpoint: http://localhost:${PORT}/api/token-chart/:address`);
    console.log(`📊 Legacy BAGWORK endpoint: http://localhost:${PORT}/api/bagwork-basic-chart`);
    console.log(`❤️ Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
