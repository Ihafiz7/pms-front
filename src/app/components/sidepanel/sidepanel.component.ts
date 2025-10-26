import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-sidepanel',
  templateUrl: './sidepanel.component.html',
  styleUrls: ['./sidepanel.component.scss']
})
export class SidepanelComponent {
  @Input() isSidebarOpen = false;

  menuItems = [
    { label: 'Kanban', icon: 'assets/icons/kanban.svg' },
    { label: 'Users', icon: 'assets/icons/users.svg' },
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
