import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { ProjectBoardComponent } from './components/project-board/project-board.component';
import { KanbanBoardComponent } from './components/kanban-board/kanban-board.component';
// import { TaskComponent } from './components/task/task.component';
import { UserManagementsComponent } from './components/user-managements/user-managements.component';
import { GanttChartComponent } from './components/gantt-chart/gantt-chart.component';

const routes: Routes = [
  { path: '',redirectTo: '/login', pathMatch: 'full'},
  { path: 'login', component:  LoginComponent},
  { path: 'register', component: RegisterComponent },
  { path: 'projects', component: ProjectBoardComponent},
  { path: 'kanban/:id', component:KanbanBoardComponent},
  // { path: 'task', component:TaskComponent},
  { path: 'users', component: UserManagementsComponent},
  { path: 'gantt', component: GanttChartComponent},

  { path: '**',redirectTo: '/login'}

];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
