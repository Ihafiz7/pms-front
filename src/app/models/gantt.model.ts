export interface GanttTask {
  taskId: number;
  title: string;
  startDate: string;
  endDate: string;
  progress: number;
  status: string;
  dependencies: string;
  assigneeName: string;
}

export interface Project {
  projectId: number;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  budget: number | null;
  status: string;
  objectives: string | null;
  scope: string | null;
  managerId: number;
  managerName: string;
  allowCustomColumns: boolean;
  defaultView: string;
  createdAt: string;
  updatedAt: string;
  taskCount: number;
  completedTaskCount: number;
  overallProgress: number;
}

export interface GanttData {
  project: Project;
  tasks: GanttTask[];
  milestones: any[];
}

export interface FrappeGanttTask {
  id: string;
  name: string;
  start: string;
  end: string;
  progress: number;
  dependencies: string;
  custom_class?: string;
  originalData?: any;
}




