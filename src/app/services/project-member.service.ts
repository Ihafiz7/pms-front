import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, from, map, Observable, of, switchMap } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ProjectRole, ProjectSummaryDTO } from '../models/models';
import { ProjectMemberResponseDTO, AddMembersRequest, SuccessResponse } from '../models/projectMember';
import { UserService } from './user.service';

@Injectable({
  providedIn: 'root'
})
export class ProjectMemberService {
  private apiUrl = `${environment.apiUrl}/projectMembers`;

  constructor(private http: HttpClient, private userService: UserService) { }

  // Add a member to a project
  addMemberToProject(projectId: number, userId: number, role: ProjectRole): Observable<ProjectMemberResponseDTO> {
    const params = new HttpParams()
      .set('projectId', projectId.toString())
      .set('userId', userId.toString())
      .set('role', role);

    return this.http.post<ProjectMemberResponseDTO>(this.apiUrl, null, { params });
  }

  // Add multiple members to a project
  addMembersToProject(projectId: number, request: AddMembersRequest): Observable<ProjectMemberResponseDTO[]> {
    return this.http.post<ProjectMemberResponseDTO[]>(`${this.apiUrl}/batch`, request, {
      params: { projectId: projectId.toString() }
    });
  }



  getProjectMembers(projectId: number): Observable<ProjectMemberResponseDTO[]> {
    return this.http.get<ProjectMemberResponseDTO[]>(`${this.apiUrl}/${projectId}`);
  }

  // Update member role
  updateMemberRole(projectId: number, memberId: number, role: ProjectRole): Observable<ProjectMemberResponseDTO> {
    return this.http.put<ProjectMemberResponseDTO>(
      `${this.apiUrl}/${memberId}/role`,
      null,
      {
        params: {
          projectId: projectId.toString(),
          role: role
        }
      }
    );
  }

  // Remove member from project
  removeMemberFromProject(projectId: number, memberId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${memberId}`, {
      params: { projectId: projectId.toString() }
    });
  }

  // Check if user is member of project
  isUserMember(projectId: number, userId: number): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/check`, {
      params: {
        projectId: projectId.toString(),
        userId: userId.toString()
      }
    });
  }

  // Get user's role in project
  getUserRole(projectId: number, userId: number): Observable<ProjectRole> {
    return this.http.get<ProjectRole>(`${this.apiUrl}/user/${userId}/role`, {
      params: { projectId: projectId.toString() }
    });
  }

  // Get member count for project
  getMemberCount(projectId: number): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/count`, {
      params: { projectId: projectId.toString() }
    });
  }

  // Get all projects where user is a member
  getUserProjects(userId: number): Observable<ProjectSummaryDTO[]> {
    return this.http.get<ProjectSummaryDTO[]>(`${this.apiUrl}/user/${userId}/projects`);
  }

  // Get member details by project and user
  getMemberByProjectAndUser(projectId: number, userId: number): Observable<ProjectMemberResponseDTO> {
    return this.http.get<ProjectMemberResponseDTO>(`${this.apiUrl}/user/${userId}`, {
      params: { projectId: projectId.toString() }
    });
  }

  // Transfer project ownership
  transferOwnership(projectId: number, currentOwnerId: number, newOwnerId: number): Observable<SuccessResponse> {
    return this.http.post<SuccessResponse>(`${this.apiUrl}/transfer-ownership`, null, {
      params: {
        projectId: projectId.toString(),
        currentOwnerId: currentOwnerId.toString(),
        newOwnerId: newOwnerId.toString()
      }
    });
  }


}
