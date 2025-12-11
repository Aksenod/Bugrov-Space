import type { Meta, StoryObj } from '@storybook/react';
import { EmptyStatePage } from '../../EmptyStatePage';

const meta: Meta<typeof EmptyStatePage> = {
  title: 'UI/EmptyStatePage',
  component: EmptyStatePage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'dark',
      values: [{ name: 'dark', value: '#000000' }],
    },
  },
};

export default meta;
type Story = StoryObj<typeof EmptyStatePage>;

export const NoProjects: Story = {
  render: () => (
    <EmptyStatePage
      type="no-projects"
      onCreateProject={() => console.log('Create project')}
      onLogout={() => console.log('Logout')}
    />
  ),
};

export const NoAgents: Story = {
  render: () => (
    <EmptyStatePage
      type="no-agents"
    />
  ),
};

export const NoProjectsWithoutActions: Story = {
  render: () => (
    <EmptyStatePage
      type="no-projects"
    />
  ),
};

