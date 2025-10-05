// Batch-based coin storage - saves batches from Solana Tracker queries
// Keeps last 2-3 batches, automatically rotates old ones out

const fs = require('fs');
const path = require('path');

const BATCHES_FILE = path.join(__dirname, 'coin-batches.json');
const MAX_BATCHES = 3; // Keep only last 3 batches

class CoinStorage {
  constructor() {
    this.batches = this.loadBatches();
  }

  // Load saved batches from file
  loadBatches() {
    try {
      if (fs.existsSync(BATCHES_FILE)) {
        const data = fs.readFileSync(BATCHES_FILE, 'utf8');
        const parsed = JSON.parse(data);
        const totalCoins = parsed.batches?.reduce((sum, batch) => sum + batch.coins.length, 0) || 0;
        console.log(`📂 Loaded ${parsed.batches?.length || 0} batches with ${totalCoins} total coins`);
        return parsed.batches || [];
      }
    } catch (error) {
      console.error('❌ Error loading coin batches:', error.message);
    }
    return [];
  }

  // Save new batch (auto-rotates old ones)
  saveBatch(coins) {
    try {
      const newBatch = {
        id: Date.now(),
        coins: coins,
        savedAt: new Date().toISOString(),
        count: coins.length
      };

      // Add new batch to beginning
      this.batches.unshift(newBatch);

      // Keep only last MAX_BATCHES
      if (this.batches.length > MAX_BATCHES) {
        const removed = this.batches.splice(MAX_BATCHES);
        console.log(`🗑️ Rotated out ${removed.length} old batches`);
      }

      // Save to file
      const data = {
        batches: this.batches,
        lastUpdated: new Date().toISOString(),
        totalBatches: this.batches.length
      };
      
      fs.writeFileSync(BATCHES_FILE, JSON.stringify(data, null, 2));
      console.log(`💾 Saved new batch with ${coins.length} coins (${this.batches.length}/${MAX_BATCHES} batches stored)`);
      return true;
    } catch (error) {
      console.error('❌ Error saving coin batch:', error.message);
      return false;
    }
  }

  // Get all coins from all batches (most recent first)
  getAllCoins() {
    const allCoins = [];
    this.batches.forEach((batch, batchIndex) => {
      batch.coins.forEach(coin => {
        allCoins.push({
          ...coin,
          batchId: batch.id,
          batchIndex: batchIndex + 1
        });
      });
    });
    return allCoins;
  }

  // Get coins from latest batch only
  getLatestBatch() {
    if (this.batches.length === 0) return [];
    return this.batches[0].coins;
  }

  // Get batch info
  getBatchStats() {
    return this.batches.map((batch, index) => ({
      batchId: batch.id,
      position: index + 1,
      count: batch.count,
      savedAt: batch.savedAt,
      age: Math.floor((Date.now() - batch.id) / (1000 * 60)) // Age in minutes
    }));
  }

  // Clear all batches
  clearAllBatches() {
    this.batches = [];
    if (fs.existsSync(BATCHES_FILE)) {
      fs.unlinkSync(BATCHES_FILE);
    }
    console.log('🗑️ Cleared all coin batches');
  }

  // Get storage stats
  getStats() {
    const totalCoins = this.batches.reduce((sum, batch) => sum + batch.count, 0);
    return {
      totalBatches: this.batches.length,
      totalCoins: totalCoins,
      maxBatches: MAX_BATCHES,
      lastSaved: this.batches.length > 0 ? this.batches[0].savedAt : null,
      fileExists: fs.existsSync(BATCHES_FILE),
      batches: this.getBatchStats()
    };
  }
}

module.exports = CoinStorage;
