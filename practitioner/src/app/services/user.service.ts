import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { User, UpdateUserProfileDto, ApiResponse } from '../models/user.model';

const API_BASE_URL = 'http://localhost:3000/api/v1';
const ENDPOINTS = {
  AUTH_ME: `${API_BASE_URL}/auth/me`,
  USER: `${API_BASE_URL}/user`,
} as const;

@Injectable({
  providedIn: 'root'
})
export class UserService {
  constructor(private readonly http: HttpClient) {}

  getCurrentUser(): Observable<User> {
    return this.http.get<ApiResponse<User>>(ENDPOINTS.AUTH_ME)
      .pipe(map((response: ApiResponse<User>) => response.data));
  }

  getUserById(id: number): Observable<User> {
    return this.http.get<ApiResponse<User>>(`${ENDPOINTS.USER}/${id}`)
      .pipe(map((response: ApiResponse<User>) => response.data));
  }

  updateUserProfile(userId: number, updateData: UpdateUserProfileDto): Observable<User> {
    return this.http.patch<ApiResponse<User>>(`${ENDPOINTS.USER}/${userId}`, updateData)
      .pipe(map((response: ApiResponse<User>) => response.data));
  }
}
