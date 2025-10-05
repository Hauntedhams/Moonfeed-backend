const fetch = require('node-fetch');

async function testGeckoTerminal() {
  console.log('Testing GeckoTerminal API with improved headers...');
  
  // Test with a known Solana token - BONK
  const tokenAddress = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'; // BONK token
  
  try {
    const url = `https://api.geckoterminal.com/api/v2/networks/solana/tokens/${tokenAddress}/pools`;
    
    console.log(`Making request to: ${url}`);
    
    const response = await fetch(url + '?limit=5', {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Referer': 'https://www.geckoterminal.com/',
        'Origin': 'https://www.geckoterminal.com',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-site'
      },
      timeout: 15000
    });
    
    console.log(`Response status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ SUCCESS!');
      console.log(`Found ${data.data?.length || 0} pools for BONK token`);
      
      if (data.data && data.data.length > 0) {
        const firstPool = data.data[0];
        console.log(`Best pool: ${firstPool.id}`);
        console.log(`Pool name: ${firstPool.attributes?.name}`);
        console.log(`Liquidity: $${firstPool.attributes?.reserve_in_usd}`);
        
        // Test fetching OHLCV data for this pool
        console.log('\nTesting OHLCV data...');
        const ohlcvUrl = `https://api.geckoterminal.com/api/v2/networks/solana/pools/${firstPool.id}/ohlcv/1h`;
        
        const ohlcvResponse = await fetch(ohlcvUrl + '?limit=100', {
          method: 'GET',
          headers: {
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Referer': 'https://www.geckoterminal.com/',
            'Origin': 'https://www.geckoterminal.com',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-site'
          },
          timeout: 15000
        });
        
        console.log(`OHLCV Response status: ${ohlcvResponse.status}`);
        
        if (ohlcvResponse.ok) {
          const ohlcvData = await ohlcvResponse.json();
          const dataPoints = ohlcvData.data?.attributes?.ohlcv_list?.length || 0;
          console.log(`✅ OHLCV SUCCESS! Got ${dataPoints} data points`);
          
          if (dataPoints > 0) {
            const firstPoint = ohlcvData.data.attributes.ohlcv_list[0];
            const lastPoint = ohlcvData.data.attributes.ohlcv_list[dataPoints - 1];
            console.log(`Price range: $${firstPoint[4]} -> $${lastPoint[4]}`);
          }
        } else {
          const errorText = await ohlcvResponse.text();
          console.log(`❌ OHLCV Failed: ${ohlcvResponse.status} - ${errorText}`);
        }
      }
      
    } else {
      const errorText = await response.text();
      console.log(`❌ FAILED: ${response.status} - ${errorText}`);
    }
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

testGeckoTerminal();
