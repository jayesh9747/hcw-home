import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Speciality, ApiResponse } from '../models/user.model';

const API_BASE_URL = 'http://localhost:3000/api/v1';
const ENDPOINTS = {
  SPECIALITY: `${API_BASE_URL}/speciality`,
} as const;

@Injectable({
  providedIn: 'root'
})
export class SpecialityService {
  constructor(private readonly http: HttpClient) {}

  getAllSpecialities(): Observable<Speciality[]> {
    return this.http.get<ApiResponse<Speciality[]>>(ENDPOINTS.SPECIALITY)
      .pipe(map((response: ApiResponse<Speciality[]>) => response.data));
  }

  getSpecialityById(id: number): Observable<Speciality> {
    return this.http.get<ApiResponse<Speciality>>(`${ENDPOINTS.SPECIALITY}/${id}`)
      .pipe(map((response: ApiResponse<Speciality>) => response.data));
  }
}
