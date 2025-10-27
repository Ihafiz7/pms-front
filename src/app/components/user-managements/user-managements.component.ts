import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Route } from '@angular/router';
import { catchError, of, forkJoin, takeUntil, Subject } from 'rxjs';
import { Project, ProjectRole, User } from 'src/app/models/models';
import { ProjectMemberResponseDTO } from 'src/app/models/projectMember';
import { AuthService } from 'src/app/services/auth.service';
import { ProjectMemberService } from 'src/app/services/project-member.service';
import { ProjectService } from 'src/app/services/project.service';
import { UserService } from 'src/app/services/user.service';

export interface SafeProject extends Project {
  members: ProjectMemberResponseDTO[];
}

@Component({
  selector: 'app-user-managements',
  templateUrl: './user-managements.component.html',
  styleUrls: ['./user-managements.component.scss']
})
export class UserManagementsComponent implements OnInit {
  projects: SafeProject[] = [];
  allUsers: User[] = [];
  currentUser: User | null = null;
  loading = false;
  ProjectRole = ProjectRole;

  // Modal states
  showAddUserModal = false;
  showEditUserModal = false;
  selectedProject: SafeProject | null = null;
  selectedMember: ProjectMemberResponseDTO | null = null;

  // Forms
  addUserForm: FormGroup;
  editUserForm: FormGroup;

  // Search and filter
  searchTerm = '';
  roleFilter = '';

   // layout
  isSidebarOpen = false;


  constructor(
    private authService: AuthService,
    private userService: UserService,
    private projectService: ProjectService,
    private projectMemberService: ProjectMemberService,
    private fb: FormBuilder,
    private route: ActivatedRoute
  ) {
    this.addUserForm = this.createAddUserForm();
    this.editUserForm = this.createEditUserForm();
  }

  ngOnInit(): void {
    this.loadCurrentUser();
    this.loadAllUsers();
  }
  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  private loadCurrentUser(): void {
    this.authService.currentUser$.subscribe({
      next: (user) => {
        if (user) {
          this.currentUser = user as User;
          this.loadData();
        } else {
          // Ensure profile is loaded if currentUser$ is null
          this.authService.getProfile().subscribe({
            next: (profile) => {
              this.currentUser = profile as User;
              this.loadData();
            },
            error: (err) => {
              console.error('Failed to load profile', err);
            }
          });
        }
      },
      error: (err) => {
        console.error('Error subscribing to currentUser$', err);
      }
    });
  }

  private loadData(): void {
    this.loading = true;

    if (this.isAdmin()) {
      this.loadAllProjects();
    } else {
      this.loadUserProjects();
    }

    // If the current user can manage users then ensure the user list is loaded
    if (this.canManageUsers()) {
      this.loadAllUsers();
    }
  }

  private loadAllProjects(): void {
    this.projectService.getAllProjects().subscribe({
      next: (projects) => this.loadProjectsWithMembers(projects),
      error: (err) => {
        console.error('Error loading projects:', err);
        this.loading = false;
      }
    });
  }

  private loadUserProjects(): void {
    if (!this.currentUser?.userId) {
      console.error('User ID not available for loading user projects');
      this.loading = false;
      return;
    }

    this.projectMemberService.getUserProjects(this.currentUser.userId).subscribe({
      next: (projectSummaries: any[]) => {
        const projectFetches = (projectSummaries || []).map(summary => {
          const projectId = summary?.projectId ?? summary?.id ?? null;
          if (!projectId) {
            return of(null);
          }
          return this.projectService.getProjectById(projectId).pipe(
            catchError(err => {
              console.error('Failed to load project', projectId, err);
              return of(null);
            })
          );
        });

        forkJoin(projectFetches).subscribe({
          next: (projects: (Project | null)[]) => {
            const validProjects = (projects || []).filter(p => !!p) as Project[];
            this.loadProjectsWithMembers(validProjects);
          },
          error: (err) => {
            console.error('Error loading projects', err);
            this.loading = false;
          }
        });
      },
      error: (error) => {
        console.error('Error loading user projects:', error);
        this.loading = false;
      }
    });
  }

  private loadProjectsWithMembers(projects: Project[]): void {
    if (!projects || projects.length === 0) {
      this.projects = [];
      this.loading = false;
      return;
    }

    const membersObservables = projects.map(p =>
      this.projectMemberService.getProjectMembers(p.projectId).pipe(
        catchError(err => {
          console.error(`Failed to load members for project ${p.projectId}`, err);
          return of([] as ProjectMemberResponseDTO[]);
        })
      )
    );

    forkJoin(membersObservables).subscribe({
      next: (memberArrays) => {
        this.projects = projects.map((project, idx) => {
          const members = (memberArrays[idx] || []).map(member => ({
            ...member,
            user: this.ensureUserData(member.user, member.userId),
            role: member.role || ProjectRole.MEMBER,
            memberId: member.memberId || this.generateTempId()
          } as ProjectMemberResponseDTO));

          return {
            ...project,
            members
          } as SafeProject;
        });

        this.loading = false;
      },
      error: (err) => {
        console.error('Error combining project members', err);
        this.loading = false;
      }
    });
  }

