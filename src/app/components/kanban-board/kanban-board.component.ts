import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject, takeUntil, catchError, of, forkJoin, Observable } from 'rxjs';
import { ColumnResponse, Task, User, TaskRequest, TaskPriority, ColumnRequest, Project } from 'src/app/models/models';
import { KanbanColumnService } from 'src/app/services/kanban-column.service';
import { ProjectMemberService } from 'src/app/services/project-member.service';
import { ProjectService } from 'src/app/services/project.service';
import { TaskService } from 'src/app/services/task.service';
import { UserService } from 'src/app/services/user.service';

@Component({
  selector: 'app-kanban-board',
  templateUrl: './kanban-board.component.html',
  styleUrls: ['./kanban-board.component.scss']
})
export class KanbanBoardComponent implements OnInit, OnDestroy {
  columns: ColumnResponse[] = [];
  tasks: Record<number, Task[]> = {};
  users: User[] = [];
  allUsers: User[] = [];
  currentProjectId!: number;
  isSidebarOpen = false;
  projectName: string = '';

  loading = false;
  isDragging = false;
  connectedColumnIds: string[] = [];

  // Modal control
  modalVisible = false;
  modalMode: 'createTask' | 'editTask' | 'createColumn' | 'editColumn' | null = null;
  modalPayload: { columnId?: number; task?: Task; column?: ColumnResponse } | null = null;

  // Notification
  notification = {
    show: false,
    message: '',
    type: 'info' as 'success' | 'error' | 'info'
  };

  private destroy$ = new Subject<void>();
  private notificationTimeout: any;

