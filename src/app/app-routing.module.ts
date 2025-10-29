import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { ProjectBoardComponent } from './components/project-board/project-board.component';
import { KanbanBoardComponent } from './components/kanban-board/kanban-board.component';
// import { TaskComponent } from './components/task/task.component';
import { UserManagementsComponent } from './components/user-managements/user-managements.component';
import { GanttChartComponent } from './components/gantt-chart/gantt-chart.component';
import { TeamComponent } from './components/team/team.component';
import { ExpenseComponent } from './components/expense/expense.component';
import { FileManagerComponentComponent } from './components/file-manager-component/file-manager-component.component';
import { ResourceAllocationComponent } from './components/resource-allocation/resource-allocation.component';
import { ExpenseReportComponent } from './components/expense-report/expense-report.component';

const routes: Routes = [
  { path: '',redirectTo: '/login', pathMatch: 'full'},
  { path: 'login', component:  LoginComponent},
  { path: 'register', component: RegisterComponent },
  { path: 'projects', component: ProjectBoardComponent},
  { path: 'kanban/:id', component:KanbanBoardComponent},
  { path: 'users', component: UserManagementsComponent},
  { path: 'teams', component: TeamComponent},
  { path: 'expense', component: ExpenseComponent},
  { path: 'files', component: FileManagerComponentComponent},
  { path: 'gantt', component: GanttChartComponent},
  { path: 'resource', component: ResourceAllocationComponent},
  { path: 'report', component: ExpenseReportComponent},
  { path: '**',redirectTo: '/login'}

];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
