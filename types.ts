export enum Role {
  USER = 'user',
  MODEL = 'model'
}

export interface Message {
  id: string;
  role: Role;
  text: string;
  timestamp: Date;
  isStreaming?: boolean;
  isError?: boolean;
}

export enum LLMModel {
  GPT51 = 'gpt-5.1',
  GPT5_MINI = 'gpt-5-mini',
  GPT4O_MINI = 'gpt-4o-mini',
  GPT4O = 'gpt-4o'
}

export interface ModelConfig {
  id: LLMModel;
  name: string;
  description: string;
}

export interface UploadedFile {
  id: string;
  name: string;
  type: string;
  data: string; // Base64 string
  agentId?: string;
  dslContent?: string;
  verstkaContent?: string;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  systemInstruction: string;
  summaryInstruction: string; // New field for controlling summary generation
  files: UploadedFile[];
  avatarColor?: string;
  model: LLMModel | string;
  role?: string;
  order: number;
}

export interface User {
  id: string;
  username: string;
}

export const MODELS: ModelConfig[] = [
  {
    id: LLMModel.GPT51,
    name: 'GPT-5.1',
    description: 'Максимальная точность и рассуждение (Deep Reasoning)'
  },
  {
    id: LLMModel.GPT5_MINI,
    name: 'GPT-5 mini',
    description: 'Быстрая и эффективная модель GPT-5'
  }
];