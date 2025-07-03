import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UserService } from './user.service';
import { User, UserRole, UserSex, UserStatus, UpdateUserProfileDto, ApiResponse } from '../models/user.model';

const API_BASE_URL = 'http://localhost:3000/api/v1';

const MOCK_USER: User = {
  id: 1,
  role: UserRole.PRACTITIONER,
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  temporaryAccount: false,
  phoneNumber: '+1234567890',
  country: 'US',
  sex: UserSex.MALE,
  status: UserStatus.APPROVED,
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-02'),
  languageIds: [1, 2],
  specialityIds: [1],
  organizations: [{ id: 1, name: 'Test Hospital', createdAt: new Date(), updatedAt: new Date() }],
  groups: [{ id: 1, name: 'Emergency', organizationId: 1, sharedOnlyIncomingConsultation: false, createdAt: new Date(), updatedAt: new Date() }]
} as const;

const MOCK_UPDATE_DATA: UpdateUserProfileDto = {
  firstName: 'Jane',
  lastName: 'Smith',
  phoneNumber: '+9876543210',
  country: 'CA',
  sex: UserSex.FEMALE,
  languageIds: [2, 3],
  specialityIds: [2]
} as const;

function createTestBed(): void {
  TestBed.configureTestingModule({
    providers: [
      UserService,
      provideHttpClient(),
      provideHttpClientTesting()
    ]
  });
}

function createSuccessResponse<T>(data: T, message = 'Success'): ApiResponse<T> {
  return {
    success: true,
    message,
    data,
    statusCode: 200
  };
}

function createErrorResponse(statusCode: number, message: string): any {
  return {
    success: false,
    message,
    statusCode,
    data: null
  };
}

