import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ProjectSummaryDTO, ProjectStatus } from 'src/app/models/models';
import { UserProfile, AuthService } from 'src/app/services/auth.service';
import { ProjectBoardService } from 'src/app/services/project-board.service';

@Component({
  selector: 'app-project-board',
  templateUrl: './project-board.component.html',
  styleUrls: ['./project-board.component.scss']
})
export class ProjectBoardComponent implements OnInit, OnDestroy {
  projects: ProjectSummaryDTO[] = [];
  currentUser: UserProfile | null = null;
  showCreateForm = false;
  showEditForm = false;
  
  newProject: Partial<ProjectSummaryDTO> = {
    name: '',
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    status: ProjectStatus.PLANNING 
  };

  editingProject: ProjectSummaryDTO | null = null;
  
  isAdmin = false;
  loading = false;
  error = '';
  isUserMenuOpen = false;

  ProjectStatus = ProjectStatus;
  
  private destroy$ = new Subject<void>();

  constructor(
    private projectBoardService: ProjectBoardService,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadCurrentUser();
    this.loadProjects();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCurrentUser(): void {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user) => {
          this.currentUser = user;
          this.isAdmin = this.authService.isAdmin();
        },
        error: (err) => {
          console.error('Failed to fetch user:', err);
          this.error = 'Failed to load user profile';
        }
      });
  }

  loadProjects(): void {
    this.loading = true;
    this.error = '';

    this.projectBoardService.getMyProjects()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (projects) => {
          this.projects = projects;
          this.loading = false;
        },
        error: (error) => {
          console.error('Failed to load projects:', error);
          this.error = error.message || 'Failed to load projects';
          this.loading = false;
        }
      });
  }

  // Create Project Methods
  toggleCreateForm(): void {
    this.showCreateForm = !this.showCreateForm;
    if (this.showCreateForm) {
      this.resetNewProject();
      this.error = '';
    }
  }

  createProject(): void {
    if (!this.isProjectValid(this.newProject)) {
      this.error = 'Please fill in all required fields';
      return;
    }

    this.loading = true;
    this.error = '';

    this.projectBoardService.createProject(this.newProject)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (createdProject) => {
          this.projects.push(createdProject);
          this.loading = false;
          this.showCreateForm = false;
          this.resetNewProject();
        },
        error: (error) => {
          this.error = error.message || 'Failed to create project';
          this.loading = false;
        }
      });
  }

  // Edit Project Methods
  openEditModal(project: ProjectSummaryDTO): void {
    this.editingProject = { ...project };
    this.showEditForm = true;
    this.error = '';
  }

  closeEditModal(): void {
    this.showEditForm = false;
    this.editingProject = null;
    this.error = '';
  }

  updateProject(): void {
    if (!this.editingProject || !this.isProjectValid(this.editingProject)) {
      this.error = 'Please fill in all required fields: Name, Start Date, and End Date';
      return;
    }

    this.loading = true;
    this.error = '';

    const projectToUpdate = {
    name: this.editingProject.name?.trim() || '',
    description: this.editingProject.description || '',
    startDate: this.formatDateForBackend(this.editingProject.startDate),
    endDate: this.formatDateForBackend(this.editingProject.endDate),
    status: this.editingProject.status,
    managerId: this.authService.getUserId() 
  };

  console.log('Sending update data:', projectToUpdate);

    this.projectBoardService.updateProject(this.editingProject.projectId, this.editingProject)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedProject) => {
          const index = this.projects.findIndex(p => p.projectId === updatedProject.projectId);
          if (index !== -1) {
            this.projects[index] = updatedProject;
          }
          this.loading = false;
          this.closeEditModal();
        },
        error: (error) => {
          this.error = error.message || 'Failed to update project';
          this.loading = false;
        }
      });
  }

  
private formatDateForBackend(dateString: string): string {
  if (!dateString) {
    // Provide a default date if null
    return new Date().toISOString().split('T')[0];
  }
  
  // If it's already in YYYY-MM-DD format, return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }
  
  // Convert to YYYY-MM-DD format
  try {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  } catch (e) {
    console.error('Date conversion error:', e);
    return new Date().toISOString().split('T')[0];
  }
}

  // Project Actions
  viewProject(projectId: number): void {
    this.router.navigate(['/kanban', projectId]);
  }

  deleteProject(projectId: number): void {
    if (confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      this.projectBoardService.deleteProject(projectId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.projects = this.projects.filter(p => p.projectId !== projectId);
          },
          error: (error) => {
            this.error = error.message || 'Failed to delete project';
          }
        });
    }
  }

  // Utility Methods
  private isProjectValid(project: Partial<ProjectSummaryDTO>): boolean {
    return !!(project.name && project.name.trim());
  }

  private resetNewProject(): void {
    this.newProject = {
      name: '',
      description: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      status: ProjectStatus.PLANNING
    };
  }

  // Statistics
  getTotalProjects(): number {
    return this.projects.length;
  }

  getActiveProjects(): number {
    return this.projects.filter(p => 
      p.status === ProjectStatus.PLANNING || p.status === ProjectStatus.IN_PROGRESS
    ).length;
  }

  getCompletedProjects(): number {
    return this.projects.filter(p => p.status === ProjectStatus.COMPLETED).length;
  }

  // User Methods
  getUserFullName(): string {
    return this.authService.getFullName();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // Status Helpers
  getStatusBadgeClass(status: ProjectStatus): string {
    switch (status) {
      case ProjectStatus.PLANNING:
        return 'bg-blue-100 text-blue-800';
      case ProjectStatus.IN_PROGRESS:
        return 'bg-yellow-100 text-yellow-800';
      case ProjectStatus.COMPLETED:
        return 'bg-green-100 text-green-800';
      case ProjectStatus.ON_HOLD:
        return 'bg-orange-100 text-orange-800';
      case ProjectStatus.CANCELLED:
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusOptions(): { value: ProjectStatus, label: string }[] {
    return [
      { value: ProjectStatus.PLANNING, label: 'Planning' },
      { value: ProjectStatus.IN_PROGRESS, label: 'In Progress' },
      { value: ProjectStatus.ON_HOLD, label: 'On Hold' },
      { value: ProjectStatus.COMPLETED, label: 'Completed' },
      { value: ProjectStatus.CANCELLED, label: 'Cancelled' }
    ];
  }

  isProjectActive(project: ProjectSummaryDTO): boolean {
    const today = new Date();
    const startDate = new Date(project.startDate);
    const endDate = new Date(project.endDate);
    return today >= startDate && today <= endDate;
  }

  // UI Helpers
  toggleUserMenu(): void {
    this.isUserMenuOpen = !this.isUserMenuOpen;
  }

  closeUserMenu(): void {
    this.isUserMenuOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-dropdown-container')) {
      this.isUserMenuOpen = false;
    }
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}
