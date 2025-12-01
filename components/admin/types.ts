import { ApiProjectType, ApiProjectTypeAgent, ApiAdminUser } from '../../services/api';

export interface AdminPageProps {
  onClose: () => void;
  initialAgentId?: string;
  onAgentUpdated?: () => void;
}

export interface SortableAgentItemProps {
  agent: ApiProjectTypeAgent;
  index: number;
}

export interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  variant?: 'danger' | 'warning' | 'info';
}

export interface AlertDialogState {
  isOpen: boolean;
  title?: string;
  message: string;
  variant?: 'success' | 'error' | 'info' | 'warning';
}

export type TabType = 'projectTypes' | 'agents' | 'users';
export type SortBy = 'name' | 'createdAt' | 'projectTypesCount';
export type SortOrder = 'asc' | 'desc';
