import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { DragDropModule } from '@angular/cdk/drag-drop';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { AuthInterceptor } from './interceptors/auth.interceptor';
import { JwtModule } from '@auth0/angular-jwt';
import { NavbarComponent } from './components/navbar/navbar.component';
import { SidepanelComponent } from './components/sidepanel/sidepanel.component';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { TaskComponent } from './components/task/task.component';
import { ProjectBoardComponent } from './components/project-board/project-board.component';
import { KanbanBoardComponent } from './components/kanban-board/kanban-board.component';
import { BoardModalsComponent } from './components/board-modals/board-modals.component';
import { UserManagementsComponent } from './components/user-managements/user-managements.component';
import { GanttChartComponent } from './components/gantt-chart/gantt-chart.component';
import { TeamComponent } from './components/team/team.component';
import { ExpenseComponent } from './components/expense/expense.component';
import { FileManagerComponentComponent } from './components/file-manager-component/file-manager-component.component';
import { FileUploadModalComponent } from './components/file-upload-modal/file-upload-modal.component';
import { ConfirmDeleteComponent } from './components/confirm-delete/confirm-delete.component';
import { FileDetailsComponent } from './components/file-details/file-details.component';
import { ExpenseReportComponent } from './components/expense-report/expense-report.component';
import { ResourceAllocationComponent } from './components/resource-allocation/resource-allocation.component';


@NgModule({
  declarations: [
    AppComponent,
    NavbarComponent,
    SidepanelComponent,
    LoginComponent,
    RegisterComponent,
    TaskComponent,
    ProjectBoardComponent,
    KanbanBoardComponent,
    BoardModalsComponent,
    UserManagementsComponent,
    GanttChartComponent,
    TeamComponent,
    ExpenseComponent,
    FileManagerComponentComponent,
    FileUploadModalComponent,
    ConfirmDeleteComponent,
    FileDetailsComponent,
    ExpenseReportComponent,
    ResourceAllocationComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    DragDropModule,
    JwtModule.forRoot({
      config: {
        tokenGetter: () => localStorage.getItem('token'),
        allowedDomains: ['localhost:8080'],
        disallowedRoutes: [
          'http://localhost:8080/pms/auth/signin',
          'http://localhost:8080/pms/auth/signup'
        ]
      }
    })
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
