export interface TeamMemberRequest {
  userIds: number[];
}

export interface TeamRequest {
  name: string;
  description?: string;
  leadId: number;
  memberIds?: number[];
  isActive?: boolean;
}

export interface TeamMemberResponse {
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  department: string;
}

export interface TeamResponse {
  teamId: number;
  name: string;
  description?: string;
  leadId: number;
  leadName: string;
  leadEmail: string;
  isActive: boolean;
  createdAt: string;
  memberCount: number;
  projectCount: number;
  members: TeamMemberResponse[];
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
  isCurrentUser?: boolean;
}