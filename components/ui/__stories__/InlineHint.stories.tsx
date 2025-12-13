import type { Meta, StoryObj } from '@storybook/react';
import { InlineHint } from '../../InlineHint';

const meta: Meta<typeof InlineHint> = {
  title: 'UI/InlineHint',
  component: InlineHint,
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
type Story = StoryObj<typeof InlineHint>;

export const Info: Story = {
  render: () => (
    <InlineHint
      variant="info"
      title="Что такое проект?"
      description="Проект — это рабочее пространство для организации вашей работы с AI-агентами. В каждом проекте есть набор агентов, которые помогут вам с различными задачами."
    />
  ),
};

export const Tip: Story = {
  render: () => (
    <InlineHint
      variant="tip"
      title="Совет"
      description="Вы можете создавать несколько проектов для разных задач. Каждый проект имеет свой набор агентов и документов."
    />
  ),
};

export const Warning: Story = {
  render: () => (
    <InlineHint
      variant="warning"
      title="Внимание"
      description="Удаление проекта приведет к удалению всех связанных данных. Это действие нельзя отменить."
    />
  ),
};

export const WithExamples: Story = {
  render: () => (
    <InlineHint
      variant="info"
      title="Примеры использования"
      description="Вот несколько примеров того, как можно использовать платформу:"
      examples={[
        'Создайте проект для веб-дизайна',
        'Загрузите документы для контекста',
        'Начните диалог с агентом',
      ]}
      onExampleClick={(example) => console.log('Example clicked:', example)}
    />
  ),
};

export const Collapsible: Story = {
  render: () => (
    <InlineHint
      variant="info"
      title="Сворачиваемая подсказка"
      description="Это подсказка, которую можно свернуть или развернуть. Нажмите на стрелку, чтобы изменить состояние."
      collapsible={true}
      defaultExpanded={true}
    />
  ),
};

export const CollapsibleCollapsed: Story = {
  render: () => (
    <InlineHint
      variant="info"
      title="Свернутая подсказка"
      description="Эта подсказка по умолчанию свернута. Нажмите на стрелку, чтобы развернуть."
      collapsible={true}
      defaultExpanded={false}
    />
  ),
};

export const Dismissible: Story = {
  render: () => (
    <InlineHint
      variant="info"
      title="Закрываемая подсказка"
      description="Эта подсказка может быть закрыта. Нажмите на крестик, чтобы скрыть её."
      dismissible={true}
      onDismiss={() => console.log('Dismissed')}
    />
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-4">
      <InlineHint
        variant="info"
        title="Информация"
        description="Это информационное сообщение."
      />
      <InlineHint
        variant="tip"
        title="Совет"
        description="Это полезный совет."
      />
      <InlineHint
        variant="warning"
        title="Внимание"
        description="Это предупреждение."
      />
    </div>
  ),
};


