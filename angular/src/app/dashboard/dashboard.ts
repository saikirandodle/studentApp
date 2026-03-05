import { ChangeDetectorRef, Component, NgZone } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudentPayload, StudentService } from '../student.service';

interface Student {
  id: string;
  name: string;
  email: string;
  course: string;
  department: 'CSE' | 'IT' | 'ECE';
  marks: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent {
  students: Student[] = [];
  showForm = false;
  isEditing = false;
  isSaving = false;
  isLoading = false;
  apiMessage = '';
  apiError = false;
  submitAttempted = false;
  departments: Array<'CSE' | 'IT' | 'ECE'> = ['CSE', 'IT', 'ECE'];
  searchTerm = '';
  departmentFilter: 'ALL' | 'CSE' | 'IT' | 'ECE' = 'ALL';
  sortColumn: keyof Student = 'name';
  sortDirection: 'asc' | 'desc' = 'asc';
  currentPage = 1;
  pageSize = 5;
  readonly pageSizeOptions = [5, 10, 25];

  formStudent = {
    id: '',
    name: '',
    email: '',
    course: '',
    department: 'CSE' as 'CSE' | 'IT' | 'ECE',
    marks: null as number | null
  };

  constructor(
    private studentService: StudentService,
    private zone: NgZone,
    private cdr: ChangeDetectorRef
  ) {
    this.loadStudents();
  }

  loadStudents() {
    this.isLoading = true;
    this.apiMessage = '';
    this.apiError = false;

    this.studentService.getStudents().subscribe({
      next: (response) => {
        const payload = this.extractStudents(response);
        this.zone.run(() => {
          this.students = payload.map((student: any) => this.mapApiStudent(student));
          this.students = [...this.students];
          this.ensureValidCurrentPage();
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      },
      error: (error) => {
        this.zone.run(() => {
          this.apiMessage = error?.error?.message || 'Unable to load students from server.';
          this.apiError = true;
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  openAddStudentForm() {
    this.isEditing = false;
    this.showForm = true;
    this.submitAttempted = false;
    this.formStudent = { id: '', name: '', email: '', course: '', department: 'CSE', marks: null };
  }

  saveStudent() {
    this.submitAttempted = true;

    const marks = this.formStudent.marks;
    const name = this.formStudent.name.trim();
    const email = this.formStudent.email.trim();
    const course = this.formStudent.course.trim();

    const isNameValid = name.length >= 2;
    const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const isCourseValid = course.length >= 2;
    const isDepartmentValid = this.departments.includes(this.formStudent.department);
    const areMarksValid = typeof marks === 'number' && Number.isFinite(marks) && marks >= 0 && marks <= 100;

    if (!isNameValid || !isEmailValid || !isCourseValid || !isDepartmentValid || !areMarksValid) {
      return;
    }

    const payload: StudentPayload = {
      name,
      email,
      course,
      department: this.formStudent.department,
      marks
    };

    this.isSaving = true;
    this.apiMessage = '';
    this.apiError = false;

    if (this.isEditing) {
      const updatedId = this.formStudent.id;

      this.studentService.updateStudent(this.formStudent.id, payload).subscribe({
        next: (response) => {
          const updated = this.extractUpdatedStudent(response);
          this.students = this.students.map((student) => {
            if (student.id !== updatedId) {
              return student;
            }

            return updated ? this.mapApiStudent(updated) : { ...student, ...payload };
          });

          this.apiMessage = 'Student updated successfully.';
          this.cancelForm();
          this.loadStudents();
        },
        error: (error) => {
          if (error?.status === 200) {
            this.students = this.students.map((student) =>
              student.id === updatedId ? { ...student, ...payload } : student
            );
            this.apiMessage = 'Student updated successfully.';
            this.cancelForm();
            this.loadStudents();
            return;
          }

          this.apiMessage = error?.error?.message || 'Failed to update student.';
          this.apiError = true;
          this.isSaving = false;
        }
      });
    } else {
      this.studentService.createStudent(payload).subscribe({
        next: (response) => {
          const created = this.extractCreatedStudent(response);
          const createdStudent = created
            ? this.mapApiStudent(created)
            : ({ id: `temp-${Date.now()}`, ...payload } as Student);

          this.students = [...this.students, createdStudent];
          this.ensureValidCurrentPage();
          this.apiMessage = 'Student added successfully.';
          this.cancelForm();
          this.loadStudents();
        },
        error: (error) => {
          if (error?.status === 200) {
            const createdStudent = { id: `temp-${Date.now()}`, ...payload } as Student;
            this.students = [...this.students, createdStudent];
            this.apiMessage = 'Student added successfully.';
            this.cancelForm();
            this.loadStudents();
            return;
          }

          this.apiMessage = error?.error?.message || 'Failed to add student.';
          this.apiError = true;
          this.isSaving = false;
        }
      });
    }
  }

  editStudent(student: Student) {
    this.isEditing = true;
    this.showForm = true;
    this.submitAttempted = false;
    this.formStudent = {
      id: student.id,
      name: student.name,
      email: student.email,
      course: student.course,
      department: student.department,
      marks: student.marks
    };
  }

  deleteStudent(id: string) {
    this.apiMessage = '';
    this.apiError = false;

    this.studentService.deleteStudent(id).subscribe({
      next: () => {
        this.students = this.students.filter((student) => student.id !== id);
        this.ensureValidCurrentPage();
        this.apiMessage = 'Student deleted successfully.';

        if (this.isEditing && this.formStudent.id === id) {
          this.cancelForm();
        }

        this.loadStudents();
      },
      error: (error) => {
        if (error?.status === 200) {
          this.students = this.students.filter((student) => student.id !== id);
          this.ensureValidCurrentPage();
          this.apiMessage = 'Student deleted successfully.';

          if (this.isEditing && this.formStudent.id === id) {
            this.cancelForm();
          }

          this.loadStudents();

          return;
        }

        this.apiMessage = error?.error?.message || 'Failed to delete student.';
        this.apiError = true;
      }
    });
  }

  cancelForm() {
    this.showForm = false;
    this.isEditing = false;
    this.isSaving = false;
    this.submitAttempted = false;
    this.formStudent = { id: '', name: '', email: '', course: '', department: 'CSE', marks: null };
  }

  get filteredStudents(): Student[] {
    const normalizedSearch = this.searchTerm.trim().toLowerCase();

    return this.students.filter((student) => {
      const matchesDepartment =
        this.departmentFilter === 'ALL' || student.department === this.departmentFilter;

      if (!matchesDepartment) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return (
        student.name.toLowerCase().includes(normalizedSearch) ||
        student.email.toLowerCase().includes(normalizedSearch) ||
        student.course.toLowerCase().includes(normalizedSearch) ||
        student.department.toLowerCase().includes(normalizedSearch) ||
        String(student.marks).includes(normalizedSearch)
      );
    });
  }

  get sortedStudents(): Student[] {
    const sorted = [...this.filteredStudents];
    const directionFactor = this.sortDirection === 'asc' ? 1 : -1;

    sorted.sort((left, right) => {
      const leftValue = left[this.sortColumn];
      const rightValue = right[this.sortColumn];

      if (typeof leftValue === 'number' && typeof rightValue === 'number') {
        return (leftValue - rightValue) * directionFactor;
      }

      const leftText = String(leftValue).toLowerCase();
      const rightText = String(rightValue).toLowerCase();
      return leftText.localeCompare(rightText) * directionFactor;
    });

    return sorted;
  }

  get paginatedStudents(): Student[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.sortedStudents.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.sortedStudents.length / this.pageSize));
  }

  get pageStartRecord(): number {
    if (this.sortedStudents.length === 0) {
      return 0;
    }

    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get pageEndRecord(): number {
    return Math.min(this.currentPage * this.pageSize, this.sortedStudents.length);
  }

  onFiltersChanged() {
    this.currentPage = 1;
    this.ensureValidCurrentPage();
  }

  toggleSort(column: keyof Student) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    this.currentPage = 1;
  }

  setPage(page: number) {
    if (page < 1 || page > this.totalPages) {
      return;
    }

    this.currentPage = page;
  }

  onPageSizeChange(size: number | string) {
    const numericSize = Number(size);
    if (!this.pageSizeOptions.includes(numericSize)) {
      return;
    }

    this.pageSize = numericSize;
    this.currentPage = 1;
    this.ensureValidCurrentPage();
  }

  getSortLabel(column: keyof Student): string {
    if (this.sortColumn !== column) {
      return 'Not sorted';
    }

    return this.sortDirection === 'asc' ? 'Ascending' : 'Descending';
  }

  getSortIcon(column: keyof Student): string {
    if (this.sortColumn !== column) {
      return '↕';
    }

    return this.sortDirection === 'asc' ? '↑' : '↓';
  }

  private ensureValidCurrentPage() {
    const maxPage = this.totalPages;
    if (this.currentPage > maxPage) {
      this.currentPage = maxPage;
    }

    if (this.currentPage < 1) {
      this.currentPage = 1;
    }
  }

  private mapApiStudent(student: any): Student {
    return {
      id: String(student?.id || student?._id || ''),
      name: student?.name || '',
      email: student?.email || '',
      course: student?.course || '',
      department: this.isValidDepartment(student?.department) ? student.department : 'CSE',
      marks: Number(student?.marks ?? 0)
    };
  }

  private extractStudents(response: any): any[] {
    const directCandidates = [
      response,
      response?.students,
      response?.data,
      response?.data?.students,
      response?.result,
      response?.result?.students,
      response?.payload,
      response?.payload?.students,
      response?.items,
      response?.records
    ];

    for (const candidate of directCandidates) {
      if (Array.isArray(candidate)) {
        return candidate;
      }
    }

    const containers = [response, response?.data, response?.result, response?.payload];
    for (const container of containers) {
      if (container && typeof container === 'object') {
        for (const value of Object.values(container)) {
          if (Array.isArray(value)) {
            return value;
          }
        }
      }
    }

    return [];
  }

  private extractCreatedStudent(response: any): any | null {
    if (!response) {
      return null;
    }

    if (response?.student) {
      return response.student;
    }

    if (response?.data?.student) {
      return response.data.student;
    }

    if (response?.data && !Array.isArray(response.data)) {
      return response.data;
    }

    if (response?._id || response?.id) {
      return response;
    }

    return null;
  }

  private extractUpdatedStudent(response: any): any | null {
    if (!response) {
      return null;
    }

    if (response?.student) {
      return response.student;
    }

    if (response?.data?.student) {
      return response.data.student;
    }

    if (response?.data && !Array.isArray(response.data)) {
      return response.data;
    }

    if (response?._id || response?.id) {
      return response;
    }

    return null;
  }

  private isValidDepartment(value: any): value is 'CSE' | 'IT' | 'ECE' {
    return value === 'CSE' || value === 'IT' || value === 'ECE';
  }
}
