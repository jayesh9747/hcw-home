import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreatetermDto, UpdateTermDto } from './dto/terms.dto';
import { HttpExceptionHelper } from 'src/common/helpers/execption/http-exception.helper';
import {  Terms } from '@prisma/client';


@Injectable()
export class TermsService {
  private readonly logger = new Logger(TermsService.name);
  private bumpVersion(current: number, increment = 0.01): number {
    return parseFloat((current + increment).toFixed(2));
  }  

  constructor(private readonly databaseService: DatabaseService) {}

  async create(createTerm: CreatetermDto): Promise<Terms> {
    // Fetch latest version for the same language-country
    const latest = await this.databaseService.terms.findFirst({
      where: {
        language: createTerm.language,
        country: createTerm.country,
      },
      orderBy: { version: 'desc' },
    });
  
    const nextVersion = latest ? Math.floor(latest.version) + 1 : 1;
  
    // Create new versioned terms
    return await this.databaseService.terms.create({
      data: {
        ...createTerm,
        version: parseFloat(nextVersion.toFixed(2)),
      },
    });
  }
  

  async update(id: number, updateTerm: UpdateTermDto): Promise<Terms> {
    const exists = await this.databaseService.terms.findUnique({ where: { id } });
  
    if (!exists) {
      this.logger.log(`Terms with id ${id} not found`);
      throw HttpExceptionHelper.notFound(`Term with id:${id} not found`);
    }
  
    const newVersion = this.bumpVersion(exists.version);
  
    return await this.databaseService.terms.update({
      where: { id },
      data: {
        content: updateTerm.content,
        language: updateTerm.language,
        country: updateTerm.country,
        version: newVersion,
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
      orderBy: { version: 'desc' },
    });
  }

  async getLatest(language: string, country: string): Promise<Terms> {
    const term = await this.databaseService.terms.findFirst({
      where: { language, country },
      orderBy: { version: 'desc' },
    });

    if (!term) {
      throw HttpExceptionHelper.notFound(
        `No latest terms found for ${language}-${country}`,
      );
    }

    return term;
  }
}
