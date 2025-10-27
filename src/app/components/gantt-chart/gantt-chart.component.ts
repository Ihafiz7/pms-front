import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { GanttData, GanttTask } from 'src/app/models/gantt.model';
import { GanttService } from 'src/app/services/gantt.service';

import Gantt from 'frappe-gantt';

interface GanttChartTask {
  id: string;
  name: string;
  start: string;
  end: string;
  progress: number;
  dependencies: string;
  custom_class?: string;
}

@Component({
  selector: 'app-gantt-chart',
  templateUrl: './gantt-chart.component.html',
  styleUrls: ['./gantt-chart.component.scss']
})
export class GanttChartComponent implements OnInit, AfterViewInit, OnChanges {
  @Input() projectId: number = 1;
  @Input() viewMode: string = 'Month';
  @Output() taskSelected = new EventEmitter<GanttTask>();
  
  @ViewChild('ganttContainer') ganttContainer!: ElementRef;

  ganttData: GanttData | null = null;
  loading: boolean = false;
  error: string = '';
  
  private gantt: any;
  private isInitialized: boolean = false;

  // Available view modes
  viewModes = [
    { value: 'Quarter Day', label: 'Quarter Day' },
    { value: 'Half Day', label: 'Half Day' },
    { value: 'Day', label: 'Day' },
    { value: 'Week', label: 'Week' },
    { value: 'Month', label: 'Month' }
  ];

  constructor(private ganttService: GanttService) {}

  ngOnInit(): void {
    this.loadGanttData();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initGanttChart();
    }, 100);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['projectId'] && !changes['projectId'].firstChange) {
      this.loadGanttData();
    }
    if (changes['viewMode'] && this.gantt) {
      this.changeViewMode(this.viewMode);
    }
  }

  loadGanttData(): void {
    this.loading = true;
    this.error = '';
    
    this.ganttService.getGanttData(this.projectId).subscribe({
      next: (data) => {
        this.ganttData = data;
        this.loading = false;
        this.refreshGanttChart();
      },
      error: (error) => {
        this.error = 'Failed to load Gantt data';
        this.loading = false;
        console.error('Error loading Gantt data:', error);
      }
    });
  }

  private initGanttChart(): void {
    if (!this.ganttContainer?.nativeElement || this.isInitialized) {
      return;
    }

    const tasks = this.transformToGanttTasks(this.ganttData?.tasks || []);
    
    try {
      // Use type assertion to avoid TypeScript errors
      this.gantt = new (Gantt as any)(
        this.ganttContainer.nativeElement, 
        tasks,
        {
          header_height: 50,
          column_width: 30,
          step: 24,
          view_modes: ['Quarter Day', 'Half Day', 'Day', 'Week', 'Month'],
          bar_height: 20,
          bar_corner_radius: 3,
          arrow_curve: 5,
          padding: 18,
          view_mode: this.viewMode,
          date_format: 'YYYY-MM-DD',
          custom_popup_html: this.customPopupHtml.bind(this),
          on_click: (task: any) => this.onTaskClick(task),
          on_date_change: (task: any, start: Date, end: Date) => this.onDateChange(task, start, end),
          on_progress_change: (task: any, progress: number) => this.onProgressChange(task, progress),
        }
      );

      this.isInitialized = true;
    } catch (error) {
      console.error('Error initializing Gantt chart:', error);
    }
  }

  private refreshGanttChart(): void {
    if (this.gantt && this.ganttData) {
      const tasks = this.transformToGanttTasks(this.ganttData.tasks);
      this.gantt.refresh(tasks);
    } else if (!this.isInitialized) {
      this.initGanttChart();
    }
  }

  private transformToGanttTasks(tasks: GanttTask[]): GanttChartTask[] {
    return tasks.map(task => ({
      id: task.taskId.toString(),
      name: task.title,
      start: task.startDate,
      end: task.endDate,
      progress: task.progress,
      dependencies: task.dependencies || '',
      custom_class: this.getStatusClass(task.status)
    }));
  }

  private getStatusClass(status: string): string {
    const statusMap: { [key: string]: string } = {
      'Done': 'status-done',
      'Review': 'status-review',
      'In Progress': 'status-in-progress',
      'To Do': 'status-todo',
      'Blocked': 'status-blocked'
    };
    return statusMap[status] || 'status-todo';
  }

  private customPopupHtml(task: any): string {
    const originalTask = this.ganttData?.tasks.find(t => t.taskId.toString() === task.id);
    return `
      <div class="bg-white rounded-lg shadow-lg border border-gray-200 p-4 min-w-64">
        <h3 class="font-semibold text-lg text-gray-800 mb-2 border-b border-gray-200 pb-2">${task.name}</h3>
        <div class="space-y-2 mb-3">
          <div class="flex justify-between">
            <span class="text-gray-600">Start:</span>
            <span class="font-medium">${task.start}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">End:</span>
            <span class="font-medium">${task.end}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Progress:</span>
            <span class="font-medium">${task.progress}%</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Status:</span>
            <span class="font-medium">${originalTask?.status || 'Unknown'}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Assignee:</span>
            <span class="font-medium">${originalTask?.assigneeName || 'Unassigned'}</span>
          </div>
        </div>
      </div>
    `;
  }

  private onTaskClick(task: any): void {
    const originalTask = this.ganttData?.tasks.find(t => t.taskId.toString() === task.id);
    if (originalTask) {
      this.taskSelected.emit(originalTask);
    }
  }

  private onDateChange(task: any, start: Date, end: Date): void {
    // Convert Date objects to string format YYYY-MM-DD
    const startStr = this.formatDate(start);
    const endStr = this.formatDate(end);
    
    const taskId = parseInt(task.id, 10);
    this.ganttService.updateTask(taskId, {
      startDate: startStr,
      endDate: endStr
    }).subscribe({
      next: () => {
        console.log('Task dates updated successfully');
      },
      error: (error) => {
        console.error('Error updating task dates:', error);
        this.loadGanttData(); // Reload on error to reset
      }
    });
  }

  private onProgressChange(task: any, progress: number): void {
    const taskId = parseInt(task.id, 10);
    this.ganttService.updateTask(taskId, {
      progress: progress
    }).subscribe({
      next: () => {
        console.log('Task progress updated successfully');
      },
      error: (error) => {
        console.error('Error updating task progress:', error);
        this.loadGanttData(); // Reload on error to reset
      }
    });
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  changeViewMode(mode: string): void {
    this.viewMode = mode;
    if (this.gantt) {
      this.gantt.change_view_mode(mode);
    }
  }

  addNewTask(): void {
    const newTask = {
      title: 'New Task',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      progress: 0,
      status: 'To Do',
      dependencies: '',
      assigneeName: 'Unassigned'
    };

    this.ganttService.createTask(this.projectId, newTask).subscribe({
      next: () => {
        this.loadGanttData();
      },
      error: (error) => {
        console.error('Error creating task:', error);
      }
    });
  }
}