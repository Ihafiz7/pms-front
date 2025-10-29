export interface ResourceAllocationRequest {
  userId: number;
  projectId: number;
  allocationPercentage: number;
  role: string;
  startDate: string;
  endDate: string;
  notes?: string;
  status?: AllocationStatus;
}

export enum AllocationStatus {
  ACTIVE = 'ACTIVE',
  PLANNED = 'PLANNED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export interface ResourceAllocationResponse {
  allocationId: number;
  userId: number;
  userName: string;
  userEmail: string;
  projectId: number;
  projectName: string;
  allocationPercentage: number;
  role: string;
  startDate: string;
  endDate: string;
  notes?: string;
  status: AllocationStatus;
  daysRemaining: number;
  isActive: boolean;
  hasOverlap: boolean;
  createdAt: string;
  updatedAt: string;
}