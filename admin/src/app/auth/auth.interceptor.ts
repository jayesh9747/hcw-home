import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // const token = localStorage.getItem('access_token'); // adjust key if needed
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJFbWFpbCI6ImRhc2NoYXlhbjg4MzdAZ21haWwuY29tIiwiaWF0IjoxNzUxMzExMTAxLCJleHAiOjE3NTE5MTU5MDF9.ZEFkbrTNqu94JFtGanLh0sl7ZDDXqtFQup3fsAUYx00'; // or sessionStorage
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
