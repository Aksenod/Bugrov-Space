import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProjectSelector } from '../ProjectSelector';
import { Project } from '../../types';

describe('ProjectSelector', () => {
  const mockProjects: Project[] = [
    {
      id: '1',
      name: 'Project 1',
      description: 'First project',
      agentCount: 2,
    },
    {
      id: '2',
      name: 'Project 2',
      description: 'Second project',
      agentCount: 5,
    },
  ];

  const mockActiveProject: Project = mockProjects[0];

  const defaultProps = {
    projects: mockProjects,
    activeProject: mockActiveProject,
    onSelectProject: vi.fn(),
    onCreateProject: vi.fn(),
    onEditProject: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render active project', () => {
    render(<ProjectSelector {...defaultProps} />);
    
    expect(screen.getByText('Project')).toBeInTheDocument();
    expect(screen.getByText('Project 1')).toBeInTheDocument();
  });

  it('should show "Выберите проект" when no active project', () => {
    render(<ProjectSelector {...defaultProps} activeProject={null} />);
    
    expect(screen.getByText('Выберите проект')).toBeInTheDocument();
  });

  it('should open dropdown when clicked', async () => {
    render(<ProjectSelector {...defaultProps} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('Project 2')).toBeInTheDocument();
    });
  });

  it('should call onSelectProject when project is selected', async () => {
    const onSelectProject = vi.fn();
    render(<ProjectSelector {...defaultProps} onSelectProject={onSelectProject} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('Project 2')).toBeInTheDocument();
    });
    
    const project2Button = screen.getByText('Project 2').closest('button');
    if (project2Button) {
      fireEvent.click(project2Button);
    }
    
    expect(onSelectProject).toHaveBeenCalledWith('2');
  });

  it('should call onCreateProject when create button is clicked', async () => {
    const onCreateProject = vi.fn();
    render(<ProjectSelector {...defaultProps} onCreateProject={onCreateProject} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('Создать проект')).toBeInTheDocument();
    });
    
    const createButton = screen.getByText('Создать проект');
    fireEvent.click(createButton);
    
    expect(onCreateProject).toHaveBeenCalled();
  });

  it('should call onEditProject when edit button is clicked', async () => {
    const onEditProject = vi.fn();
    render(<ProjectSelector {...defaultProps} onEditProject={onEditProject} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('Project 1')).toBeInTheDocument();
    });
    
    // Ищем кнопку редактирования (иконка Edit2)
    const editButtons = screen.getAllByRole('button');
    const editButton = editButtons.find(btn => 
      btn.getAttribute('title') === 'Редактировать проект'
    );
    
    if (editButton) {
      fireEvent.click(editButton);
      expect(onEditProject).toHaveBeenCalledWith(mockActiveProject);
    }
  });

  it('should show "Нет проектов" when projects array is empty', async () => {
    render(<ProjectSelector {...defaultProps} projects={[]} activeProject={null} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('Нет проектов')).toBeInTheDocument();
    });
  });

  it('should display agent count for each project', async () => {
    render(<ProjectSelector {...defaultProps} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('2 агента')).toBeInTheDocument();
      expect(screen.getByText('5 агентов')).toBeInTheDocument();
    });
  });

  it('should close dropdown when clicking outside', async () => {
    render(
      <div>
        <div data-testid="outside">Outside</div>
        <ProjectSelector {...defaultProps} />
      </div>
    );
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('Project 2')).toBeInTheDocument();
    });
    
    const outside = screen.getByTestId('outside');
    fireEvent.mouseDown(outside);
    
    await waitFor(() => {
      expect(screen.queryByText('Project 2')).not.toBeInTheDocument();
    });
  });
});

