// Modular blockchain liquidity lock checker for EVM and Solana
// Add more chains as needed

const Web3 = require('web3');
const { Connection, PublicKey } = require('@solana/web3.js');

// Known lock contract addresses for EVM chains (add more as needed)
const LOCK_CONTRACTS_EVM = [
  '0x6c6ee5e31d828de241282b9606c8e98ea48526e2', // Team Finance
  '0xc5d0c7e6e0e2e3e3e3e3e3e3e3e3e3e3e3e3e3e3', // Unicrypt
  // Add more lock contract addresses here
];

// EVM: Check if LP tokens are held by lock contracts
async function isLiquidityLockedEVM(lpTokenAddress, chainRpcUrl) {
  try {
    const web3 = new Web3(chainRpcUrl);
    const lpTokenContract = new web3.eth.Contract([
      { constant: true, inputs: [{ name: 'owner', type: 'address' }], name: 'balanceOf', outputs: [{ name: '', type: 'uint256' }], type: 'function' }
    ], lpTokenAddress);
    for (const lockAddr of LOCK_CONTRACTS_EVM) {
      const balance = await lpTokenContract.methods.balanceOf(lockAddr).call();
      if (parseInt(balance) > 0) return true;
    }
    return false;
  } catch (e) {
    console.error('EVM lock check error:', e);
    return null;
  }
}

// Solana: Check if pool authority is a known lock program (simplified)
async function isLiquidityLockedSolana(poolAddress, solanaRpcUrl) {
  try {
    const connection = new Connection(solanaRpcUrl);
    const accountInfo = await connection.getAccountInfo(new PublicKey(poolAddress));
    // You may need to parse accountInfo.data for lock program authority
    // This is chain/project specific and may require more logic
    // For now, return null (unknown)
    return null;
  } catch (e) {
    console.error('Solana lock check error:', e);
    return null;
  }
}

module.exports = {
  isLiquidityLockedEVM,
  isLiquidityLockedSolana
};
