/**
 * Reputation system for ShareBuddy
 * 
 * Tracks reliability of storage providers to ensure data integrity.
 * The reputation system helps users identify reliable storage nodes
 * and incentivizes good behavior in the network.
 */

// Interface for reputation score details
export interface ReputationScore {
  userId: number;
  score: number; // 0-100
  uptime: number; // Percentage
  responseTime: number; // Average in ms
  lastUpdated: Date;
  totalChunksStored: number;
  successfulRetrievals: number;
  failedRetrievals: number;
}

// Interface for reputation events
export interface ReputationEvent {
  userId: number;
  eventType: 'chunk_stored' | 'chunk_retrieved' | 'chunk_lost' | 'uptime_check' | 'latency_check';
  timestamp: Date;
  successful: boolean;
  details?: Record<string, any>;
}

export class ReputationSystem {
  private static readonly SCORE_WEIGHTS = {
    uptime: 0.4,           // 40% of score is uptime
    responseTime: 0.2,     // 20% of score is response time
    retrievalSuccess: 0.3, // 30% of score is successful retrievals
    storageStability: 0.1  // 10% is storage stability
  };
  
  /**
   * Calculate a provider's reputation score based on performance metrics
   */
  static calculateScore(metrics: {
    uptime: number; // percentage
    responseTime: number; // ms (lower is better)
    retrievalSuccessRate: number; // percentage
    storageStability: number; // percentage
  }): number {
    // Normalize response time (500ms or less is perfect, 5000ms or more is terrible)
    const normalizedResponseTime = Math.max(0, Math.min(100, 100 - (metrics.responseTime - 500) / 45));
    
    // Calculate weighted score (0-100)
    const score =
      (metrics.uptime * this.SCORE_WEIGHTS.uptime) +
      (normalizedResponseTime * this.SCORE_WEIGHTS.responseTime) +
      (metrics.retrievalSuccessRate * this.SCORE_WEIGHTS.retrievalSuccess) +
      (metrics.storageStability * this.SCORE_WEIGHTS.storageStability);
    
    return Math.round(score);
  }
  
  /**
   * Process a new reputation event and update the provider's score
   */
  static async processEvent(event: ReputationEvent, currentScore: ReputationScore): Promise<ReputationScore> {
    // Clone the current score to avoid mutating the original
    const updatedScore = { ...currentScore };
    
    // Update metrics based on event type
    switch (event.eventType) {
      case 'chunk_stored':
        updatedScore.totalChunksStored++;
        break;
        
      case 'chunk_retrieved':
        if (event.successful) {
          updatedScore.successfulRetrievals++;
        } else {
          updatedScore.failedRetrievals++;
        }
        break;
        
      case 'uptime_check':
        // Update uptime based on exponential moving average
        const newUptime = event.successful ? 100 : 0;
        updatedScore.uptime = 0.9 * updatedScore.uptime + 0.1 * newUptime;
        break;
        
      case 'latency_check':
        if (event.details?.responseTime) {
          // Update response time using exponential moving average
          updatedScore.responseTime = 
            0.9 * updatedScore.responseTime + 
            0.1 * event.details.responseTime;
        }
        break;
        
      case 'chunk_lost':
        // Penalize for lost chunks
        updatedScore.failedRetrievals++;
        break;
    }
    
    // Calculate new score based on updated metrics
    const retrievalSuccessRate = updatedScore.successfulRetrievals / 
      (updatedScore.successfulRetrievals + updatedScore.failedRetrievals) * 100 || 100;
      
    // Estimate storage stability based on successful vs failed retrievals
    const storageStability = Math.max(0, 100 - (updatedScore.failedRetrievals / 
      Math.max(1, updatedScore.totalChunksStored) * 200));
    
    // Calculate the new score
    updatedScore.score = this.calculateScore({
      uptime: updatedScore.uptime,
      responseTime: updatedScore.responseTime,
      retrievalSuccessRate,
      storageStability
    });
    
    // Update timestamp
    updatedScore.lastUpdated = new Date();
    
    return updatedScore;
  }
  
  /**
   * Determine if a provider is reliable enough to store critical data
   */
  static isProviderReliable(score: ReputationScore): boolean {
    return score.score >= 70 && score.uptime >= 90;
  }
  
  /**
   * Get a human-readable reliability tier based on score
   */
  static getReliabilityTier(score: number): string {
    if (score >= 95) return 'Platinum';
    if (score >= 85) return 'Gold';
    if (score >= 75) return 'Silver';
    if (score >= 60) return 'Bronze';
    return 'Unproven';
  }
}