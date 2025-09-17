import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Import webhook utilities for testing
import './utils/webhook-handler'
import { testAddAnalysis } from './utils/webhook-handler'

// Test with your actual n8n output
const testData = `{
  "favorite_team": "Rice Owls",
  "favorite_odds": "-131.2222222222223",
  "underdog_team": "Charlotte 49ers", 
  "underdog_odds": "+108.88888888888889",
  "recommendation_team": "Charlotte 49ers",
  "recommendation_side": "underdog",
  "analysis": "## Game Analysis: Charlotte 49ers vs Rice Owls\\n\\n### Key Insights\\n- The Rice Owls have been a consistent team, but this matchup is creating value on the Charlotte 49ers.\\n- Public sentiment seems to be heavily favoring the Rice Owls, leading to potentially inflated odds for the Charlotte 49ers.\\n\\n### Value Assessment\\n**Favorite:** Rice Owls (-131.2222222222223)\\n**Underdog:** Charlotte 49ers (+108.88888888888889)\\n\\n### Betting Recommendation\\nFade the public on this one. The sharp money is leaning towards the Charlotte 49ers, and given the current situation, there's strong value in backing them as the underdogs. The Rice Owls' odds reflect a level of public hype that may not be justified, especially in this conference rivalry where the intensity can skew expected outcomes. By siding with the Charlotte 49ers, we take advantage of the square money flowing towards the Rice Owls. The Charlotte 49ers have the potential to surprise, particularly with their recent performance trends, creating a perfect storm for an upset. Take the value with the Charlotte 49ers here and don't sleep on the public betting misperceptions.",
  "recommendation": "Charlotte 49ers",
  "bet_type": "moneyline",
  "confidence": "High",
  "confidence_percentage": 85,
  "units": 2.0,
  "key_factors": ["Square money on Rice Owls", "Sharp money on Charlotte 49ers", "Conference rivalry intensity"],
  "teams": "Charlotte 49ers vs Rice Owls",
  "sport": "NFL",
  "persona": "bobby-vegas"
}`;

// Add the test data when the app loads
setTimeout(() => {
  testAddAnalysis(testData);
}, 1000);

createRoot(document.getElementById("root")!).render(<App />);
