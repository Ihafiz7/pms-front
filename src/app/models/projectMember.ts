import { ProjectRole, User } from "./models";

export interface ProjectMemberResponseDTO {
  memberId: number;
  projectId: number;
  userId: number;
  role: ProjectRole;
  user: User;
  addedAt: string;
}

export interface ProjectSummaryDTO {
  id: number;
  name: string;
  description: string;
  createdBy: number;
  createdAt: string;
}

// export interface User {
//   userId: number;
//   email: string;
//   firstName: string;
//   lastName: string;
//   role: string;
//   isActive: boolean;
//   createdAt: string;
// }

// export enum ProjectRole {
//   OWNER = 'OWNER',
//   ADMIN = 'ADMIN',
//   MEMBER = 'MEMBER'
// }

export interface AddMembersRequest {
  userIds: number[];
  role: ProjectRole;
}

export interface ErrorResponse {
  error: string;
  message: string;
  timestamp: number;
}

export interface SuccessResponse {
  message: string;
  timestamp: number;
}
