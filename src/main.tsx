import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Import webhook utilities for testing
import './utils/webhook-handler'
import { testAddAnalysis } from './utils/webhook-handler'

// Test with your actual n8n output
const testData = `{
  "favorite_team": "Eagles",
  "favorite_odds": "-150",
  "underdog_team": "Cowboys", 
  "underdog_odds": "+130",
  "recommendation_team": "Cowboys",
  "recommendation_side": "underdog",
  "analysis": "## Game Analysis: Cowboys vs Eagles\\n\\n### Key Insights\\n- The Eagles have been a consistent team, but this matchup is creating value on the Cowboys.\\n- Public sentiment seems to be heavily favoring the Eagles, leading to potentially inflated odds for the Cowboys.\\n\\n### Value Assessment\\n**Favorite:** Eagles (-150)\\n**Underdog:** Cowboys (+130)\\n\\n### Betting Recommendation\\nFade the public on this one. The sharp money is leaning towards the Cowboys, and given the current situation, there's strong value in backing them as the underdogs. The Eagles' odds reflect a level of public hype that may not be justified, especially in this divisional rivalry where the intensity can skew expected outcomes. By siding with the Cowboys, we take advantage of the square money flowing towards the Eagles. The Cowboys have the potential to surprise, particularly with their recent performance trends, creating a perfect storm for an upset. Take the value with the Cowboys here and don't sleep on the public betting misperceptions.",
  "recommendation": "Cowboys",
  "bet_type": "moneyline",
  "confidence": "High",
  "confidence_percentage": 85,
  "units": 2.0,
  "key_factors": ["Square money on Eagles", "Sharp money on Cowboys", "Divisional rivalry intensity"],
  "teams": "Cowboys vs Eagles",
  "sport": "NFL",
  "persona": "bobby-vegas"
}`;

// Add the test data when the app loads
setTimeout(() => {
  testAddAnalysis(testData);
}, 1000);

createRoot(document.getElementById("root")!).render(<App />);
