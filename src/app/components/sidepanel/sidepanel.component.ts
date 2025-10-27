import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-sidepanel',
  templateUrl: './sidepanel.component.html',
  styleUrls: ['./sidepanel.component.scss']
})
export class SidepanelComponent {
  @Input() isSidebarOpen = false;

  menuItems = [
    { label: 'project', icon: 'assets/icons/kanban.svg', route:'projects' },
    { label: 'Users', icon: 'assets/icons/users.svg',route:'/users' },
    { label: 'Gantt', icon: 'assets/icons/gantt.svg',route:'/gantt' },
    { label: 'Team', icon: 'assets/icons/team.svg' },
    { label: 'Discussion', icon: 'assets/icons/discussion.svg' },
    { label: 'Files', icon: 'assets/icons/files.svg' },
    { label: 'Mileston', icon: 'assets/icons/milestone.svg' },
    { label: 'Report', icon: 'assets/icons/report.svg' },
    { label: 'Resources', icon: 'assets/icons/human-resources.svg' },
    { label: 'Workflow', icon: 'assets/icons/workflow.svg' },
    { label: 'Settings', icon: 'assets/icons/settings.svg' },
  ];
}

