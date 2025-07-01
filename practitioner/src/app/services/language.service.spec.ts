import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LanguageService } from './language.service';
import { Language, ApiResponse } from '../models/user.model';

const API_BASE_URL = 'http://localhost:3000/api/v1';

const MOCK_LANGUAGES: Language[] = [
  { id: 1, name: 'English', code: 'en', createdAt: new Date('2023-01-01'), updatedAt: new Date('2023-01-01') },
  { id: 2, name: 'Spanish', code: 'es', createdAt: new Date('2023-01-02'), updatedAt: new Date('2023-01-02') },
  { id: 3, name: 'French', code: 'fr', createdAt: new Date('2023-01-03'), updatedAt: new Date('2023-01-03') },
  { id: 4, name: 'German', code: 'de', createdAt: new Date('2023-01-04'), updatedAt: new Date('2023-01-04') }
] as const;

const MOCK_SINGLE_LANGUAGE: Language = MOCK_LANGUAGES[0];

function createTestBed(): void {
  TestBed.configureTestingModule({
    providers: [
      LanguageService,
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

describe('LanguageService', () => {
  let languageServiceSpy: LanguageService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    createTestBed();
    languageServiceSpy = TestBed.inject(LanguageService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Service Creation', () => {
    it('should be created', () => {
      // Assert
      expect(languageServiceSpy).toBeTruthy();
      expect(languageServiceSpy).toBeInstanceOf(LanguageService);
    });
  });

  describe('getAllLanguages', () => {
    it('should return all admin-created languages successfully', (done) => {
      // Arrange
      const expectedResponse = createSuccessResponse(MOCK_LANGUAGES, 'Languages retrieved successfully');

      // Act
      languageServiceSpy.getAllLanguages().subscribe({
        next: (languages) => {
          // Assert
          expect(languages).toEqual(MOCK_LANGUAGES);
          expect(languages.length).toBe(4);
          expect(languages[0].name).toBe('English');
          expect(languages[0].code).toBe('en');
          expect(languages[1].name).toBe('Spanish');
          expect(languages[1].code).toBe('es');
          done();
        },
        error: () => done.fail('Should not have failed')
      });

      const req = httpMock.expectOne(`${API_BASE_URL}/language`);
      expect(req.request.method).toBe('GET');
      req.flush(expectedResponse);
    });

    it('should return empty array when no languages available', (done) => {
      // Arrange
      const expectedResponse = createSuccessResponse([], 'No languages found');

      // Act
      languageServiceSpy.getAllLanguages().subscribe({
        next: (languages) => {
          // Assert
          expect(languages).toEqual([]);
          expect(languages.length).toBe(0);
          done();
        },
        error: () => done.fail('Should not have failed')
      });

      const req = httpMock.expectOne(`${API_BASE_URL}/language`);
      req.flush(expectedResponse);
    });

    it('should handle server error with status 500', (done) => {
      // Arrange
      const errorResponse = createErrorResponse(500, 'Internal Server Error');

      // Act
      languageServiceSpy.getAllLanguages().subscribe({
        next: () => done.fail('Should have failed with server error'),
        error: (error) => {
          // Assert
          expect(error).toBeTruthy();
          expect(error.status).toBe(500);
          done();
        }
      });

      const req = httpMock.expectOne(`${API_BASE_URL}/language`);
      req.flush(errorResponse, { status: 500, statusText: 'Internal Server Error' });
    });

    it('should handle missing data field in response', (done) => {
      // Arrange
      const responseWithoutData = { success: true, message: 'Success', statusCode: 200 };

      // Act
      languageServiceSpy.getAllLanguages().subscribe({
        next: (languages) => {
          // Assert
          expect(languages).toBeUndefined();
          done();
        },
        error: () => done.fail('Should not have failed')
      });

      const req = httpMock.expectOne(`${API_BASE_URL}/language`);
      req.flush(responseWithoutData);
    });
  });

  describe('getLanguageById', () => {
    it('should return language by id successfully', (done) => {
      // Arrange
      const languageId = 1;
      const expectedResponse = createSuccessResponse(MOCK_SINGLE_LANGUAGE, 'Language found');

      // Act
      languageServiceSpy.getLanguageById(languageId).subscribe({
        next: (language) => {
          // Assert
          expect(language).toEqual(MOCK_SINGLE_LANGUAGE);
          expect(language.id).toBe(languageId);
          expect(language.name).toBe('English');
          expect(language.code).toBe('en');
          done();
        },
        error: () => done.fail('Should not have failed')
      });

      const req = httpMock.expectOne(`${API_BASE_URL}/language/${languageId}`);
      expect(req.request.method).toBe('GET');
      req.flush(expectedResponse);
    });

    it('should handle language not found error with status 404', (done) => {
      // Arrange
      const nonExistentLanguageId = 999;
      const errorResponse = createErrorResponse(404, 'Language not found');

      // Act
      languageServiceSpy.getLanguageById(nonExistentLanguageId).subscribe({
        next: () => done.fail('Should have failed with not found error'),
        error: (error) => {
          // Assert
          expect(error).toBeTruthy();
          expect(error.status).toBe(404);
          done();
        }
      });

      const req = httpMock.expectOne(`${API_BASE_URL}/language/${nonExistentLanguageId}`);
      req.flush(errorResponse, { status: 404, statusText: 'Not Found' });
    });

    it('should handle invalid language id with status 400', (done) => {
      // Arrange
      const invalidLanguageId = -1;
      const errorResponse = createErrorResponse(400, 'Invalid language ID');

      // Act
      languageServiceSpy.getLanguageById(invalidLanguageId).subscribe({
        next: () => done.fail('Should have failed with invalid ID error'),
        error: (error) => {
          // Assert
          expect(error).toBeTruthy();
          expect(error.status).toBe(400);
          done();
        }
      });

      const req = httpMock.expectOne(`${API_BASE_URL}/language/${invalidLanguageId}`);
      req.flush(errorResponse, { status: 400, statusText: 'Bad Request' });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', (done) => {
      // Arrange
      languageServiceSpy.getAllLanguages().subscribe({
        next: () => done.fail('Should have failed with network error'),
        error: (error) => {
          // Assert
          expect(error).toBeTruthy();
          expect(error.name).toBe('HttpErrorResponse');
          done();
        }
      });

      const req = httpMock.expectOne(`${API_BASE_URL}/language`);
      req.error(new ProgressEvent('Network error'));
    });

    it('should handle timeout errors', (done) => {
      // Arrange
      languageServiceSpy.getLanguageById(1).subscribe({
        next: () => done.fail('Should have failed with timeout error'),
        error: (error) => {
          // Assert
          expect(error).toBeTruthy();
          expect(error.status).toBe(408);
          done();
        }
      });

      const req = httpMock.expectOne(`${API_BASE_URL}/language/1`);
      req.flush('Request timeout', { status: 408, statusText: 'Request Timeout' });
    });
  });

  describe('Data Integrity', () => {
    const testCases = [
      { id: 1, expected: 'English' },
      { id: 2, expected: 'Spanish' },
      { id: 3, expected: 'French' },
      { id: 4, expected: 'German' }
    ];

    testCases.forEach(({ id, expected }) => {
      it(`should return correct language for ID ${id}`, (done) => {
        // Arrange
        const mockLanguage = MOCK_LANGUAGES.find(lang => lang.id === id);
        const expectedResponse = createSuccessResponse(mockLanguage);

        // Act
        languageServiceSpy.getLanguageById(id).subscribe({
          next: (language) => {
            // Assert
            expect(language.name).toBe(expected);
            expect(language.id).toBe(id);
            done();
          },
          error: () => done.fail('Should not have failed')
        });

        const req = httpMock.expectOne(`${API_BASE_URL}/language/${id}`);
        req.flush(expectedResponse);
      });
    });
  });
});
