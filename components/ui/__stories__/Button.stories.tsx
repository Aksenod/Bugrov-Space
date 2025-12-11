import type { Meta, StoryObj } from '@storybook/react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '../Button';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  args: {
    children: 'Кнопка',
    variant: 'primary',
    size: 'md',
  },
};

export default meta;

type Story = StoryObj<typeof Button>;

export const Playground: Story = {};

export const Variants: Story = {
  render: (args) => (
    <div className="flex flex-wrap gap-3">
      <Button {...args} variant="primary">
        Primary
      </Button>
      <Button {...args} variant="secondary">
        Secondary
      </Button>
      <Button {...args} variant="tertiary">
        Tertiary
      </Button>
      <Button {...args} variant="ghost">
        Ghost
      </Button>
    </div>
  ),
};

export const Sizes: Story = {
  render: (args) => (
    <div className="flex flex-wrap gap-3 items-center">
      <Button {...args} size="sm">
        Small
      </Button>
      <Button {...args} size="md">
        Medium
      </Button>
      <Button {...args} size="lg">
        Large
      </Button>
    </div>
  ),
};

export const WithIcons: Story = {
  render: (args) => (
    <div className="flex flex-wrap gap-3">
      <Button {...args} leadingIcon={<Sparkles className="w-4 h-4" />}>
        С иконкой
      </Button>
      <Button
        {...args}
        trailingIcon={<ArrowRight className="w-4 h-4" />}
        variant="secondary"
      >
        Справа
      </Button>
    </div>
  ),
};

export const States: Story = {
  render: (args) => (
    <div className="flex flex-wrap gap-3 items-center">
      <Button {...args}>Default</Button>
      <Button {...args} isLoading>
        Загрузка
      </Button>
      <Button {...args} disabled variant="tertiary">
        Disabled
      </Button>
      <Button {...args} fullWidth>
        Full width
      </Button>
    </div>
  ),
};

