const BirdeyeService = require('./birdeyeService');

async function testBasicChartData() {
    console.log('📈 BAGWORK - Basic Chart Data Test');
    console.log('=' .repeat(50));

    const birdeyeService = new BirdeyeService();
    const BAGWORK_ADDRESS = '7Pnqg1S6MYrL6AP1ZXcToTHfdBbTB77ze6Y33qBBpump';

    try {
        console.log(`🎯 Getting basic chart data for BAGWORK...`);
        console.log('');

        const result = await birdeyeService.getBasicChartData(BAGWORK_ADDRESS);

        if (result.success) {
            const { chartPoints, priceInfo, chartConfig } = result.data;
            
            console.log('✅ Chart Data Ready!');
            console.log('─'.repeat(40));
            console.log(`📊 Data Points: ${chartConfig.dataPoints}`);
            console.log(`💰 Price Range: $${priceInfo.minPrice.toFixed(8)} → $${priceInfo.maxPrice.toFixed(8)}`);
            console.log(`📈 Price Change: ${priceInfo.priceChangePercent > 0 ? '+' : ''}${priceInfo.priceChangePercent.toFixed(2)}%`);
            console.log('');

            console.log('🎨 ASCII Chart Visualization:');
            console.log('─'.repeat(80));
            
            // Create a simple ASCII chart
            const chartHeight = 20;
            const chartWidth = 60;
            
            // Create 2D array for the chart
            let chart = Array(chartHeight).fill().map(() => Array(chartWidth).fill(' '));
            
            // Plot the points
            chartPoints.forEach((point, index) => {
                if (index < chartWidth) {
                    const x = Math.floor((index / (chartPoints.length - 1)) * (chartWidth - 1));
                    const y = Math.floor(((100 - point.y) / 100) * (chartHeight - 1));
                    chart[y][x] = '●';
                }
            });
            
            // Print the chart
            for (let y = 0; y < chartHeight; y++) {
                let line = '';
                for (let x = 0; x < chartWidth; x++) {
                    line += chart[y][x];
                }
                const price = priceInfo.maxPrice - ((y / (chartHeight - 1)) * priceInfo.priceRange);
                console.log(`${price.toFixed(6)} |${line}|`);
            }
            
            // Time labels at bottom
            console.log(' '.repeat(11) + '+' + '─'.repeat(chartWidth) + '+');
            let timeLabels = ' '.repeat(11);
            for (let i = 0; i < 6; i++) {
                const pointIndex = Math.floor((i / 5) * (chartPoints.length - 1));
                if (chartPoints[pointIndex]) {
                    timeLabels += chartPoints[pointIndex].timeShort.padEnd(10);
                }
            }
            console.log(timeLabels);

            console.log('');
            console.log('📋 Chart Data Points (first 10):');
            console.log('─'.repeat(60));
            console.log('X    Y(scaled)  Actual Price    Time');
            console.log('─'.repeat(60));
            
            chartPoints.slice(0, 10).forEach(point => {
                console.log(`${point.x.toString().padStart(2)}   ${point.y.toFixed(1).padStart(6)}     $${point.actualPrice.toFixed(8)}   ${point.time}`);
            });

            console.log('');
            console.log('🎯 Perfect for Line Chart!');
            console.log('• X values: 0-59 (time axis)');
            console.log('• Y values: 0-100 (normalized for display)');
            console.log('• Actual prices preserved in actualPrice field');
            console.log('• Shows real highs and lows properly scaled');

            console.log('');
            console.log('📊 Sample Chart Data JSON:');
            console.log(JSON.stringify({
                chartPoints: chartPoints.slice(0, 3),
                priceInfo: priceInfo,
                config: chartConfig
            }, null, 2));

        } else {
            console.log('❌ Failed to get chart data');
            console.log('Error:', result.error);
        }

    } catch (error) {
        console.error('💥 Test failed:', error.message);
    }

    console.log('');
    console.log('🏁 Basic chart test completed');
}

// Run the test
if (require.main === module) {
    testBasicChartData();
}

module.exports = testBasicChartData;
