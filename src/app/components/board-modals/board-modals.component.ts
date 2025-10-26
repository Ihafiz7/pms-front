import { Component, EventEmitter, Input, OnChanges, OnInit, Output } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { ModalMode, Task, ColumnResponse, User, TaskPriority } from 'src/app/models/models';

@Component({
  selector: 'app-board-modals',
  templateUrl: './board-modals.component.html',
  styleUrls: ['./board-modals.component.scss']
})
export class BoardModalsComponent implements OnInit, OnChanges {
  @Input() visible = false;
  @Input() mode: ModalMode = null;
  @Input() payload: { columnId?: number; task?: Task; column?: ColumnResponse } | null = null;
  @Input() users: User[] = [];
  @Input() columns: ColumnResponse[] = [];
  @Input() currentProjectId!: number;

  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<{ type: 'task' | 'column'; action: 'create' | 'update'; payload: any }>();
  @Output() delete = new EventEmitter<{ type: 'task' | 'column'; id: number; columnId?: number }>();

  // Forms
  taskForm!: FormGroup;
  columnForm!: FormGroup;

  // UI state
  loading = false;

  // Enums for template
  taskPriority = TaskPriority;

  // Color options for columns
  colorOptions = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
  ];

  constructor(private fb: FormBuilder) {
    this.initForms();
  }

  ngOnInit(): void {
    this.initForms();
  }

  ngOnChanges(): void {
    if (this.visible) {
      this.initForms();
      this.loadFormData();
    }
  }

  private initForms(): void {
    // Task Form with all required fields for backend
    this.taskForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(1)]],
      description: [''],
      columnId: [null, Validators.required],
      priority: [TaskPriority.MEDIUM, Validators.required],
      dueDate: [''],
      assigneeId: [null, Validators.required],
      estimatedHours: [0],
      actualHours: [0],
      progressPercentage: [0],
      dependencies: [''],
      parentTaskId: [null]
    });

    // Column Form
    this.columnForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(1)]],
      color: ['#3b82f6', Validators.required],
      wipLimit: [null, [Validators.min(1)]]
    });
  }

  private loadFormData(): void {
    if (!this.mode || !this.payload) return;

    switch (this.mode) {
      case 'createTask':
        const defaultColumnId = this.payload.columnId || (this.columns[0]?.columnId || null);
        const defaultAssigneeId = this.users[0]?.userId || null;
        
        console.log('Create task defaults - Column ID:', defaultColumnId, 'Assignee ID:', defaultAssigneeId);
        
        this.taskForm.reset({
          title: '',
          description: '',
          columnId: defaultColumnId,
          priority: TaskPriority.MEDIUM,
          dueDate: new Date().toISOString().split('T')[0],
          assigneeId: defaultAssigneeId,
          estimatedHours: 0,
          actualHours: 0,
          progressPercentage: 0,
          dependencies: '',
          parentTaskId: null
        });
        break;

      case 'editTask':
        if (this.payload.task) {
          const task = this.payload.task;
          console.log('Editing task:', task);
          
          this.taskForm.patchValue({
            title: task.title,
            description: task.description || '',
            columnId: task.columnId,
            priority: task.priority,
            dueDate: task.dueDate || '',
            assigneeId: task.assigneeId,
            estimatedHours: task.estimatedHours || 0,
            actualHours: task.actualHours || 0,
            progressPercentage: task.progressPercentage || 0,
            dependencies: task.dependencies || '',
            parentTaskId: task.parentTaskId || null
          });
        }
        break;

      case 'createColumn':
        this.columnForm.reset({
          name: '',
          color: '#3b82f6',
          wipLimit: null
        });
        break;

      case 'editColumn':
        if (this.payload.column) {
          this.columnForm.patchValue({
            name: this.payload.column.name,
            color: this.payload.column.color,
            wipLimit: this.payload.column.wipLimit
          });
        }
        break;
    }
  }

  /* ---------- Form Submission ---------- */
  onSubmit(): void {
    if (this.mode?.includes('Task') && this.taskForm.valid) {
      this.submitTaskForm();
    } else if (this.mode?.includes('Column') && this.columnForm.valid) {
      this.submitColumnForm();
    } else {
      console.log('Form invalid or mode not set');
    }
  }

  private submitTaskForm(): void {
    const formValue = this.taskForm.value;
    
    // Validate critical fields
    if (!formValue.columnId) {
      alert('Please select a column for the task');
      return;
    }

    if (!formValue.assigneeId) {
      alert('Please select an assignee for the task');
      return;
    }

    const taskData = {
      ...formValue,
      dueDate: formValue.dueDate || new Date().toISOString().split('T')[0],
      projectId: this.currentProjectId
    };

    console.log('Submitting task data:', taskData);

    if (this.mode === 'createTask') {
      this.save.emit({
        type: 'task',
        action: 'create',
        payload: taskData
      });
    } else if (this.mode === 'editTask' && this.payload?.task) {
      this.save.emit({
        type: 'task',
        action: 'update',
        payload: {
          ...taskData,
          taskId: this.payload.task.taskId
        }
      });
    }
  }

  private submitColumnForm(): void {
    const formValue = this.columnForm.value;
    const columnData = {
      ...formValue,
      projectId: this.currentProjectId,
      isDefault: false
    };

    if (this.mode === 'createColumn') {
      this.save.emit({
        type: 'column',
        action: 'create',
        payload: columnData
      });
    } else if (this.mode === 'editColumn' && this.payload?.column) {
      this.save.emit({
        type: 'column',
        action: 'update',
        payload: {
          ...columnData,
          columnId: this.payload.column.columnId
        }
      });
    }
  }

  /* ---------- UI Handlers ---------- */
  onClose(): void {
    this.close.emit();
  }

  onDelete(): void {
    if (this.mode === 'editTask' && this.payload?.task) {
      this.delete.emit({
        type: 'task',
        id: this.payload.task.taskId,
        columnId: this.payload.task.columnId
      });
    } else if (this.mode === 'editColumn' && this.payload?.column) {
      this.delete.emit({
        type: 'column',
        id: this.payload.column.columnId
      });
    }
  }

  selectColor(color: string): void {
    this.columnForm.patchValue({ color });
  }

  /* ---------- Getters for Template ---------- */
  get modalTitle(): string {
    switch (this.mode) {
      case 'createTask': return 'Create New Task';
      case 'editTask': return 'Edit Task';
      case 'createColumn': return 'Create New Column';
      case 'editColumn': return 'Edit Column';
      default: return '';
    }
  }

  get submitButtonText(): string {
    switch (this.mode) {
      case 'createTask': return 'Create Task';
      case 'editTask': return 'Update Task';
      case 'createColumn': return 'Create Column';
      case 'editColumn': return 'Update Column';
      default: return 'Save';
    }
  }

  get showDeleteButton(): boolean {
    return this.mode === 'editTask' || this.mode === 'editColumn';
  }

  get isTaskModal(): boolean {
    return this.mode?.includes('Task') ?? false;
  }

  get isColumnModal(): boolean {
    return this.mode?.includes('Column') ?? false;
  }

  get isCreateMode(): boolean {
    return this.mode?.includes('create') ?? false;
  }

  get isEditMode(): boolean {
    return this.mode?.includes('edit') ?? false;
  }

  // Helper to get priority options for select
  get priorityOptions(): string[] {
    return Object.values(TaskPriority);
  }

  // Helper to check if column selection is available
  get hasColumns(): boolean {
    return this.columns && this.columns.length > 0;
  }

  // Helper to check if users are available
  get hasUsers(): boolean {
    return this.users && this.users.length > 0;
  }

  // Get user display name for select options
  getUserDisplayName(user: User): string {
    return `${user.firstName} ${user.lastName} (${user.email})`;
  }

  // Get current progress value for display
  get progressValue(): number {
    return this.taskForm.get('progressPercentage')?.value || 0;
  }
}