describe('UserService', () => {
  let userServiceSpy: UserService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    createTestBed();
    userServiceSpy = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Service Creation', () => {
    it('should be created', () => {
      expect(userServiceSpy).toBeTruthy();
      expect(userServiceSpy).toBeInstanceOf(UserService);
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user successfully', (done) => {
      const expectedResponse = createSuccessResponse(MOCK_USER, 'User retrieved successfully');

      userServiceSpy.getCurrentUser().subscribe({
        next: (user) => {
          expect(user).toEqual(MOCK_USER);
          expect(user.id).toBe(1);
          expect(user.email).toBe('john.doe@example.com');
          expect(user.firstName).toBe('John');
          expect(user.lastName).toBe('Doe');
          done();
        },
        error: () => done.fail('Should not have failed')
      });

      const req = httpMock.expectOne(`${API_BASE_URL}/auth/me`);
      expect(req.request.method).toBe('GET');
      req.flush(expectedResponse);
    });

    it('should handle unauthorized error with status 401', (done) => {
      const errorResponse = createErrorResponse(401, 'Unauthorized');

      userServiceSpy.getCurrentUser().subscribe({
        next: () => done.fail('Should have failed with unauthorized error'),
        error: (error) => {
          expect(error).toBeTruthy();
          expect(error.status).toBe(401);
          done();
        }
      });

      const req = httpMock.expectOne(`${API_BASE_URL}/auth/me`);
      req.flush(errorResponse, { status: 401, statusText: 'Unauthorized' });
    });

    it('should handle server error with status 500', (done) => {
      
      const errorResponse = createErrorResponse(500, 'Internal Server Error');

      userServiceSpy.getCurrentUser().subscribe({
        next: () => done.fail('Should have failed with server error'),
        error: (error) => {
          expect(error).toBeTruthy();
          expect(error.status).toBe(500);
          done();
        }
      });

      const req = httpMock.expectOne(`${API_BASE_URL}/auth/me`);
      req.flush(errorResponse, { status: 500, statusText: 'Internal Server Error' });
    });

    it('should handle missing data field in response', (done) => {
      const responseWithoutData = { success: true, message: 'Success', statusCode: 200 };

      userServiceSpy.getCurrentUser().subscribe({
        next: (user) => {
          expect(user).toBeUndefined();
          done();
        },
        error: () => done.fail('Should not have failed')
      });

      const req = httpMock.expectOne(`${API_BASE_URL}/auth/me`);
      req.flush(responseWithoutData);
    });
  });

  describe('updateUserProfile', () => {
    it('should update user profile successfully', (done) => {
      
      const userId = 1;
      const updatedUser = { ...MOCK_USER, ...MOCK_UPDATE_DATA };
      const expectedResponse = createSuccessResponse(updatedUser, 'Profile updated successfully');

      
      userServiceSpy.updateUserProfile(userId, MOCK_UPDATE_DATA).subscribe({
        next: (user) => {
          expect(user).toEqual(updatedUser);
          expect(user.firstName).toBe('Jane');
          expect(user.lastName).toBe('Smith');
          expect(user.phoneNumber).toBe('+9876543210');
          expect(user.country).toBe('CA');
          expect(user.sex).toBe(UserSex.FEMALE);
          expect(user.languageIds).toEqual([2, 3]);
          expect(user.specialityIds).toEqual([2]);
          done();
        },
        error: () => done.fail('Should not have failed')
      });

      const req = httpMock.expectOne(`${API_BASE_URL}/user/${userId}`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(MOCK_UPDATE_DATA);
      req.flush(expectedResponse);
    });

    it('should handle validation error with status 400', (done) => {
      const userId = 1;
      const invalidUpdateData = { firstName: '' }; 
      const errorResponse = createErrorResponse(400, 'Validation failed');

      userServiceSpy.updateUserProfile(userId, invalidUpdateData).subscribe({
        next: () => done.fail('Should have failed with validation error'),
        error: (error) => {
          expect(error).toBeTruthy();
          expect(error.status).toBe(400);
          done();
        }
      });

      const req = httpMock.expectOne(`${API_BASE_URL}/user/${userId}`);
      req.flush(errorResponse, { status: 400, statusText: 'Bad Request' });
    });

    it('should handle partial update data', (done) => {
      const userId = 1;
      const partialUpdate = { firstName: 'UpdatedName' };
      const updatedUser = { ...MOCK_USER, firstName: 'UpdatedName' };
      const expectedResponse = createSuccessResponse(updatedUser);

      userServiceSpy.updateUserProfile(userId, partialUpdate).subscribe({
        next: (user) => {
          
          expect(user.firstName).toBe('UpdatedName');
          expect(user.lastName).toBe(MOCK_USER.lastName); 
          done();
        },
        error: () => done.fail('Should not have failed')
      });

      const req = httpMock.expectOne(`${API_BASE_URL}/user/${userId}`);
      req.flush(expectedResponse);
    });
  });

  describe('getUserById', () => {
    it('should return user by id successfully', (done) => {
      
      const userId = 1;
      const expectedResponse = createSuccessResponse(MOCK_USER, 'User found');

      userServiceSpy.getUserById(userId).subscribe({
        next: (user) => {
          expect(user).toEqual(MOCK_USER);
          expect(user.id).toBe(userId);
          done();
        },
        error: () => done.fail('Should not have failed')
      });

      const req = httpMock.expectOne(`${API_BASE_URL}/user/${userId}`);
      expect(req.request.method).toBe('GET');
      req.flush(expectedResponse);
    });

    it('should handle user not found error with status 404', (done) => {
      const nonExistentUserId = 999;
      const errorResponse = createErrorResponse(404, 'User not found');

      userServiceSpy.getUserById(nonExistentUserId).subscribe({
        next: () => done.fail('Should have failed with not found error'),
        error: (error) => {
          expect(error).toBeTruthy();
          expect(error.status).toBe(404);
          done();
        }
      });

      const req = httpMock.expectOne(`${API_BASE_URL}/user/${nonExistentUserId}`);
      req.flush(errorResponse, { status: 404, statusText: 'Not Found' });
    });

    it('should handle invalid user id', (done) => {
     
      const invalidUserId = -1;
      const errorResponse = createErrorResponse(400, 'Invalid user ID');

      
      userServiceSpy.getUserById(invalidUserId).subscribe({
        next: () => done.fail('Should have failed with invalid ID error'),
        error: (error) => {
          
          expect(error).toBeTruthy();
          expect(error.status).toBe(400);
          done();
        }
      });

      const req = httpMock.expectOne(`${API_BASE_URL}/user/${invalidUserId}`);
      req.flush(errorResponse, { status: 400, statusText: 'Bad Request' });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', (done) => {
      
      userServiceSpy.getCurrentUser().subscribe({
        next: () => done.fail('Should have failed with network error'),
        error: (error) => {
          
          expect(error).toBeTruthy();
          expect(error.name).toBe('HttpErrorResponse');
          done();
        }
      });

      const req = httpMock.expectOne(`${API_BASE_URL}/auth/me`);
      req.error(new ProgressEvent('Network error'));
    });
  });
});
