import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SpecialityService } from './speciality.service';
import { Speciality, ApiResponse } from '../models/user.model';

const API_BASE_URL = 'http://localhost:3000/api/v1';

const MOCK_SPECIALITIES: Speciality[] = [
  { id: 1, name: 'Cardiology', description: 'Heart and cardiovascular system', createdAt: new Date('2023-01-01'), updatedAt: new Date('2023-01-01') },
  { id: 2, name: 'Dermatology', description: 'Skin, hair, and nails', createdAt: new Date('2023-01-02'), updatedAt: new Date('2023-01-02') },
  { id: 3, name: 'Neurology', description: 'Nervous system disorders', createdAt: new Date('2023-01-03'), updatedAt: new Date('2023-01-03') },
  { id: 4, name: 'Orthopedics', description: 'Musculoskeletal system', createdAt: new Date('2023-01-04'), updatedAt: new Date('2023-01-04') }
] as const;

const MOCK_SINGLE_SPECIALITY: Speciality = MOCK_SPECIALITIES[0];

function createTestBed(): void {
  TestBed.configureTestingModule({
    providers: [
      SpecialityService,
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

describe('SpecialityService', () => {
  let specialityServiceSpy: SpecialityService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    createTestBed();
    specialityServiceSpy = TestBed.inject(SpecialityService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Service Creation', () => {
    it('should be created', () => {

      expect(specialityServiceSpy).toBeTruthy();
      expect(specialityServiceSpy).toBeInstanceOf(SpecialityService);
    });
  });

  describe('getAllSpecialities', () => {
    it('should return all admin-created specialities successfully', (done) => {
     
      const expectedResponse = createSuccessResponse(MOCK_SPECIALITIES, 'Specialities retrieved successfully');

      specialityServiceSpy.getAllSpecialities().subscribe({
        next: (specialities) => {

          expect(specialities).toEqual(MOCK_SPECIALITIES);
          expect(specialities.length).toBe(4);
          expect(specialities[0].name).toBe('Cardiology');
          expect(specialities[0].description).toBe('Heart and cardiovascular system');
          expect(specialities[1].name).toBe('Dermatology');
          expect(specialities[1].description).toBe('Skin, hair, and nails');
          done();
        },
        error: () => done.fail('Should not have failed')
      });

      const req = httpMock.expectOne(`${API_BASE_URL}/speciality`);
      expect(req.request.method).toBe('GET');
      req.flush(expectedResponse);
    });

    it('should return empty array when no specialities available', (done) => {

      const expectedResponse = createSuccessResponse([], 'No specialities found');

      specialityServiceSpy.getAllSpecialities().subscribe({
        next: (specialities) => {

          expect(specialities).toEqual([]);
          expect(specialities.length).toBe(0);
          done();
        },
        error: () => done.fail('Should not have failed')
      });

      const req = httpMock.expectOne(`${API_BASE_URL}/speciality`);
      req.flush(expectedResponse);
    });

    it('should handle server error with status 500', (done) => {
     
      const errorResponse = createErrorResponse(500, 'Internal Server Error');

    
      specialityServiceSpy.getAllSpecialities().subscribe({
        next: () => done.fail('Should have failed with server error'),
        error: (error) => {
      
          expect(error).toBeTruthy();
          expect(error.status).toBe(500);
          done();
        }
      });

      const req = httpMock.expectOne(`${API_BASE_URL}/speciality`);
      req.flush(errorResponse, { status: 500, statusText: 'Internal Server Error' });
    });

    it('should handle missing data field in response', (done) => {

      const responseWithoutData = { success: true, message: 'Success', statusCode: 200 };


      specialityServiceSpy.getAllSpecialities().subscribe({
        next: (specialities) => {
    
          expect(specialities).toBeUndefined();
          done();
        },
        error: () => done.fail('Should not have failed')
      });

      const req = httpMock.expectOne(`${API_BASE_URL}/speciality`);
      req.flush(responseWithoutData);
    });
  });

  describe('getSpecialityById', () => {
    it('should return speciality by id successfully', (done) => {
 
      const specialityId = 1;
      const expectedResponse = createSuccessResponse(MOCK_SINGLE_SPECIALITY, 'Speciality found');

      specialityServiceSpy.getSpecialityById(specialityId).subscribe({
        next: (speciality) => {
    
          expect(speciality).toEqual(MOCK_SINGLE_SPECIALITY);
          expect(speciality.id).toBe(specialityId);
          expect(speciality.name).toBe('Cardiology');
          expect(speciality.description).toBe('Heart and cardiovascular system');
          done();
        },
        error: () => done.fail('Should not have failed')
      });

      const req = httpMock.expectOne(`${API_BASE_URL}/speciality/${specialityId}`);
      expect(req.request.method).toBe('GET');
      req.flush(expectedResponse);
    });

    it('should handle speciality not found error with status 404', (done) => {

      const nonExistentSpecialityId = 999;
      const errorResponse = createErrorResponse(404, 'Speciality not found');

      specialityServiceSpy.getSpecialityById(nonExistentSpecialityId).subscribe({
        next: () => done.fail('Should have failed with not found error'),
        error: (error) => {
         
          expect(error).toBeTruthy();
          expect(error.status).toBe(404);
          done();
        }
      });

      const req = httpMock.expectOne(`${API_BASE_URL}/speciality/${nonExistentSpecialityId}`);
      req.flush(errorResponse, { status: 404, statusText: 'Not Found' });
    });

    it('should handle invalid speciality id with status 400', (done) => {
   
      const invalidSpecialityId = -1;
      const errorResponse = createErrorResponse(400, 'Invalid speciality ID');

      specialityServiceSpy.getSpecialityById(invalidSpecialityId).subscribe({
        next: () => done.fail('Should have failed with invalid ID error'),
        error: (error) => {
  
          expect(error).toBeTruthy();
          expect(error.status).toBe(400);
          done();
        }
      });

      const req = httpMock.expectOne(`${API_BASE_URL}/speciality/${invalidSpecialityId}`);
      req.flush(errorResponse, { status: 400, statusText: 'Bad Request' });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', (done) => {
  
      specialityServiceSpy.getAllSpecialities().subscribe({
        next: () => done.fail('Should have failed with network error'),
        error: (error) => {

          expect(error).toBeTruthy();
          expect(error.name).toBe('HttpErrorResponse');
          done();
        }
      });

      const req = httpMock.expectOne(`${API_BASE_URL}/speciality`);
      req.error(new ProgressEvent('Network error'));
    });

    it('should handle timeout errors', (done) => {

      specialityServiceSpy.getSpecialityById(1).subscribe({
        next: () => done.fail('Should have failed with timeout error'),
        error: (error) => {

          expect(error).toBeTruthy();
          expect(error.status).toBe(408);
          done();
        }
      });

      const req = httpMock.expectOne(`${API_BASE_URL}/speciality/1`);
      req.flush('Request timeout', { status: 408, statusText: 'Request Timeout' });
    });
  });

  describe('Data Integrity', () => {
    const testCases = [
      { id: 1, expected: 'Cardiology' },
      { id: 2, expected: 'Dermatology' },
      { id: 3, expected: 'Neurology' },
      { id: 4, expected: 'Orthopedics' }
    ];

    testCases.forEach(({ id, expected }) => {
      it(`should return correct speciality for ID ${id}`, (done) => {
        
        const mockSpeciality = MOCK_SPECIALITIES.find(spec => spec.id === id);
        const expectedResponse = createSuccessResponse(mockSpeciality);

        
        specialityServiceSpy.getSpecialityById(id).subscribe({
          next: (speciality) => {
            
            expect(speciality.name).toBe(expected);
            expect(speciality.id).toBe(id);
            done();
          },
          error: () => done.fail('Should not have failed')
        });

        const req = httpMock.expectOne(`${API_BASE_URL}/speciality/${id}`);
        req.flush(expectedResponse);
      });
    });
  });
});
