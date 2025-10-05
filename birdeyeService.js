const axios = require('axios');

class BirdeyeService {
    constructor(apiKey = '41e66508b2034930b74eedb0d36d06bc') {
        this.apiKey = apiKey;
        this.baseURL = 'https://public-api.birdeye.so';
        this.headers = {
            'Accept': 'application/json',
            'X-API-KEY': apiKey
        };
    }

    /**
     * Get historical price data for a token
     * @param {string} address - Token mint address
     * @param {string} type - Time interval: '1m', '5m', '1h', '1d'
     * @param {number} timeFrom - Unix timestamp (seconds) for start time
     * @param {number} timeTo - Unix timestamp (seconds) for end time
     * @returns {Promise<Object>} Historical price data
     */
    async getHistoricalPrice(address, type = '1m', timeFrom, timeTo) {
        try {
            const params = new URLSearchParams({
                address: address,
                address_type: 'token',
                type: type,
                time_from: timeFrom.toString(),
                time_to: timeTo.toString()
            });

            const response = await axios.get(`${this.baseURL}/defi/history_price?${params}`, {
                headers: this.headers
            });

            if (response.data && response.data.success) {
                return {
                    success: true,
                    data: response.data.data
                };
            } else {
                return {
                    success: false,
                    error: response.data?.message || 'Unknown error'
                };
            }
        } catch (error) {
            console.error('Birdeye API Error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.message || error.message
            };
        }
    }

    /**
     * Get 1 hour of historical price data with 1-minute intervals
     * @param {string} address - Token mint address
     * @returns {Promise<Object>} 60 data points of price history
     */
    async getOneHourHistory(address) {
        const now = Math.floor(Date.now() / 1000); // Current unix timestamp in seconds
        const oneHourAgo = now - (60 * 60); // 1 hour ago

        console.log(`Getting 1 hour of price history for ${address}`);
        console.log(`From: ${new Date(oneHourAgo * 1000).toISOString()}`);
        console.log(`To: ${new Date(now * 1000).toISOString()}`);

        return await this.getHistoricalPrice(address, '1m', oneHourAgo, now);
    }

    /**
     * Get 1 day of historical price data with 30-minute intervals (48 data points)
     * @param {string} address - Token mint address
     * @returns {Promise<Object>} 48 data points of price history over 24 hours
     */
    async getOneDayHistory(address) {
        const now = Math.floor(Date.now() / 1000); // Current unix timestamp in seconds
        const oneDayAgo = now - (24 * 60 * 60); // 24 hours ago

        console.log(`Getting 1 day of price history for ${address}`);
        console.log(`From: ${new Date(oneDayAgo * 1000).toISOString()}`);
        console.log(`To: ${new Date(now * 1000).toISOString()}`);

        // Use 30-minute intervals to get 48 data points over 24 hours
        // 30 minutes * 48 intervals = 1440 minutes = 24 hours
        return await this.getHistoricalPrice(address, '30m', oneDayAgo, now);
    }

    /**
     * Format price data for frontend consumption
     * @param {Array} priceData - Raw price data from Birdeye
     * @returns {Array} Formatted data with timestamp and price
     */
    formatPriceData(priceData) {
        if (!Array.isArray(priceData)) {
            return [];
        }

        return priceData.map(item => ({
            timestamp: item.unixTime,
            price: parseFloat(item.value),
            date: new Date(item.unixTime * 1000).toISOString(),
            formattedTime: new Date(item.unixTime * 1000).toLocaleTimeString()
        }));
    }

    /**
     * Get price data formatted for a basic line chart with proper scaling
     * @param {string} address - Token mint address
     * @returns {Promise<Object>} Chart data with proper price scaling
     */
    async getBasicChartData(address) {
        try {
            console.log(`📈 Getting basic chart data for ${address}`);
            
            const result = await this.getOneHourHistory(address);

            if (result.success) {
                const formattedData = this.formatPriceData(result.data.items || result.data);
                
                // Get price range for proper scaling
                const prices = formattedData.map(d => d.price);
                const minPrice = Math.min(...prices);
                const maxPrice = Math.max(...prices);
                const priceRange = maxPrice - minPrice;
                
                // Create chart data with normalized Y values (0-100 scale)
                const chartData = formattedData.map((point, index) => {
                    // Normalize price to 0-100 scale for better chart visualization
                    const normalizedY = priceRange > 0 ? ((point.price - minPrice) / priceRange) * 100 : 50;
                    
                    return {
                        x: index, // 0-59 for 60 minutes
                        y: normalizedY, // 0-100 scaled for chart display
                        actualPrice: point.price, // Keep the real price
                        time: point.formattedTime,
                        timeShort: point.formattedTime.replace(':00 ', ' '), // Shorter time format
                        timestamp: point.timestamp,
                        minute: index + 1
                    };
                });

                return {
                    success: true,
                    data: {
                        address: address,
                        chartPoints: chartData,
                        priceInfo: {
                            minPrice: minPrice,
                            maxPrice: maxPrice,
                            priceRange: priceRange,
                            startPrice: prices[0],
                            endPrice: prices[prices.length - 1],
                            priceChange: prices[prices.length - 1] - prices[0],
                            priceChangePercent: ((prices[prices.length - 1] - prices[0]) / prices[0]) * 100
                        },
                        chartConfig: {
                            xLabels: chartData.filter((_, i) => i % 10 === 0).map(d => d.timeShort), // Every 10 minutes
                            yMin: 0,
                            yMax: 100,
                            dataPoints: chartData.length
                        }
                    }
                };
            } else {
                return result;
            }
        } catch (error) {
            console.error('Basic Chart Data Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get price data formatted for 1D chart - same format as SimpleChart (48 data points)
     * @param {string} address - Token mint address
     * @returns {Promise<Object>} Chart data for 1 day timeframe (matches SimpleChart format)
     */
    async getOneDayChartData(address) {
        try {
            console.log(`📅 Getting 1D chart data for ${address}`);
            
            const result = await this.getOneDayHistory(address);

            if (result.success) {
                const formattedData = this.formatPriceData(result.data.items || result.data);
                
                // Convert to SimpleChart format with exact 30-minute interval data (same as 1H but different intervals)
                const chartData = formattedData.map((point, index) => ({
                    x: index, // 0-47 for 48 intervals (30 minutes each)
                    y: point.price, // Exact price for that 30-minute interval
                    time: point.formattedTime,
                    price: point.price,
                    timestamp: point.timestamp,
                    date: point.date,
                    minute: index + 1 // 1-48 for display (30-minute intervals)
                }));

                // Calculate chart bounds and metadata
                const prices = chartData.map(d => d.price);
                const minPrice = Math.min(...prices);
                const maxPrice = Math.max(...prices);
                const priceRange = maxPrice - minPrice;
                
                return {
                    success: true,
                    data: {
                        address: address,
                        timeframe: '1d',
                        interval: '30m',
                        dataPoints: chartData.length,
                        prices: chartData,
                        metadata: {
                            minPrice: minPrice,
                            maxPrice: maxPrice,
                            priceRange: priceRange,
                            startTime: chartData[0].time,
                            endTime: chartData[chartData.length - 1].time,
                            startPrice: prices[0],
                            endPrice: prices[prices.length - 1],
                            priceChange: prices[prices.length - 1] - prices[0],
                            priceChangePercent: ((prices[prices.length - 1] - prices[0]) / prices[0]) * 100
                        }
                    }
                };
            } else {
                return result;
            }
        } catch (error) {
            console.error('1D Chart Data Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = BirdeyeService;
