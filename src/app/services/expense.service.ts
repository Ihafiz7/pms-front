import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, Observable, of } from 'rxjs';
import { ExpenseRequest, ExpenseResponse, ExpenseStatus } from '../models/expense.model';

@Injectable({
  providedIn: 'root'
})
export class ExpenseService {

  private apiUrl = 'http://localhost:8080/pms/expenses';

  constructor(private http: HttpClient) { }

  createExpense(expense: ExpenseRequest): Observable<ExpenseResponse> {
    return this.http.post<ExpenseResponse>(this.apiUrl, expense);
  }

  getAllExpenses(): Observable<ExpenseResponse[]> {
    return this.http.get<ExpenseResponse[]>(this.apiUrl);
  }

  getExpenseById(id: number): Observable<ExpenseResponse> {
    return this.http.get<ExpenseResponse>(`${this.apiUrl}/${id}`);
  }

  getExpensesByProject(projectId: number): Observable<ExpenseResponse[]> {
    return this.http.get<ExpenseResponse[]>(`${this.apiUrl}/project/${projectId}`);
  }

  getExpensesByUser(userId: number): Observable<ExpenseResponse[]> {
    return this.http.get<ExpenseResponse[]>(`${this.apiUrl}/user/${userId}`);
  }

  getExpensesByCategory(category: string): Observable<ExpenseResponse[]> {
    return this.http.get<ExpenseResponse[]>(`${this.apiUrl}/category/${category}`);
  }

  getExpensesByStatus(status: ExpenseStatus): Observable<ExpenseResponse[]> {
    return this.http.get<ExpenseResponse[]>(`${this.apiUrl}/status/${status}`);
  }

  getExpensesByDateRange(startDate: string, endDate: string): Observable<ExpenseResponse[]> {
    let params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);
    return this.http.get<ExpenseResponse[]>(`${this.apiUrl}/date-range`, { params });
  }

  updateExpenseStatus(expenseId: number, status: ExpenseStatus): Observable<ExpenseResponse> {
    return this.http.put<ExpenseResponse>(`${this.apiUrl}/${expenseId}/status`, null, {
      params: { status }
    });
  }

  updateExpense(expenseId: number, expense: ExpenseRequest): Observable<ExpenseResponse> {
    return this.http.put<ExpenseResponse>(`${this.apiUrl}/${expenseId}`, expense);
  }

  deleteExpense(expenseId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${expenseId}`);
  }

  getTotalExpensesByProject(projectId: number): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/project/${projectId}/total`);
  }

  getCategories(): Observable<string[]> {
  return this.http.get<string[]>(`${this.apiUrl}/categories`).pipe(
    catchError(error => {
      console.error('Error fetching categories from API:', error);
      return of([]);
    })
  );
  }

}
