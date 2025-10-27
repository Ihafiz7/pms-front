import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Project } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private apiUrl = `${environment.apiUrl}/projects`;

  constructor(private http: HttpClient) { }

  // Get all projects (for admin)
  getAllProjects(): Observable<Project[]> {
    return this.http.get<Project[]>(this.apiUrl);
  }

  // Get project by ID
  getProjectById(projectId: number): Observable<Project> {
    return this.http.get<Project>(`${this.apiUrl}/${projectId}`);
  }

  // Create new project
  createProject(project: { name: string; description: string }): Observable<Project> {
    return this.http.post<Project>(this.apiUrl, project);
  }

  // Update project
  updateProject(projectId: number, project: { name: string; description: string }): Observable<Project> {
    return this.http.put<Project>(`${this.apiUrl}/${projectId}`, project);
  }

  // Delete project
  deleteProject(projectId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${projectId}`);
  }
}
