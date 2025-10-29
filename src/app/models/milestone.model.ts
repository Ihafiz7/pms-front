export interface Milestone {
  milestoneId?: number;
  name: string;
  description?: string;
  dueDate: string;
  achievedDate?: string;
  projectId: number;
  projectName?: string;
  isCritical: boolean;
  status: MilestoneStatus;
  createdAt?: string;
  updatedAt?: string;
  isOverdue?: boolean;
  isAchieved?: boolean;
}

export interface MilestoneRequest {
  name: string;
  description?: string;
  dueDate: string;
  achievedDate?: string;
  projectId: number;
  isCritical?: boolean;
  status?: MilestoneStatus;
}

export interface MilestoneResponse {
  milestoneId: number;
  name: string;
  description?: string;
  dueDate: string;
  achievedDate?: string;
  projectId: number;
  projectName: string;
  isCritical: boolean;
  status: MilestoneStatus;
  isOverdue: boolean;
  isAchieved: boolean;
  createdAt: string;
  updatedAt: string;
}

export enum MilestoneStatus {
  PENDING = 'PENDING',
  ACHIEVED = 'ACHIEVED',
  DELAYED = 'DELAYED',
  CANCELLED = 'CANCELLED'
}