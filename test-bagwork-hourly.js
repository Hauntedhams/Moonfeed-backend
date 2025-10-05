const fetch = require('node-fetch');

const fetchBagworkTransactions = async () => {
  // Use the Helius enhanced transactions API to search for Bagwork token transactions
  const tokenAddress = "7Pnqg1S6MYrL6AP1ZXcToTHfdBbTB77ze6Y33qBBpump"; // Bagwork token
  const apiKey = "26240c3d-8cce-414e-95f7-5c0c75c1a2cb";
  
  console.log("Fetching Bagwork transaction history...");
  
  try {
    // Use enhanced transactions API to search for transactions involving Bagwork token
    const requestBody = {
      query: {
        tokens: [tokenAddress],
        types: ['SWAP', 'TRANSFER']
      },
      options: {
        limit: 100,
        showRewards: false
      }
    };
    
    const response = await fetch(`https://api.helius.xyz/v0/transactions/enhanced?api-key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const transactions = await response.json();
    console.log(`✅ Found ${transactions.length} Bagwork transactions`);
    
    // Extract real price points from transactions
    const pricePoints = [];
    
    for (const tx of transactions) {
      if (tx.transactionError) continue;
      
      const timestamp = tx.timestamp ? tx.timestamp * 1000 : Date.now();
      
      // Look for token transfers involving Bagwork and SOL
      if (tx.tokenTransfers && tx.tokenTransfers.length > 0) {
        let bagworkTransfer = null;
        let solTransfer = null;
        
        for (const transfer of tx.tokenTransfers) {
          if (transfer.mint === tokenAddress) {
            bagworkTransfer = transfer;
          }
          if (transfer.mint === 'So11111111111111111111111111111111111111112') {
            solTransfer = transfer;
          }
        }
        
        // Calculate real price if we have both transfers
        if (bagworkTransfer && solTransfer) {
          const tokenAmount = parseFloat(bagworkTransfer.tokenAmount);
          const solAmount = parseFloat(solTransfer.tokenAmount);
          
          if (tokenAmount > 0 && solAmount > 0) {
            const SOL_PRICE_USD = 140; // Approximate SOL price
            const priceInSOL = solAmount / tokenAmount;
            const priceInUSD = priceInSOL * SOL_PRICE_USD;
            
            pricePoints.push({
              timestamp,
              price: priceInUSD,
              txHash: tx.signature,
              tokenAmount,
              solAmount
            });
          }
        }
      }
    }
    
    // Sort by timestamp
    pricePoints.sort((a, b) => a.timestamp - b.timestamp);
    
    console.log(`✅ Extracted ${pricePoints.length} real price points`);
    
    // Create 60 minute intervals for the past hour
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000); // 1 hour ago
    const intervalMs = 60 * 1000; // 1 minute intervals
    
    const hourlyPriceData = [];
    
    for (let i = 0; i < 60; i++) {
      const intervalStart = oneHourAgo + (i * intervalMs);
      const intervalEnd = intervalStart + intervalMs;
      
      // Find prices in this 1-minute interval
      const pricesInInterval = pricePoints.filter(p => 
        p.timestamp >= intervalStart && p.timestamp < intervalEnd
      );
      
      let price;
      if (pricesInInterval.length > 0) {
        // Use average price in this interval
        price = pricesInInterval.reduce((sum, p) => sum + p.price, 0) / pricesInInterval.length;
      } else {
        // Interpolate from nearest prices or use fallback
        const beforePrice = pricePoints.filter(p => p.timestamp < intervalStart).pop();
        const afterPrice = pricePoints.find(p => p.timestamp >= intervalEnd);
        
        if (beforePrice && afterPrice) {
          const ratio = (intervalStart - beforePrice.timestamp) / (afterPrice.timestamp - beforePrice.timestamp);
          price = beforePrice.price + (afterPrice.price - beforePrice.price) * ratio;
        } else if (beforePrice) {
          price = beforePrice.price;
        } else if (afterPrice) {
          price = afterPrice.price;
        } else {
          price = 0.001; // Fallback price
        }
      }
      
      const date = new Date(intervalStart);
      hourlyPriceData.push({
        minute: i + 1,
        time: date.toLocaleTimeString(),
        timestamp: intervalStart,
        price: price,
        priceFormatted: `$${price.toFixed(8)}`
      });
    }
    
    console.log("\n=== BAGWORK HOURLY PRICE HISTORY (60 minutes) ===");
    console.log("Minute | Time      | Price");
    console.log("-------|-----------|------------------");
    
    hourlyPriceData.forEach(point => {
      console.log(`${point.minute.toString().padStart(6)} | ${point.time} | ${point.priceFormatted}`);
    });
    
    console.log(`\n✅ Generated 60 minute-by-minute price points for Bagwork`);
    console.log(`Price range: $${Math.min(...hourlyPriceData.map(p => p.price)).toFixed(8)} - $${Math.max(...hourlyPriceData.map(p => p.price)).toFixed(8)}`);
    
    return hourlyPriceData;
    
  } catch (error) {
    console.error("❌ Error fetching Bagwork transactions:", error.message);
  }
};

fetchBagworkTransactions();
