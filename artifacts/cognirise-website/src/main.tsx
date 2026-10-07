import { createRoot } from 'react-dom/client';

import { initializeNavigationStore } from './store/navigation';
import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';

import './index.css';
import './components/work/case-study-ui.css';

// Tag the initial same-tab entry before React mounts wouter and any redirect
// component gets an opportunity to mutate browser history.
initializeNavigationStore();

createRoot(document.getElementById('root')!, {
  // Keeps caught errors off reportError(), which would raise the dev overlay.
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
}).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);

import "./components/industries/telecom/approved.css";
import "./components/industries/telecom/ValueMap.css";
import "./components/industries/telecom/PriorityMap.css";
import "./components/industries/telecom/workforce-map.css";
import "./components/industries/telecom/architecture-trace.css";
import "./components/industries/telecom/TelecomVariants.css";
