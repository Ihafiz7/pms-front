import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { FileAttachmentRequest } from '../models/FileAttachment.model';
import { AuthService } from './auth.service';
import { OnInit } from '@angular/core';

import { Router } from '@angular/router';
import { Observable, throwError, catchError } from 'rxjs';
import { environment } from 'src/environments/environment';



export interface FileAttachment {
  fileId: number;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  uploaderName: string;
  uploaderId: number;
  projectName?: string;
  projectId?: number;
  taskTitle?: string;
  taskId?: number;
  uploadedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class FileAttachmentService  {
 private apiUrl = `${environment.apiUrl}/file-attachments`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  private handleError(error: any): Observable<never> {
    console.error('API Error:', error);
    
    if (error.status === 401) {
      // Token is invalid/expired - redirect to login
      this.authService.logout();
      window.location.href = '/login'; // Force page reload to clear state
    }
    
    const errorMessage = error.error?.message || error.message || 'An error occurred';
    return throwError(() => new Error(errorMessage));
  }

  // Upload file with actual file content
  uploadFile(file: File, uploaderId: number, projectId?: number, taskId?: number): Observable<FileAttachment> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('uploaderId', uploaderId.toString());
    
    // Only append if they have valid values
    if (projectId != null && !isNaN(projectId)) {
      formData.append('projectId', projectId.toString());
    }
    if (taskId != null && !isNaN(taskId)) {
      formData.append('taskId', taskId.toString());
    }

    const headers = this.authService.getAuthHeadersForUpload();

    return this.http.post<FileAttachment>(`${this.apiUrl}/upload`, formData, { 
      headers: headers
    }).pipe(catchError(this.handleError.bind(this)));
  }

  // Get file as blob for download
  downloadFile(filePath: string): Observable<Blob> {
    const filename = filePath.split('/').pop() || 'download';
    const url = `${this.apiUrl}/files/${filename}`;
    
    return this.http.get(url, {
      headers: this.authService.getAuthHeaders(),
      responseType: 'blob'
    }).pipe(catchError(this.handleError.bind(this)));
  }

  getAllFiles(): Observable<FileAttachment[]> {
    return this.http.get<FileAttachment[]>(this.apiUrl, {
      headers: this.authService.getAuthHeaders()
    }).pipe(catchError(this.handleError.bind(this)));
  }

  getFileById(fileId: number): Observable<FileAttachment> {
    return this.http.get<FileAttachment>(`${this.apiUrl}/${fileId}`, {
      headers: this.authService.getAuthHeaders()
    }).pipe(catchError(this.handleError.bind(this)));
  }

  getFilesByProject(projectId: number): Observable<FileAttachment[]> {
    return this.http.get<FileAttachment[]>(`${this.apiUrl}/project/${projectId}`, {
      headers: this.authService.getAuthHeaders()
    }).pipe(catchError(this.handleError.bind(this)));
  }

  getFilesByTask(taskId: number): Observable<FileAttachment[]> {
    return this.http.get<FileAttachment[]>(`${this.apiUrl}/task/${taskId}`, {
      headers: this.authService.getAuthHeaders()
    }).pipe(catchError(this.handleError.bind(this)));
  }

  getFilesByUser(userId: number): Observable<FileAttachment[]> {
    return this.http.get<FileAttachment[]>(`${this.apiUrl}/user/${userId}`, {
      headers: this.authService.getAuthHeaders()
    }).pipe(catchError(this.handleError.bind(this)));
  }

  searchFiles(keyword: string): Observable<FileAttachment[]> {
    const params = new HttpParams().set('keyword', keyword);
    return this.http.get<FileAttachment[]>(`${this.apiUrl}/search`, {
      params,
      headers: this.authService.getAuthHeaders()
    }).pipe(catchError(this.handleError.bind(this)));
  }

  searchInProject(projectId: number, keyword: string): Observable<FileAttachment[]> {
    const params = new HttpParams().set('keyword', keyword);
    return this.http.get<FileAttachment[]>(`${this.apiUrl}/search/project/${projectId}`, {
      params,
      headers: this.authService.getAuthHeaders()
    }).pipe(catchError(this.handleError.bind(this)));
  }

  deleteFile(fileId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${fileId}`, {
      headers: this.authService.getAuthHeaders()
    }).pipe(catchError(this.handleError.bind(this)));
  }

  getTotalStorageUsed(): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/storage/total`, {
      headers: this.authService.getAuthHeaders()
    }).pipe(catchError(this.handleError.bind(this)));
  }

  getStorageUsedByUser(userId: number): Observable<number> {
    // Validate userId before making the call
    if (!userId || isNaN(userId)) {
      return throwError(() => new Error('Invalid user ID'));
    }
    
    return this.http.get<number>(`${this.apiUrl}/storage/user/${userId}`, {
      headers: this.authService.getAuthHeaders()
    }).pipe(catchError(this.handleError.bind(this)));
  }

  getStorageUsedByProject(projectId: number): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/storage/project/${projectId}`, {
      headers: this.authService.getAuthHeaders()
    }).pipe(catchError(this.handleError.bind(this)));
  }

  // Get file download URL for direct linking
  getFileDownloadUrl(filePath: string): string {
    const filename = filePath.split('/').pop() || filePath;
    return `${this.apiUrl}/files/${filename}`;
  }
}