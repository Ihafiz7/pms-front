import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Project, User } from 'src/app/models/models';
import { AllocationStatus, ResourceAllocationRequest, ResourceAllocationResponse } from 'src/app/models/resource-allocation.model';
import { ProjectService } from 'src/app/services/project.service';
import { ResourceAllocationService } from 'src/app/services/resource-allocation.service';
import { UserService } from 'src/app/services/user.service';

@Component({
  selector: 'app-resource-allocation',
  templateUrl: './resource-allocation.component.html',
  styleUrls: ['./resource-allocation.component.scss']
})
export class ResourceAllocationComponent implements OnInit {
  allocations: ResourceAllocationResponse[] = [];
  filteredAllocations: ResourceAllocationResponse[] = [];
  allocationForm: FormGroup;
  isEditing = false;
  currentAllocationId?: number;
  isLoading = false;
  searchTerm = '';
  statusFilter = 'ALL';
  showForm = false;

  // Real data from services
  users: User[] = [];
  projects: Project[] = [];
  roles = ['DEVELOPER', 'DESIGNER', 'PROJECT_MANAGER', 'QA_ENGINEER', 'DEVOPS', 'ANALYST', 'ARCHITECT'];
  statuses = Object.values(AllocationStatus);

  constructor(
    private fb: FormBuilder,
    private allocationService: ResourceAllocationService,
    private userService: UserService,
    private projectService: ProjectService
  ) {
    this.allocationForm = this.createForm();
  }

  ngOnInit(): void {
    this.loadInitialData();
  }

  loadInitialData(): void {
    this.isLoading = true;
    
    // Load users, projects, and allocations in parallel
    Promise.all([
      this.loadUsers(),
      this.loadProjects(),
      this.loadAllocations()
    ]).finally(() => {
      this.isLoading = false;
    });
  }

