import { Injectable } from '@angular/core';
import { HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export abstract class BaseService {
  protected apiUrl = environment.apiUrl;
  protected readonly TOKEN_KEY = 'token'; // Key to store JWT token

  //Get authentication headers with JWT token
  protected getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    if (!token) {
      console.warn('No authentication token found');
    }
    
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  //Get authentication headers for multipart/form-data (file uploads)
  protected getAuthHeadersMultiPart(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
      // Note: Don't set Content-Type for multipart forms
    });
  }

  //Generic error handler for HTTP requests
  protected handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unexpected error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Client Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = this.getServerErrorMessage(error);
    }
    
    console.error('Service Error:', {
      message: errorMessage,
      status: error.status,
      url: error.url,
      details: error.error
    });
    
    return throwError(() => new Error(errorMessage));
  }

  //Extract user-friendly error message from server response
  private getServerErrorMessage(error: HttpErrorResponse): string {
    switch (error.status) {
      case 0:
        return 'Network error: Unable to connect to server. Please check your connection.';
      case 400:
        return error.error?.message || 'Bad request: Please check your input.';
      case 401:
        this.handleUnauthorized();
        return 'Session expired. Please login again.';
      case 403:
        return 'Access denied: You do not have permission for this action.';
      case 404:
        return 'The requested resource was not found.';
      case 409:
        return error.error?.message || 'Conflict: Resource already exists.';
      case 422:
        return error.error?.message || 'Validation error: Please check your input.';
      case 500:
        return 'Server error: Please try again later.';
      case 503:
        return 'Service temporarily unavailable. Please try again later.';
      default:
        return error.error?.message || `Server error: ${error.status} - ${error.message}`;
    }
  }

  //Handle unauthorized access (token expired, invalid, etc.)
  private handleUnauthorized(): void {
    // Clear token and redirect to login
    localStorage.removeItem(this.TOKEN_KEY);
    // Optional: You can inject Router and navigate to login page
    // this.router.navigate(['/login']);
  }

  //Get token from storage - PROTECTED so child classes can access
  public getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  //Build URL with query parameters
  protected buildUrl(endpoint: string, params?: any): string {
    let url = `${this.apiUrl}/${endpoint}`;
    
    if (params) {
      const queryParams = new URLSearchParams();
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          queryParams.append(key, params[key].toString());
        }
      });
      
      const queryString = queryParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }
    
    return url;
  }
}