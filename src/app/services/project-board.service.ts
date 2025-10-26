import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { Project, ProjectSummaryDTO } from '../models/models';
import { AuthService } from './auth.service';
import { BaseService } from './base.service';

@Injectable({
  providedIn: 'root'
})
export class ProjectBoardService extends BaseService {
  private projectEndpoint = 'projects';
  private projectMembersEndpoint = 'projectMembers';

  constructor(private http: HttpClient, private authService: AuthService) {
    super();
  }

  getUserProjects(userId: number): Observable<ProjectSummaryDTO[]> {
    return this.http.get<ProjectSummaryDTO[]>(
      this.buildUrl(`${this.projectMembersEndpoint}/user/${userId}/projects`),
      { headers: this.getAuthHeaders() }
    ).pipe(
      tap(projects => console.log(`Fetched projects for user ${userId}:`, projects)),
      catchError(error => this.handleError(error))
    );
  }

  getMyProjects(): Observable<ProjectSummaryDTO[]> {
    const token = this.authService.getToken();
    if (!token) {
      return throwError(() => new Error('No authentication token found'));
    }

    const userId = this.authService.getUserIdFromToken(token);
    if (userId == null) {
      return throwError(() => new Error('User ID not found in token'));
    }

    return this.http.get<ProjectSummaryDTO[]>(
      this.buildUrl(`${this.projectMembersEndpoint}/user/${userId}/projects`),
      { headers: this.getAuthHeaders() }
    ).pipe(
      tap(projects => console.log('Fetched user projects:', projects)),
      catchError(error => {
        console.error('Error fetching projects:', error);
        return throwError(() => error);
      })
    );
  }

  createProject(project: Partial<ProjectSummaryDTO>): Observable<ProjectSummaryDTO> {
    return this.http.post<ProjectSummaryDTO>(
      this.buildUrl(this.projectEndpoint),
      project,
      { headers: this.getAuthHeaders() }
    ).pipe(
      tap(createdProject => console.log('Created project:', createdProject)),
      catchError(error => this.handleError(error))
    );
  }

  getProjectById(projectId: number): Observable<Project> {
    return this.http.get<Project>(
      this.buildUrl(`${this.projectEndpoint}/${projectId}`),
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(error => this.handleError(error))
    );
  }

  updateProject(projectId: number, project: Partial<ProjectSummaryDTO>): Observable<ProjectSummaryDTO> {
    return this.http.put<ProjectSummaryDTO>(
      this.buildUrl(`${this.projectEndpoint}/${projectId}`),
      project,
      { headers: this.getAuthHeaders() }
    ).pipe(
      tap(updatedProject => console.log('Updated project:', updatedProject)),
      catchError(error => this.handleError(error))
    );
  }

  deleteProject(projectId: number): Observable<void> {
    return this.http.delete<void>(
      this.buildUrl(`${this.projectEndpoint}/${projectId}`),
      { headers: this.getAuthHeaders() }
    ).pipe(
      tap(() => console.log('Deleted project:', projectId)),
      catchError(error => this.handleError(error))
    );
  }

  getProjectsByStatus(status: string): Observable<Project[]> {
    return this.http.get<Project[]>(
      this.buildUrl(`${this.projectEndpoint}/status/${status}`),
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(error => this.handleError(error))
    );
  }

  searchProjects(query: string): Observable<Project[]> {
    return this.http.get<Project[]>(
      this.buildUrl(`${this.projectEndpoint}/search`, { q: query }),
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(error => this.handleError(error))
    );
  }

  
}

