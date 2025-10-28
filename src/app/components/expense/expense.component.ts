import { Component, OnInit } from '@angular/core';
import { ExpenseResponse, ExpenseFilter, ExpenseStatus, ExpenseRequest } from 'src/app/models/expense.model';
import { Project, User } from 'src/app/models/models';
import { DialogService } from 'src/app/services/dialog.service';
import { ExpenseService } from 'src/app/services/expense.service';
import { ProjectService } from 'src/app/services/project.service';
import { UserService } from 'src/app/services/user.service';

@Component({
  selector: 'app-expense',
  templateUrl: './expense.component.html',
  styleUrls: ['./expense.component.scss']
})
export class ExpenseComponent implements OnInit {
  expenses: ExpenseResponse[] = [];
  filteredExpenses: ExpenseResponse[] = [];
  loading = false;
  error = '';
  savingExpense = false;

  // Modal control
  showExpenseModal = false;
  editingExpense: ExpenseResponse | null = null;

  // Expense Detail Modal
  showExpenseDetail = false;
  selectedExpense: ExpenseResponse | null = null;

  // New expense data
  newExpense: ExpenseRequest = {
    projectId: 0,
    submittedBy: 0,
    category: '',
    amount: 0,
    description: '',
    date: this.getTodayDate(),
    status: ExpenseStatus.SUBMITTED,
    receiptUrl: ''
  };

  // Data for dropdowns
  projects: Project[] = [];
  users: User[] = [];

  // Filter properties
  filters: ExpenseFilter = {};
  statusFilter: ExpenseStatus | 'ALL' = 'ALL';
  categoryFilter = '';
  projectFilter: number | 'ALL' = 'ALL';
  dateRange = {
    start: '',
    end: ''
  };

  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  totalItems = 0;

  // Categories - will be populated from existing expenses + common defaults
  categories: string[] = [];
  commonCategories: string[] = [
    'TRAVEL',
    'MEALS',
    'EQUIPMENT',
    'SOFTWARE',
    'TRAINING',
    'OFFICE_SUPPLIES',
    'TRANSPORTATION',
    'ACCOMMODATION',
    'ENTERTAINMENT',
    'OTHER'
  ];

  // Statistics
  totalExpenses = 0;
  filteredExpensesTotal = 0;

  // Custom category handling
  customCategory = '';

  constructor(
    private expenseService: ExpenseService,
    private projectService: ProjectService,
    private userService: UserService,
    private dialogService: DialogService
  ) { }

  ngOnInit() {
    this.loadExpenses();
    this.loadProjects();
    this.loadUsers();
  }

  loadExpenses() {
    this.loading = true;
    this.expenseService.getAllExpenses().subscribe({
      next: (data) => {
        this.expenses = data;
        this.filteredExpenses = data;
        this.totalItems = data.length;
        this.totalExpenses = data.length;
        this.filteredExpensesTotal = data.length;
        this.loading = false;

        console.log('Loaded expenses:', data);

        // Extract unique categories from existing expenses
        this.extractCategoriesFromExpenses(data);
        this.calculateStatistics();
      },
      error: (error) => {
        this.dialogService.error('Failed to load expenses');
        this.loading = false;
        console.error('Error loading expenses:', error);

        // Even if expenses fail to load, use common categories
        this.categories = [...this.commonCategories];
      }
    });
  }

  extractCategoriesFromExpenses(expenses: ExpenseResponse[]) {
    const expenseCategories = [...new Set(expenses.map(expense => expense.category).filter(Boolean))];
    this.categories = [...new Set([...this.commonCategories, ...expenseCategories])].sort();
    console.log('Available categories:', this.categories);
  }

  loadProjects() {
    this.projectService.getAllProjects().subscribe({
      next: (projects) => {
        this.projects = projects;
        console.log('Projects loaded:', projects);
      },
      error: (error) => {
        console.error('Error loading projects:', error);
      }
    });
  }

  loadUsers() {
    this.userService.getAllUsers().subscribe({
      next: (users) => {
        this.users = users;
        console.log('Users loaded:', users);
      },
      error: (error) => {
        console.error('Error loading users:', error);
      }
    });
  }

  // Modal methods
  openAddExpenseModal() {
    this.editingExpense = null;
    this.resetNewExpense();
    this.showExpenseModal = true;
  }

  openEditExpenseModal(expense: ExpenseResponse) {
    this.editingExpense = expense;
    this.newExpense = {
      projectId: expense.projectId,
      submittedBy: expense.submittedById,
      category: expense.category,
      amount: expense.amount,
      description: expense.description || '',
      date: expense.date,
      status: expense.status,
      receiptUrl: expense.receiptUrl || ''
    };
    this.showExpenseModal = true;
  }

  closeExpenseModal() {
    this.showExpenseModal = false;
    this.editingExpense = null;
    this.resetNewExpense();
  }

  // Expense Detail Modal methods
  openExpenseDetail(expense: ExpenseResponse) {
    this.selectedExpense = expense;
    this.showExpenseDetail = true;
  }

  closeExpenseDetail() {
    this.showExpenseDetail = false;
    this.selectedExpense = null;
  }

  resetNewExpense() {
    this.newExpense = {
      projectId: 0,
      submittedBy: 0,
      category: '',
      amount: 0,
      description: '',
      date: this.getTodayDate(),
      status: ExpenseStatus.SUBMITTED,
      receiptUrl: ''
    };
  }

  getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  onExpenseFormSubmit() {
    if (!this.isFormValid()) {
      this.error = 'Please fill all required fields correctly';
      return;
    }

    this.savingExpense = true;
    this.error = '';

    if (this.editingExpense) {
      this.expenseService.updateExpense(this.editingExpense.expenseId, this.newExpense).subscribe({
        next: (response) => {
          this.savingExpense = false;
          this.closeExpenseModal();
          this.dialogService.success('Expense updated successfully!');
          this.loadExpenses();
        },
        error: (error) => {
          this.savingExpense = false;
          this.dialogService.error('Failed to update expense: ' + error.message);
        }
      });
    } else {
      this.expenseService.createExpense(this.newExpense).subscribe({
        next: (response) => {
          this.savingExpense = false;
          this.closeExpenseModal();
          this.dialogService.success('Expense created successfully!');
          this.loadExpenses();
        },
        error: (error) => {
          this.savingExpense = false;
          this.dialogService.error('Failed to create expense: ' + error.message);
        }
      });
    }
  }

  isFormValid(): boolean {
    return !!this.newExpense.projectId &&
      !!this.newExpense.submittedBy &&
      !!this.newExpense.category &&
      !!this.newExpense.amount &&
      this.newExpense.amount > 0 &&
      !!this.newExpense.date;
  }

  deleteExpense(expenseId: number) {
    this.dialogService.confirm(
      'Are you sure you want to delete this expense? This action cannot be undone.',
      'Delete Expense?',
      'Yes, Delete It',
      'Cancel'
    ).then((result) => {
      if (result.isConfirmed) {
        this.expenseService.deleteExpense(expenseId).subscribe({
          next: () => {
            this.dialogService.success('Expense deleted successfully!');
            this.loadExpenses();
          },
          error: (error) => {
            this.dialogService.error('Error deleting expense: ' + error.message);
          }
        });
      }
    });
  }

  applyFilters() {
    console.log('Applying filters...');
    console.log('Project filter:', this.projectFilter, 'Type:', typeof this.projectFilter);

    let filtered = this.expenses;

    // Status filter
    if (this.statusFilter && this.statusFilter !== 'ALL') {
      filtered = filtered.filter(expense => expense.status === this.statusFilter);
    }

    // Category filter
    if (this.categoryFilter) {
      filtered = filtered.filter(expense =>
        expense.category.toLowerCase().includes(this.categoryFilter.toLowerCase())
      );
    }

    // Project filter
    if (this.projectFilter && this.projectFilter !== 'ALL') {
      const filterProjectId = Number(this.projectFilter);
      filtered = filtered.filter(expense => {
        const expenseProjectId = Number(expense.projectId);
        return expenseProjectId === filterProjectId;
      });
    }

    // Date range filter
    if (this.dateRange.start && this.dateRange.end) {
      filtered = filtered.filter(expense => {
        const expenseDate = new Date(expense.date);
        const startDate = new Date(this.dateRange.start);
        const endDate = new Date(this.dateRange.end);
        return expenseDate >= startDate && expenseDate <= endDate;
      });
    }

    this.filteredExpenses = filtered;
    this.totalItems = filtered.length;
    this.currentPage = 1;
    this.calculateStatistics();
  }

  clearFilters() {
    this.statusFilter = 'ALL';
    this.categoryFilter = '';
    this.projectFilter = 'ALL';
    this.dateRange = { start: '', end: '' };
    this.filteredExpenses = this.expenses;
    this.totalItems = this.expenses.length;
    this.calculateStatistics();
  }

  calculateStatistics() {
    this.filteredExpensesTotal = this.filteredExpenses.length;
    const totalAmount = this.filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    console.log(`Statistics - Filtered: ${this.filteredExpensesTotal} expenses, Total: $${totalAmount.toFixed(2)}`);
  }

  getFilteredTotalAmount(): number {
    return this.filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  }

  getStatusColor(status: ExpenseStatus): string {
    const colors = {
      [ExpenseStatus.SUBMITTED]: 'bg-blue-100 text-blue-800',
      [ExpenseStatus.UNDER_REVIEW]: 'bg-yellow-100 text-yellow-800',
      [ExpenseStatus.APPROVED]: 'bg-green-100 text-green-800',
      [ExpenseStatus.REJECTED]: 'bg-red-100 text-red-800',
      [ExpenseStatus.PAID]: 'bg-purple-100 text-purple-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  }

  get paginatedExpenses(): ExpenseResponse[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredExpenses.slice(startIndex, startIndex + this.itemsPerPage);
  }

  onPageChange(page: number) {
    this.currentPage = page;
  }

  getEndIndex(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.totalItems);
  }

  getTotalPages(): number {
    return Math.ceil(this.totalItems / this.itemsPerPage);
  }

  isLastPage(): boolean {
    return this.currentPage === this.getTotalPages();
  }

  getProjectName(projectId: number | string): string {
    if (projectId === 'ALL') {
      return 'All Projects';
    }
    const projectIdNum = Number(projectId);
    const project = this.projects.find(p => p.projectId === projectIdNum);
    return project ? project.name : `Project ${projectId}`;
  }

  getCurrentProjectName(): string {
    return this.getProjectName(this.projectFilter);
  }

  addCustomCategory() {
    if (this.customCategory && this.customCategory.trim()) {
      const newCategory = this.customCategory.trim().toUpperCase();
      if (!this.categories.includes(newCategory)) {
        this.categories = [...this.categories, newCategory].sort();
      }
      this.newExpense.category = newCategory;
      this.customCategory = '';
      console.log('Added custom category:', newCategory);
    }
  }
}