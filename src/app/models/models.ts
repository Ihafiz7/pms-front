import { ProjectMemberResponseDTO } from "./projectMember";

export interface ColumnResponse {
  columnId: number;
  name: string;
  color?: string;
  wipLimit?: number;
  projectId: number;
  displayOrder: number;
  isDefault: boolean;
  tasks?: Task[]; 
}

export interface ColumnRequest {
  name: string;
  color?: string;
  displayOrder?: number;
  isDefault?: boolean;
  projectId: number; 
  wipLimit?: number;
}


export interface KanbanColumn {
  columnId: number;
  name: string;
  displayOrder: number;
  color: string;
  isDefault: boolean;
  wipLimit?: number;
  taskCount?: number;
  tasks?: Task[]; 
}

// models/modal.model.ts
export interface ModalSaveEvent {
  type: 'task' | 'column';
  action: 'create' | 'update';
  payload: any; // TaskRequest | ColumnRequest | any updated object
}

export interface ModalDeleteEvent {
  type: 'task' | 'column';
  id: number;
  columnId?: number; // Required for task deletion
}

export interface ModalPayload {
  columnId?: number;
  task?: Task;
  column?: ColumnResponse;
}

export type ModalMode = 'createTask' | 'editTask' | 'createColumn' | 'editColumn' | null;

// 
export interface Project {
  projectId: number;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  status: ProjectStatus;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: number;
  teamMembers?: ProjectMember[];
  tasks?: ProjectTask[];
}

export interface ProjectMember {
  memberId: number;
  userId: number;
  projectId: number;
  role: ProjectRole;
  joinedAt: string;
  user?: {
    userId: number;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface ProjectTask {
  taskId: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  assignedTo: number;
  projectId: number;
  createdAt: string;
  updatedAt: string;
}

export enum ProjectStatus {
  PLANNING = 'PLANNED',
  IN_PROGRESS = 'IN_PROGRESS',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum ProjectRole {
  MANAGER = 'MANAGER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER'
}

export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  REVIEW = 'REVIEW',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface ProjectResponse {
  projectId: number;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: number;
}

export interface ProjectRequest {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  status: ProjectStatus;
}


export interface TaskRequest {
  title: string;
  description?: string;
  priority: TaskPriority;
  dueDate: string; 
  estimatedHours?: number;
  actualHours?: number;
  progressPercentage?: number;
  dependencies?: string;
  assigneeId: number;
  projectId: number;
  parentTaskId?: number;
  columnId?: number;
  displayOrder?: number;
}

export interface Task {
  taskId: number;
  title: string;
  description?: string;
  priority: TaskPriority;
  dueDate: string;
  estimatedHours?: number;
  actualHours?: number;
  progressPercentage?: number | undefined;
  dependencies?: string;
  assigneeId: number;
  assigneeName: string;
  projectId: number;
  projectName: string;
  parentTaskId?: number;
  parentTaskTitle?: string;
  subtaskCount?: number;
  columnId: number;
  columnName: string;
  column: ColumnResponse; 
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface AssignTaskRequest {
  assigneeId: number;
}

export interface ProjectSummaryDTO {
  projectId: number;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  status: ProjectStatus;
}

export interface User {
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  department?: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  department?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

