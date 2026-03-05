import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

export interface StudentPayload {
  name: string;
  email: string;
  course: string;
  department: 'CSE' | 'IT' | 'ECE';
  marks: number;
}

@Injectable({
  providedIn: 'root'
})
export class StudentService {
  private readonly apiBaseUrl = 'http://localhost:5000/api/students';

  constructor(private http: HttpClient) {}

  getStudents() {
    const params = new HttpParams().set('_ts', Date.now().toString());

    return this.http.get<any>(this.apiBaseUrl, {
      withCredentials: true,
      params,
      headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache'
      }
    });
  }

  createStudent(data: StudentPayload) {
    return this.http.post<any>(this.apiBaseUrl, data, { withCredentials: true });
  }

  updateStudent(id: string, data: StudentPayload) {
    return this.http.put<any>(`${this.apiBaseUrl}/${id}`, data, { withCredentials: true });
  }

  deleteStudent(id: string) {
    return this.http.delete<any>(`${this.apiBaseUrl}/${id}`, { withCredentials: true });
  }
}
