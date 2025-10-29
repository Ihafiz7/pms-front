import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';
import { ResourceAllocationRequest, ResourceAllocationResponse, AllocationStatus } from '../models/resource-allocation.model';
import { environment } from 'src/environments/environment';
import { BaseService } from './base.service';

@Injectable({
  providedIn: 'root'
})
export class ResourceAllocationService extends BaseService {

   private baseUrl = `${environment.apiUrl}/resource-allocations`;

  constructor(private http: HttpClient) {
    super();
  }

  createAllocation(request: ResourceAllocationRequest): Observable<ResourceAllocationResponse> {
    return this.http.post<ResourceAllocationResponse>(
      this.baseUrl, 
      request,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(error => this.handleError(error))
    );
  }

  getAllAllocations(): Observable<ResourceAllocationResponse[]> {
    return this.http.get<ResourceAllocationResponse[]>(
      this.baseUrl,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(error => this.handleError(error))
    );
  }

  getAllocationById(allocationId: number): Observable<ResourceAllocationResponse> {
    return this.http.get<ResourceAllocationResponse>(
      `${this.baseUrl}/${allocationId}`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(error => this.handleError(error))
    );
  }

  getByUser(userId: number): Observable<ResourceAllocationResponse[]> {
    return this.http.get<ResourceAllocationResponse[]>(
      `${this.baseUrl}/user/${userId}`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(error => this.handleError(error))
    );
  }

  getActiveByUser(userId: number): Observable<ResourceAllocationResponse[]> {
    return this.http.get<ResourceAllocationResponse[]>(
      `${this.baseUrl}/user/${userId}/active`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(error => this.handleError(error))
    );
  }

  getByProject(projectId: number): Observable<ResourceAllocationResponse[]> {
    return this.http.get<ResourceAllocationResponse[]>(
      `${this.baseUrl}/project/${projectId}`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(error => this.handleError(error))
    );
  }

  getActiveByProject(projectId: number): Observable<ResourceAllocationResponse[]> {
    return this.http.get<ResourceAllocationResponse[]>(
      `${this.baseUrl}/project/${projectId}/active`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(error => this.handleError(error))
    );
  }

  getByStatus(status: AllocationStatus): Observable<ResourceAllocationResponse[]> {
    return this.http.get<ResourceAllocationResponse[]>(
      `${this.baseUrl}/status/${status}`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(error => this.handleError(error))
    );
  }

  updateAllocation(allocationId: number, request: ResourceAllocationRequest): Observable<ResourceAllocationResponse> {
    return this.http.put<ResourceAllocationResponse>(
      `${this.baseUrl}/${allocationId}`,
      request,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(error => this.handleError(error))
    );
  }

  deleteAllocation(allocationId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/${allocationId}`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(error => this.handleError(error))
    );
  }

  checkUserAvailability(userId: number, startDate: string, endDate: string, requiredPercentage: number): Observable<ResourceAllocationResponse[]> {
    let params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate)
      .set('requiredPercentage', requiredPercentage.toString());
    
    return this.http.get<ResourceAllocationResponse[]>(
      `${this.baseUrl}/user/${userId}/availability`,
      { 
        params,
        headers: this.getAuthHeaders()
      }
    ).pipe(
      catchError(error => this.handleError(error))
    );
  }

  getUserAllocationPercentage(userId: number, startDate: string, endDate: string): Observable<number> {
    let params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);
    
    return this.http.get<number>(
      `${this.baseUrl}/user/${userId}/allocation-percentage`,
      { 
        params,
        headers: this.getAuthHeaders()
      }
    ).pipe(
      catchError(error => this.handleError(error))
    );
  }
}