  constructor(
    private taskService: TaskService,
    private columnService: KanbanColumnService,
    private userService: UserService,
    private route: ActivatedRoute,
    private projectMemberService: ProjectMemberService,
    private projectService: ProjectService
  ) { }

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const projectId = params.get('id');
      if (projectId) {
        this.currentProjectId = +projectId;
        this.loadUsers();
        this.loadBoardData();
        this.getProjectName();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
    }
  }

  // Loading methods
  loadBoardData(): void {
    this.loading = true;
    this.columnService.getColumnsByProject(this.currentProjectId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (cols) => {
        this.columns = cols.sort((a, b) => a.displayOrder - b.displayOrder);
        this.connectedColumnIds = this.getConnectedColumnIds();
        this.loadTasksForColumns();
      },
      error: (err) => {
        console.error('Error loading columns', err);
        this.loading = false;
        this.showNotification('Error loading board data', 'error');
      }
    });
  }

  loadUsers(): void {
    if (!this.currentProjectId) {
      this.users = [];
      return;
    }

    this.userService.getAllUsers().pipe(takeUntil(this.destroy$)).subscribe({
      next: (allUsers) => {
        this.allUsers = allUsers;
        this.loadProjectMembers();
      },
      error: (err) => {
        console.error('Error loading all users', err);
        this.users = [];
      }
    });
  }

  private loadProjectMembers(): void {
    this.projectMemberService.getProjectMembers(this.currentProjectId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (projectMembers) => {
        this.users = projectMembers
          .map(member => this.allUsers.find(u => u.userId === member.userId))
          .filter(user => !!user) as User[];

        if (this.users.length === 0) {
          this.showNotification('No users found in this project. Please add users to the project first.', 'error');
        }
      },
      error: (err) => {
        console.error('Error loading project members', err);
        this.users = [];
      }
    });
  }

  loadTasksForColumns(): void {
    if (!this.columns.length) {
      this.tasks = {};
      this.loading = false;
      return;
    }

    const requests = this.columns.map(c =>
      this.taskService.getTasksByColumn(c.columnId).pipe(
        catchError(err => {
          console.error(`Error loading tasks for column ${c.columnId}`, err);
          return of([] as Task[]);
        })
      )
    );

    forkJoin(requests).pipe(takeUntil(this.destroy$)).subscribe({
      next: (taskGroups) => {
        this.columns.forEach((col, idx) => {
          this.tasks[col.columnId] = (taskGroups[idx] || []).sort((a, b) => a.displayOrder - b.displayOrder);
        });
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading tasks', err);
        this.loading = false;
        this.showNotification('Error loading tasks', 'error');
      }
    });
  }

  // Drag & Drop methods
  onTaskDrop(event: CdkDragDrop<Task[]>, targetColumnId: number): void {
    this.isDragging = false;

    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      this.tasks[targetColumnId] = [...event.container.data];
      this.updateTaskOrder(this.tasks[targetColumnId], targetColumnId);
    } else {
      const task = event.previousContainer.data[event.previousIndex];
      if (!task) return;

      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );

      const prevColumnId = task.columnId;
      this.tasks[prevColumnId] = [...event.previousContainer.data];
      this.tasks[targetColumnId] = [...event.container.data];

      this.moveTaskToColumn(task.taskId, targetColumnId, event.currentIndex);
    }
  }

  onColumnDrop(event: CdkDragDrop<ColumnResponse[]>): void {
    moveItemInArray(this.columns, event.previousIndex, event.currentIndex);
    this.updateColumnOrder();
    this.connectedColumnIds = this.getConnectedColumnIds();
  }

  onDragStarted(): void {
    this.isDragging = true;
  }

  private updateTaskOrder(tasks: Task[], columnId: number): void {
    if (!tasks?.length) return;

    const updates = tasks.map((t, idx) =>
      this.taskService.reorderTaskInColumn(t.taskId, idx).pipe(
        catchError(err => {
          console.error(`reorder error for ${t.taskId}`, err);
          return of(null);
        })
      )
    );

    forkJoin(updates).pipe(takeUntil(this.destroy$)).subscribe();
  }

  private moveTaskToColumn(taskId: number, columnId: number, position: number): void {
    this.taskService.moveTaskToColumn(taskId, columnId, position).pipe(
      takeUntil(this.destroy$),
      catchError(err => {
        console.error('moveTaskToColumn error', err);
        this.loadBoardData();
        return of(null);
      })
    ).subscribe((res) => {
      if (res) {
        this.refreshTaskInBoard(res);
      }
    });
  }

  private updateColumnOrder(): void {
    const ids = this.columns.map(c => c.columnId);
    this.columnService.reorderColumns(this.currentProjectId, ids).pipe(
      takeUntil(this.destroy$),
      catchError(err => {
        console.error('Error updating column order', err);
        return of(null);
      })
    ).subscribe();
  }

  // Modal methods
  openCreateTask(columnId: number): void {
    this.modalMode = 'createTask';
    this.modalPayload = { columnId };
    this.modalVisible = true;
  }

  openEditTask(task: Task): void {
    this.modalMode = 'editTask';
    this.modalPayload = { task };
    this.modalVisible = true;
  }

  openCreateColumn(): void {
    this.modalMode = 'createColumn';
    this.modalPayload = {};
    this.modalVisible = true;
  }

  openEditColumn(column: ColumnResponse): void {
    this.modalMode = 'editColumn';
    this.modalPayload = { column };
    this.modalVisible = true;
  }

  closeModal(): void {
    this.modalVisible = false;
    this.modalMode = null;
    this.modalPayload = null;
  }

  onModalSave(result: { type: 'task' | 'column'; action: 'create' | 'update'; payload: any }): void {
    this.loading = true;

    if (result.type === 'task') {
      this.handleTaskOperation(result);
    } else {
      this.handleColumnOperation(result);
    }
  }

  private handleTaskOperation(result: { action: 'create' | 'update'; payload: any }): void {
    if (!result.payload.title?.trim()) {
      this.showNotification('Task title is required', 'error');
      this.loading = false;
      return;
    }

    if (this.users.length === 0) {
      this.showNotification('No users available. Please ensure users are loaded.', 'error');
      this.loading = false;
      return;
    }

    const columnId = result.payload.columnId;
    if (!columnId) {
      this.showNotification('Column ID is required', 'error');
      this.loading = false;
      return;
    }

    const assigneeId = result.payload.assigneeId || this.users[0]?.userId;
    const dueDate = result.payload.dueDate
      ? new Date(result.payload.dueDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    const taskRequest: TaskRequest = {
      title: result.payload.title.trim(),
      description: result.payload.description?.trim() || '',
      priority: result.payload.priority || TaskPriority.MEDIUM,
      dueDate: dueDate,
      estimatedHours: result.payload.estimatedHours || 0,
      actualHours: result.payload.actualHours || 0,
      progressPercentage: result.payload.progressPercentage || 0,
      dependencies: result.payload.dependencies || '',
      assigneeId: assigneeId,
      projectId: this.currentProjectId,
      parentTaskId: result.payload.parentTaskId || null,
      columnId: columnId,
      displayOrder: result.payload.displayOrder || 0
    };

    if (result.action === 'create') {
      this.createTask(taskRequest);
    } else {
      this.updateTask(result.payload.taskId, taskRequest);
    }
  }

  private createTask(taskRequest: TaskRequest): void {
    this.taskService.createTask(taskRequest).pipe(takeUntil(this.destroy$)).subscribe({
      next: (createdTask: Task) => {
        this.createTaskLocal(createdTask);
        this.loading = false;
        this.closeModal();
        this.showNotification('Task created successfully', 'success');
      },
      error: (err) => {
        console.error('Error creating task', err);
        this.loading = false;
        this.showNotification(`Error creating task: ${this.extractErrorMessage(err)}`, 'error');
      }
    });
  }

  private updateTask(taskId: number, taskRequest: TaskRequest): void {
    this.taskService.updateTask(taskId, taskRequest).pipe(takeUntil(this.destroy$)).subscribe({
      next: (updatedTask: Task) => {
        this.updateTaskLocal(updatedTask);
        this.loading = false;
        this.closeModal();
        this.showNotification('Task updated successfully', 'success');
      },
      error: (err) => {
        console.error('Error updating task', err);
        this.loading = false;
        this.showNotification(`Error updating task: ${this.extractErrorMessage(err)}`, 'error');
      }
    });
  }

  private handleColumnOperation(result: { action: 'create' | 'update'; payload: any }): void {
    if (result.action === 'create') {
      const name = result.payload.name?.trim();
      if (!name) {
        this.showNotification('Column name is required', 'error');
        this.loading = false;
        return;
      }

      const existingColumn = this.columns.find(col =>
        col.name.toLowerCase() === name.toLowerCase()
      );
      if (existingColumn) {
        this.showNotification('A column with this name already exists', 'error');
        this.loading = false;
        return;
      }

      const columnRequest: ColumnRequest = {
        name: name,
        color: result.payload.color || '#3b82f6',
        projectId: this.currentProjectId,
        displayOrder: 0,
        isDefault: false,
        wipLimit: result.payload.wipLimit
      };

      this.columnService.createColumn(columnRequest).pipe(takeUntil(this.destroy$)).subscribe({
        next: (createdColumn) => {
          this.createColumnLocal(createdColumn);
          this.loading = false;
          this.closeModal();
          this.showNotification('Column created successfully', 'success');
        },
        error: (err) => {
          console.error('Error creating column', err);
          this.loading = false;
          this.showNotification(`Error creating column: ${this.extractErrorMessage(err)}`, 'error');
        }
      });
    } else {
      if (!result.payload.columnId) {
        this.showNotification('Column ID is required for update', 'error');
        this.loading = false;
        return;
      }

      const columnId = Number(result.payload.columnId);
      const updateData = {
        name: result.payload.name?.trim(),
        color: result.payload.color,
        wipLimit: result.payload.wipLimit || null
      };

      this.columnService.updateColumnWithProject(this.currentProjectId, columnId, updateData).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: (updatedColumn) => {
          this.updateColumnLocal(updatedColumn);
          this.loading = false;
          this.closeModal();
          this.showNotification('Column updated successfully', 'success');
        },
        error: (err) => {
          console.error('Error updating column', err);
          this.loading = false;
          this.showNotification(`Error updating column: ${this.extractErrorMessage(err)}`, 'error');
        }
      });
    }
  }

  onModalDelete(result: { type: 'task' | 'column'; id: number; columnId?: number }): void {
    if (result.type === 'task') {
      this.onDeleteTask(result.id, result.columnId!);
    } else {
      this.onDeleteColumn(result.id);
      this.closeModal();
    }
  }

  // CRUD Operations
  createTaskLocal(task: Task): void {
    const colId = task.columnId;
    if (!this.tasks[colId]) this.tasks[colId] = [];
    this.tasks[colId].push(task);
    this.tasks[colId].sort((a, b) => a.displayOrder - b.displayOrder);
  }

  updateTaskLocal(task: Task): void {
    Object.keys(this.tasks).forEach(k => {
      this.tasks[+k] = this.tasks[+k].filter(t => t.taskId !== task.taskId);
    });
    this.createTaskLocal(task);
  }

  createColumnLocal(col: ColumnResponse): void {
    this.columns.push(col);
    this.columns.sort((a, b) => a.displayOrder - b.displayOrder);
    this.connectedColumnIds = this.getConnectedColumnIds();
    this.tasks[col.columnId] = col.tasks ?? [];
  }

  updateColumnLocal(col: ColumnResponse): void {
    const idx = this.columns.findIndex(c => c.columnId === col.columnId);
    if (idx > -1) {
      this.columns[idx] = col;
    }
    this.columns.sort((a, b) => a.displayOrder - b.displayOrder);
    this.connectedColumnIds = this.getConnectedColumnIds();
  }

  deleteTaskLocal(taskId: number, columnId: number): void {
    if (!this.tasks[columnId]) return;
    this.tasks[columnId] = this.tasks[columnId].filter(t => t.taskId !== taskId);
  }

  deleteColumnLocal(columnId: number): void {
    this.columns = this.columns.filter(c => c.columnId !== columnId);
    delete this.tasks[columnId];
    this.connectedColumnIds = this.getConnectedColumnIds();
  }

  onDeleteTask(taskId: number, columnId: number): void {
    this.taskService.deleteTask(taskId).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.deleteTaskLocal(taskId, columnId);
        this.showNotification('Task deleted successfully', 'success');
      },
      error: err => {
        console.error('Error deleting task', err);
        this.showNotification(`Error deleting task: ${this.extractErrorMessage(err)}`, 'error');
        this.loadBoardData();
      }
    });
  }

  onDeleteColumn(columnId: number): void {
    if (!this.currentProjectId) {
      this.showNotification('No project selected', 'error');
      return;
    }

    const columnToDelete = this.columns.find(col => col.columnId === columnId);
    const availableColumns = this.columns.filter(col => col.columnId !== columnId);

    if (availableColumns.length === 0) {
      this.showNotification('Cannot delete the only column in the project', 'error');
      return;
    }

    this.showTargetColumnDialog(columnToDelete!, availableColumns).then(targetColumnId => {
      if (targetColumnId) {
        this.executeColumnDeletion(columnId, targetColumnId);
      }
    }).catch(() => {
      // User cancelled deletion
    });
  }

  private executeColumnDeletion(columnId: number, targetColumnId: number): void {
    this.loading = true;

    this.columnService.deleteColumn(this.currentProjectId, columnId, targetColumnId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.deleteColumnLocal(columnId);
          this.loading = false;
          this.showNotification('Column deleted successfully', 'success');
          this.loadBoardData();
        },
        error: (err) => {
          console.error('Error deleting column', err);
          this.loading = false;
          this.showNotification(`Failed to delete column: ${this.extractErrorMessage(err)}`, 'error');
          this.loadBoardData();
        }
      });
  }

  private async showTargetColumnDialog(columnToDelete: ColumnResponse, availableColumns: ColumnResponse[]): Promise<number> {
    return new Promise((resolve, reject) => {
      const columnNames = availableColumns.map(col => `${col.name} (ID: ${col.columnId})`).join('\n');
      const message = `Delete column "${columnToDelete.name}"?\n\nSelect target column for tasks:\n\n${columnNames}\n\nEnter Column ID:`;

      const targetColumnId = prompt(message);

      if (!targetColumnId) {
        reject(new Error('User cancelled'));
        return;
      }

      const columnId = Number(targetColumnId.trim());
      const targetColumn = availableColumns.find(col => col.columnId === columnId);

      if (targetColumn) {
        resolve(targetColumn.columnId);
      } else {
        alert(`Column with ID "${targetColumnId}" not found. Please enter a valid Column ID from the list.`);
        reject(new Error('Invalid column selection'));
      }
    });
  }

  // Utility methods
  private refreshTaskInBoard(updatedTask: Task): void {
    Object.keys(this.tasks).forEach(columnId => {
      const columnIdNum = Number(columnId);
      this.tasks[columnIdNum] = this.tasks[columnIdNum].filter(
        task => task.taskId !== updatedTask.taskId
      );
    });

    const newColumnId = updatedTask.columnId;
    if (!this.tasks[newColumnId]) {
      this.tasks[newColumnId] = [];
    }
    this.tasks[newColumnId].push(updatedTask);
    this.tasks[newColumnId].sort((a, b) => a.displayOrder - b.displayOrder);
  }

  private extractErrorMessage(err: any): string {
    if (err.error?.message) {
      return err.error.message;
    } else if (err.message) {
      return err.message;
    } else if (err.statusText) {
      return err.statusText;
    } else {
      return 'Unknown error occurred';
    }
  }

  getConnectedColumnIds(): string[] {
    return this.columns.map(c => `column-${c.columnId}`);
  }

  getWipCount(columnId: number): number {
    return (this.tasks[columnId] || []).length;
  }

  isWipLimitReached(column: ColumnResponse): boolean {
    return !!column.wipLimit && this.getWipCount(column.columnId) >= column.wipLimit;
  }

  trackByColumnId(_: number, col: ColumnResponse): number {
    return col.columnId;
  }

  trackByTaskId(_: number, t: Task): number {
    return t.taskId;
  }

  areTasksLoaded(columnId: number): boolean {
    return this.tasks[columnId] !== undefined;
  }

  getUserById(userId: number): User | undefined {
    return this.users.find(user => user.userId === userId);
  }

  getAssigneeName(task: Task): string {
    if (task.assigneeName && task.assigneeName !== 'Unknown User' && task.assigneeName !== 'User') {
      return task.assigneeName;
    }

    if (task.assigneeId) {
      const user = this.users.find(u => u.userId === task.assigneeId);
      if (user) {
        return this.formatUserName(user);
      }
    }

    return 'Unassigned';
  }

  private formatUserName(user: User): string {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.firstName) {
      return user.firstName;
    }
    if (user.lastName) {
      return user.lastName;
    }
    if (user.email) {
      return user.email.split('@')[0];
    }
    return `User #${user.userId}`;
  }

  getColumnName(task: Task): string {
    if (task.columnName) {
      return task.columnName;
    }

    const column = this.columns.find(c => c.columnId === task.columnId);
    return column ? column.name : 'Unknown Column';
  }

  getTaskProgress(task: Task): number {
    return task.progressPercentage ?? 0;
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  private showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    this.notification = {
      show: true,
      message,
      type
    };

    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
    }

    this.notificationTimeout = setTimeout(() => {
      this.notification.show = false;
    }, 5000);
  }

  getProject(): Observable<Project> {
    return this.projectService.getProjectById(this.currentProjectId);
  }

  getProjectName(): void {
  this.getProject().pipe(
    takeUntil(this.destroy$)
  ).subscribe({
    next: (project: Project) => {
      this.projectName = project.name;
    },
    error: (error) => {
      console.error('Error fetching project:', error);
    }
  });
}
}