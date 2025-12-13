import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { ChatInput } from '../../ChatInput';

const meta: Meta<typeof ChatInput> = {
  title: 'UI/ChatInput',
  component: ChatInput,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'dark',
      values: [{ name: 'dark', value: '#000000' }],
    },
  },
};

export default meta;
type Story = StoryObj<typeof ChatInput>;

export const Default: Story = {
  render: () => {
    const [messages, setMessages] = useState<string[]>([]);
    return (
      <div className="w-full max-w-3xl space-y-4">
        <ChatInput
          onSend={(text) => {
            setMessages([...messages, text]);
            console.log('Sent:', text);
          }}
          disabled={false}
        />
        {messages.length > 0 && (
          <div className="mt-4 p-4 bg-white/5 rounded-lg">
            <p className="text-sm text-white/60 mb-2">Отправленные сообщения:</p>
            <ul className="space-y-1">
              {messages.map((msg, i) => (
                <li key={i} className="text-white/80 text-sm">• {msg}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  },
};

export const Disabled: Story = {
  render: () => (
    <div className="w-full max-w-3xl">
      <ChatInput
        onSend={() => {}}
        disabled={true}
      />
    </div>
  ),
};

export const Loading: Story = {
  render: () => {
    const [isLoading, setIsLoading] = useState(false);
    return (
      <div className="w-full max-w-3xl space-y-4">
        <ChatInput
          onSend={() => {
            setIsLoading(true);
            setTimeout(() => setIsLoading(false), 3000);
          }}
          disabled={false}
          isLoading={isLoading}
          onCancel={() => setIsLoading(false)}
        />
        <p className="text-sm text-white/60">Нажмите отправить, чтобы увидеть состояние загрузки</p>
      </div>
    );
  },
};

export const LongText: Story = {
  render: () => {
    const [messages, setMessages] = useState<string[]>([]);
    return (
      <div className="w-full max-w-3xl space-y-4">
        <ChatInput
          onSend={(text) => {
            setMessages([...messages, text]);
          }}
          disabled={false}
        />
        <div className="p-4 bg-white/5 rounded-lg">
          <p className="text-sm text-white/60 mb-2">Попробуйте ввести длинный текст - поле автоматически расширится:</p>
          <p className="text-xs text-white/40">Введите несколько строк текста, чтобы увидеть авто-высоту</p>
        </div>
      </div>
    );
  },
};


