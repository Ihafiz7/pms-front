import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject, takeUntil, catchError, of, forkJoin } from 'rxjs';
import { ColumnResponse, Task, User, TaskRequest, TaskPriority, ColumnRequest } from 'src/app/models/models';
import { KanbanColumnService } from 'src/app/services/kanban-column.service';
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
  currentProjectId!: number;

  loading = false;
  isDragging = false;
  connectedColumnIds: string[] = [];

  // modal control
  modalVisible = false;
  modalMode: 'createTask' | 'editTask' | 'createColumn' | 'editColumn' | null = null;
  modalPayload: { columnId?: number; task?: Task; column?: ColumnResponse } | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private taskService: TaskService,
    private columnService: KanbanColumnService,
    private userService: UserService,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const projectId = params.get('id');
      if (projectId) {
        this.currentProjectId = +projectId;
        this.loadUsers();
        this.loadBoardData();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Loading
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

  // loadUsers(): void {
  //   this.userService.getAllUsers().pipe(takeUntil(this.destroy$)).subscribe({
  //     next: (users) => {
  //       this.users = users;
  //       console.log('Loaded users:', this.users.length);
  //     },
  //     error: (err) => {
  //       console.error('Error loading users', err);
  //       this.users = [];
  //       this.showNotification('Error loading users', 'error');
  //     }
  //   });
  // }

  loadUsers(): void {
    if (!this.currentProjectId) {
      console.warn('No project ID available for loading users');
      this.users = [];
      return;
    }

    this.userService.getUsersByProject(this.currentProjectId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (users) => {
        this.users = users;
        console.log(`Loaded ${users.length} users for project ${this.currentProjectId}:`, users);

        // If no users found, show a warning
        if (users.length === 0) {
          console.warn('No users found for this project. Tasks cannot be assigned.');
          this.showNotification('No users found in this project. Please add users to the project first.', 'error');
        }
      },
      error: (err) => {
        console.error('Error loading users for project', err);
        this.users = [];
        const errorMessage = this.extractErrorMessage(err);
        this.showNotification(`Error loading project users: ${errorMessage}`, 'error');
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

  //Drag & Drop
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
    if (!tasks || !tasks.length) return;

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

  //Modal Handlers 
  openCreateTask(columnId: number): void {
    console.log('Opening create task for column:', columnId);
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
    console.log('Modal save result:', result);

    this.loading = true;

    if (result.type === 'task') {
      this.handleTaskOperation(result);
    } else {
      this.handleColumnOperation(result);
    }
  }

  private handleTaskOperation(result: { action: 'create' | 'update'; payload: any }): void {
    // Validate required fields
    if (!result.payload.title?.trim()) {
      this.showNotification('Task title is required', 'error');
      this.loading = false;
      return;
    }

    // Validate users are loaded
    if (this.users.length === 0) {
      this.showNotification('No users available. Please ensure users are loaded.', 'error');
      this.loading = false;
      return;
    }

    // Use provided assignee or default to first user
    const assigneeId = result.payload.assigneeId || this.users[0]?.userId;

    if (!assigneeId) {
      this.showNotification('No valid assignee selected', 'error');
      this.loading = false;
      return;
    }

    // Get the target column ID - CRITICAL FIX
    const columnId = result.payload.columnId;
    if (!columnId) {
      this.showNotification('Column ID is required', 'error');
      this.loading = false;
      return;
    }

    // Format date properly for backend (YYYY-MM-DD)
    const dueDate = result.payload.dueDate
      ? new Date(result.payload.dueDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    // Build complete TaskRequest matching backend expectations
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

    console.log('Sending task request:', taskRequest);

    if (result.action === 'create') {
      this.createTask(taskRequest);
    } else {
      this.updateTask(result.payload.taskId, taskRequest);
    }
  }

  private createTask(taskRequest: TaskRequest): void {
    this.taskService.createTask(taskRequest).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (createdTask: Task) => {
        console.log('Task created successfully:', createdTask);
        this.createTaskLocal(createdTask);
        this.loading = false;
        this.closeModal();
        this.showNotification('Task created successfully', 'success');
      },
      error: (err) => {
        console.error('Error creating task', err);
        this.loading = false;
        const errorMessage = this.extractErrorMessage(err);
        this.showNotification(`Error creating task: ${errorMessage}`, 'error');
      }
    });
  }

  private updateTask(taskId: number, taskRequest: TaskRequest): void {
    this.taskService.updateTask(taskId, taskRequest).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (updatedTask: Task) => {
        console.log('Task updated successfully:', updatedTask);
        this.updateTaskLocal(updatedTask);
        this.loading = false;
        this.closeModal();
        this.showNotification('Task updated successfully', 'success');
      },
      error: (err) => {
        console.error('Error updating task', err);
        this.loading = false;
        const errorMessage = this.extractErrorMessage(err);
        this.showNotification(`Error updating task: ${errorMessage}`, 'error');
      }
    });
  }

  // private handleColumnOperation(result: { action: 'create' | 'update'; payload: any }): void {
  //   if (result.action === 'create') {
  //     if (!result.payload.name?.trim()) {
  //       this.showNotification('Column name is required', 'error');
  //       this.loading = false;
  //       return;
  //     }

  //     const columnRequest: ColumnRequest = {
  //       name: result.payload.name.trim(),
  //       color: result.payload.color || '#3b82f6',
  //       wipLimit: result.payload.wipLimit || null,
  //       projectId: this.currentProjectId,
  //       isDefault: false
  //     };

  //     this.columnService.createColumn(columnRequest).pipe(
  //       takeUntil(this.destroy$)
  //     ).subscribe({
  //       next: (createdColumn) => {
  //         this.createColumnLocal(createdColumn);
  //         this.loading = false;
  //         this.closeModal();
  //         this.showNotification('Column created successfully', 'success');
  //       },
  //       error: (err) => {
  //         console.error('Error creating column', err);
  //         this.loading = false;
  //         const errorMessage = this.extractErrorMessage(err);
  //         this.showNotification(`Error creating column: ${errorMessage}`, 'error');
  //       }
  //     });
  //   } else {
  //     if (!result.payload.columnId) {
  //       this.showNotification('Column ID is required for update', 'error');
  //       this.loading = false;
  //       return;
  //     }

  //     this.columnService.updateColumn(result.payload.columnId, result.payload).pipe(
  //       takeUntil(this.destroy$)
  //     ).subscribe({
  //       next: (updatedColumn) => {
  //         this.updateColumnLocal(updatedColumn);
  //         this.loading = false;
  //         this.closeModal();
  //         this.showNotification('Column updated successfully', 'success');
  //       },
  //       error: (err) => {
  //         console.error('Error updating column', err);
  //         this.loading = false;
  //         const errorMessage = this.extractErrorMessage(err);
  //         this.showNotification(`Error updating column: ${errorMessage}`, 'error');
  //       }
  //     });
  //   }
  // }

  private handleColumnOperation(result: { action: 'create' | 'update'; payload: any }): void {
    if (result.action === 'create') {
      // Enhanced validation
      const name = result.payload.name?.trim();
      if (!name) {
        this.showNotification('Column name is required', 'error');
        this.loading = false;
        return;
      }

      if (name.length === 0) {
        this.showNotification('Column name cannot be empty', 'error');
        this.loading = false;
        return;
      }
      const columnRequest: ColumnRequest = {
        name: name,
        color: result.payload.color || '#3b82f6',
        projectId: this.currentProjectId,
        displayOrder: 0, // Backend will calculate this
        isDefault: false,
        wipLimit: result.payload.wipLimit
      };

      console.log('Creating column with request:', columnRequest);

      this.columnService.createColumn(columnRequest).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: (createdColumn) => {
          this.createColumnLocal(createdColumn);
          this.loading = false;
          this.closeModal();
          this.showNotification('Column created successfully', 'success');
        },
        error: (err) => {
          console.error('Error creating column', err);
          this.loading = false;
          const errorMessage = this.extractErrorMessage(err);
          this.showNotification(`Error creating column: ${errorMessage}`, 'error');
        }
      });
    } else {
      // UPDATE COLUMN - wipLimit is allowed here
      if (!result.payload.columnId) {
        this.showNotification('Column ID is required for update', 'error');
        this.loading = false;
        return;
      }

      const columnId = Number(result.payload.columnId);
      if (isNaN(columnId)) {
        this.showNotification('Invalid column ID', 'error');
        this.loading = false;
        return;
      }

      // For update, include wipLimit since backend updateColumn accepts it
      const updateData = {
        name: result.payload.name?.trim(),
        color: result.payload.color,
        wipLimit: result.payload.wipLimit || null
      };

      console.log('Updating column with ID:', columnId, 'in project:', this.currentProjectId, 'Data:', updateData);

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
          const errorMessage = this.extractErrorMessage(err);
          this.showNotification(`Error updating column: ${errorMessage}`, 'error');
        }
      });
    }
  }

  onModalDelete(result: { type: 'task' | 'column'; id: number; columnId?: number }): void {
    if (result.type === 'task') {
      this.onDeleteTask(result.id, result.columnId!);
    } else {
      this.onDeleteColumn(result.id);
    }
  }

  //CRUD Operations 
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
        const errorMessage = this.extractErrorMessage(err);
        this.showNotification(`Error deleting task: ${errorMessage}`, 'error');
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
      console.log('Column deletion cancelled');
    });
  }


  private executeColumnDeletion(columnId: number, targetColumnId: number): void {
    this.loading = true;

    console.log('Executing deletion - Project:', this.currentProjectId, 'Column:', columnId, 'Target:', targetColumnId);

    this.columnService.deleteColumn(this.currentProjectId, columnId, targetColumnId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.deleteColumnLocal(columnId);
          this.loading = false;
          this.showNotification('Column deleted successfully', 'success');
        },
        error: (err) => {
          console.error('Error deleting column', err);
          this.loading = false;
          const errorMessage = this.extractErrorMessage(err);
          this.showNotification(`Failed to delete column: ${errorMessage}`, 'error');
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

  /* ---------- Utilities ---------- */
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
    if (task.assigneeName) {
      return task.assigneeName;
    }

    const user = this.users.find(u => u.userId === task.assigneeId);
    return user ? `${user.firstName} ${user.lastName}` : 'Unknown User';
  }

  getColumnName(task: Task): string {
    if (task.columnName) {
      return task.columnName;
    }

    const column = this.columns.find(c => c.columnId === task.columnId);
    return column ? column.name : 'Unknown Column';
  }

  /* ---------- Notifications ---------- */
  notification = {
    show: false,
    message: '',
    type: 'info' as 'success' | 'error' | 'info'
  };

  getTaskProgress(task: Task): number {
    return task.progressPercentage ?? 0;
  }

  private showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    this.notification = {
      show: true,
      message,
      type
    };

    setTimeout(() => {
      this.notification.show = false;
    }, 5000);
  }
}