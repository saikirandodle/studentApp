import { Component } from '@angular/core';
import { AuthService } from '../auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-register',
  templateUrl: './register.html',
  standalone: true,
  styleUrl: './register.css',
  imports: [CommonModule, FormsModule, RouterLink]
})
export class RegisterComponent {
  user = { name: '', email: '', password: '' };
  isSubmitting = false;
  message = '';
  isError = false;
  submitAttempted = false;

  constructor(private auth: AuthService) {}

  register(registerForm?: NgForm) {
    this.submitAttempted = true;

    const name = this.user.name.trim();
    const email = this.user.email.trim();
    const password = this.user.password;

    const isNameValid = name.length >= 2;
    const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const isPasswordValid = password.length >= 6;

    if (!isNameValid || !isEmailValid || !isPasswordValid) {
      this.message = 'Please enter valid registration details.';
      this.isError = true;
      return;
    }

    this.isSubmitting = true;
    this.message = '';
    this.isError = false;

    this.auth.register({ name, email, password }).pipe(
      finalize(() => {
        this.isSubmitting = false;
      })
    ).subscribe({
      next: (response: any) => {
        this.message = this.extractMessage(response) || 'User Registered Successfully';
        this.isError = false;
        this.resetRegistrationForm(registerForm);
      },
      error: (error) => {
        const backendMessage = this.extractMessage(error?.error);

        if (error?.status === 200 || backendMessage === 'User Registered Successfully') {
          this.message = backendMessage || 'User Registered Successfully';
          this.isError = false;
          this.resetRegistrationForm(registerForm);
          return;
        }

        const message = backendMessage || this.extractMessage(error);
        this.message = message || 'Registration failed. Please try again.';
        this.isError = true;
      }
    });
  }

  private extractMessage(payload: any): string {
    if (!payload) {
      return '';
    }

    if (typeof payload === 'string') {
      const trimmed = payload.trim();

      try {
        const parsed = JSON.parse(trimmed);
        return this.extractMessage(parsed);
      } catch {
        return trimmed;
      }
    }

    if (typeof payload?.message === 'string') {
      return payload.message;
    }

    if (typeof payload?.msg === 'string') {
      return payload.msg;
    }

    if (typeof payload?.data?.message === 'string') {
      return payload.data.message;
    }

    if (typeof payload?.text === 'string') {
      return this.extractMessage(payload.text);
    }

    return '';
  }

  private resetRegistrationForm(registerForm?: NgForm) {
    this.user = { name: '', email: '', password: '' };
    this.submitAttempted = false;
    registerForm?.resetForm({ name: '', email: '', password: '' });
  }
}
