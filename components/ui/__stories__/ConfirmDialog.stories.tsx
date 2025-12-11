import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { ConfirmDialog } from '../../ConfirmDialog';
import { Button } from '../Button';

const meta: Meta<typeof ConfirmDialog> = {
  title: 'UI/ConfirmDialog',
  component: ConfirmDialog,
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
type Story = StoryObj<typeof ConfirmDialog>;

const ConfirmDialogWrapper = ({ variant, title, message, confirmText, cancelText, isLoading }: { variant: 'danger' | 'warning' | 'info'; title: string; message: string; confirmText?: string; cancelText?: string; isLoading?: boolean }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConfirm = () => {
    if (isLoading) {
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        setIsOpen(false);
      }, 2000);
    } else {
      setIsOpen(false);
    }
  };

  return (
    <div className="p-8">
      <Button onClick={() => setIsOpen(true)}>Открыть {variant}</Button>
      <ConfirmDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onConfirm={handleConfirm}
        variant={variant}
        title={title}
        message={message}
        confirmText={confirmText}
        cancelText={cancelText}
        isLoading={loading}
      />
    </div>
  );
};

export const Danger: Story = {
  render: () => (
    <ConfirmDialogWrapper
      variant="danger"
      title="Удалить проект?"
      message="Проект и все связанные данные будут безвозвратно удалены.\n\nЭто действие нельзя отменить."
      confirmText="Удалить"
      cancelText="Отмена"
    />
  ),
};

export const Warning: Story = {
  render: () => (
    <ConfirmDialogWrapper
      variant="warning"
      title="Очистить историю чата?"
      message="Все сообщения в этом чате будут удалены.\n\nЭто действие нельзя отменить."
      confirmText="Очистить"
      cancelText="Отмена"
    />
  ),
};

export const Info: Story = {
  render: () => (
    <ConfirmDialogWrapper
      variant="info"
      title="Подтвердить действие?"
      message="Вы уверены, что хотите выполнить это действие?"
      confirmText="Подтвердить"
      cancelText="Отмена"
    />
  ),
};

export const WithLoading: Story = {
  render: () => (
    <ConfirmDialogWrapper
      variant="danger"
      title="Удалить проект?"
      message={`Проект и все связанные данные будут безвозвратно удалены.

Это действие нельзя отменить.`}
      confirmText="Удалить"
      cancelText="Отмена"
      isLoading={true}
    />
  ),
};

export const LongMessage: Story = {
  render: () => (
    <ConfirmDialogWrapper
      variant="danger"
      title="Удалить проект?"
      message={`Проект "Мой проект" и все связанные данные (3 агента, все сообщения и файлы) будут безвозвратно удалены.

Это действие нельзя отменить. После удаления восстановление данных будет невозможно.`}
      confirmText="Удалить навсегда"
      cancelText="Отмена"
    />
  ),
};

export const AllVariants: Story = {
  render: () => {
    const [openVariant, setOpenVariant] = useState<'danger' | 'warning' | 'info' | null>(null);

    return (
      <div className="p-8 space-y-4">
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => setOpenVariant('danger')} variant="secondary">
            Danger
          </Button>
          <Button onClick={() => setOpenVariant('warning')} variant="tertiary">
            Warning
          </Button>
          <Button onClick={() => setOpenVariant('info')} variant="ghost">
            Info
          </Button>
        </div>
        {openVariant && (
          <ConfirmDialog
            isOpen={true}
            onClose={() => setOpenVariant(null)}
            onConfirm={() => setOpenVariant(null)}
            variant={openVariant}
            title={`${openVariant} Dialog`}
            message={`Это пример диалога подтверждения с вариантом ${openVariant}.`}
          />
        )}
      </div>
    );
  },
};

