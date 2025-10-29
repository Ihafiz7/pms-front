import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError, tap, catchError, of } from 'rxjs';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { AuthService } from './auth.service';
import { environment } from 'src/environments/environment';


export interface Notification {
  notificationId: number;
  userId: number;
  userName: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  relatedEntityType?: string;
  relatedEntityId?: number;
  actionUrl?: string;
  priority: string;
  createdAt: string;
  readAt?: string;
  expiresAt?: string;
  timeAgo: string;
  isExpired: boolean;
  daysUntilExpiration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = `${environment.apiUrl}/notifications`;
  private wsUrl = `${environment.wsUrl}`;
  private wsSubject?: WebSocketSubject<any>;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  private notifications = new BehaviorSubject<Notification[]>([]);
  private unreadCount = new BehaviorSubject<number>(0);
  private isConnected = new BehaviorSubject<boolean>(false);

  public notifications$ = this.notifications.asObservable();
  public unreadCount$ = this.unreadCount.asObservable();
  public isConnected$ = this.isConnected.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  // WebSocket Connection
  connect(): void {
    try {
      const userId = this.authService.getUserId();
      if (!userId) {
        console.error('Cannot connect WebSocket: No user ID available');
        return;
      }

      this.wsSubject = webSocket({
        url: `${this.wsUrl}?userId=${userId}`,
        openObserver: {
          next: () => {
            console.log('WebSocket connected for user:', userId);
            this.isConnected.next(true);
            this.reconnectAttempts = 0;
          }
        },
        closeObserver: {
          next: () => {
            console.log('WebSocket disconnected');
            this.isConnected.next(false);
            this.handleReconnection();
          }
        }
      });

      this.wsSubject.subscribe(
        (message) => this.handleWebSocketMessage(message),
        (error) => console.error('WebSocket error:', error)
      );
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      this.handleReconnection();
    }
  }

  private handleReconnection(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * this.reconnectAttempts, 10000);
      
      console.log(`Reconnecting in ${delay}ms...`);
      setTimeout(() => this.connect(), delay);
    }
  }

  private handleWebSocketMessage(message: any): void {
    if (message.notificationId) {
      // New notification received
      const currentNotifications = this.notifications.value;
      const newNotification = this.mapToNotification(message);
      this.notifications.next([newNotification, ...currentNotifications]);
      
      if (!message.isRead) {
        this.unreadCount.next(this.unreadCount.value + 1);
      }
    }
  }

  disconnect(): void {
    this.wsSubject?.complete();
    this.isConnected.next(false);
  }

  // HTTP API Methods
  getUserNotifications(): Observable<Notification[]> {
    const userId = this.authService.getUserId();
    if (!userId) {
      return throwError(() => new Error('User not authenticated'));
    }

    return this.http.get<Notification[]>(`${this.apiUrl}/user/${userId}`).pipe(
      tap(notifications => {
        const mappedNotifications = notifications.map(n => this.mapToNotification(n));
        this.notifications.next(mappedNotifications);
        this.updateUnreadCount(mappedNotifications);
      }),
      catchError(error => {
        console.error('Error fetching notifications:', error);
        return of([]);
      })
    );
  }

  getUnreadNotifications(): Observable<Notification[]> {
    const userId = this.authService.getUserId();
    if (!userId) {
      return throwError(() => new Error('User not authenticated'));
    }

    return this.http.get<Notification[]>(`${this.apiUrl}/user/${userId}/unread-ordered`).pipe(
      catchError(error => {
        console.error('Error fetching unread notifications:', error);
        return of([]);
      })
    );
  }

  getUnreadCount(): Observable<number> {
    const userId = this.authService.getUserId();
    if (!userId) {
      return of(0);
    }

    return this.http.get<number>(`${this.apiUrl}/user/${userId}/unread-count`).pipe(
      tap(count => this.unreadCount.next(count)),
      catchError(error => {
        console.error('Error fetching unread count:', error);
        return of(0);
      })
    );
  }

  markAsRead(notificationId: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/${notificationId}/read`, {}).pipe(
      tap(() => {
        // Update local state
        const notifications = this.notifications.value.map(notification =>
          notification.notificationId === notificationId 
            ? { ...notification, isRead: true, readAt: new Date().toISOString() }
            : notification
        );
        this.notifications.next(notifications);
        this.updateUnreadCount(notifications);
      }),
      catchError(error => {
        console.error('Error marking notification as read:', error);
        return of(null);
      })
    );
  }

  markAllAsRead(): Observable<any> {
    const userId = this.authService.getUserId();
    if (!userId) {
      return throwError(() => new Error('User not authenticated'));
    }

    return this.http.put(`${this.apiUrl}/user/${userId}/mark-all-read`, {}).pipe(
      tap(() => {
        // Update local state
        const notifications = this.notifications.value.map(notification => ({
          ...notification,
          isRead: true,
          readAt: new Date().toISOString()
        }));
        this.notifications.next(notifications);
        this.unreadCount.next(0);
      }),
      catchError(error => {
        console.error('Error marking all as read:', error);
        return of(null);
      })
    );
  }

  deleteNotification(notificationId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${notificationId}`).pipe(
      tap(() => {
        const notifications = this.notifications.value.filter(
          n => n.notificationId !== notificationId
        );
        this.notifications.next(notifications);
        this.updateUnreadCount(notifications);
      }),
      catchError(error => {
        console.error('Error deleting notification:', error);
        return of(null);
      })
    );
  }

  private updateUnreadCount(notifications: Notification[]): void {
    const count = notifications.filter(n => !n.isRead).length;
    this.unreadCount.next(count);
  }

  private mapToNotification(data: any): Notification {
    return {
      notificationId: data.notificationId,
      userId: data.userId,
      userName: data.userName,
      title: data.title,
      message: data.message,
      type: data.type,
      isRead: data.isRead,
      relatedEntityType: data.relatedEntityType,
      relatedEntityId: data.relatedEntityId,
      actionUrl: data.actionUrl,
      priority: data.priority,
      createdAt: data.createdAt,
      readAt: data.readAt,
      expiresAt: data.expiresAt,
      timeAgo: data.timeAgo,
      isExpired: data.isExpired,
      daysUntilExpiration: data.daysUntilExpiration
    };
  }

  // Initialize the service
  initialize(): void {
    this.getUnreadCount().subscribe();
    this.connect();
  }
}
