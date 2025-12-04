import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { OnboardingProvider } from './components/OnboardingContext';
import { onboardingSteps } from './components/onboardingSteps';
import {
  AuthProvider,
  ProjectProvider,
  AgentProvider,
  ChatProvider,
  BootstrapProvider,
  DocumentsProvider,
} from './contexts';

// Компонент-обертка для провайдеров, которые зависят от других провайдеров
const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AuthProvider>
      <ProjectProvider>
        <AgentProvider>
          <ChatProvider>
            <BootstrapProvider
              onError={(error: any) => {
                // Обработка ошибок будет в App.tsx через useDialogs
                console.error('Bootstrap error:', error);
              }}
            >
              <DocumentsProvider>
                {children}
              </DocumentsProvider>
            </BootstrapProvider>
          </ChatProvider>
        </AgentProvider>
      </ProjectProvider>
    </AuthProvider>
  );
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <OnboardingProvider steps={onboardingSteps}>
      <AppProviders>
        <App />
      </AppProviders>
    </OnboardingProvider>
  </React.StrictMode>
);