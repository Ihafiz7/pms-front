import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit, OnDestroy {
  registerForm: FormGroup;
  showPassword = false;
  passwordStrength = 0;
  message = '';
  messageType: 'success' | 'error' = 'error';
  loading = false;
  
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.createForm();
  }

  ngOnInit(): void {
    // Redirect if already logged in
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/projects']);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private createForm(): FormGroup {
    const form = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      department: [''],
      password: ['', [
        Validators.required, 
        Validators.minLength(6),
        this.passwordStrengthValidator
      ]],
      confirmPassword: ['', Validators.required]
    }, { 
      validators: this.passwordMatchValidator 
    });

    // Subscribe to password changes for strength calculation
    form.get('password')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(password => {
        // Handle null case by providing empty string
        this.passwordStrength = this.calculateStrength(password || '');
      });

    return form;
  }

  // Custom validator for password strength
  private passwordStrengthValidator(control: AbstractControl) {
    const password = control.value;
    if (!password) return null;

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const strength = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar]
      .filter(Boolean).length;

    return strength >= 2 ? null : { passwordWeak: true };
  }

  // Custom validator for password match
  private passwordMatchValidator(form: AbstractControl) {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    
    if (password && confirmPassword && password !== confirmPassword) {
      form.get('confirmPassword')?.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    
    form.get('confirmPassword')?.setErrors(null);
    return null;
  }

  // Fixed: Handle string | null by providing default empty string
  calculateStrength(password: string | null): number {
    // Handle null case
    if (!password) return 0;
    
    let strength = 0;
    if (password.length >= 6) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;
    
    return strength;
  }

  // Alternative: More type-safe version with explicit null check
  calculateStrengthAlt(password: string | null): number {
    if (password === null || password === undefined || password === '') {
      return 0;
    }
    
    let strength = 0;
    if (password.length >= 6) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;
    
    return strength;
  }

  getStrengthColor(): string {
    switch (this.passwordStrength) {
      case 0:
      case 1:
        return 'bg-red-500';
      case 2:
        return 'bg-yellow-500';
      case 3:
        return 'bg-blue-500';
      case 4:
      case 5:
        return 'bg-green-500';
      default:
        return 'bg-gray-300';
    }
  }

  getStrengthText(): string {
    switch (this.passwordStrength) {
      case 0:
        return 'Very weak';
      case 1:
        return 'Weak';
      case 2:
        return 'Fair';
      case 3:
        return 'Good';
      case 4:
        return 'Strong';
      case 5:
        return 'Very strong';
      default:
        return '';
    }
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    if (this.registerForm.invalid || this.loading) {
      this.markFormGroupTouched();
      return;
    }

    this.loading = true;
    this.message = '';

    const formValue = this.registerForm.value;
    // Remove confirmPassword from the data sent to the server
    const { confirmPassword, ...registerData } = formValue;

    this.authService.register(registerData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.loading = false;
          this.messageType = 'success';
          this.message = 'Registration successful! Redirecting to login...';
          
          // Redirect to login after 2 seconds
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 2000);
        },
        error: (error) => {
          this.loading = false;
          this.messageType = 'error';
          this.handleError(error);
        }
      });
  }

  private markFormGroupTouched(): void {
    Object.keys(this.registerForm.controls).forEach(key => {
      const control = this.registerForm.get(key);
      control?.markAsTouched();
    });
  }

  private handleError(error: any): void {
    console.error('Registration error:', error);
    
    if (error.message) {
      this.message = error.message;
    } else if (error.error?.message) {
      this.message = error.error.message;
    } else {
      this.message = 'Registration failed. Please try again.';
    }
  }

  // Form control getters for easy template access
  get firstName() {
    return this.registerForm.get('firstName');
  }

  get lastName() {
    return this.registerForm.get('lastName');
  }

  get email() {
    return this.registerForm.get('email');
  }

  get password() {
    return this.registerForm.get('password');
  }

  get confirmPassword() {
    return this.registerForm.get('confirmPassword');
  }

  // Helper methods for template
  getFirstNameError(): string {
    if (this.firstName?.errors?.['required']) {
      return 'First name is required';
    }
    if (this.firstName?.errors?.['minlength']) {
      return 'First name must be at least 2 characters long';
    }
    return '';
  }

  getLastNameError(): string {
    if (this.lastName?.errors?.['required']) {
      return 'Last name is required';
    }
    if (this.lastName?.errors?.['minlength']) {
      return 'Last name must be at least 2 characters long';
    }
    return '';
  }

  getEmailError(): string {
    if (this.email?.errors?.['required']) {
      return 'Email is required';
    }
    if (this.email?.errors?.['email']) {
      return 'Please enter a valid email address';
    }
    return '';
  }

  getPasswordError(): string {
    if (this.password?.errors?.['required']) {
      return 'Password is required';
    }
    if (this.password?.errors?.['minlength']) {
      return 'Password must be at least 6 characters long';
    }
    if (this.password?.errors?.['passwordWeak']) {
      return 'Password must include at least 2 of: uppercase, lowercase, numbers, or special characters';
    }
    return '';
  }

  getConfirmPasswordError(): string {
    if (this.confirmPassword?.errors?.['required']) {
      return 'Please confirm your password';
    }
    if (this.registerForm.errors?.['passwordMismatch'] || this.confirmPassword?.errors?.['passwordMismatch']) {
      return 'Passwords do not match';
    }
    return '';
  }
}