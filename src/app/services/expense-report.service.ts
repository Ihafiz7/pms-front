import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ExpenseProjectReport } from '../models/expense-project-report.model';
import { ExpenseStatus, Expense } from '../models/expense.model';

@Injectable({
  providedIn: 'root'
})
export class ExpenseReportService {

  private baseUrl = `${environment.apiUrl}/expenses/reports`;

  constructor(private http: HttpClient) { }

  getExpensesPerProject(): Observable<ExpenseProjectReport[]> {
    return this.http.get<ExpenseProjectReport[]>(`${this.baseUrl}/project-expenses`);
  }

  getFilteredExpensesPerProject(
    startDate?: string,
    endDate?: string,
    status?: ExpenseStatus
  ): Observable<ExpenseProjectReport[]> {
    let params = new HttpParams();

    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    if (status) params = params.set('status', status);

    return this.http.get<ExpenseProjectReport[]>(`${this.baseUrl}/project-expenses/filtered`, { params });
  }

  getDetailedProjectReport(projectId: number): Observable<ExpenseProjectReport> {
    return this.http.get<ExpenseProjectReport>(`${this.baseUrl}/project/${projectId}/detailed`);
  }

  getExpensesByProject(projectId: number): Observable<Expense[]> {
    return this.http.get<Expense[]>(`${this.baseUrl}/project/${projectId}/expenses`);
  }

  exportReport(format: string = 'PDF', startDate?: string, endDate?: string, status?: ExpenseStatus): Observable<Blob> {
    let params = new HttpParams().set('format', format);

    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    if (status) params = params.set('status', status);

    return this.http.get(`${this.baseUrl}/export/project-expenses`, {
      params,
      responseType: 'blob'
    });
  }
}
