import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError } from 'rxjs';
import { User, UpdateProfileRequest, ChangePasswordRequest } from '../models/models';
import { BaseService } from './base.service';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService extends BaseService {
  private userEndpoint = 'users/active';
  private baseUrl = `${environment.apiUrl}`

  constructor(private http: HttpClient) {
    super();
  }

  //Get all users (admin only)
  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(
      this.buildUrl(this.userEndpoint),
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(error => this.handleError(error))
    );
  }

  getUsersByProject(projectId: number): Observable<User[]> {
    return this.http.get<User[]>(`${this.baseUrl}/users/project/${projectId}`)
      .pipe(catchError(this.handleError));
  }

  //Get user by ID
  getUserById(userId: number): Observable<User> {
    return this.http.get<User>(
      this.buildUrl(`${this.userEndpoint}/${userId}`),
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(error => this.handleError(error))
    );
  }

  //Update user profile
  updateProfile(userId: number, profileData: UpdateProfileRequest): Observable<User> {
    return this.http.put<User>(
      this.buildUrl(`${this.userEndpoint}/${userId}/profile`),
      profileData,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(error => this.handleError(error))
    );
  }

  //Change password
  changePassword(passwordData: ChangePasswordRequest): Observable<void> {
    return this.http.put<void>(
      this.buildUrl(`${this.userEndpoint}/change-password`),
      passwordData,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(error => this.handleError(error))
    );
  }

  //Deactivate user account
  deactivateAccount(): Observable<void> {
    return this.http.put<void>(
      this.buildUrl(`${this.userEndpoint}/deactivate`),
      {},
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(error => this.handleError(error))
    );
  }

  //Search users
  searchUsers(query: string): Observable<User[]> {
    return this.http.get<User[]>(
      this.buildUrl(`${this.userEndpoint}/search`, { q: query }),
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(error => this.handleError(error))
    );
  }

  //Get users by role
  getUsersByRole(role: string): Observable<User[]> {
    return this.http.get<User[]>(
      this.buildUrl(`${this.userEndpoint}/role/${role}`),
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(error => this.handleError(error))
    );
  }
}