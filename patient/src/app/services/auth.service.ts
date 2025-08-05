import { environment } from "src/environments/environment";

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

interface MagicLinkResponse {
  message: string;
  contact: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private baseUrl = `${environment.apiUrl}/auth`; // or use environment.apiUrl

  constructor(private http: HttpClient) {}

  requestMagicLink(contact: string, type: string): Observable<MagicLinkResponse> {
    return this.http.post<MagicLinkResponse>(`${this.baseUrl}/request-magic-link`, {
      contact,
      type,
    });
  }
}