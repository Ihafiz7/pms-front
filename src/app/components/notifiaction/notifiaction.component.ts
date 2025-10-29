import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from 'src/app/services/auth.service';
import { Notification, NotificationService } from 'src/app/services/notification.service';

@Component({
  selector: 'app-notifiaction',
  templateUrl: './notifiaction.component.html',
  styleUrls: ['./notifiaction.component.scss']
})
export class NotifiactionComponent implements OnInit, OnDestroy {
  isOpen = false;
  notifications: Notification[] = [];
  unreadCount = 0;
  isConnected = false;
  isLoading = false;
  
  private subscriptions = new Subscription();

  constructor(
    private notificationService: NotificationService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.loadNotifications();
      this.subscribeToData();
    } else {
      this.subscriptions.add(
        this.authService.currentUser$.subscribe(user => {
          if (user) {
            this.loadNotifications();
            this.subscribeToData();
          }
        })
      );
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private loadNotifications(): void {
    this.isLoading = true;
    this.notificationService.getUserNotifications().subscribe({
      next: () => this.isLoading = false,
      error: () => this.isLoading = false
    });
  }

  private subscribeToData(): void {
    this.subscriptions.add(
      this.notificationService.notifications$.subscribe(
        notifications => this.notifications = notifications
      )
    );

    this.subscriptions.add(
      this.notificationService.unreadCount$.subscribe(
        count => this.unreadCount = count
      )
    );

    this.subscriptions.add(
      this.notificationService.isConnected$.subscribe(
        connected => this.isConnected = connected
      )
    );
  }

  toggleDropdown(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen && this.unreadCount > 0) {
      this.markAllAsRead();
    }
  }

  markAsRead(notification: Notification, event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    if (!notification.isRead) {
      this.notificationService.markAsRead(notification.notificationId).subscribe();
    }

    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
    
    this.isOpen = false;
  }

  markAllAsRead(): void {
    if (this.unreadCount > 0) {
      this.notificationService.markAllAsRead().subscribe();
    }
  }

  deleteNotification(notification: Notification, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    
    this.notificationService.deleteNotification(notification.notificationId).subscribe();
  }

  getNotificationIcon(type: string): string {
    const icons: { [key: string]: string } = {
      'TASK_ASSIGNED': 'fas fa-tasks',
      'TASK_DUE_REMINDER': 'fas fa-clock',
      'TASK_COMPLETED': 'fas fa-check-circle',
      'PROJECT_UPDATE': 'fas fa-project-diagram',
      'MILESTONE_ACHIEVED': 'fas fa-flag',
      'NEW_COMMENT': 'fas fa-comment',
      'EXPENSE_APPROVED': 'fas fa-check',
      'EXPENSE_REJECTED': 'fas fa-times',
      'TIME_ENTRY_SUBMITTED': 'fas fa-hourglass',
      'SYSTEM_ANNOUNCEMENT': 'fas fa-bullhorn',
      'RESOURCE_ALLOCATED': 'fas fa-users'
    };
    return icons[type] || 'fas fa-bell';
  }

  getPriorityColor(priority: string): string {
    const colors: { [key: string]: string } = {
      'HIGH': 'bg-red-100 text-red-800 border-red-200',
      'MEDIUM': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'LOW': 'bg-blue-100 text-blue-800 border-blue-200'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800 border-gray-200';
  }

  getPriorityText(priority: string): string {
    const texts: { [key: string]: string } = {
      'HIGH': 'High Priority',
      'MEDIUM': 'Medium Priority',
      'LOW': 'Low Priority'
    };
    return texts[priority] || 'Standard Priority';
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.notification-container')) {
      this.isOpen = false;
    }
  }

  refreshNotifications(): void {
    this.loadNotifications();
  }
}