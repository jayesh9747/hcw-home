import { PipeTransform, Injectable } from '@nestjs/common';
import { HttpExceptionHelper } from 'src/common/helpers/execption/http-exception.helper';

@Injectable()
export class UserIdParamPipe implements PipeTransform<string, number> {
  transform(value: string): number {
    if (Array.isArray(value)) {
      throw HttpExceptionHelper.badRequest('userId must be a single value');
    }
    const userId = Number(value);
    if (!userId || isNaN(userId) || userId <= 0) {
      throw HttpExceptionHelper.badRequest('userId must be a positive integer');
    }
    return userId;
  }
}
