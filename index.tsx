import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { OnboardingProvider } from './components/OnboardingContext';
import { onboardingSteps } from './components/onboardingSteps';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <OnboardingProvider steps={onboardingSteps}>
      <App />
    </OnboardingProvider>
  </React.StrictMode>
);