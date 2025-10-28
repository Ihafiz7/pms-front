import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FileAttachmentRequest } from 'src/app/models/FileAttachment.model';
import { AuthService } from 'src/app/services/auth.service';
import { FileAttachmentService } from 'src/app/services/file-attachment.service';
import { ProjectService } from 'src/app/services/project.service';
import { TaskService } from 'src/app/services/task.service';

@Component({
  selector: 'app-file-upload-modal',
  templateUrl: './file-upload-modal.component.html',
  styleUrls: ['./file-upload-modal.component.scss']
})
export class FileUploadModalComponent implements OnInit {
  @Output() fileUploaded = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();
  @Input() projectId?: number;
  @Input() taskId?: number;

  selectedFile: File | null = null;
  isUploading = false;
  uploadProgress = 0;
  dragOver = false;
  errorMessage = '';
  currentUserId!: number;

  // Project and Task selection
  projects: any[] = [];
  tasks: any[] = [];
  selectedProjectId?: number;
  selectedTaskId?: number;
  isLoadingProjects = false;
  isLoadingTasks = false;

  constructor(
    private fileService: FileAttachmentService,
    private authService: AuthService,
    private projectService: ProjectService,
    private taskService: TaskService
  ) {}

  ngOnInit(): void {
    const userId = this.authService.getUserId();
    if (userId) {
      this.currentUserId = userId;
      this.loadProjects();
      
      // If projectId is provided, load tasks for that project
      if (this.projectId) {
        this.selectedProjectId = this.projectId;
        this.loadTasksForProject(this.projectId);
      }
      
      // If taskId is provided, set it
      if (this.taskId) {
        this.selectedTaskId = this.taskId;
      }
    } else {
      this.errorMessage = 'User not authenticated. Please log in.';
    }
  }

  loadProjects(): void {
    this.isLoadingProjects = true;
    this.projectService.getAllProjects().subscribe({
      next: (projects) => {
        this.projects = projects;
        this.isLoadingProjects = false;
      },
      error: (error) => {
        console.error('Error loading projects:', error);
        this.isLoadingProjects = false;
        this.errorMessage = 'Failed to load projects';
      }
    });
  }

  loadTasksForProject(projectId: number): void {
    this.isLoadingTasks = true;
    this.taskService.getTasksByProject(projectId).subscribe({
      next: (tasks) => {
        this.tasks = tasks;
        this.isLoadingTasks = false;
      },
      error: (error) => {
        console.error('Error loading tasks:', error);
        this.isLoadingTasks = false;
        this.errorMessage = 'Failed to load tasks';
      }
    });
  }

  onProjectChange(): void {
    this.selectedTaskId = undefined; // Reset task when project changes
    this.tasks = []; // Clear tasks
    
    if (this.selectedProjectId) {
      this.loadTasksForProject(this.selectedProjectId);
    }
  }

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    this.handleFileSelection(file);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = false;
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFileSelection(files[0]);
    }
  }

  private handleFileSelection(file: File): void {
    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      this.errorMessage = 'File size must be less than 10MB';
      return;
    }

    this.selectedFile = file;
    this.errorMessage = '';
  }

  uploadFile(): void {
    if (!this.selectedFile) {
      this.errorMessage = 'Please select a file';
      return;
    }

    if (!this.currentUserId) {
      this.errorMessage = 'User not authenticated';
      return;
    }

    // Use provided inputs or user selection
    const projectId = this.projectId || this.selectedProjectId;
    const taskId = this.taskId || this.selectedTaskId;

    // Validate that at least one context is selected
    if (!projectId && !taskId) {
      this.errorMessage = 'Please select a project or task for this file';
      return;
    }

    this.isUploading = true;
    this.uploadProgress = 0;

    // Simulate progress
    const progressInterval = setInterval(() => {
      this.uploadProgress += 10;
      if (this.uploadProgress >= 90) {
        clearInterval(progressInterval);
      }
    }, 200);

    this.fileService.uploadFile(
      this.selectedFile,
      this.currentUserId,
      projectId,
      taskId
    ).subscribe({
      next: (response) => {
        clearInterval(progressInterval);
        this.uploadProgress = 100;
        
        setTimeout(() => {
          this.isUploading = false;
          this.resetForm();
          this.fileUploaded.emit();
          this.closeModal();
        }, 500);
      },
      error: (error) => {
        clearInterval(progressInterval);
        this.isUploading = false;
        
        if (error.status === 400) {
          this.errorMessage = error.error?.message || 'Invalid request. Please check your file and try again.';
        } else if (error.status === 401) {
          this.errorMessage = 'Authentication failed. Please log in again.';
        } else if (error.status === 413) {
          this.errorMessage = 'File too large. Maximum size is 10MB.';
        } else {
          this.errorMessage = error.error?.message || 'Upload failed. Please try again.';
        }
      }
    });
  }

  removeFile(): void {
    this.selectedFile = null;
    this.errorMessage = '';
  }

  closeModal(): void {
    this.resetForm();
    this.closed.emit();
  }

  private resetForm(): void {
    this.selectedFile = null;
    this.uploadProgress = 0;
    this.errorMessage = '';
    this.dragOver = false;
    
    // Reset selections only if not provided as inputs
    if (!this.projectId) {
      this.selectedProjectId = undefined;
    }
    if (!this.taskId) {
      this.selectedTaskId = undefined;
    }
    
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
      case 'svg':
        return '🖼️';
      case 'zip':
      case 'rar':
      case '7z':
        return '📦';
      case 'mp4':
      case 'avi':
      case 'mov':
        return '🎬';
      case 'mp3':
      case 'wav':
        return '🎵';
      default:
        return '📎';
    }
  }
}