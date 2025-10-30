import { Component, OnInit } from '@angular/core';
import { ExpenseProjectReport, ExpenseStatus } from 'src/app/models/expense-project-report.model';
import { ExpenseReportService } from 'src/app/services/expense-report.service';

@Component({
  selector: 'app-expense-report',
  templateUrl: './expense-report.component.html',
  styleUrls: ['./expense-report.component.scss']
})
export class ExpenseReportComponent implements OnInit {
  reports: ExpenseProjectReport[] = [];
  filteredReports: ExpenseProjectReport[] = [];
  loading = false;
  exportLoading = false;
  error = '';
  currentDate = new Date();

  // Filter properties
  startDate: string = '';
  endDate: string = '';
  statusFilter: ExpenseStatus | '' = '';

  // Status options for dropdown
  statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: ExpenseStatus.SUBMITTED, label: 'Submitted' },
    { value: ExpenseStatus.UNDER_REVIEW, label: 'Under Review' },
    { value: ExpenseStatus.APPROVED, label: 'Approved' },
    { value: ExpenseStatus.PAID, label: 'Paid' },
    { value: ExpenseStatus.REJECTED, label: 'Rejected' }
  ];

  constructor(private expenseReportService: ExpenseReportService) { }

  ngOnInit(): void {
    this.loadReports();
  }

  loadReports(): void {
    this.loading = true;
    this.error = '';

    this.expenseReportService.getExpensesPerProject().subscribe({
      next: (data) => {
        this.reports = data || [];
        this.filteredReports = [...this.reports];
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load expense reports. Please try again.';
        this.loading = false;
        console.error('Error loading reports:', err);
      }
    });
  }

  applyFilters(): void {
    this.loading = true;
    this.error = '';

    const startDate = this.startDate || undefined;
    const endDate = this.endDate || undefined;
    const status = this.statusFilter || undefined;

    this.expenseReportService.getFilteredExpensesPerProject(startDate, endDate, status).subscribe({
      next: (data) => {
        this.filteredReports = data || [];
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to apply filters. Please check your filter values.';
        this.loading = false;
        console.error('Error applying filters:', err);
      }
    });
  }

  clearFilters(): void {
    this.startDate = '';
    this.endDate = '';
    this.statusFilter = '';
    this.filteredReports = [...this.reports];
    this.error = '';
  }

  exportReport(format: string): void {
    this.exportLoading = true;
    this.error = '';

    const startDate = this.startDate || undefined;
    const endDate = this.endDate || undefined;
    const status = this.statusFilter || undefined;

    this.expenseReportService.exportReport(format, startDate, endDate, status).subscribe({
      next: (blob: Blob) => {
        this.downloadFile(blob, format);
        this.exportLoading = false;
      },
      error: (err) => {
        this.error = 'Failed to export report';
        this.exportLoading = false;
        console.error('Export error:', err);
      }
    });
  }

  private downloadFile(blob: Blob, format: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    link.download = `expense_report_${timestamp}.${format.toLowerCase()}`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    window.URL.revokeObjectURL(url);
  }

  getTotalExpenses(): number {
    return this.filteredReports.reduce((total, report) => total + (report.totalExpenses || 0), 0);
  }

  getTotalExpenseCount(): number {
    return this.filteredReports.reduce((total, report) => total + (report.expenseCount || 0), 0);
  }

  objectKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }

  getCategoryAmount(report: ExpenseProjectReport, category: string): number {
    return report.expensesByCategory && report.expensesByCategory[category]
      ? report.expensesByCategory[category]
      : 0;
  }

  getStatusAmount(report: ExpenseProjectReport, status: string): number {
    return report.expensesByStatus && report.expensesByStatus[status as ExpenseStatus]
      ? report.expensesByStatus[status as ExpenseStatus]
      : 0;
  }

  getCategoryPercentage(report: ExpenseProjectReport, category: string): string {
    if (!report.expensesByCategory || !report.expensesByCategory[category] || !report.totalExpenses || report.totalExpenses === 0) {
      return '0.0';
    }
    return ((report.expensesByCategory[category] / report.totalExpenses) * 100).toFixed(1);
  }

  getStatusLabel(status: string): string {
    const statusLabels: { [key: string]: string } = {
      'APPROVED': 'Approved',
      'PAID': 'Paid',
      'REJECTED': 'Rejected',
      'SUBMITTED': 'Submitted',
      'UNDER_REVIEW': 'Under Review'
    };
    return statusLabels[status] || status;
  }

  getStatusDisplay(status: string): string {
    const statusDisplay: { [key: string]: string } = {
      'APPROVED': 'Approved',
      'PAID': 'Paid',
      'REJECTED': 'Rejected',
      'SUBMITTED': 'Submitted',
      'UNDER_REVIEW': 'Review'
    };
    return statusDisplay[status] || status;
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'PAID':
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'REJECTED':
        return 'bg-red-100 text-red-800 border border-red-200';
      case 'SUBMITTED':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'UNDER_REVIEW':
        return 'bg-purple-100 text-purple-800 border border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  }

  getCategoryColor(index: number): string {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500',
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500',
      'bg-orange-500', 'bg-cyan-500', 'bg-lime-500', 'bg-amber-500'
    ];
    return colors[index % colors.length];
  }

  viewProjectDetails(projectId: number): void {
    console.log('View details for project:', projectId);
    // Implement navigation: this.router.navigate(['/projects', projectId, 'expenses']);
  }

  exportProjectReport(projectId: number): void {
    console.log('Export report for project:', projectId);
    // Implement single project export if needed
  }

  getPeriodDescription(report: any): string {
    // Use type 'any' to avoid TypeScript errors
    if (report.periodDescription) {
      return report.periodDescription;
    }

    // Fallback to current filter dates
    if (this.startDate && this.endDate) {
      return `${this.startDate} to ${this.endDate}`;
    } else if (this.startDate) {
      return `From ${this.startDate}`;
    } else if (this.endDate) {
      return `Until ${this.endDate}`;
    }

    return 'All time';
  }

   isSidebarOpen: boolean = false;


  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }
}