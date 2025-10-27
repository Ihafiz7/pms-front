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
  private apiUrl = `${environment.apiUrl}/project-members`;

  constructor(
    private http: HttpClient,
    private userService: UserService
  ) {}

  /** Add a single member to a project */
  addMemberToProject(
    projectId: number,
    userId: number,
    role: ProjectRole
  ): Observable<ProjectMemberResponseDTO> {
    const params = new HttpParams()
      .set('projectId', projectId)
      .set('userId', userId)
      .set('role', role);

    return this.http.post<ProjectMemberResponseDTO>(this.apiUrl, null, { params });
  }

  /** Add multiple members to a project */
  addMembersToProject(
    projectId: number,
    request: AddMembersRequest
  ): Observable<ProjectMemberResponseDTO[]> {
    const params = new HttpParams().set('projectId', projectId);
    return this.http.post<ProjectMemberResponseDTO[]>(`${this.apiUrl}/batch`, request, { params });
  }

  /** Get all members of a project */
  getProjectMembers(projectId: number): Observable<ProjectMemberResponseDTO[]> {
    return this.http.get<ProjectMemberResponseDTO[]>(`${this.apiUrl}/${projectId}`);
  }

  /** Update a member’s role in the project */
  updateMemberRole(
    projectId: number,
    memberId: number,
    role: ProjectRole
  ): Observable<ProjectMemberResponseDTO> {
    const params = new HttpParams()
      .set('projectId', projectId)
      .set('role', role);

    return this.http.put<ProjectMemberResponseDTO>(`${this.apiUrl}/${memberId}/role`, null, { params });
  }

  /** Remove a member from a project */
  removeMemberFromProject(projectId: number, memberId: number): Observable<void> {
    const params = new HttpParams().set('projectId', projectId);
    return this.http.delete<void>(`${this.apiUrl}/${memberId}`, { params });
  }

  /** Check if a user is part of a project */
  isUserMember(projectId: number, userId: number): Observable<boolean> {
    const params = new HttpParams()
      .set('projectId', projectId)
      .set('userId', userId);

    return this.http.get<boolean>(`${this.apiUrl}/check`, { params });
  }

  /** Get a user’s role in a project */
  getUserRole(projectId: number, userId: number): Observable<ProjectRole> {
    const params = new HttpParams().set('projectId', projectId);
    return this.http.get<ProjectRole>(`${this.apiUrl}/user/${userId}/role`, { params });
  }

  /** Get the number of members in a project */
  getMemberCount(projectId: number): Observable<number> {
    const params = new HttpParams().set('projectId', projectId);
    return this.http.get<number>(`${this.apiUrl}/count`, { params });
  }

  /** Get all projects where a user is a member */
  getUserProjects(userId: number): Observable<ProjectSummaryDTO[]> {
    return this.http.get<ProjectSummaryDTO[]>(`${this.apiUrl}/user/${userId}/projects`);
  }

  /** Get member details for a specific project and user */
  getMemberByProjectAndUser(
    projectId: number,
    userId: number
  ): Observable<ProjectMemberResponseDTO> {
    const params = new HttpParams().set('projectId', projectId);
    return this.http.get<ProjectMemberResponseDTO>(`${this.apiUrl}/user/${userId}`, { params });
  }

  /** Transfer ownership of a project */
  transferOwnership(
    projectId: number,
    currentOwnerId: number,
    newOwnerId: number
  ): Observable<SuccessResponse> {
    const params = new HttpParams()
      .set('projectId', projectId)
      .set('currentOwnerId', currentOwnerId)
      .set('newOwnerId', newOwnerId);

    return this.http.post<SuccessResponse>(`${this.apiUrl}/transfer-ownership`, null, { params });
  }
}
