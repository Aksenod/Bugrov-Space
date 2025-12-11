import type { Meta, StoryObj } from '@storybook/react';
import { LoadingFallback, ModalLoadingFallback, PageLoadingFallback, ComponentLoadingFallback } from '../../LoadingFallback';

const meta: Meta<typeof LoadingFallback> = {
  title: 'UI/LoadingFallback',
  component: LoadingFallback,
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
type Story = StoryObj<typeof LoadingFallback>;

export const Page: Story = {
  render: () => <PageLoadingFallback />,
};

export const Modal: Story = {
  render: () => <ModalLoadingFallback />,
};

export const Component: Story = {
  render: () => (
    <div className="p-8">
      <ComponentLoadingFallback />
    </div>
  ),
};

export const ComponentWithMessage: Story = {
  render: () => (
    <div className="p-8">
      <ComponentLoadingFallback message="Загрузка данных..." />
    </div>
  ),
};

export const Default: Story = {
  render: () => <LoadingFallback />,
};

export const AllTypes: Story = {
  render: () => (
    <div className="space-y-8 p-8">
      <div>
        <h3 className="text-white mb-4">Page Loading</h3>
        <div className="h-64 border border-white/10 rounded-lg overflow-hidden">
          <PageLoadingFallback />
        </div>
      </div>
      <div>
        <h3 className="text-white mb-4">Modal Loading</h3>
        <div className="h-64 border border-white/10 rounded-lg overflow-hidden relative">
          <ModalLoadingFallback />
        </div>
      </div>
      <div>
        <h3 className="text-white mb-4">Component Loading</h3>
        <ComponentLoadingFallback />
      </div>
    </div>
  ),
};