  private loadAllUsers(): void {
    this.userService.getAllUsers().subscribe({
      next: (users) => {
        this.allUsers = users || [];
      },
      error: (err) => {
        console.error('Error loading users', err);
      }
    });
  }

  createAddUserForm(): FormGroup {
    return this.fb.group({
      userId: ['', Validators.required],
      role: [ProjectRole.MEMBER, Validators.required]
    });
  }

  createEditUserForm(): FormGroup {
    return this.fb.group({
      role: ['', Validators.required]
    });
  }

  // Role-based access control methods
  isAdmin(): boolean {
    const r = this.currentUser?.role || '';
    return r === 'ADMIN' || r === 'ROLE_ADMIN';
  }

  isManager(): boolean {
    const r = this.currentUser?.role || '';
    return r === 'MANAGER' || r === 'ROLE_MANAGER';
  }

  canManageUsers(): boolean {
    return this.isAdmin() || this.isManager();
  }

  canEditProject(project: SafeProject): boolean {
    const userMember = project.members.find(m => m.userId === this.currentUser?.userId);
    const roleStr = String(userMember?.role || '').toUpperCase();
    return roleStr === String(ProjectRole.ADMIN) || roleStr === String(ProjectRole.MANAGER);
  }

  openAddUserModal(project: SafeProject): void {
    this.selectedProject = project;
    this.addUserForm.reset({ userId: '', role: ProjectRole.MEMBER });
    this.showAddUserModal = true;
  }

  openEditUserModal(project: SafeProject, member: ProjectMemberResponseDTO): void {
    this.selectedProject = project;
    this.selectedMember = member;
    this.editUserForm.reset({ role: member.role });
    this.showEditUserModal = true;
  }

  closeModals(): void {
    this.showAddUserModal = false;
    this.showEditUserModal = false;
    this.selectedProject = null;
    this.selectedMember = null;
  }

  onAddUserSubmit(): void {
    if (!this.addUserForm.valid || !this.selectedProject) return;

    const value = this.addUserForm.value;
    const userId = Number(value.userId);
    const role: ProjectRole = (value.role as ProjectRole) || ProjectRole.MEMBER;

    // Refresh user list if needed
    this.refreshAllUsersIfNeeded();

    // Defensive checks
    if (!userId || !this.selectedProject?.projectId) {
      this.showNotification('error', 'Invalid input', 'Please select a valid user and project.');
      return;
    }

    this.projectMemberService.addMemberToProject(this.selectedProject.projectId, userId, role).subscribe({
      next: (newMember) => {
        // Ensure user object is present
        const safeMember = {
          ...newMember,
          user: this.ensureUserData(newMember.user, newMember.userId),
          role: newMember.role || ProjectRole.MEMBER,
          memberId: newMember.memberId || this.generateTempId()
        } as ProjectMemberResponseDTO;

        // Update local project members
        const projIndex = this.projects.findIndex(p => p.projectId === this.selectedProject!.projectId);
        if (projIndex !== -1) {
          this.projects[projIndex].members.push(safeMember);
        }

        this.closeModals();
        this.showNotification('success', 'User added', `${this.getUserDisplayName(safeMember.user)} added as ${safeMember.role}`);
      },
      error: (err) => {
        console.error('Error adding member', err);
        this.showNotification('error', 'Failed to add user', (err?.error?.message) || 'Please try again');
      }
    });
  }

  onEditUserSubmit(): void {
    if (!this.editUserForm.valid || !this.selectedProject || !this.selectedMember) return;

    const value = this.editUserForm.value;
    const newRole: ProjectRole = (value.role as ProjectRole) || this.selectedMember.role;

    if (!this.selectedProject.projectId || !this.selectedMember.memberId) {
      this.showNotification('error', 'Invalid input', 'Missing project or member information.');
      return;
    }

    this.projectMemberService.updateMemberRole(this.selectedProject.projectId, this.selectedMember.memberId, newRole)
      .subscribe({
        next: (updated) => {
          const projIndex = this.projects.findIndex(p => p.projectId === this.selectedProject!.projectId);
          if (projIndex !== -1) {
            const memIndex = this.projects[projIndex].members.findIndex(m => m.memberId === updated.memberId);
            if (memIndex !== -1) {
              this.projects[projIndex].members[memIndex] = {
                ...updated,
                user: this.ensureUserData(updated.user, updated.userId)
              } as ProjectMemberResponseDTO;
            }
          }
          this.closeModals();
          this.showNotification('success', 'Role updated', `${this.getUserDisplayName(updated.user)} role set to ${updated.role}`);
        },
        error: (err) => {
          console.error('Error updating member role', err);
          this.showNotification('error', 'Failed to update role', (err?.error?.message) || 'Please try again');
        }
      });
  }

