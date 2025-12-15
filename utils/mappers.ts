/**
 * Mapper функции для преобразования API типов в типы приложения
 */

import { Agent, Message, Role, LLMModel, UploadedFile, User, Project, ProjectType } from '../types';
import { ApiAgent, ApiFile, ApiMessage, ApiUser, ApiProject, ApiProjectTypeAgent } from '../services/api';
import { pickColor } from './helpers';

/**
 * Преобразует ApiFile в UploadedFile
 */
export const mapFile = (file: ApiFile): UploadedFile => ({
  id: file.id,
  name: file.name,
  type: file.mimeType,
  data: file.content,
  agentId: file.agentId,
  isKnowledgeBase: file.isKnowledgeBase,
  dslContent: file.dslContent,
  verstkaContent: file.verstkaContent,
});

/**
 * Преобразует ApiAgent в Agent
 */
export const mapAgent = (agent: ApiAgent): Agent => {
  return {
    id: agent.id,
    name: agent.name,
    description: agent.description,
    systemInstruction: agent.systemInstruction,
    summaryInstruction: agent.summaryInstruction,
    files: (agent.files ?? []).filter(file => !file.name.startsWith('Summary')).map(mapFile),
    avatarColor: pickColor(agent.id),
    model: (agent.model as LLMModel) || LLMModel.GPT5_MINI,
    role: agent.role,
    order: agent.order ?? 0,
    projectTypeAgentId: agent.projectTypeAgentId,
    isHiddenFromSidebar: agent.isHiddenFromSidebar,
    disableGlobalPrompt: agent.disableGlobalPrompt,
    quickMessages: agent.quickMessages,
  };
};

/**
 * Преобразует ApiMessage в Message
 */
export const mapMessage = (message: ApiMessage): Message => ({
  id: message.id,
  role: message.role === 'USER' ? Role.USER : Role.MODEL,
  text: message.text,
  timestamp: new Date(message.createdAt),
});

/**
 * Преобразует ApiUser в User
 */
export const mapUser = (user: ApiUser): User => ({
  id: user.id,
  username: user.username,
  role: user.role,
  isPaid: (user as any).isPaid,
  subscriptionExpiresAt: (user as any).subscriptionExpiresAt ? new Date((user as any).subscriptionExpiresAt) : null,
  hasFreeAccess: (user as any).hasFreeAccess,
});

/**
 * Преобразует ApiProjectTypeAgent в Agent
 */
export const mapProjectTypeAgent = (agent: ApiProjectTypeAgent): Agent => {
  return {
    id: agent.id,
    name: agent.name,
    description: agent.description,
    systemInstruction: agent.systemInstruction,
    summaryInstruction: agent.summaryInstruction,
    files: [], // Агенты типов проектов не имеют файлов
    avatarColor: pickColor(agent.id),
    model: (agent.model as LLMModel) || LLMModel.GPT5_MINI,
    role: agent.role,
    order: agent.order ?? 0,
    disableGlobalPrompt: agent.disableGlobalPrompt,
    quickMessages: agent.quickMessages,
  };
};

/**
 * Преобразует ApiProject в Project
 */
export const mapProject = (project: ApiProject): Project => ({
  id: project.id,
  name: project.name,
  description: project.description,
  projectTypeId: project.projectTypeId,
  projectType: project.projectType ? {
    id: project.projectType.id,
    name: project.projectType.name,
    createdAt: project.projectType.createdAt,
    updatedAt: project.projectType.updatedAt,
  } : undefined,
  agentCount: project.agentCount,
  createdAt: project.createdAt,
  updatedAt: project.updatedAt,
});

