import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Import webhook utilities for testing
import './utils/webhook-handler'

createRoot(document.getElementById("root")!).render(<App />);
