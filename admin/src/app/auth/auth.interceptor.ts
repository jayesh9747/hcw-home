import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // const token = localStorage.getItem('access_token'); // adjust key if needed
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJFbWFpbCI6ImRhc2NoYXlhbjg4MzdAZ21haWwuY29tIiwiaWF0IjoxNzUwOTUxMjM2LCJleHAiOjE3NTEwMzc2MzZ9.S6gvQmixJX3nc5GTfeMTDQFfNl_NIBqw-oujmamTdY8'; // or sessionStorage
// testing 
  if (token) {
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
    return next(authReq);
  }

  return next(req);
};
