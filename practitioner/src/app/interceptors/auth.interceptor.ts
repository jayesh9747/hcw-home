import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, timer } from 'rxjs';
import { catchError, switchMap, retry, delay } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
 private isRefreshing = false;

 constructor(
  private authService: AuthService,
  private router: Router
 ) { }

 intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
  const token = this.authService.getToken();

  if (token) {
   req = req.clone({
    setHeaders: {
     Authorization: `Bearer ${token}`
    }
   });
  }

  return next.handle(req).pipe(
   catchError((error: HttpErrorResponse) => {
    if (error.status === 401 && !this.isRefreshing) {
     return this.handleUnauthorized(req, next, error);
    } else if (error.status === 0) {
     return this.handleNetworkError(req, next, error);
    } else if (error.status >= 500) {
     return this.handleServerError(req, next, error);
    }

    return throwError(() => error);
   })
  );
 }

 private handleUnauthorized(req: HttpRequest<any>, next: HttpHandler, error: HttpErrorResponse): Observable<HttpEvent<any>> {
  // Prevent multiple simultaneous refresh attempts
  if (this.isRefreshing) {
   return throwError(() => error);
  }

  this.isRefreshing = true;
  const refreshToken = this.authService.getrefreshToken();

  if (!refreshToken) {
   this.isRefreshing = false;
   this.authService.logout();
   return throwError(() => error);
  }

  return this.authService.refreshToken().pipe(
   switchMap((newTokens) => {
    this.isRefreshing = false;
    const newReq = req.clone({
     setHeaders: {
      Authorization: `Bearer ${newTokens.accessToken}`
     }
    });
    return next.handle(newReq);
   }),
   catchError((refreshError) => {
    this.isRefreshing = false;
    console.error('Token refresh failed in interceptor:', refreshError);

    // Only logout on auth failures, not network issues
    if (refreshError.status === 401 || refreshError.status === 403) {
     this.authService.logout();
    }

    return throwError(() => refreshError);
   })
  );
 }

 private handleNetworkError(req: HttpRequest<any>, next: HttpHandler, error: HttpErrorResponse): Observable<HttpEvent<any>> {
  // Implement exponential backoff retry for network errors
  return timer(1000).pipe(
   switchMap(() => next.handle(req)),
   retry({
    count: 2,
    delay: (error, retryIndex) => {
     console.warn(`Network error - retry attempt ${retryIndex + 1}:`, error);
     return timer(1000 * Math.pow(2, retryIndex)); // 1s, 2s, 4s delays
    }
   }),
   catchError((finalError) => {
    console.error('Network error after retries:', finalError);
    return throwError(() => finalError);
   })
  );
 }

 private handleServerError(req: HttpRequest<any>, next: HttpHandler, error: HttpErrorResponse): Observable<HttpEvent<any>> {
  return timer(2000).pipe(
   switchMap(() => next.handle(req)),
   retry({
    count: 1, 
    delay: () => timer(2000)
   }),
   catchError((finalError) => {
    console.error('Server error after retry:', finalError);
    return throwError(() => finalError);
   })
  );
 }
}
