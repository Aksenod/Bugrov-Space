import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { AlertDialog } from '../../AlertDialog';
import { Button } from '../Button';

const meta: Meta<typeof AlertDialog> = {
  title: 'UI/AlertDialog',
  component: AlertDialog,
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
type Story = StoryObj<typeof AlertDialog>;

const AlertDialogWrapper = ({ variant, title, message, duration = 0 }: { variant: 'success' | 'error' | 'info' | 'warning'; title?: string; message: string; duration?: number }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="p-8">
      <Button onClick={() => setIsOpen(true)}>Открыть {variant}</Button>
      <AlertDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        variant={variant}
        title={title}
        message={message}
        duration={duration}
      />
    </div>
  );
};

export const Success: Story = {
  render: () => (
    <AlertDialogWrapper
      variant="success"
      title="Успешно!"
      message="Операция выполнена успешно."
    />
  ),
};

export const Error: Story = {
  render: () => (
    <AlertDialogWrapper
      variant="error"
      title="Ошибка"
      message="Произошла ошибка при выполнении операции."
    />
  ),
};

export const Warning: Story = {
  render: () => (
    <AlertDialogWrapper
      variant="warning"
      title="Внимание"
      message="Пожалуйста, проверьте введенные данные."
    />
  ),
};

export const Info: Story = {
  render: () => (
    <AlertDialogWrapper
      variant="info"
      title="Информация"
      message="Это информационное сообщение для пользователя."
    />
  ),
};

export const WithoutTitle: Story = {
  render: () => (
    <AlertDialogWrapper
      variant="info"
      message="Сообщение без заголовка."
    />
  ),
};

export const AutoClose: Story = {
  render: () => (
    <AlertDialogWrapper
      variant="success"
      title="Автозакрытие"
      message="Это сообщение закроется через 3 секунды."
      duration={3000}
    />
  ),
};

export const LongMessage: Story = {
  render: () => (
    <AlertDialogWrapper
      variant="info"
      title="Длинное сообщение"
      message="Это очень длинное сообщение, которое демонстрирует, как компонент обрабатывает многострочный текст. Компонент должен корректно отображать весь текст, даже если он занимает несколько строк."
    />
  ),
};

export const AllVariants: Story = {
  render: () => {
    const [openVariant, setOpenVariant] = useState<'success' | 'error' | 'info' | 'warning' | null>(null);
    const [message, setMessage] = useState('');
    const [title, setTitle] = useState('');

    return (
      <div className="p-8 space-y-4">
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => { setOpenVariant('success'); setTitle('Успешно!'); setMessage('Операция выполнена успешно.'); }}>
            Success
          </Button>
          <Button onClick={() => { setOpenVariant('error'); setTitle('Ошибка'); setMessage('Произошла ошибка.'); }} variant="secondary">
            Error
          </Button>
          <Button onClick={() => { setOpenVariant('warning'); setTitle('Внимание'); setMessage('Проверьте данные.'); }} variant="tertiary">
            Warning
          </Button>
          <Button onClick={() => { setOpenVariant('info'); setTitle('Информация'); setMessage('Информационное сообщение.'); }} variant="ghost">
            Info
          </Button>
        </div>
        {openVariant && (
          <AlertDialog
            isOpen={true}
            onClose={() => setOpenVariant(null)}
            variant={openVariant}
            title={title}
            message={message}
          />
        )}
      </div>
    );
  },
};

