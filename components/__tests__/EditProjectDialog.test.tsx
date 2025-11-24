import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EditProjectDialog } from '../EditProjectDialog';
import { Project } from '../../types';

describe('EditProjectDialog', () => {
  const mockProject: Project = {
    id: '1',
    name: 'Original Project',
    description: 'Original description',
    agentCount: 3,
  };

  const mockOnUpdate = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnClose = vi.fn();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onUpdate: mockOnUpdate,
    onDelete: mockOnDelete,
    project: mockProject,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when isOpen is false', () => {
    render(<EditProjectDialog {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByText('Редактировать проект')).not.toBeInTheDocument();
  });

  it('should not render when project is null', () => {
    render(<EditProjectDialog {...defaultProps} project={null} />);
    
    expect(screen.queryByText('Редактировать проект')).not.toBeInTheDocument();
  });

  it('should render with project data', () => {
    render(<EditProjectDialog {...defaultProps} />);
    
    expect(screen.getByText('Редактировать проект')).toBeInTheDocument();
    
    const nameInput = screen.getByLabelText(/Название проекта/) as HTMLInputElement;
    const descriptionInput = screen.getByLabelText(/Описание/) as HTMLTextAreaElement;
    
    expect(nameInput.value).toBe('Original Project');
    expect(descriptionInput.value).toBe('Original description');
  });

  it('should validate empty name', async () => {
    render(<EditProjectDialog {...defaultProps} />);
    
    const nameInput = screen.getByLabelText(/Название проекта/);
    fireEvent.change(nameInput, { target: { value: '' } });
    
    const submitButton = screen.getByRole('button', { name: /Сохранить/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Название проекта обязательно')).toBeInTheDocument();
    });
    
    expect(mockOnUpdate).not.toHaveBeenCalled();
  });

  it('should validate name too long', async () => {
    render(<EditProjectDialog {...defaultProps} />);
    
    const nameInput = screen.getByLabelText(/Название проекта/);
    fireEvent.change(nameInput, { target: { value: 'a'.repeat(51) } });
    
    const submitButton = screen.getByRole('button', { name: /Сохранить/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Название проекта не может быть длиннее 50 символов/)).toBeInTheDocument();
    });
    
    expect(mockOnUpdate).not.toHaveBeenCalled();
  });

  it('should call onUpdate with updated data', async () => {
    mockOnUpdate.mockResolvedValue(undefined);
    
    render(<EditProjectDialog {...defaultProps} />);
    
    const nameInput = screen.getByLabelText(/Название проекта/);
    fireEvent.change(nameInput, { target: { value: 'Updated Project' } });
    
    const submitButton = screen.getByRole('button', { name: /Сохранить/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith('Updated Project', 'Original description');
    });
  });

  it('should call onUpdate with cleared description', async () => {
    mockOnUpdate.mockResolvedValue(undefined);
    
    render(<EditProjectDialog {...defaultProps} />);
    
    const descriptionInput = screen.getByLabelText(/Описание/);
    fireEvent.change(descriptionInput, { target: { value: '' } });
    
    const submitButton = screen.getByRole('button', { name: /Сохранить/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith('Original Project', undefined);
    });
  });

  it('should call onDelete when delete button is clicked', () => {
    render(<EditProjectDialog {...defaultProps} />);
    
    const deleteButton = screen.getByRole('button', { name: /Удалить проект/i });
    fireEvent.click(deleteButton);
    
    expect(mockOnDelete).toHaveBeenCalled();
  });

  it('should not show delete button when onDelete is not provided', () => {
    render(<EditProjectDialog {...defaultProps} onDelete={undefined} />);
    
    expect(screen.queryByRole('button', { name: /Удалить проект/i })).not.toBeInTheDocument();
  });

  it('should handle onUpdate error', async () => {
    const error = new Error('Failed to update project');
    mockOnUpdate.mockRejectedValue(error);
    
    render(<EditProjectDialog {...defaultProps} />);
    
    const nameInput = screen.getByLabelText(/Название проекта/);
    fireEvent.change(nameInput, { target: { value: 'Updated' } });
    
    const submitButton = screen.getByRole('button', { name: /Сохранить/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Ошибка при обновлении проекта/)).toBeInTheDocument();
    });
  });

  it('should call onClose when close button is clicked', () => {
    render(<EditProjectDialog {...defaultProps} />);
    
    const closeButtons = screen.getAllByRole('button');
    const xButton = closeButtons.find(btn => btn.querySelector('svg'));
    
    if (xButton) {
      fireEvent.click(xButton);
      expect(mockOnClose).toHaveBeenCalled();
    }
  });

  it('should disable buttons when loading', async () => {
    mockOnUpdate.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(<EditProjectDialog {...defaultProps} />);
    
    const nameInput = screen.getByLabelText(/Название проекта/);
    fireEvent.change(nameInput, { target: { value: 'Updated' } });
    
    const submitButton = screen.getByRole('button', { name: /Сохранение/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });
    
    const deleteButton = screen.getByRole('button', { name: /Удалить проект/i });
    expect(deleteButton).toBeDisabled();
  });

  it('should show character counters', () => {
    render(<EditProjectDialog {...defaultProps} />);
    
    const nameInput = screen.getByLabelText(/Название проекта/);
    fireEvent.change(nameInput, { target: { value: 'Test' } });
    
    expect(screen.getByText('4/50')).toBeInTheDocument();
  });
});

