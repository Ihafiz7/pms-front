import { Component, EventEmitter, HostListener, Input, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';
import { UserProfile, AuthService } from 'src/app/services/auth.service';
import { NotificationService } from 'src/app/services/notification.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit {
  @Input() componentName = 'Dashboard';
  @Output() toggleSidebar = new EventEmitter<void>();

  currentUser: UserProfile | null = null;
  isUserMenuOpen = false;

  constructor(
    private authService: AuthService, 
    private router: Router,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    // Subscribe to current user from AuthService
    this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user;
    });

    // If not loaded yet, try fetching from backend
    if (!this.currentUser) {
      this.authService.getProfile().subscribe({
        next: (user) => (this.currentUser = user),
        error: (err) => console.error('Error loading profile', err)
      });
    }
  }

  onToggleSidebar(): void {
    this.toggleSidebar.emit();
  }

  getUserFullName(): string {
    if (!this.currentUser) return 'User';
    return `${this.currentUser.firstName} ${this.currentUser.lastName}`.trim();
  }

  getUserInitial(): string {
    if (!this.currentUser) return 'U';
    return this.currentUser.firstName?.charAt(0).toUpperCase() || 'U';
  }

  toggleUserMenu(): void {
    this.isUserMenuOpen = !this.isUserMenuOpen;
  }

  closeUserMenu(): void {
    this.isUserMenuOpen = false;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // Close dropdown if user clicks outside
  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-dropdown-container')) {
      this.closeUserMenu();
    }
  }
}