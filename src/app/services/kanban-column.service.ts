import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError, tap } from 'rxjs';
import { ColumnResponse, ColumnRequest } from '../models/models';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class KanbanColumnService {

  private baseUrl = `${environment.apiUrl}`;

  constructor(private http: HttpClient) { }

  getColumnsByProject(projectId: number): Observable<ColumnResponse[]> {
    return this.http.get<ColumnResponse[]>(`${this.baseUrl}/projects/${projectId}/columns`)
      .pipe(catchError(this.handleError));
  }

  createColumn(column: ColumnRequest): Observable<ColumnResponse> {
    console.log('Creating column:', column);

    // Create the request body that matches your backend ColumnRequest DTO
    const requestBody = {
      name: column.name,
      color: column.color || '#3b82f6',
      displayOrder: column.displayOrder || 0,
      isDefault: column.isDefault || false
    };

    console.log('Sending column creation request body:', requestBody);

    return this.http.post<ColumnResponse>(
      `${this.baseUrl}/projects/${column.projectId}/columns`,
      requestBody // Send as JSON body
    ).pipe(catchError(this.handleError));
  }

  updateColumn(columnId: number, updateData: { name?: string; color?: string; wipLimit?: number }): Observable<ColumnResponse> {
    console.log('Updating column:', columnId, updateData);
    //  need to modify this method signature to include projectId
    return throwError(() => new Error('Update column method needs projectId. Use updateColumnWithProject instead.'));
  }

  // Update column with projectId
  updateColumnWithProject(projectId: number, columnId: number, updateData: { name?: string; color?: string; wipLimit?: number }): Observable<ColumnResponse> {
    console.log('Updating column:', columnId, 'in project:', projectId, 'with data:', updateData);

    let params = new HttpParams();

    if (updateData.name !== undefined) {
      params = params.set('name', updateData.name);
    }
    if (updateData.color !== undefined) {
      params = params.set('color', updateData.color);
    }
    if (updateData.wipLimit !== undefined) {
      params = params.set('wipLimit', updateData.wipLimit.toString());
    }

    // Use the correct endpoint: /pms/projects/{projectId}/columns/{columnId}
    return this.http.put<ColumnResponse>(
      `${this.baseUrl}/projects/${projectId}/columns/${columnId}`,
      {}, // Empty body since we're using params
      { params }
    ).pipe(catchError(this.handleError));
  }

  deleteColumn(projectId: number, columnId: number, targetColumnId: number): Observable<void> {
    console.log('Deleting column:', columnId, 'moving tasks to:', targetColumnId, 'in project:', projectId);

    // Use the correct endpoint: /pms/projects/{projectId}/columns/{columnId}?targetColumnId={targetColumnId}
    return this.http.delete<void>(
      `${this.baseUrl}/projects/${projectId}/columns/${columnId}`,
      {
        params: { targetColumnId: targetColumnId.toString() }
      }
    ).pipe(catchError(this.handleError));
  }

  reorderColumns(projectId: number, columnIds: number[]): Observable<void> {
    console.log('Reordering columns for project:', projectId, 'order:', columnIds);
    return this.http.put<void>(
      `${this.baseUrl}/projects/${projectId}/columns/reorder`,
      columnIds
    ).pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse) {
    console.error('Column Service Error:', error);

    let errorMessage = 'An unknown error occurred';
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      if (error.error && typeof error.error === 'object' && error.error.message) {
        errorMessage = error.error.message;
      } else if (error.status === 0) {
        errorMessage = 'Unable to connect to server. Please check if the backend is running.';
      } else if (error.status === 400) {
        errorMessage = 'Bad request. Please check the data you are sending.';
      } else if (error.status === 404) {
        errorMessage = 'Resource not found. Please check if the column or project exists.';
      } else if (error.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      } else {
        errorMessage = `Error: ${error.status} - ${error.message}`;
      }
    }

    return throwError(() => new Error(errorMessage));
  }
}
