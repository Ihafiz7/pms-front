import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ViewChild, ElementRef } from '@angular/core';
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
export class GanttChartComponent implements OnInit, OnChanges {
  @Input() projectId: number = 3;
  @Input() viewMode: string = 'Month';
  @Output() taskSelected = new EventEmitter<GanttTask>();
  @ViewChild('ganttContainer') ganttContainer!: ElementRef;

  ganttData: GanttData | null = null;
  loading = false;
  error = '';
  gantt: any;
  viewModes = ['Quarter Day', 'Half Day', 'Day', 'Week', 'Month'];

  constructor(private ganttService: GanttService) { }

  ngOnInit(): void {
    this.loadGanttData();
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

        // Ensure at least one placeholder task if no tasks
        if (!this.ganttData.tasks || this.ganttData.tasks.length === 0) {
          const today = new Date();
          const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
          this.ganttData.tasks = [{
            taskId: Date.now(),
            title: 'No Tasks Yet',
            startDate: this.formatDate(today),
            endDate: this.formatDate(nextWeek),
            progress: 0,
            status: 'To Do',
            dependencies: '',
            assigneeName: 'Unassigned'
          }];
        }

        this.loading = false;
        this.renderGanttChart();
      },
      error: (error) => {
        console.error('Error loading Gantt data:', error);
        this.error = 'Failed to load Gantt data';
        this.loading = false;
      }
    });
  }

  private renderGanttChart(): void {
    if (!this.ganttContainer?.nativeElement || !this.ganttData) return;

    const tasks = this.transformToGanttTasks(this.ganttData.tasks);
    if (!tasks.length) {
      this.ganttContainer.nativeElement.innerHTML = '<p>No tasks available</p>';
      return;
    }

    this.ganttContainer.nativeElement.innerHTML = '';
    try {
      this.gantt = new (Gantt as any)(
        this.ganttContainer.nativeElement,
        tasks,
        {
          header_height: 50,
          column_width: 30,
          view_modes: this.viewModes,
          bar_height: 22,
          bar_corner_radius: 3,
          arrow_curve: 5,
          padding: 20,
          view_mode: this.viewMode,
          date_format: 'YYYY-MM-DD',
          custom_popup_html: this.customPopupHtml.bind(this),
          on_click: (task: any) => this.onTaskClick(task),
          on_date_change: (task: any, start: Date, end: Date) => this.onDateChange(task, start, end),
          on_progress_change: (task: any, progress: number) => this.onProgressChange(task, progress),
        }
      );
    } catch (error) {
      console.error('Error initializing Gantt chart:', error);
      this.error = 'Failed to initialize chart';
    }
  }

  private transformToGanttTasks(tasks: any[]): GanttChartTask[] {
    return tasks
      .filter(t => t.startDate)
      .map((t, index) => {
        let start = new Date(t.startDate);
        let end = t.endDate ? new Date(t.endDate) : new Date(start.getTime());

        if (end <= start) {
          end = new Date(start.getTime());
          end.setDate(end.getDate() + 1); // minimum 1-day duration
        }

        const progress = typeof t.progress === 'number' ? t.progress : 0;

        return {
          id: t.taskId ? t.taskId.toString() : `task-${index}`,
          name: t.title || `Task ${index + 1}`,
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0],
          progress: progress,
          dependencies: t.dependencies && t.dependencies !== 'string' ? t.dependencies : '',
          custom_class: this.getStatusClass(t.status),
        };
      });
  }

  private getStatusClass(status: string): string {
    const statusMap: { [key: string]: string } = {
      'Done': 'status-done',
      'Review': 'status-review',
      'In Progress': 'status-in-progress',
      'To Do': 'status-todo',
      'Blocked': 'status-blocked',
    };
    return statusMap[status] || 'status-todo';
  }

  private customPopupHtml(task: any): string {
    const original = this.ganttData?.tasks.find(t => t.taskId.toString() === task.id);
    return `
      <div class="popup-card">
        <h3>${task.name}</h3>
        <p><strong>Start:</strong> ${task.start}</p>
        <p><strong>End:</strong> ${task.end}</p>
        <p><strong>Progress:</strong> ${task.progress}%</p>
        <p><strong>Status:</strong> ${original?.status || 'Unknown'}</p>
        <p><strong>Assignee:</strong> ${original?.assigneeName || 'Unassigned'}</p>
      </div>
    `;
  }

  private onTaskClick(task: any): void {
    const original = this.ganttData?.tasks.find(t => t.taskId.toString() === task.id);
    if (original) this.taskSelected.emit(original);
  }

  private onDateChange(task: any, start: Date, end: Date): void {
    const taskId = parseInt(task.id, 10);
    this.ganttService.updateTask(taskId, {
      startDate: this.formatDate(start),
      endDate: this.formatDate(end),
    }).subscribe({
      next: () => console.log('Task dates updated'),
      error: () => this.loadGanttData(),
    });
  }

  private onProgressChange(task: any, progress: number): void {
    const taskId = parseInt(task.id, 10);
    this.ganttService.updateTask(taskId, { progress }).subscribe({
      next: () => console.log('Task progress updated'),
      error: () => this.loadGanttData(),
    });
  }

  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  changeViewMode(mode: string): void {
    this.viewMode = mode;
    if (this.gantt) this.gantt.change_view_mode(mode);
  }

  addNewTask(): void {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    const newTask: GanttTask = {
      taskId: Date.now(),
      title: 'New Task',
      startDate: this.formatDate(today),
      endDate: this.formatDate(nextWeek),
      progress: 0,
      status: 'To Do',
      dependencies: '',
      assigneeName: 'Unassigned'
    };

    this.ganttData?.tasks.push(newTask);
    this.renderGanttChart();

    this.ganttService.createTask(this.projectId, newTask).subscribe({
      next: (createdTask) => {
        const idx = this.ganttData?.tasks.findIndex(t => t.taskId === newTask.taskId);
        if (idx !== undefined && idx >= 0) {
          this.ganttData!.tasks[idx] = createdTask;
          this.renderGanttChart();
        }
      },
      error: (error) => console.error('Error creating task:', error),
    });
  }
}
