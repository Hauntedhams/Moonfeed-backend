const rugcheckService = require('./rugcheckService');

class RugcheckAutoProcessor {
  constructor() {
    this.isProcessing = false;
    this.processInterval = 30000; // Check every 30 seconds
    this.batchSize = 30;
    this.intervalId = null;
    this.stats = {
      totalProcessed: 0,
      totalVerified: 0,
      totalLocked: 0,
      batchesCompleted: 0,
      lastProcessedAt: null,
      errors: 0
    };
  }

  // Start the automated processor
  start(currentCoinsRef) {
    if (this.intervalId) {
      console.log('🔍 Rugcheck auto-processor already running');
      return;
    }

    this.currentCoinsRef = currentCoinsRef;
    console.log('🚀 Starting Rugcheck auto-processor...');
    
    // Process immediately, then set interval
    this.processNext();
    
    this.intervalId = setInterval(() => {
      this.processNext();
    }, this.processInterval);

    console.log(`✅ Rugcheck auto-processor started (checking every ${this.processInterval/1000}s)`);
  }

  // Stop the automated processor
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('🛑 Rugcheck auto-processor stopped');
    }
  }

  // Process the next batch of unverified coins
  async processNext() {
    if (this.isProcessing) {
      console.log('⏳ Rugcheck processor already working, skipping...');
      return;
    }

    if (!this.currentCoinsRef || !this.currentCoinsRef()) {
      console.log('📭 No coins available for processing');
      return;
    }

    const currentCoins = this.currentCoinsRef();
    const unprocessedCoins = currentCoins.filter(coin => !coin.rugcheckProcessedAt);

    if (unprocessedCoins.length === 0) {
      console.log('✅ All coins have been processed by Rugcheck');
      return;
    }

    this.isProcessing = true;
    console.log(`🔍 Auto-processing next ${Math.min(this.batchSize, unprocessedCoins.length)} coins...`);

    try {
      const totalCoins = currentCoins.length;
      const processedCount = totalCoins - unprocessedCoins.length;
      const startIndex = processedCount;
      const coinsToProcess = Math.min(this.batchSize, unprocessedCoins.length);

      // Get the batch to process
      const batchToProcess = currentCoins.slice(startIndex, startIndex + coinsToProcess);
      const mintAddresses = batchToProcess.map(coin => 
        coin.mintAddress || coin.tokenAddress || coin.address
      ).filter(Boolean);

      console.log(`🔍 Processing batch starting at index ${startIndex} (${coinsToProcess} coins)`);

      // Process this batch
      const rugcheckResults = await rugcheckService.checkMultipleTokens(mintAddresses, {
        maxConcurrent: 2,
        batchDelay: 1500,
        maxTokens: coinsToProcess
      });

      // Update the coins with Rugcheck data
      let updatedCount = 0;
      let verifiedCount = 0;
      let lockedCount = 0;

      for (let i = 0; i < batchToProcess.length; i++) {
        const coinIndex = startIndex + i;
        const coin = currentCoins[coinIndex];
        const mintAddress = coin.mintAddress || coin.tokenAddress || coin.address;
        const rugcheckData = rugcheckResults.find(r => r.address === mintAddress);
        
        if (rugcheckData && rugcheckData.rugcheckAvailable) {
          currentCoins[coinIndex] = {
            ...coin,
            liquidityLocked: rugcheckData.liquidityLocked,
            lockPercentage: rugcheckData.lockPercentage,
            burnPercentage: rugcheckData.burnPercentage,
            rugcheckScore: rugcheckData.score,
            riskLevel: rugcheckData.riskLevel,
            freezeAuthority: rugcheckData.freezeAuthority,
            mintAuthority: rugcheckData.mintAuthority,
            topHolderPercent: rugcheckData.topHolderPercent,
            isHoneypot: rugcheckData.isHoneypot,
            rugcheckVerified: true,
            rugcheckProcessedAt: new Date().toISOString()
          };
          verifiedCount++;
          if (rugcheckData.liquidityLocked) lockedCount++;
        } else {
          // Mark as processed but not verified
          currentCoins[coinIndex] = {
            ...coin,
            rugcheckVerified: false,
            rugcheckProcessedAt: new Date().toISOString()
          };
        }
        updatedCount++;
      }

      // Update stats
      this.stats.totalProcessed += updatedCount;
      this.stats.totalVerified += verifiedCount;
      this.stats.totalLocked += lockedCount;
      this.stats.batchesCompleted++;
      this.stats.lastProcessedAt = new Date().toISOString();

      const progressPercentage = Math.round(((processedCount + coinsToProcess) / totalCoins) * 100);
      const remainingCoins = totalCoins - (processedCount + coinsToProcess);

      console.log(`✅ Auto-batch complete: ${verifiedCount}/${coinsToProcess} verified, ${lockedCount} locked`);
      console.log(`📊 Progress: ${progressPercentage}% (${remainingCoins} coins remaining)`);

      if (remainingCoins === 0) {
        console.log('🎉 All coins have been processed by Rugcheck auto-processor!');
        this.logFinalStats(totalCoins);
      }

    } catch (error) {
      console.error('❌ Error in auto-processor:', error.message);
      this.stats.errors++;
    } finally {
      this.isProcessing = false;
    }
  }

  // Log final statistics
  logFinalStats(totalCoins) {
    const verificationRate = this.stats.totalProcessed > 0 ? 
      Math.round((this.stats.totalVerified / this.stats.totalProcessed) * 100) : 0;
    const lockRate = this.stats.totalVerified > 0 ? 
      Math.round((this.stats.totalLocked / this.stats.totalVerified) * 100) : 0;

    console.log('\n🎯 RUGCHECK AUTO-PROCESSOR COMPLETE!');
    console.log('═══════════════════════════════════════');
    console.log(`📊 Total coins processed: ${this.stats.totalProcessed}/${totalCoins}`);
    console.log(`✅ Verification rate: ${verificationRate}%`);
    console.log(`🔒 Liquidity lock rate: ${lockRate}%`);
    console.log(`📦 Batches completed: ${this.stats.batchesCompleted}`);
    console.log(`❌ Errors encountered: ${this.stats.errors}`);
    console.log('═══════════════════════════════════════\n');
  }

  // Get current processor status
  getStatus() {
    return {
      isRunning: !!this.intervalId,
      isProcessing: this.isProcessing,
      stats: this.stats,
      config: {
        batchSize: this.batchSize,
        processInterval: this.processInterval
      }
    };
  }

  // Manually trigger processing (useful for testing)
  async triggerProcessing() {
    if (this.isProcessing) {
      return { success: false, message: 'Already processing' };
    }

    console.log('🔧 Manual trigger: Processing next batch...');
    await this.processNext();
    return { success: true, message: 'Processing triggered' };
  }

  // Reset stats
  resetStats() {
    this.stats = {
      totalProcessed: 0,
      totalVerified: 0,
      totalLocked: 0,
      batchesCompleted: 0,
      lastProcessedAt: null,
      errors: 0
    };
    console.log('📊 Rugcheck auto-processor stats reset');
  }
}

module.exports = RugcheckAutoProcessor;
