const fetch = require('node-fetch');

const fetchBagworkPriceHistory = async () => {
  // Using your exact working block of code
  const tokenAddress = "7Pnqg1S6MYrL6AP1ZXcToTHfdBbTB77ze6Y33qBBpump"; // Bagwork token
  const url = `https://api.helius.xyz/v0/addresses/${tokenAddress}/transactions?api-key=26240c3d-8cce-414e-95f7-5c0c75c1a2cb&limit=100`;
  
  console.log("Fetching Bagwork transactions...");
  
  const response = await fetch(url);
  const transactions = await response.json();
  console.log("Bagwork transactions:", transactions.length, "found");
  
  // Extract price data from transactions
  const pricePoints = [];
  
  for (const tx of transactions) {
    if (tx.transactionError) continue;
    
    const timestamp = tx.timestamp ? tx.timestamp * 1000 : Date.now();
    
    // Look for token transfers
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
      
      // Calculate price if we have both transfers
      if (bagworkTransfer && solTransfer) {
        const tokenAmount = parseFloat(bagworkTransfer.tokenAmount);
        const solAmount = parseFloat(solTransfer.tokenAmount);
        
        if (tokenAmount > 0 && solAmount > 0) {
          const SOL_PRICE_USD = 140; // SOL price
          const priceInSOL = solAmount / tokenAmount;
          const priceInUSD = priceInSOL * SOL_PRICE_USD;
          
          pricePoints.push({
            timestamp,
            price: priceInUSD,
            txHash: tx.signature
          });
        }
      }
    }
  }
  
  // Sort by timestamp
  pricePoints.sort((a, b) => a.timestamp - b.timestamp);
  
  console.log(`Found ${pricePoints.length} real price points`);
  
  // Create 60 minute intervals for past hour
  const now = Date.now();
  const oneHourAgo = now - (60 * 60 * 1000);
  
  const hourlyData = [];
  
  for (let i = 0; i < 60; i++) {
    const intervalStart = oneHourAgo + (i * 60 * 1000); // 1 minute intervals
    const intervalEnd = intervalStart + 60 * 1000;
    
    // Find prices in this minute
    const pricesInMinute = pricePoints.filter(p => 
      p.timestamp >= intervalStart && p.timestamp < intervalEnd
    );
    
    let price;
    if (pricesInMinute.length > 0) {
      price = pricesInMinute.reduce((sum, p) => sum + p.price, 0) / pricesInMinute.length;
    } else {
      // Use nearest price or fallback
      const nearestPrice = pricePoints.find(p => Math.abs(p.timestamp - intervalStart) < 30 * 60 * 1000);
      price = nearestPrice ? nearestPrice.price : 0.001;
    }
    
    const date = new Date(intervalStart);
    hourlyData.push({
      minute: i + 1,
      time: date.toLocaleTimeString(),
      price: price,
      formatted: `$${price.toFixed(8)}`
    });
  }
  
  console.log("\n=== BAGWORK PAST HOUR PRICE HISTORY ===");
  console.log("Min | Time      | Price");
  console.log("----|-----------|------------------");
  
  hourlyData.forEach(point => {
    console.log(`${point.minute.toString().padStart(3)} | ${point.time} | ${point.formatted}`);
  });
  
  console.log(`\nPrice range: $${Math.min(...hourlyData.map(p => p.price)).toFixed(8)} - $${Math.max(...hourlyData.map(p => p.price)).toFixed(8)}`);
  
  return hourlyData;
};

fetchBagworkPriceHistory().catch(console.error);