  loadUsers(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.userService.getAllUsers().subscribe({
        next: (users) => {
          this.users = users;
          resolve();
        },
        error: (error) => {
          console.error('Error loading users:', error);
          reject(error);
        }
      });
    });
  }

  loadProjects(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.projectService.getAllProjects().subscribe({
        next: (projects) => {
          this.projects = projects;
          resolve();
        },
        error: (error) => {
          console.error('Error loading projects:', error);
          reject(error);
        }
      });
    });
  }

  loadAllocations(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.allocationService.getAllAllocations().subscribe({
        next: (allocations) => {
          this.allocations = allocations;
          this.filteredAllocations = allocations;
          resolve();
        },
        error: (error) => {
          console.error('Error loading allocations:', error);
          reject(error);
        }
      });
    });
  }

  createForm(): FormGroup {
    return this.fb.group({
      userId: ['', Validators.required],
      projectId: ['', Validators.required],
      allocationPercentage: ['', [Validators.required, Validators.min(0), Validators.max(100)]],
      role: ['', Validators.required],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      notes: [''],
      status: [AllocationStatus.ACTIVE, Validators.required]
    }, { validator: this.dateValidator });
  }

  // Custom validator for date range
  dateValidator(form: FormGroup) {
    const startDate = form.get('startDate')?.value;
    const endDate = form.get('endDate')?.value;
    
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return { dateRange: true };
    }
    return null;
  }

  onSubmit(): void {
    if (this.allocationForm.valid) {
      this.isLoading = true;
      const formData: ResourceAllocationRequest = this.allocationForm.value;
      
      // Convert dates to ISO string format
      formData.startDate = new Date(formData.startDate).toISOString().split('T')[0];
      formData.endDate = new Date(formData.endDate).toISOString().split('T')[0];

      const operation = this.isEditing && this.currentAllocationId
        ? this.allocationService.updateAllocation(this.currentAllocationId, formData)
        : this.allocationService.createAllocation(formData);

      operation.subscribe({
        next: () => {
          this.loadAllocations();
          this.resetForm();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error saving allocation:', error);
          this.isLoading = false;
          // You can add a toast notification here
          alert('Error saving allocation: ' + (error.error?.message || error.message));
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  editAllocation(allocation: ResourceAllocationResponse): void {
    this.isEditing = true;
    this.currentAllocationId = allocation.allocationId;
    
    // Format dates for the form (remove time portion if present)
    const startDate = allocation.startDate.split('T')[0];
    const endDate = allocation.endDate.split('T')[0];

    this.allocationForm.patchValue({
      userId: allocation.userId,
      projectId: allocation.projectId,
      allocationPercentage: allocation.allocationPercentage,
      role: allocation.role,
      startDate: startDate,
      endDate: endDate,
      notes: allocation.notes,
      status: allocation.status
    });
    this.showForm = true;
  }

  deleteAllocation(allocationId: number): void {
    if (confirm('Are you sure you want to delete this allocation?')) {
      this.isLoading = true;
      this.allocationService.deleteAllocation(allocationId).subscribe({
        next: () => {
          this.loadAllocations();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error deleting allocation:', error);
          this.isLoading = false;
          alert('Error deleting allocation: ' + (error.error?.message || error.message));
        }
      });
    }
  }

  resetForm(): void {
    this.allocationForm.reset({
      status: AllocationStatus.ACTIVE
    });
    this.allocationForm.markAsUntouched();
    this.isEditing = false;
    this.currentAllocationId = undefined;
    this.showForm = false;
  }

  filterAllocations(): void {
    this.filteredAllocations = this.allocations.filter(allocation => {
      const matchesSearch = allocation.userName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                          allocation.projectName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                          allocation.role.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      const matchesStatus = this.statusFilter === 'ALL' || allocation.status === this.statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }

  checkAvailability(): void {
    const formValue = this.allocationForm.value;
    if (formValue.userId && formValue.startDate && formValue.endDate && formValue.allocationPercentage) {
      const startDate = new Date(formValue.startDate).toISOString().split('T')[0];
      const endDate = new Date(formValue.endDate).toISOString().split('T')[0];
      
      this.allocationService.checkUserAvailability(
        formValue.userId, 
        startDate, 
        endDate, 
        formValue.allocationPercentage
      ).subscribe({
        next: (conflicts) => {
          if (conflicts.length > 0) {
            const conflictNames = conflicts.map(c => c.projectName).join(', ');
            alert(`Warning: User has overlapping allocations with: ${conflictNames}`);
          } else {
            alert('User is available for this allocation!');
          }
        },
        error: (error) => {
          console.error('Error checking availability:', error);
        }
      });
    }
  }

  // Helper method to mark all form fields as touched
  private markFormGroupTouched(): void {
    Object.keys(this.allocationForm.controls).forEach(key => {
      const control = this.allocationForm.get(key);
      control?.markAsTouched();
    });
  }

  getStatusBadgeClass(status: AllocationStatus): string {
    const classes = {
      [AllocationStatus.ACTIVE]: 'bg-green-100 text-green-800',
      [AllocationStatus.PLANNED]: 'bg-blue-100 text-blue-800',
      [AllocationStatus.COMPLETED]: 'bg-gray-100 text-gray-800',
      [AllocationStatus.CANCELLED]: 'bg-red-100 text-red-800'
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  }

  // Form validation helpers for template
  isFieldInvalid(fieldName: string): boolean {
    const field = this.allocationForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.allocationForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return 'This field is required';
      if (field.errors['min']) return `Minimum value is ${field.errors['min'].min}`;
      if (field.errors['max']) return `Maximum value is ${field.errors['max'].max}`;
    }
    return '';
  }

  isSidebarOpen: boolean = false;


  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

    // Statistics properties
  totalAllocations: number = 0;
  activeAllocations: number = 0;
  averageAllocation: number = 0;
  utilizationRate: number = 0;
   calculateStatistics(): void {
    this.totalAllocations = this.allocations.length;
    this.activeAllocations = this.allocations.filter(a => a.isActive).length;
    
    if (this.allocations.length > 0) {
      this.averageAllocation = Math.round(
        this.allocations.reduce((sum, a) => sum + a.allocationPercentage, 0) / this.allocations.length
      );
      
      this.utilizationRate = Math.round(
        (this.activeAllocations / this.totalAllocations) * 100
      );
    }
  }

  onAllocationsChange(): void {
    this.calculateStatistics();
  }
}