import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Task, User } from 'src/app/models/models';

@Component({
  selector: 'app-task',
  templateUrl: './task.component.html',
  styleUrls: ['./task.component.scss']
})
export class TaskComponent {
  @Input() task!: Task;
  @Input() users: User[] = [];
  @Output() taskUpdated = new EventEmitter<Task>();
  @Output() taskDeleted = new EventEmitter<number>();
  @Output() editTask = new EventEmitter<Task>();
  @Output() viewTask = new EventEmitter<Task>();

  getPriorityClasses(priority: string): string {
    const classes = {
      'LOW': 'bg-green-100 text-green-800 border-green-200',
      'MEDIUM': 'bg-blue-100 text-blue-800 border-blue-200',
      'HIGH': 'bg-orange-100 text-orange-800 border-orange-200',
      'CRITICAL': 'bg-red-100 text-red-800 border-red-200'
    };
    return classes[priority as keyof typeof classes] || 'bg-gray-100 text-gray-800 border-gray-200';
  }

  getProgressColor(progress: number | undefined): string {
    const safeProgress = progress ?? 0;
    if (safeProgress >= 100) return 'bg-green-500';
    if (safeProgress >= 75) return 'bg-green-400';
    if (safeProgress >= 50) return 'bg-yellow-500';
    if (safeProgress >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return 'No date';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  isOverdue(dueDate: string | undefined): boolean {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  }

  getDaysUntilDue(dueDate: string | undefined): number {
    if (!dueDate) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getDueDateText(dueDate: string | undefined): string {
    if (!dueDate) return 'No due date';

    const days = this.getDaysUntilDue(dueDate);
    if (days < 0) return `Overdue ${Math.abs(days)}d`;
    if (days === 0) return 'Due today';
    if (days === 1) return 'Due tomorrow';
    if (days <= 7) return `Due in ${days}d`;
    return this.formatDate(dueDate);
  }

  getDueDateClasses(dueDate: string | undefined): string {
    if (!dueDate) return 'bg-gray-100 text-gray-600 border-gray-200';

    const days = this.getDaysUntilDue(dueDate);
    if (days < 0) return 'bg-red-100 text-red-700 border-red-200';
    if (days === 0) return 'bg-orange-100 text-orange-700 border-orange-200';
    if (days <= 3) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    return 'bg-gray-100 text-gray-600 border-gray-200';
  }

  // Use assigneeName from backend response, fallback to user lookup
  getAssigneeName(): string {
    if (this.task.assigneeName) {
      return this.task.assigneeName;
    }

    if (this.task.assigneeId && this.users.length > 0) {
      const user = this.users.find(u => u.userId === this.task.assigneeId);
      return user ? `${user.firstName} ${user.lastName}` : `User ${this.task.assigneeId}`;
    }

    return 'Unassigned';
  }

  getUserInitials(): string {
    if (this.task.assigneeName) {
      const names = this.task.assigneeName.split(' ');
      if (names.length >= 2) {
        return (names[0][0] + names[1][0]).toUpperCase();
      }
      return this.task.assigneeName.substring(0, 2).toUpperCase();
    }

    if (this.task.assigneeId && this.users.length > 0) {
      const user = this.users.find(u => u.userId === this.task.assigneeId);
      if (user) {
        return (user.firstName[0] + (user.lastName?.[0] || '')).toUpperCase();
      }
    }

    return 'NA';
  }

  // Get column name from backend response or fallback
  getColumnName(): string {
    if (this.task.columnName) {
      return this.task.columnName;
    }
    return `Column ${this.task.columnId}`;
  }

  // Check if task has dependencies
  hasDependencies(): boolean {
    return !!this.task.dependencies && this.task.dependencies.trim().length > 0;
  }

  // Get dependency task IDs as array
  getDependencyIds(): number[] {
    if (!this.task.dependencies) return [];

    return this.task.dependencies
      .split(',')
      .map(id => id.trim())
      .filter(id => id.length > 0)
      .map(id => parseInt(id, 10))
      .filter(id => !isNaN(id));
  }

  // Calculate completion status based on progress
  isCompleted(): boolean {
    return (this.task.progressPercentage ?? 0) >= 100;
  }

  // Get status text based on progress
  getStatusText(): string {
    const progress = this.task.progressPercentage ?? 0;
    if (this.isCompleted()) return 'Completed';
    if (progress > 0) return 'In Progress';
    return 'Not Started';
  }

  // Get status color classes
  getStatusClasses(): string {
    const progress = this.task.progressPercentage ?? 0;
    if (this.isCompleted()) return 'bg-green-100 text-green-800';
    if (progress > 0) return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  }

  // Format hours for display
  formatHours(hours: number | undefined): string {
    if (!hours || hours === 0) return '0h';
    if (hours % 1 === 0) return `${hours}h`;
    return `${hours.toFixed(1)}h`;
  }

  // Check if task has time tracking
  hasTimeTracking(): boolean {
    return !!(this.task.estimatedHours || this.task.actualHours);
  }

  // Calculate time variance
  getTimeVariance(): number {
    const estimated = this.task.estimatedHours ?? 0;
    const actual = this.task.actualHours ?? 0;
    return actual - estimated;
  }

  // Get time variance color
  getTimeVarianceColor(): string {
    const variance = this.getTimeVariance();
    if (variance > 0) return 'text-red-600'; // Over budget
    if (variance < 0) return 'text-green-600'; // Under budget
    return 'text-gray-600'; // On budget
  }

  // Get time variance text
  getTimeVarianceText(): string {
    const variance = this.getTimeVariance();
    if (variance > 0) return `+${this.formatHours(variance)} over`;
    if (variance < 0) return `${this.formatHours(Math.abs(variance))} under`;
    return 'On budget';
  }

  // Safe getter for progress percentage
  getProgressPercentage(): number {
    return this.task.progressPercentage ?? 0;
  }

  // Check if progress should be shown
  shouldShowProgress(): boolean {
    return (this.task.progressPercentage ?? 0) > 0;
  }

  onEditTask(event: Event): void {
    event.stopPropagation();
    this.editTask.emit(this.task);
  }

  onDeleteTask(event: Event): void {
    event.stopPropagation();
    if (confirm('Are you sure you want to delete this task?')) {
      this.taskDeleted.emit(this.task.taskId);
    }
  }

  onTaskClick(): void {
    this.viewTask.emit(this.task);
  }

  // Prevent drag events from triggering click actions
  onDragStart(event: DragEvent): void {
    event.stopPropagation();
  }
}
