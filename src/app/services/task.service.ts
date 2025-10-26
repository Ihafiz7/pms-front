import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { TaskRequest, Task, AssignTaskRequest } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class TaskService {

  private baseUrl = 'http://localhost:8080/pms/tasks';

  constructor(private http: HttpClient) { }

  // Task CRUD Operations
  createTask(taskRequest: TaskRequest): Observable<Task> {
    return this.http.post<Task>(this.baseUrl, taskRequest)
      .pipe(catchError(this.handleError));
  }

  getTaskById(id: number): Observable<Task> {
    return this.http.get<Task>(`${this.baseUrl}/${id}`)
      .pipe(catchError(this.handleError));
  }

  getAllTasks(page: number = 0, size: number = 20, sortBy: string = 'createdAt', sortDirection: string = 'desc'): Observable<Task[]> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sortBy', sortBy)
      .set('sortDirection', sortDirection);

    return this.http.get<Task[]>(this.baseUrl, { params })
      .pipe(catchError(this.handleError));
  }

  updateTask(id: number, taskRequest: TaskRequest): Observable<Task> {
    return this.http.put<Task>(`${this.baseUrl}/${id}`, taskRequest)
      .pipe(catchError(this.handleError));
  }

  deleteTask(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`)
      .pipe(catchError(this.handleError));
  }

  // Task Movement Operations
  moveTaskToColumn(taskId: number, columnId: number, position: number = 0): Observable<Task> {
    let params = new HttpParams()
      .set('columnId', columnId.toString())
      .set('position', position.toString());

    return this.http.post<Task>(`${this.baseUrl}/${taskId}/move`, {}, { params })
      .pipe(catchError(this.handleError));
  }

  reorderTaskInColumn(taskId: number, newPosition: number): Observable<Task> {
    return this.http.patch<Task>(`${this.baseUrl}/${taskId}/reorder`, {}, {
      params: { newPosition: newPosition.toString() }
    }).pipe(catchError(this.handleError));
  }

  // Task Assignment
  assignTask(taskId: number, assignRequest: AssignTaskRequest): Observable<Task> {
    return this.http.post<Task>(`${this.baseUrl}/${taskId}/assign`, assignRequest)
      .pipe(catchError(this.handleError));
  }

  // Progress Update
  updateTaskProgress(taskId: number, progress: number): Observable<Task> {
    return this.http.patch<Task>(`${this.baseUrl}/${taskId}/progress`, {}, {
      params: { progress: progress.toString() }
    }).pipe(catchError(this.handleError));
  }

  // Filtering Operations
  getTasksByProject(projectId: number): Observable<Task[]> {
    return this.http.get<Task[]>(`${this.baseUrl}/project/${projectId}`)
      .pipe(catchError(this.handleError));
  }

  getTasksByColumn(columnId: number): Observable<Task[]> {
    return this.http.get<Task[]>(`${this.baseUrl}/column/${columnId}`)
      .pipe(catchError(this.handleError));
  }

  getTasksByAssignee(assigneeId: number): Observable<Task[]> {
    return this.http.get<Task[]>(`${this.baseUrl}/assignee/${assigneeId}`)
      .pipe(catchError(this.handleError));
  }

  getTasksByPriority(priority: string): Observable<Task[]> {
    return this.http.get<Task[]>(`${this.baseUrl}/priority/${priority}`)
      .pipe(catchError(this.handleError));
  }

  getSubtasks(parentTaskId: number): Observable<Task[]> {
    return this.http.get<Task[]>(`${this.baseUrl}/${parentTaskId}/subtasks`)
      .pipe(catchError(this.handleError));
  }

  searchTasksInProject(projectId: number, keyword: string): Observable<Task[]> {
    return this.http.get<Task[]>(`${this.baseUrl}/project/${projectId}/search`, {
      params: { keyword }
    }).pipe(catchError(this.handleError));
  }

  private handleError(error: any): Observable<never> {
    console.error('API Error:', error);
    let errorMessage = 'An error occurred';

    if (error.error instanceof ErrorEvent) {
      errorMessage = error.error.message;
    } else {
      errorMessage = error.error?.message || error.message || error.statusText;
    }

    return throwError(() => new Error(errorMessage));
  }
}
