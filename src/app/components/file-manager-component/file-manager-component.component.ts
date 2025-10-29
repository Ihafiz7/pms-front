import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FileAttachment } from 'src/app/models/FileAttachment.model';
import { AuthService } from 'src/app/services/auth.service';
import { FileAttachmentService } from 'src/app/services/file-attachment.service';

@Component({
  selector: 'app-file-manager-component',
  templateUrl: './file-manager-component.component.html',
  styleUrls: ['./file-manager-component.component.scss']
})
export class FileManagerComponentComponent implements OnInit {
  // State
  files: FileAttachment[] = [];
  filteredFiles: FileAttachment[] = [];
  isLoading = false;
  searchTerm = '';
  currentView: 'grid' | 'list' = 'list';
  isSidebarOpen = false;
  
  // Modals
  showUploadModal = false;
  showDeleteModal = false;
  showFileDetailsModal = false;
  fileToDelete: FileAttachment | null = null;
  selectedFile: FileAttachment | null = null;
  
  // Storage stats
  totalStorage = 0;
  userStorage = 0;
  
  // User info
  currentUserId!: number;
  currentUserName!: string;
  isAdmin = false;
  isAuthenticated = false;

  constructor(
    private fileService: FileAttachmentService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Check authentication first
    this.isAuthenticated = this.authService.isAuthenticated();
    
    if (!this.isAuthenticated) {
      console.warn('User not authenticated, redirecting to login');
      this.router.navigate(['/login']);
      return;
    }

    try {
      const userId = this.authService.getUserId();
      if (userId === null) {
        console.error('User ID is null despite being authenticated');
        this.authService.logout();
        this.router.navigate(['/login']);
        return;
      }
      
      this.currentUserId = userId;
      this.currentUserName = this.authService.getFullName();
      this.isAdmin = this.authService.isAdmin();
      
      this.loadFiles();
      this.loadStorageStats();
    } catch (error) {
      console.error('Failed to initialize file manager:', error);
      this.router.navigate(['/login']);
    }
  }

  closeUploadModal(): void {
    this.showUploadModal = false;
  }

  closeDeleteModal(): void {
    this.fileToDelete = null;
    this.showDeleteModal = false;
  }

  closeFileDetails(): void {
    this.selectedFile = null;
    this.showFileDetailsModal = false;
  }

  loadFiles(): void {
    this.isLoading = true;
    this.fileService.getAllFiles().subscribe({
      next: (files) => {
        this.files = files;
        this.filteredFiles = files;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading files:', error);
        this.isLoading = false;
      }
    });
  }

  loadStorageStats(): void {
    this.fileService.getTotalStorageUsed().subscribe({
      next: (total) => {
        this.totalStorage = total;
      },
      error: (error) => {
        console.error('Error loading total storage:', error);
        this.totalStorage = 0;
      }
    });
    
    if (this.currentUserId) {
      this.fileService.getStorageUsedByUser(this.currentUserId).subscribe({
        next: (userTotal) => {
          this.userStorage = userTotal;
        },
        error: (error) => {
          console.error('Error loading user storage:', error);
          this.userStorage = 0;
        }
      });
    }
  }

  onSearch(): void {
    if (!this.searchTerm.trim()) {
      this.filteredFiles = this.files;
      return;
    }

    this.fileService.searchFiles(this.searchTerm).subscribe(files => {
      this.filteredFiles = files;
    });
  }

  openUploadModal(): void {
    if (!this.isAuthenticated) {
      this.router.navigate(['/login']);
      return;
    }
    this.showUploadModal = true;
  }

  onFileUploaded(): void {
    this.loadFiles();
    this.loadStorageStats();
    this.closeUploadModal(); 
  }

  openFileDetails(file: FileAttachment): void {
    this.selectedFile = file;
    this.showFileDetailsModal = true;
  }

  requestDownload(file: FileAttachment): void {
    this.fileService.downloadFile(file.filePath).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Download error:', error);
        // Fallback: try direct URL
        const downloadUrl = this.fileService.getFileDownloadUrl(file.filePath);
        window.open(downloadUrl, '_blank');
      }
    });
  }

  requestDelete(file: FileAttachment): void {
    this.fileToDelete = file;
    this.showDeleteModal = true;
  }

  confirmDelete(): void {
    if (this.fileToDelete) {
      this.fileService.deleteFile(this.fileToDelete.fileId).subscribe({
        next: () => {
          this.loadFiles();
          this.loadStorageStats();
          this.closeDeleteModal(); 
        },
        error: (error) => {
          console.error('Error deleting file:', error);
          this.closeDeleteModal(); 
        }
      });
    }
  }

  canDeleteFile(file: FileAttachment): boolean {
    return this.isAdmin || file.uploaderId === this.currentUserId;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getFileIcon(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return '📄';
      case 'doc':
      case 'docx':
        return '📝';
      case 'xls':
      case 'xlsx':
        return '📊';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return '🖼️';
      case 'zip':
      case 'rar':
        return '📦';
      default:
        return '📎';
    }
  }

  // Add authentication check method
  checkAuthentication(): boolean {
    this.isAuthenticated = this.authService.isAuthenticated();
    if (!this.isAuthenticated) {
      this.router.navigate(['/login']);
      return false;
    }
    return true;
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }
}