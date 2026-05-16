export type Role = 'admin' | 'operator';

export interface Category {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  order: number;
  active: boolean;
}

export interface User {
  id: string;
  username: string;
  password: string;
  role: Role;
  fullName?: string;
  phone?: string;
  createdAt: number;
}

export type StageFieldType = 'text' | 'textarea' | 'number' | 'phone' | 'select';

export interface StageField {
  key: string;
  label: string;
  type: StageFieldType;
  required?: boolean;
  options?: string[];
}

export interface Stage {
  id: string;
  name: string;
  color: string;
  order: number;
  fields: StageField[];
}

export type TicketStatus = 'pending' | 'resolved';

export interface TicketHistoryEntry {
  id: string;
  timestamp: number;
  actorId: string;
  actorName?: string;
  action: string;
  stageId?: string;
  note?: string;
}

export interface Ticket {
  id: string;
  trackingNumber: string;
  status: TicketStatus;
  stageId: string;
  categoryId?: string;
  customerName: string;
  customerPhone: string;
  channel?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  resolvedAt?: number;
  assigneeId?: string;
  details: Record<string, string>;
  history: TicketHistoryEntry[];
}

export interface AppDataSnapshot {
  users: User[];
  stages: Stage[];
  tickets: Ticket[];
  categories: Category[];
}
