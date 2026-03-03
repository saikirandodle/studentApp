import { Component } from '@angular/core';
import { AuthService } from '../auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.html',
  standalone: true,
  styleUrl: './login.css',
  imports: [CommonModule, FormsModule, RouterLink]
})
export class LoginComponent {
  user = { email: '', password: '' };
  isSubmitting = false;
  message = '';
  isError = false;
  submitAttempted = false;

  constructor(private auth: AuthService, private router: Router) {}

  login() {
    this.submitAttempted = true;

    const email = this.user.email.trim();
    const password = this.user.password;
    const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const isPasswordValid = password.length >= 6;

    if (!isEmailValid || !isPasswordValid) {
      this.message = 'Please enter valid login details.';
      this.isError = true;
      return;
    }

    this.isSubmitting = true;
    this.message = '';
    this.isError = false;

    this.auth.login({ email, password }).subscribe({
      next: () => {
        this.message = 'Login Successful.';
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        this.message = error?.error?.message || 'Login failed. Please try again.';
        this.isError = true;
        this.isSubmitting = false;
      }
    });
  }
}
