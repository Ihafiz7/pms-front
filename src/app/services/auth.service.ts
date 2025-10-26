import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { JwtHelperService } from '@auth0/angular-jwt';
import { Observable, BehaviorSubject, tap, catchError } from 'rxjs';
import { BaseService } from './base.service';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role?: string;
}

export interface AuthResponse {
  token: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  userId?: number;
}

export interface UserProfile {
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  department?: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService extends BaseService {
  private currentUserSubject = new BehaviorSubject<UserProfile | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  // Remove TOKEN_KEY from here since it's in BaseService
  private readonly USER_KEY = 'currentUser';

  constructor(
    private http: HttpClient,
    private jwtHelper: JwtHelperService
  ) {
    super();
    this.initializeAuthState();
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/signin`, credentials)
      .pipe(
        tap(response => {
          if (response.token) {
            this.setAuthState(response.token, response);
          }
        }),
        catchError(error => this.handleError(error))
      );
  }

  register(userData: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/signup`, userData)
      .pipe(
        tap(response => {
          if (response.token) {
            this.setAuthState(response.token, response);
          }
        }),
        catchError(error => this.handleError(error))
      );
  }

  getProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.apiUrl}/auth/me`, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(profile => {
        this.currentUserSubject.next(profile);
        this.saveUserToStorage(profile);
      }),
      catchError(error => this.handleError(error))
    );
  }

  refreshToken(): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/refresh`, {}, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(response => {
        if (response.token) {
          this.setAuthState(response.token, response);
        }
      }),
      catchError(error => this.handleError(error))
    );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY); 
    localStorage.removeItem(this.USER_KEY);
    this.currentUserSubject.next(null);
  }

  isAuthenticated(): boolean {
    const token = this.getToken(); // Use inherited getToken()
    if (!token) return false;

    try {
      return !this.jwtHelper.isTokenExpired(token);
    } catch {
      return false;
    }
  }

  getRole(): string | null {
    const user = this.currentUserSubject.value || this.getUserFromToken();
    return user?.role || null;
  }

  isAdmin(): boolean {
    const role = this.getRole();
    return role === 'ROLE_ADMIN' || role === 'ADMIN';
  }

  getFullName(): string {
    const user = this.currentUserSubject.value || this.getUserFromToken();
    return user ? `${user.firstName} ${user.lastName}`.trim() : 'User';
  }

  getUserId(): number | null {
    const user = this.currentUserSubject.value || this.getUserFromToken();
    return user?.userId || null;
  }

  getTokenExpiration(): Date | null {
    const token = this.getToken(); // Use inherited getToken()
    return token ? this.jwtHelper.getTokenExpirationDate(token) : null;
  }

  isTokenExpiringSoon(minutes = 5): boolean {
    const expiration = this.getTokenExpiration();
    if (!expiration) return false;

    const now = new Date();
    const timeUntilExpiration = expiration.getTime() - now.getTime();
    return timeUntilExpiration < (minutes * 60 * 1000);
  }

  private initializeAuthState(): void {
    const token = this.getToken(); // Use inherited getToken()
    if (token && !this.jwtHelper.isTokenExpired(token)) {
      const storedUser = this.getUserFromStorage();
      if (storedUser) {
        this.currentUserSubject.next(storedUser);
      } else {
        this.getProfile().subscribe();
      }
    } else {
      this.logout();
    }
  }

  private setAuthState(token: string, authResponse: AuthResponse): void {
    localStorage.setItem(this.TOKEN_KEY, token); //inherited TOKEN_KEY
    
    const userProfile: UserProfile = {
      userId: authResponse.userId || this.getUserIdFromToken(token),
      email: authResponse.email || this.getEmailFromToken(token),
      firstName: authResponse.firstName || this.getFirstNameFromToken(token),
      lastName: authResponse.lastName || this.getLastNameFromToken(token),
      role: authResponse.role || this.getRoleFromToken(token),
      isActive: true,
      createdAt: new Date()
    };

    this.currentUserSubject.next(userProfile);
    this.saveUserToStorage(userProfile);
  }

  private getUserFromToken(): UserProfile | null {
    const token = this.getToken(); // Use inherited getToken()
    if (!token) return null;

    try {
      const decoded = this.jwtHelper.decodeToken(token);
      return {
        userId: decoded.userId || decoded.sub,
        email: decoded.email || decoded.sub,
        firstName: decoded.firstName,
        lastName: decoded.lastName,
        role: decoded.role || decoded.Role,
        isActive: true,
        createdAt: new Date()
      };
    } catch {
      return null;
    }
  }
  
  getUserIdFromToken(token: string): number {
    if (!token) {
      throw new Error('Token is required to extract userId');
    }

    const decoded: any = this.jwtHelper.decodeToken(token);
    //  console.log('Decoded JWT:', decoded)

    const userId = decoded?.userId;

    if (!userId) {
      throw new Error('User ID not found in JWT payload');
    }

    return Number(userId);
  }

  private getEmailFromToken(token: string): string {
    const decoded = this.jwtHelper.decodeToken(token);
    return decoded.email || decoded.sub;
  }

  private getFirstNameFromToken(token: string): string {
    const decoded = this.jwtHelper.decodeToken(token);
    return decoded.firstName || 'User';
  }

  private getLastNameFromToken(token: string): string {
    const decoded = this.jwtHelper.decodeToken(token);
    return decoded.lastName || '';
  }

  private getRoleFromToken(token: string): string {
    const decoded = this.jwtHelper.decodeToken(token);
    return decoded.role || decoded.Role || 'USER';
  }

  private getUserFromStorage(): UserProfile | null {
    const userStr = localStorage.getItem(this.USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }

  private saveUserToStorage(user: UserProfile): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }
}