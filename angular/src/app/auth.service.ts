import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiBaseUrl = 'http://localhost:5000/api/auth';

  constructor(private http: HttpClient) {}

  register(data: any) {
    return this.http.post(`${this.apiBaseUrl}/register`, data, { withCredentials: true, responseType: 'text' });
  }

  login(data: any) {
    return this.http.post(`${this.apiBaseUrl}/login`, data, { withCredentials: true });
  }

  logout() {
    return this.http.get(`${this.apiBaseUrl}/logout`, { withCredentials: true });
  }
}
