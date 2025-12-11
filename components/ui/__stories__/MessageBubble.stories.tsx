import type { Meta, StoryObj } from '@storybook/react';
import { MessageBubble } from '../../MessageBubble';
import { Role } from '../../../types';

const meta: Meta<typeof MessageBubble> = {
  title: 'UI/MessageBubble',
  component: MessageBubble,
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
type Story = StoryObj<typeof MessageBubble>;

const createMessage = (role: Role, text: string, isStreaming = false, isError = false) => ({
  id: `msg-${Date.now()}-${Math.random()}`,
  role,
  text,
  timestamp: new Date(),
  isStreaming,
  isError,
});

export const UserMessage: Story = {
  render: () => (
    <MessageBubble
      message={createMessage(Role.USER, 'Привет! Как дела?')}
      onDelete={(id) => console.log('Delete:', id)}
    />
  ),
};

export const BotMessage: Story = {
  render: () => (
    <MessageBubble
      message={createMessage(Role.MODEL, 'Привет! У меня всё отлично, спасибо! Чем могу помочь?')}
      onDelete={(id) => console.log('Delete:', id)}
    />
  ),
};

export const LongBotMessage: Story = {
  render: () => (
    <MessageBubble
      message={createMessage(
        Role.MODEL,
        `Это очень длинное сообщение от бота, которое демонстрирует, как компонент обрабатывает многострочный текст.

Компонент должен корректно отображать весь текст, даже если он занимает несколько строк. Также можно использовать **markdown** для форматирования.

- Списки
- Работают
- Отлично

И даже \`код\` можно вставлять!`
      )}
      onDelete={(id) => console.log('Delete:', id)}
    />
  ),
};

export const StreamingMessage: Story = {
  render: () => (
    <MessageBubble
      message={createMessage(Role.MODEL, '', true)}
      onDelete={(id) => console.log('Delete:', id)}
    />
  ),
};

export const ErrorMessage: Story = {
  render: () => (
    <MessageBubble
      message={createMessage(Role.MODEL, 'Произошла ошибка при обработке запроса.', false, true)}
      onDelete={(id) => console.log('Delete:', id)}
    />
  ),
};

export const WithSaveAction: Story = {
  render: () => (
    <MessageBubble
      message={createMessage(Role.MODEL, 'Это сообщение можно сохранить в документы.')}
      onSaveChat={() => console.log('Save chat')}
    />
  ),
};

export const WithAllActions: Story = {
  render: () => (
    <MessageBubble
      message={createMessage(Role.MODEL, 'Это сообщение со всеми доступными действиями: копирование, сохранение и удаление.')}
      onDelete={(id) => console.log('Delete:', id)}
      onSaveChat={() => console.log('Save chat')}
    />
  ),
};

export const Conversation: Story = {
  render: () => (
    <div className="space-y-4">
      <MessageBubble
        message={createMessage(Role.USER, 'Привет! Расскажи о себе.')}
        onDelete={(id) => console.log('Delete:', id)}
      />
      <MessageBubble
        message={createMessage(Role.MODEL, 'Привет! Я AI-ассистент, готовый помочь с различными задачами. Чем могу быть полезен?')}
        onDelete={(id) => console.log('Delete:', id)}
        onSaveChat={() => console.log('Save chat')}
      />
      <MessageBubble
        message={createMessage(Role.USER, 'Отлично! Спасибо за информацию.')}
        onDelete={(id) => console.log('Delete:', id)}
      />
    </div>
  ),
};

