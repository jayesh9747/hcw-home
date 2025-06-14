import { PipeTransform, Injectable } from '@nestjs/common';
import { HttpExceptionHelper } from 'src/common/helpers/execption/http-exception.helper';

@Injectable()
export class ConsultationIdParamPipe implements PipeTransform<string, number> {
  transform(value: string): number {
    if (Array.isArray(value)) {
      throw HttpExceptionHelper.badRequest(
        'consultationId must be a single value',
      );
    }
    const consultationId = Number(value);
    if (!consultationId || isNaN(consultationId) || consultationId <= 0) {
      throw HttpExceptionHelper.badRequest(
        'consultationId must be a positive integer',
      );
    }
    return consultationId;
  }
}