  removeUserFromProject(project: SafeProject, memberId: number): void {
    if (!project || !memberId) return;
    if (!confirm('Are you sure you want to remove this user from the project?')) return;

    this.projectMemberService.removeMemberFromProject(project.projectId, memberId).subscribe({
      next: () => {
        // Remove from local state
        const projIndex = this.projects.findIndex(p => p.projectId === project.projectId);
        if (projIndex !== -1) {
          this.projects[projIndex].members = this.projects[projIndex].members.filter(m => m.memberId !== memberId);
        }
        this.showNotification('success', 'User removed', 'User has been removed from the project');
      },
      error: (err) => {
        console.error('Error removing member', err);
        this.showNotification('error', 'Failed to remove user', (err?.error?.message) || 'Please try again');
      }
    });
  }

  // UI helper methods
  getRoleBadgeClass(role: ProjectRole): string {
    if (!role) return 'bg-gray-100 text-gray-800 border border-gray-200';
    switch (role) {
      case ProjectRole.MANAGER: return 'bg-purple-100 text-purple-800 border border-purple-200';
      case ProjectRole.ADMIN: return 'bg-blue-100 text-blue-800 border border-blue-200';
      case ProjectRole.MEMBER: return 'bg-green-100 text-green-800 border border-green-200';
      default: return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  }

  getRoleDisplay(role: ProjectRole | undefined | null): string {
    if (!role) return 'UNKNOWN';

    const roleString = role.toString();
    const displayMap: { [key: string]: string } = {
      'MANAGER': 'Manager',
      'MGR': 'Manager',
      'ADMIN': 'Administrator',
      'ADM': 'Administrator',
      'MEMBER': 'Member',
      'MEM': 'Member'
    };

    return displayMap[roleString] || roleString;
  }

  get filteredProjects(): SafeProject[] {
    const term = this.searchTerm?.toLowerCase() || '';
    return this.projects.filter(project => {
      const matchesSearch = (project.name || '').toLowerCase().includes(term) ||
        (project.description || '').toLowerCase().includes(term);

      if (this.roleFilter) {
        return matchesSearch && project.members.some(m => (m.role || '').toString() === this.roleFilter);
      }
      return matchesSearch;
    });
  }

  getAvailableUsers(project: SafeProject | null): User[] {
    if (!project) return this.allUsers;

    const existingUserIds = new Set(project.members.map(m => m.userId));
    return this.allUsers.filter(user => !existingUserIds.has(user.userId));
  }

  getMemberCount(project: SafeProject): number {
    return project.members?.length || 0;
  }

  showNotification(type: 'success' | 'error', title: string, message: string): void {
    // Replace with your toast/snackbar implementation
    console.log(`${type.toUpperCase()}: ${title} - ${message}`);
  }

  getEmail(user: User | undefined | null): string {
    if (!user) return 'Email not available';
    return user.email || 'No email';
  }

  isMemberEditable(member: ProjectMemberResponseDTO): boolean {
    return !!member && !!member.user;
  }

  getUserDisplayName(user: User | undefined | null): string {
    if (!user) return 'Unknown User';
    const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    return name || user.email || 'Unnamed User';
  }

  getUserInitials(user: User | undefined | null): string {
    if (!user) return '?';
    const first = user.firstName?.charAt(0) || '';
    const last = user.lastName?.charAt(0) || '';
    const initials = (first + last).toUpperCase();
    return initials || (user.email ? user.email.charAt(0).toUpperCase() : 'U');
  }

  canRemoveUser(member: ProjectMemberResponseDTO): boolean {
    if (!member || !member.user) return false;
    return member.userId !== this.currentUser?.userId;
  }

  // Private helper methods
  private ensureUserData(user: any, userId: number): User {
    // If we already have a proper user object, return it
    if (user && user.userId && (user.firstName || user.email)) {
      return user as User;
    }

    // Try to find the user in allUsers
    if (this.allUsers && this.allUsers.length > 0) {
      const foundUser = this.allUsers.find(u => u.userId == userId);
      if (foundUser) {
        return foundUser;
      }
    }

    // If we have partial user data, use it
    if (user && typeof user === 'object') {
      return {
        userId: user.userId || userId,
        firstName: user.firstName || 'Unknown',
        lastName: user.lastName || 'User',
        email: user.email || `user${userId}@unknown.com`,
        role: user.role || 'USER',
        department: user.department,
        isActive: user.isActive !== undefined ? user.isActive : true,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt ? new Date(user.createdAt) : new Date()
      } as User;
    }

    // Final fallback
    return this.createFallbackUser(userId);
  }

  private refreshAllUsersIfNeeded(): void {
    // If allUsers is empty, try to load it again
    if (!this.allUsers || this.allUsers.length === 0) {
      this.loadAllUsers();
    }
  }

  private createFallbackUser(userId: number): User {
    return {
      userId,
      firstName: 'Unknown',
      lastName: 'User',
      email: `user${userId}@unknown.com`,
      role: 'USER',
      isActive: false,
      createdAt: new Date()
    } as User;
  }

  private generateTempId(): number {
    return Math.floor(Math.random() * 1000000) * -1;
  }
}