import type { Preview } from '@storybook/react-vite';
import React from 'react';
import '../index.css';
import { OnboardingProvider } from '../components/OnboardingContext';
import { onboardingSteps } from '../components/onboardingSteps';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: 'todo',
    },
    backgrounds: {
      default: 'app-dark',
      values: [
        { name: 'app-dark', value: '#05050a' },
        { name: 'light', value: '#f8fafc' },
      ],
    },
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <OnboardingProvider steps={onboardingSteps}>
        <Story />
      </OnboardingProvider>
    ),
  ],
};

export default preview;

