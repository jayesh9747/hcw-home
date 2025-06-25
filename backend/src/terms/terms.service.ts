import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreatetermDto, UpdateTermDto } from './dto/terms.dto';
import { HttpExceptionHelper } from 'src/common/helpers/execption/http-exception.helper';
import {  Terms } from '@prisma/client';


@Injectable()
export class TermsService {
  private readonly logger = new Logger(TermsService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async create(createTerm: CreatetermDto): Promise<Terms> {
    await this.databaseService.terms.updateMany({
      where: {
        language: createTerm.language,
        country: createTerm.country,
        isLatest: true,
      },
      data: { isLatest: false },
    });

    return await this.databaseService.terms.create({
      data: { ...createTerm, isLatest: true },
    });
  }

  async update(id: number, updateTerm:UpdateTermDto): Promise<Terms> {
    const exists = await this.databaseService.terms.findUnique({ where: { id } });
    if (!exists) {
      this.logger.log(`Terms with id ${id} not found`)
      throw HttpExceptionHelper.notFound(`Term with id:${id} not found yooo`)
    }
    return await this.databaseService.terms.update({
      where: { id },
      data: { 
        content:updateTerm.content,
        language:updateTerm.language,
        country:updateTerm.country,
       },
    });
  }

  async delete(id: number): Promise<Terms> {
    const exists = await this.databaseService.terms.findUnique({ where: { id } });
    if (!exists) {
        this.logger.log(`Terms with id ${id} not found`)
        throw HttpExceptionHelper.notFound(`Terms with id ${id} not found`);
    }

    return await this.databaseService.terms.delete({
      where: { id },
    });
  }

  async list(): Promise<Terms[]> {
    return await this.databaseService.terms.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getLatest(language: string, country: string): Promise<Terms | null> {
    const term = await this.databaseService.terms.findFirst({
      where: { language, country, isLatest: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!term) {
      throw HttpExceptionHelper.notFound(
        `No latest terms found for ${language}-${country}`,
      );
    }

    return term;
  }
}
