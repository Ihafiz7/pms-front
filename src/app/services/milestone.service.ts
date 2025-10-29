import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { MilestoneRequest, MilestoneResponse, MilestoneStatus } from '../models/milestone.model';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MilestoneService {

  private apiUrl = `${environment.apiUrl}/milestones`;

  constructor(private http: HttpClient) { }

  createMilestone(request: MilestoneRequest): Observable<MilestoneResponse> {
    return this.http.post<MilestoneResponse>(this.apiUrl, request);
  }

  getMilestoneById(id: number): Observable<MilestoneResponse> {
    return this.http.get<MilestoneResponse>(`${this.apiUrl}/${id}`);
  }

  getAllMilestones(): Observable<MilestoneResponse[]> {
    return this.http.get<MilestoneResponse[]>(this.apiUrl);
  }

  updateMilestone(id: number, request: MilestoneRequest): Observable<MilestoneResponse> {
    return this.http.put<MilestoneResponse>(`${this.apiUrl}/${id}`, request);
  }

  deleteMilestone(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getMilestonesByProject(projectId: number): Observable<MilestoneResponse[]> {
    return this.http.get<MilestoneResponse[]>(`${this.apiUrl}/project/${projectId}`);
  }

  getMilestonesByStatus(status: MilestoneStatus): Observable<MilestoneResponse[]> {
    return this.http.get<MilestoneResponse[]>(`${this.apiUrl}/status/${status}`);
  }

  getCriticalMilestones(): Observable<MilestoneResponse[]> {
    return this.http.get<MilestoneResponse[]>(`${this.apiUrl}/critical`);
  }

  getOverdueMilestones(): Observable<MilestoneResponse[]> {
    return this.http.get<MilestoneResponse[]>(`${this.apiUrl}/overdue`);
  }

  achieveMilestone(id: number): Observable<MilestoneResponse> {
    return this.http.patch<MilestoneResponse>(`${this.apiUrl}/${id}/achieve`, {});
  }

  getMilestoneProgress(projectId: number): Observable<MilestoneResponse> {
    return this.http.get<MilestoneResponse>(`${this.apiUrl}/project/${projectId}/progress`);
  }
}
