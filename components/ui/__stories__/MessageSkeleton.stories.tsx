import type { Meta, StoryObj } from '@storybook/react';
import { MessageSkeleton } from '../../MessageSkeleton';

const meta: Meta<typeof MessageSkeleton> = {
  title: 'UI/MessageSkeleton',
  component: MessageSkeleton,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    backgrounds: {
      default: 'dark',
      values: [{ name: 'dark', value: '#000000' }],
    },
  },
};

export default meta;
type Story = StoryObj<typeof MessageSkeleton>;

export const Default: Story = {
  render: () => <MessageSkeleton />,
};

export const Multiple: Story = {
  render: () => (
    <div className="space-y-4">
      <MessageSkeleton />
      <MessageSkeleton />
      <MessageSkeleton />
    </div>
  ),
};


