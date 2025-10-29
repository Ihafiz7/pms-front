import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, switchMap, Observable, of } from 'rxjs';
import { TeamResponse, TeamRequest, TeamMemberRequest, User } from 'src/app/models/team.model';
import { AuthService, UserProfile } from 'src/app/services/auth.service';
import { TeamService } from 'src/app/services/team.service';
import { UserService } from 'src/app/services/user.service';

@Component({
  selector: 'app-team',
  templateUrl: './team.component.html',
  styleUrls: ['./team.component.scss']
})
export class TeamComponent implements OnInit {
  teams: TeamResponse[] = [];
  filteredTeams: TeamResponse[] = [];
  selectedTeam: TeamResponse | null = null;
  showTeamForm = false;
  showMemberModal = false;
  isEditing = false;
  searchTerm = '';
  activeFilter: 'all' | 'active' | 'inactive' = 'all';
  availableUsers: User[] = [];
  currentTeamMembers: User[] = [];
  currentUser: UserProfile | null = null;
  allUsers: User[] = [];
  isSidebarOpen = false;
  
  teamForm: FormGroup;
  selectedUsers: User[] = [];
  userSearchTerm = '';

  private searchTerms = new Subject<string>();

  constructor(
    private teamService: TeamService,
    private authService: AuthService,
    private fb: FormBuilder
  ) {
    this.teamForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      description: [''],
      leadId: ['', Validators.required],
      memberIds: [[]],
      isActive: [true]
    });
  }

  ngOnInit(): void {
    this.loadTeams();
    this.loadCurrentUser();
    this.loadAllUsers();
    
    // Setup user search
    this.searchTerms.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(term => this.searchUsers(term))
    ).subscribe(users => {
      this.availableUsers = users;
    });
  }

  loadCurrentUser(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }

  loadAllUsers(): void {
    this.teamService.getAllUsers().subscribe({
      next: (users) => {
        this.allUsers = users;
      },
      error: (error) => {
        console.error('Error loading users:', error);
      }
    });
  }

  loadTeams(): void {
    this.teamService.getAllTeams().subscribe({
      next: (teams) => {
        this.teams = teams;
        this.applyFilters();
      },
      error: (error) => {
        console.error('Error loading teams:', error);
      }
    });
  }

  // loadAvailableUsers(teamId: number): void {
  //   this.teamService.getAvailableUsers(teamId).subscribe({
  //     next: (users) => {
  //       this.availableUsers = users.filter(user => user.isActive);
  //     },
  //     error: (error) => {
  //       console.error('Error loading available users:', error);
  //       // Fallback: filter from all users by removing current members
  //       const currentMemberIds = this.currentTeamMembers.map(member => member.userId);
  //       this.availableUsers = this.allUsers.filter(user => 
  //         user.isActive && !currentMemberIds.includes(user.userId)
  //       );
  //     }
  //   });
  // }

  loadAvailableUsers(teamId: number): void {
  this.teamService.getAvailableUsers(teamId).subscribe({
    next: (users) => {
      this.availableUsers = users;
    },
    error: (error) => {
      console.error('Error loading available users:', error);
      // Ultimate fallback - filter from all users
      const currentMemberIds = this.currentTeamMembers.map(member => member.userId);
      this.availableUsers = this.allUsers.filter(user => 
        user.isActive && !currentMemberIds.includes(user.userId)
      );
    }
  });
}

  searchUsers(term: string): Observable<User[]> {
    if (!term.trim()) {
      return of(this.availableUsers);
    }
    // Filter locally for better performance
    const filtered = this.availableUsers.filter(user =>
      user.email.toLowerCase().includes(term.toLowerCase()) ||
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(term.toLowerCase()) ||
      user.department?.toLowerCase().includes(term.toLowerCase())
    );
    return of(filtered);
  }

  onUserSearch(term: string): void {
    this.searchTerms.next(term);
  }

  applyFilters(): void {
    let filtered = this.teams;

    // Apply active/inactive filter
    if (this.activeFilter === 'active') {
      filtered = filtered.filter(team => team.isActive);
    } else if (this.activeFilter === 'inactive') {
      filtered = filtered.filter(team => !team.isActive);
    }

    // Apply search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(team => 
        team.name.toLowerCase().includes(term) ||
        team.description?.toLowerCase().includes(term) ||
        team.leadName.toLowerCase().includes(term) ||
        team.leadEmail.toLowerCase().includes(term)
      );
    }

    this.filteredTeams = filtered;
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onFilterChange(filter: 'all' | 'active' | 'inactive'): void {
    this.activeFilter = filter;
    this.applyFilters();
  }

  openCreateForm(): void {
    this.isEditing = false;
    this.teamForm.reset({ isActive: true });
    this.showTeamForm = true;
    this.loadAvailableUsersForForm();
  }

  openEditForm(team: TeamResponse): void {
    if (!this.canManageTeam(team)) {
      alert('You do not have permission to edit this team.');
      return;
    }

    this.isEditing = true;
    this.selectedTeam = team;
    this.teamForm.patchValue({
      name: team.name,
      description: team.description,
      leadId: team.leadId,
      isActive: team.isActive
    });
    this.showTeamForm = true;
    this.loadAvailableUsersForForm();
  }

  openMemberModal(team: TeamResponse): void {
  if (!this.canManageTeam(team)) {
    alert('Only team leads or administrators can manage team members.');
    return;
  }

  this.selectedTeam = team;
  this.selectedUsers = [];
  this.userSearchTerm = '';
  
  // Convert TeamMemberResponse[] to User[]
  this.currentTeamMembers = (team.members || []).map(member => ({
    userId: member.userId,
    firstName: member.firstName,
    lastName: member.lastName,
    email: member.email,
    role: member.role,
    department: member.department,
    isActive: true,
    createdAt: new Date()
  }));
  
  this.loadAvailableUsers(team.teamId);
  this.showMemberModal = true;
}

  loadAvailableUsersForForm(): void {
    this.availableUsers = this.allUsers.filter(user => user.isActive);
  }

  submitTeamForm(): void {
    if (this.teamForm.valid) {
      const teamData: TeamRequest = this.teamForm.value;

      if (this.isEditing && this.selectedTeam) {
        this.teamService.updateTeam(this.selectedTeam.teamId, teamData).subscribe({
          next: () => {
            this.loadTeams();
            this.showTeamForm = false;
          },
          error: (error) => {
            console.error('Error updating team:', error);
          }
        });
      } else {
        this.teamService.createTeam(teamData).subscribe({
          next: () => {
            this.loadTeams();
            this.showTeamForm = false;
          },
          error: (error) => {
            console.error('Error creating team:', error);
          }
        });
      }
    }
  }

  addSelectedMembers(): void {
  if (this.selectedTeam && this.selectedUsers.length > 0) {
    const request: TeamMemberRequest = {
      userIds: this.selectedUsers.map(user => user.userId)
    };

    this.teamService.addTeamMembers(this.selectedTeam.teamId, request).subscribe({
      next: (updatedTeam) => {
        this.loadTeams();
        this.selectedUsers = [];
        // Convert TeamMemberResponse[] to User[]
        this.currentTeamMembers = (updatedTeam.members || []).map(member => ({
          userId: member.userId,
          firstName: member.firstName,
          lastName: member.lastName,
          email: member.email,
          role: member.role,
          department: member.department,
          isActive: true,
          createdAt: new Date()
        }));
        // Refresh available users
        this.loadAvailableUsers(this.selectedTeam!.teamId);
      },
      error: (error) => {
        console.error('Error adding members:', error);
      }
    });
  }
}

  removeMember(member: User): void {
  if (!this.selectedTeam) return;

  // Prevent removing team lead
  if (member.userId === this.selectedTeam.leadId) {
    alert('Cannot remove the team lead from the team.');
    return;
  }

  if (confirm(`Remove ${member.firstName} ${member.lastName} from the team?`)) {
    const request: TeamMemberRequest = {
      userIds: [member.userId]
    };

    this.teamService.removeTeamMembers(this.selectedTeam.teamId, request).subscribe({
      next: (updatedTeam) => {
        this.loadTeams();
        // Convert TeamMemberResponse[] to User[]
        this.currentTeamMembers = (updatedTeam.members || []).map(member => ({
          userId: member.userId,
          firstName: member.firstName,
          lastName: member.lastName,
          email: member.email,
          role: member.role,
          department: member.department,
          isActive: true,
          createdAt: new Date() // Use current date as fallback
        }));
        // Refresh available users
        this.loadAvailableUsers(this.selectedTeam!.teamId);
      },
      error: (error) => {
        console.error('Error removing member:', error);
      }
    });
  }
}

  toggleTeamStatus(team: TeamResponse): void {
    if (!this.canManageTeam(team)) {
      alert('You do not have permission to modify this team.');
      return;
    }

    if (team.isActive) {
      this.teamService.deactivateTeam(team.teamId).subscribe({
        next: () => this.loadTeams(),
        error: (error) => console.error('Error deactivating team:', error)
      });
    } else {
      this.teamService.activateTeam(team.teamId).subscribe({
        next: () => this.loadTeams(),
        error: (error) => console.error('Error activating team:', error)
      });
    }
  }

  deleteTeam(team: TeamResponse): void {
    if (!this.canManageTeam(team)) {
      alert('You do not have permission to delete this team.');
      return;
    }

    if (confirm(`Are you sure you want to delete team "${team.name}"?`)) {
      this.teamService.deleteTeam(team.teamId).subscribe({
        next: () => this.loadTeams(),
        error: (error) => console.error('Error deleting team:', error)
      });
    }
  }

  toggleUserSelection(user: User): void {
    const index = this.selectedUsers.findIndex(u => u.userId === user.userId);
    if (index > -1) {
      this.selectedUsers.splice(index, 1);
    } else {
      this.selectedUsers.push(user);
    }
  }

  isUserSelected(user: User): boolean {
    return this.selectedUsers.some(u => u.userId === user.userId);
  }

  canManageTeam(team: TeamResponse): boolean {
    if (!this.currentUser) return false;
    return this.authService.isAdmin() || this.isTeamLead(team);
  }

  isTeamLead(team: TeamResponse): boolean {
    if (!this.currentUser) return false;
    return this.currentUser.userId === team.leadId;
  }

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  getUserDisplayName(user: User): string {
    return `${user.firstName} ${user.lastName}`.trim();
  }

  getUserInitials(user: User): string {
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  }

  getRoleBadgeClass(role: string): string {
    switch (role) {
      case 'ADMIN':
      case 'ROLE_ADMIN':
        return 'bg-purple-100 text-purple-800';
      case 'MANAGER':
      case 'ROLE_MANAGER':
        return 'bg-blue-100 text-blue-800';
      case 'TEAM_LEAD':
      case 'ROLE_TEAM_LEAD':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getRoleDisplayName(role: string): string {
    switch (role) {
      case 'ROLE_ADMIN':
        return 'Admin';
      case 'ROLE_MANAGER':
        return 'Manager';
      case 'ROLE_TEAM_LEAD':
        return 'Team Lead';
      case 'ROLE_USER':
        return 'User';
      default:
        return role.replace('ROLE_', '').replace('_', ' ');
    }
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }
}