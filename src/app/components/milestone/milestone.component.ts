import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MilestoneResponse, MilestoneStatus, MilestoneRequest } from 'src/app/models/milestone.model';
import { Project } from 'src/app/models/models';
import { DialogService } from 'src/app/services/dialog.service';
import { MilestoneService } from 'src/app/services/milestone.service';
import { ProjectService } from 'src/app/services/project.service';

type ViewMode = 'grid' | 'list';

@Component({
  selector: 'app-milestone',
  templateUrl: './milestone.component.html',
  styleUrls: ['./milestone.component.scss']
})
export class MilestoneComponent implements OnInit {
  milestones: MilestoneResponse[] = [];
  filteredMilestones: MilestoneResponse[] = [];
  projects: Project[] = [];
  selectedMilestone: MilestoneResponse | null = null;
  showForm = false;
  isEditing = false;
  loading = false;
  projectsLoading = false;
  searchTerm = '';
  statusFilter = '';
  projectFilter = '';
  viewMode: ViewMode = 'list';

  milestoneForm: FormGroup;
  statusOptions = Object.values(MilestoneStatus);

  constructor(
    private milestoneService: MilestoneService,
    private projectService: ProjectService,
    private dialogService: DialogService,
    private fb: FormBuilder
  ) {
    this.milestoneForm = this.createForm();
  }

  ngOnInit(): void {
    this.loadProjects();
    this.loadMilestones();
  }

  createForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      description: [''],
      dueDate: ['', Validators.required],
      achievedDate: [''],
      projectId: ['', Validators.required],
      isCritical: [false],
      status: [MilestoneStatus.PENDING]
    });
  }

  loadProjects(): void {
    this.projectsLoading = true;
    this.projectService.getAllProjects().subscribe({
      next: (projects) => {
        this.projects = projects;
        this.projectsLoading = false;
      },
      error: (error) => {
        console.error('Error loading projects:', error);
        this.projectsLoading = false;
        this.dialogService.error('Failed to load projects. Please try again.');
      }
    });
  }

  loadMilestones(): void {
    this.loading = true;
    this.milestoneService.getAllMilestones().subscribe({
      next: (milestones) => {
        this.milestones = milestones;
        this.filteredMilestones = milestones;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading milestones:', error);
        this.loading = false;
        this.dialogService.error('Failed to load milestones. Please try again.');
      }
    });
  }

  getProjectName(projectId: number): string {
    const project = this.projects.find(p => p.projectId === projectId);
    return project ? project.name : 'Unknown Project';
  }

  applyFilters(): void {
    this.filteredMilestones = this.milestones.filter(milestone => {
      const matchesSearch = milestone.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                           milestone.description?.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchesStatus = !this.statusFilter || milestone.status === this.statusFilter;
      const matchesProject = !this.projectFilter || milestone.projectId.toString() === this.projectFilter;
      
      return matchesSearch && matchesStatus && matchesProject;
    });
  }

  setViewMode(mode: ViewMode): void {
    this.viewMode = mode;
  }

  onCreate(): void {
    if (this.projects.length === 0) {
      this.dialogService.warning('No projects available. Please create a project first.');
      return;
    }
    
    this.showForm = true;
    this.isEditing = false;
    this.selectedMilestone = null;
    this.milestoneForm.reset({
      projectId: this.projects[0].projectId,
      isCritical: false,
      status: MilestoneStatus.PENDING
    });
  }

  onEdit(milestone: MilestoneResponse): void {
    this.showForm = true;
    this.isEditing = true;
    this.selectedMilestone = milestone;
    
    this.milestoneForm.patchValue({
      name: milestone.name,
      description: milestone.description,
      dueDate: milestone.dueDate,
      achievedDate: milestone.achievedDate,
      projectId: milestone.projectId,
      isCritical: milestone.isCritical,
      status: milestone.status
    });
  }

  onSubmit(): void {
    if (this.milestoneForm.valid) {
      const formValue: MilestoneRequest = this.milestoneForm.value;
      
      if (this.isEditing && this.selectedMilestone) {
        this.milestoneService.updateMilestone(this.selectedMilestone.milestoneId, formValue).subscribe({
          next: () => {
            this.loadMilestones();
            this.resetForm();
            this.dialogService.success('Milestone updated successfully!');
          },
          error: (error) => {
            console.error('Error updating milestone:', error);
            this.dialogService.error('Failed to update milestone. Please try again.');
          }
        });
      } else {
        this.milestoneService.createMilestone(formValue).subscribe({
          next: () => {
            this.loadMilestones();
            this.resetForm();
            this.dialogService.success('Milestone created successfully!');
          },
          error: (error) => {
            console.error('Error creating milestone:', error);
            this.dialogService.error('Failed to create milestone. Please try again.');
          }
        });
      }
    }
  }

  onDelete(id: number): void {
    this.dialogService.confirm(
      'Are you sure you want to delete this milestone? This action cannot be undone.',
      'Delete Milestone?',
      'Yes, Delete It',
      'Cancel'
    ).then((result) => {
      if (result.isConfirmed) {
        this.milestoneService.deleteMilestone(id).subscribe({
          next: () => {
            this.loadMilestones();
            this.dialogService.success('Milestone deleted successfully!');
          },
          error: (error) => {
            console.error('Error deleting milestone:', error);
            this.dialogService.error('Failed to delete milestone. Please try again.');
          }
        });
      }
    });
  }

  onAchieve(milestone: MilestoneResponse): void {
    this.dialogService.confirm(
      `Mark "${milestone.name}" as achieved?`,
      'Achieve Milestone?',
      'Yes, Mark Achieved',
      'Cancel'
    ).then((result) => {
      if (result.isConfirmed) {
        this.milestoneService.achieveMilestone(milestone.milestoneId).subscribe({
          next: () => {
            this.loadMilestones();
            this.dialogService.success('Milestone marked as achieved!');
          },
          error: (error) => {
            console.error('Error marking milestone as achieved:', error);
            this.dialogService.error('Failed to mark milestone as achieved. Please try again.');
          }
        });
      }
    });
  }

  resetForm(): void {
    this.showForm = false;
    this.isEditing = false;
    this.selectedMilestone = null;
    this.milestoneForm.reset({
      isCritical: false,
      status: MilestoneStatus.PENDING
    });
  }

  // getStatusBadgeClass(status: MilestoneStatus): string {
  //   const baseClasses = 'px-2 py-1 rounded-full text-xs font-semibold';
    
  //   switch (status) {
  //     case MilestoneStatus.ACHIEVED:
  //       return `${baseClasses} bg-green-100 text-green-800`;
  //     case MilestoneStatus.DELAYED:
  //       return `${baseClasses} bg-red-100 text-red-800`;
  //     case MilestoneStatus.CANCELLED:
  //       return `${baseClasses} bg-gray-100 text-gray-800`;
  //     default:
  //       return `${baseClasses} bg-yellow-100 text-yellow-800`;
  //   }
  // }

  getPriorityBadgeClass(isCritical: boolean): string {
    return isCritical 
      ? 'px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800'
      : 'px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800';
  }

  isOverdue(milestone: MilestoneResponse): boolean {
    return milestone.isOverdue && milestone.status !== MilestoneStatus.ACHIEVED;
  }

  getDaysRemaining(dueDate: string): number {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getDaysRemainingClass(days: number): string {
    if (days < 0) return 'text-red-600 bg-red-50';
    if (days <= 3) return 'text-orange-600 bg-orange-50';
    if (days <= 7) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  }

  isSidebarOpen: boolean = false;
  
  // Statistics properties
  totalMilestones: number = 0;
  achievedMilestones: number = 0;
  criticalMilestones: number = 0;
  overdueMilestones: number = 0;

  // ... your existing properties ...

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  // Method to calculate statistics
  calculateStatistics(): void {
    this.totalMilestones = this.milestones.length;
    this.achievedMilestones = this.milestones.filter(m => m.status === 'ACHIEVED').length;
    this.criticalMilestones = this.milestones.filter(m => m.isCritical).length;
    this.overdueMilestones = this.milestones.filter(m => this.isOverdue(m)).length;
  }

  // Call this method when milestones data changes
  onMilestonesChange(): void {
    this.calculateStatistics();
  }

  // Update the getStatusBadgeClass method to use orange colors
  getStatusBadgeClass(status: string): string {
    const baseClasses = 'inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium';
    
    switch (status) {
      case 'ACHIEVED':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'PENDING':
        return `${baseClasses} bg-orange-100 text-orange-800`;
      case 'DELAYED':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'CANCELLED':
        return `${baseClasses} bg-gray-100 text-gray-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  }
}