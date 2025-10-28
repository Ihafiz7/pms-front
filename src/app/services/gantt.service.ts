import { Injectable } from '@angular/core';
import { GanttData, GanttTask } from '../models/gantt.model';
import { HttpClient } from '@angular/common/http';
import { catchError, Observable, tap, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GanttService {
private apiUrl = 'http://localhost:8080/pms';

  constructor(private http: HttpClient) { }

  getGanttData(projectId: number): Observable<GanttData> {
    console.log(`Url-----${this.apiUrl}/projects/${projectId}/gantt`);
    
    return this.http.get<GanttData>(`${this.apiUrl}/projects/${projectId}/gantt`)
      .pipe(
        catchError(this.handleError)
      );
  }

  updateTask(taskId: number, task: Partial<GanttTask>): Observable<any> {
    return this.http.put(`${this.apiUrl}/tasks/${taskId}`, task)
      .pipe(
        catchError(this.handleError)
      );
  }

  createTask(projectId: number, task: Omit<GanttTask, 'taskId'>): Observable<GanttTask> {
    return this.http.post<GanttTask>(`${this.apiUrl}/tasks`, { ...task, projectId })
      .pipe(
        catchError(this.handleError)
      );
  }

  deleteTask(taskId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/tasks/${taskId}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  private handleError(error: any): Observable<never> {
    console.error('API Error:', error);
    return throwError(() => new Error(error.message || 'Server error'));
  }
}
