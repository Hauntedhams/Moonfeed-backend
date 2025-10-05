// Test exactly your provided code with Bagwork token
const fetch = require('node-fetch');

const fetchWalletTransactions = async () => {
  const walletAddress = "7Pnqg1S6MYrL6AP1ZXcToTHfdBbTB77ze6Y33qBBpump"; // Bagwork token
  const url = `https://api.helius.xyz/v0/addresses/${walletAddress}/transactions?api-key=26240c3d-8cce-414e-95f7-5c0c75c1a2cb`;
  
  const response = await fetch(url);
  const transactions = await response.json();
  console.log("Wallet transactions:", transactions);
  
  // Show summary
  console.log(`\n📊 SUMMARY:`);
  console.log(`Total transactions: ${transactions.length}`);
  
  if (transactions.length > 0) {
    console.log(`\n🔍 FIRST TRANSACTION STRUCTURE:`);
    console.log(JSON.stringify(transactions[0], null, 2));
  }
};

fetchWalletTransactions();
