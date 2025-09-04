// Webhook handler to process n8n analysis data and make it available to the dashboard

interface N8nAnalysisData {
  favorite_team: string;
  favorite_odds: string;
  underdog_team: string;
  underdog_odds: string;
  recommendation_team: string;
  recommendation_side: string;
  analysis: string;
  recommendation: string;
  bet_type: string;
  confidence: string;
  confidence_percentage: number;
  units: number;
  key_factors: string[];
  teams: string;
  sport: string;
  persona: string;
}

interface TelegramAnalysis {
  id: string;
  timestamp: string;
  command: string;
  teams: string;
  persona: string;
  analysis: string;
  confidence: 'High' | 'Medium' | 'Low';
  status: 'win' | 'neutral' | 'loss';
  odds?: string;
  sport?: string;
  recommendation?: string;
  bet_type?: string;
  confidence_percentage?: number;
  units?: number;
  key_factors?: string[];
}

export const processWebhookAnalysis = (n8nData: N8nAnalysisData): TelegramAnalysis => {
  const analysis: TelegramAnalysis = {
    id: `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    command: '/analyze',
    teams: n8nData.teams,
    persona: n8nData.persona || 'AI Analyst',
    analysis: JSON.stringify(n8nData),
    confidence: n8nData.confidence as 'High' | 'Medium' | 'Low',
    status: 'neutral' as const,
    odds: `${n8nData.favorite_team} ${n8nData.favorite_odds} | ${n8nData.underdog_team} ${n8nData.underdog_odds}`,
    sport: n8nData.sport,
    recommendation: n8nData.recommendation_team,
    bet_type: n8nData.bet_type,
    confidence_percentage: n8nData.confidence_percentage,
    units: n8nData.units,
    key_factors: n8nData.key_factors
  };

  return analysis;
};

export const addAnalysisToStorage = (analysis: TelegramAnalysis) => {
  try {
    const existing = localStorage.getItem('webhook_analyses');
    const analyses = existing ? JSON.parse(existing) : [];
    
    // Add new analysis to the beginning, keep only last 50
    const updated = [analysis, ...analyses].slice(0, 50);
    
    localStorage.setItem('webhook_analyses', JSON.stringify(updated));
    
    // Dispatch custom event for real-time updates
    const event = new CustomEvent('webhookAnalysisAdded', {
      detail: analysis
    });
    window.dispatchEvent(event);
    
    console.log('Analysis added to storage and event dispatched:', analysis.id);
    return true;
  } catch (error) {
    console.error('Error adding analysis to storage:', error);
    return false;
  }
};

// Test function to manually add analysis (for testing with your n8n output)
export const testAddAnalysis = (n8nOutput: string) => {
  try {
    const parsed = JSON.parse(n8nOutput);
    const analysis = processWebhookAnalysis(parsed);
    return addAnalysisToStorage(analysis);
  } catch (error) {
    console.error('Error parsing n8n output:', error);
    return false;
  }
};

// Make functions available globally for testing
if (typeof window !== 'undefined') {
  (window as any).testAddAnalysis = testAddAnalysis;
  (window as any).processWebhookAnalysis = processWebhookAnalysis;
  (window as any).addAnalysisToStorage = addAnalysisToStorage;
}
