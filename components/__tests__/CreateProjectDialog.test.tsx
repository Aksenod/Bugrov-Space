import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreateProjectDialog } from '../CreateProjectDialog';

describe('CreateProjectDialog', () => {
  const mockOnCreate = vi.fn();
  const mockOnClose = vi.fn();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onCreate: mockOnCreate,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when isOpen is false', () => {
    render(<CreateProjectDialog {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByText('Создать проект')).not.toBeInTheDocument();
  });

  it('should render when isOpen is true', () => {
    render(<CreateProjectDialog {...defaultProps} />);
    
    expect(screen.getByText('Создать проект')).toBeInTheDocument();
    expect(screen.getByLabelText(/Название проекта/)).toBeInTheDocument();
  });

  it('should validate empty name', async () => {
    render(<CreateProjectDialog {...defaultProps} />);
    
    const submitButton = screen.getByRole('button', { name: /Создать/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Название проекта обязательно')).toBeInTheDocument();
    });
    
    expect(mockOnCreate).not.toHaveBeenCalled();
  });

  it('should validate name too long', async () => {
    render(<CreateProjectDialog {...defaultProps} />);
    
    const nameInput = screen.getByLabelText(/Название проекта/);
    fireEvent.change(nameInput, { target: { value: 'a'.repeat(51) } });
    
    const submitButton = screen.getByRole('button', { name: /Создать/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Название проекта не может быть длиннее 50 символов/)).toBeInTheDocument();
    });
    
    expect(mockOnCreate).not.toHaveBeenCalled();
  });

  it('should validate description too long', async () => {
    render(<CreateProjectDialog {...defaultProps} />);
    
    const nameInput = screen.getByLabelText(/Название проекта/);
    const descriptionInput = screen.getByLabelText(/Описание/);
    
    fireEvent.change(nameInput, { target: { value: 'Valid Name' } });
    fireEvent.change(descriptionInput, { target: { value: 'a'.repeat(501) } });
    
    const submitButton = screen.getByRole('button', { name: /Создать/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Описание не может быть длиннее 500 символов/)).toBeInTheDocument();
    });
    
    expect(mockOnCreate).not.toHaveBeenCalled();
  });

  it('should show character counters', () => {
    render(<CreateProjectDialog {...defaultProps} />);
    
    const nameInput = screen.getByLabelText(/Название проекта/);
    fireEvent.change(nameInput, { target: { value: 'Test' } });
    
    expect(screen.getByText('4/50')).toBeInTheDocument();
  });

  it('should call onCreate with valid data', async () => {
    mockOnCreate.mockResolvedValue(undefined);
    
    render(<CreateProjectDialog {...defaultProps} />);
    
    const nameInput = screen.getByLabelText(/Название проекта/);
    const descriptionInput = screen.getByLabelText(/Описание/);
    
    fireEvent.change(nameInput, { target: { value: 'New Project' } });
    fireEvent.change(descriptionInput, { target: { value: 'Project description' } });
    
    const submitButton = screen.getByRole('button', { name: /Создать/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockOnCreate).toHaveBeenCalledWith('New Project', 'Project description');
    });
  });

  it('should call onCreate without description', async () => {
    mockOnCreate.mockResolvedValue(undefined);
    
    render(<CreateProjectDialog {...defaultProps} />);
    
    const nameInput = screen.getByLabelText(/Название проекта/);
    fireEvent.change(nameInput, { target: { value: 'New Project' } });
    
    const submitButton = screen.getByRole('button', { name: /Создать/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockOnCreate).toHaveBeenCalledWith('New Project', undefined);
    });
  });

  it('should handle onCreate error', async () => {
    const error = new Error('Failed to create project');
    mockOnCreate.mockRejectedValue(error);
    
    render(<CreateProjectDialog {...defaultProps} />);
    
    const nameInput = screen.getByLabelText(/Название проекта/);
    fireEvent.change(nameInput, { target: { value: 'New Project' } });
    
    const submitButton = screen.getByRole('button', { name: /Создать/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Ошибка при создании проекта/)).toBeInTheDocument();
    });
  });

  it('should call onClose when close button is clicked', () => {
    render(<CreateProjectDialog {...defaultProps} />);
    
    const closeButton = screen.getByRole('button', { name: '' }); // X button
    const closeButtons = screen.getAllByRole('button');
    const xButton = closeButtons.find(btn => btn.querySelector('svg'));
    
    if (xButton) {
      fireEvent.click(xButton);
      expect(mockOnClose).toHaveBeenCalled();
    }
  });

  it('should reset form after successful creation', async () => {
    mockOnCreate.mockResolvedValue(undefined);
    
    render(<CreateProjectDialog {...defaultProps} />);
    
    const nameInput = screen.getByLabelText(/Название проекта/) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'New Project' } });
    
    const submitButton = screen.getByRole('button', { name: /Создать/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockOnCreate).toHaveBeenCalled();
    });
    
    await waitFor(() => {
      expect(nameInput.value).toBe('');
    });
  });

  it('should disable submit button when loading', async () => {
    mockOnCreate.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(<CreateProjectDialog {...defaultProps} />);
    
    const nameInput = screen.getByLabelText(/Название проекта/);
    fireEvent.change(nameInput, { target: { value: 'New Project' } });
    
    const submitButton = screen.getByRole('button', { name: /Создание/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });
  });
});

