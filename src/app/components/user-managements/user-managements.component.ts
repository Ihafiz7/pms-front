import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Project, User } from 'src/app/models/models';
import { ProjectMemberResponseDTO, ProjectRole } from 'src/app/models/projectMember';
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
  currentUser: User | null = null;  // Use User interface
  loading = false;

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

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private projectService: ProjectService,
    private projectMemberService: ProjectMemberService,
    private fb: FormBuilder
  ) {
    this.addUserForm = this.createAddUserForm();
    this.editUserForm = this.createEditUserForm();
  }

  ngOnInit(): void {
    this.loadCurrentUser();
    this.loadAllUsers();
  }

  loadCurrentUser(): void {
    this.authService.currentUser$.subscribe({
      next: (user) => {
        console.log('Current user received:', user);
        this.currentUser = user as User; // Cast to User interface

        if (user && user.userId) {  // Use userId instead of id
          console.log('User ID available:', user.userId);
          this.loadData();
        } else {
          console.log('User or user ID not available, fetching profile...');
          this.authService.getProfile().subscribe({
            next: (profile) => {
              console.log('Profile loaded:', profile);
              this.currentUser = profile as User;
              this.loadData();
            },
            error: (error) => {
              console.error('Error loading profile:', error);
              this.loading = false;
            }
          });
        }
      },
      error: (error) => {
        console.error('Error in currentUser$ subscription:', error);
        this.loading = false;
      }
    });
  }

  loadData(): void {
    this.loading = true;

    if (this.isAdmin()) {
      this.loadAllProjects();
    } else {
      this.loadUserProjects();
    }

    if (this.canManageUsers()) {
      this.loadAllUsers();
    }
  }

  loadAllProjects(): void {
    this.projectService.getAllProjects().subscribe({
      next: (projects) => {
        this.loadProjectsWithMembers(projects);
      },
      error: (error) => {
        console.error('Error loading projects:', error);
        this.loading = false;
      }
    });
  }

  loadUserProjects(): void {
    // Use userId instead of id
    if (!this.currentUser?.userId) {
      console.error('User ID is not available');
      this.loading = false;
      return;
    }

    console.log('Loading projects for user ID:', this.currentUser.userId);

    this.projectMemberService.getUserProjects(this.currentUser.userId).subscribe({
      next: (projectSummaries) => {
        console.log('User projects loaded:', projectSummaries);
        const projectPromises = projectSummaries.map(summary =>
          this.projectService.getProjectById(summary.projectId).toPromise()
        );

        Promise.all(projectPromises).then(projects => {
          const validProjects = projects.filter(p => p !== undefined) as Project[];
          this.loadProjectsWithMembers(validProjects);
        });
      },
      error: (error) => {
        console.error('Error loading user projects:', error);
        this.loading = false;
      }
    });
  }

  loadProjectsWithMembers(projects: Project[]): void {
    const memberPromises = projects.map(project =>
      this.projectMemberService.getProjectMembers(project.projectId).toPromise()
    );

    Promise.all(memberPromises).then(memberArrays => {
      // Convert to SafeProject with guaranteed members array and safe user data
      this.projects = projects.map((project, index) => {
        const members = (memberArrays[index] || []).map(member => {
          // Ensure member has all required properties
          const safeMember: ProjectMemberResponseDTO = {
            ...member,
            user: this.ensureUserData(member.user, member.userId),
            role: member.role || ProjectRole.MEMBER,
            memberId: member.memberId || this.generateTempId()
          };
          return safeMember;
        });

        return {
          ...project,
          members
        } as SafeProject;
      });

      this.loading = false;
      console.log('Projects with members loaded safely:', this.projects);
    }).catch(error => {
      console.error('Error loading project members:', error);
      this.loading = false;
    });
  }

  loadAllUsers(): void {
    this.userService.getAllUsers().subscribe({
      next: (users) => {
        this.allUsers = users;
      },
      error: (error) => {
        console.error('Error loading users:', error);
      }
    });

    // In your user-management.component.ts
    console.log('Starting to load all users...');

    // this.userService.getAllUsers().subscribe({
    //   next: (users) => {
    //     console.log('Users loaded successfully:', users);
    //     console.log('Number of users:', users.length);
    //     console.log('First user:', users[0]);
    //     this.allUsers = users;
    //   },
    //   error: (error) => {
    //     console.error('Error loading users:', error);
    //     console.error('Error details:', error.error);
    //     console.error('Error status:', error.status);
    //   }
    // });

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
    return this.currentUser?.role === 'ADMIN';
  }

  isManager(): boolean {
    return this.currentUser?.role === 'MANAGER';
  }

  canManageUsers(): boolean {
    return this.isAdmin() || this.isManager();
  }

  canEditProject(project: SafeProject): boolean {
    if (this.isAdmin()) return true;

    // Use userId instead of id
    const userMember = project.members.find(m => m.userId === this.currentUser?.userId);
    return userMember?.role === ProjectRole.OWNER || userMember?.role === ProjectRole.ADMIN;
  }

  // Modal methods
  openAddUserModal(project: SafeProject): void {
    this.selectedProject = project;
    this.addUserForm.reset({ role: ProjectRole.MEMBER });
    this.showAddUserModal = true;
  }

  openEditUserModal(project: SafeProject, member: ProjectMemberResponseDTO): void {
    this.selectedProject = project;
    this.selectedMember = member;
    this.editUserForm.patchValue({ role: member.role });
    this.showEditUserModal = true;
  }

  closeModals(): void {
    this.showAddUserModal = false;
    this.showEditUserModal = false;
    this.selectedProject = null;
    this.selectedMember = null;
  }

  // Form submissions
  onAddUserSubmit(): void {
    if (this.addUserForm.valid && this.selectedProject) {
      const formData = this.addUserForm.value;

      this.projectMemberService.addMemberToProject(
        this.selectedProject.projectId,
        formData.userId,
        formData.role
      ).subscribe({
        next: (newMember) => {
          // Add the new member to the project
          this.selectedProject!.members.push(newMember);
          this.closeModals();
          this.showNotification('success', 'User added to project', `${this.getUserDisplayName(newMember.user)} has been added as ${newMember.role}`);
        },
        error: (error) => {
          console.error('Error adding user to project:', error);
          this.showNotification('error', 'Failed to add user', error.error?.message || 'Please try again');
        }
      });
    }
  }

  onEditUserSubmit(): void {
    if (this.editUserForm.valid && this.selectedProject && this.selectedMember) {
      const formData = this.editUserForm.value;

      this.projectMemberService.updateMemberRole(
        this.selectedProject.projectId,
        this.selectedMember.memberId,
        formData.role
      ).subscribe({
        next: (updatedMember) => {
          // Update the member in the project
          const index = this.selectedProject!.members.findIndex(m => m.memberId === updatedMember.memberId);
          if (index !== -1) {
            this.selectedProject!.members[index] = updatedMember;
          }
          this.closeModals();
          this.showNotification('success', 'Role updated', `${this.getUserDisplayName(updatedMember.user)}'s role has been updated to ${updatedMember.role}`);
        },
        error: (error) => {
          console.error('Error updating project member:', error);
          this.showNotification('error', 'Failed to update role', error.error?.message || 'Please try again');
        }
      });
    }
  }

  removeUserFromProject(project: SafeProject, memberId: number): void {
    if (confirm('Are you sure you want to remove this user from the project?')) {
      this.projectMemberService.removeMemberFromProject(project.projectId, memberId).subscribe({
        next: () => {
          // Remove the member from the local array
          project.members = project.members.filter(m => m.memberId !== memberId);
          this.showNotification('success', 'User removed', 'User has been removed from the project');
        },
        error: (error) => {
          console.error('Error removing user from project:', error);
          this.showNotification('error', 'Failed to remove user', error.error?.message || 'Please try again');
        }
      });
    }
  }

  getRoleBadgeClass(role: ProjectRole | undefined | null): string {
    if (!role) {
      return 'bg-gray-100 text-gray-800 border border-gray-200';
    }

    switch (role) {
      case ProjectRole.OWNER:
        return 'bg-purple-100 text-purple-800 border border-purple-200';
      case ProjectRole.ADMIN:
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      case ProjectRole.MEMBER:
        return 'bg-green-100 text-green-800 border border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  }

  // Filter methods
  get filteredProjects(): SafeProject[] {
    return this.projects.filter(project => {
      const matchesSearch = project.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        project.description.toLowerCase().includes(this.searchTerm.toLowerCase());

      if (this.roleFilter) {
        const hasRole = project.members.some(member =>
          member.role === this.roleFilter
        );
        return matchesSearch && hasRole;
      }

      return matchesSearch;
    });
  }

  // Update the template methods to handle undefined
  getMemberCount(project: SafeProject): number {
    return project.members.length;
  }

  // Notification system
  showNotification(type: 'success' | 'error', title: string, message: string): void {
    // Implement your notification logic here
    console.log(`${type.toUpperCase()}: ${title} - ${message}`);
  }


  getEmail(user: User | undefined | null): string {
    if (!user) {
      return 'Email not available';
    }
    return user.email || 'No email';
  }

  // Safe method for role display
  getRoleDisplay(role: ProjectRole | undefined | null): string {
    if (!role) {
      return 'UNKNOWN';
    }
    return role;
  }

  // Check if member is editable (has required data)
  isMemberEditable(member: ProjectMemberResponseDTO): boolean {
    return !!member && !!member.user;
  }

  // Enhanced getUserDisplayName with more safety
  getUserDisplayName(user: User | undefined | null): string {
    if (!user) {
      return 'Unknown User';
    }

    // Check if firstName and lastName exist
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';

    const fullName = `${firstName} ${lastName}`.trim();

    // If no name available, use email or a fallback
    if (!fullName) {
      return user.email || 'Unnamed User';
    }

    return fullName;
  }

  // Enhanced getUserInitials with more safety
  getUserInitials(user: User | undefined | null): string {
    if (!user) {
      return '?';
    }

    const firstInitial = user.firstName?.charAt(0) || '';
    const lastInitial = user.lastName?.charAt(0) || '';

    const initials = `${firstInitial}${lastInitial}`.toUpperCase();

    // If no initials from names, use first letter of email
    if (!initials && user.email) {
      return user.email.charAt(0).toUpperCase();
    }

    return initials || 'U';
  }

  // Ensure user data is complete
  private ensureUserData(user: any, userId: number): User {
    if (!user) {
      return this.createFallbackUser(userId);
    }

    // Ensure all required user properties exist
    return {
      userId: user.userId || userId,
      firstName: user.firstName || 'Unknown',
      lastName: user.lastName || 'User',
      email: user.email || `user${userId}@unknown.com`,
      role: user.role || 'USER',
      department: user.department,
      isActive: user.isActive !== undefined ? user.isActive : false,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt || new Date()
    };
  }

  // Enhanced fallback user creation
  private createFallbackUser(userId: number): User {
    return {
      userId: userId,
      firstName: 'Unknown',
      lastName: 'User',
      email: `user${userId}@unknown.com`,
      role: 'USER',
      isActive: false,
      createdAt: new Date()
    };
  }

  // Generate temporary ID for members without one
  private generateTempId(): number {
    return Math.floor(Math.random() * 1000000) * -1; // Negative to indicate temporary
  }

  // Enhanced canRemoveUser method
  canRemoveUser(member: ProjectMemberResponseDTO): boolean {
    if (!member || !member.user) {
      return false;
    }
    return member.userId !== this.currentUser?.userId;
  }

  // Debug method to log member data
  logMemberData(member: ProjectMemberResponseDTO): void {
    console.log('Member data:', {
      memberId: member.memberId,
      userId: member.userId,
      user: member.user,
      role: member.role,
      hasUser: !!member.user,
      userProperties: member.user ? Object.keys(member.user) : 'No user data'
    });
  }

  // Add this method to debug the actual data structure
  debugProjectData(): void {
    console.log('=== DEBUG PROJECT DATA ===');
    this.projects.forEach((project, projectIndex) => {
      console.log(`Project ${projectIndex}:`, project.name);
      project.members.forEach((member, memberIndex) => {
        console.log(`  Member ${memberIndex}:`, {
          memberId: member.memberId,
          userId: member.userId,
          hasUser: !!member.user,
          userType: typeof member.user,
          userKeys: member.user ? Object.keys(member.user) : 'NO USER'
        });

        // Check if user has email property
        if (member.user) {
          console.log('    User email exists:', 'email' in member.user);
          console.log('    User email value:', member.user.email);
        }
      });
    });
    console.log('=== END DEBUG ===');
  }

}
