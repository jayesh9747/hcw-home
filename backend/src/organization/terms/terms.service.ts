import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreatetermDto, QueryTermsDto, UpdateTermDto } from './dto/terms.dto';
import { HttpExceptionHelper } from 'src/common/helpers/execption/http-exception.helper';
import { Prisma, Terms } from '@prisma/client';

@Injectable()
export class TermsService {
  private readonly logger = new Logger(TermsService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  private bumpVersion(current: number, increment = 0.01): number {
    return parseFloat((current + increment).toFixed(2));
  }

  async create(organizationId: number, dto: CreatetermDto): Promise<Terms> {
    const latest = await this.databaseService.terms.findFirst({
      where: {
        organizationId,
        language: dto.language,
        country: dto.country,
      },
      orderBy: { version: 'desc' },
    });

    const nextVersion = latest ? Math.floor(latest.version) + 1 : 1;

    return this.databaseService.terms.create({
      data: {
        ...dto,
        organizationId,
        version: parseFloat(nextVersion.toFixed(2)),
      },
    });
  }

  async update(id: number, organizationId: number, dto: UpdateTermDto): Promise<Terms> {
    const exists = await this.databaseService.terms.findFirst({
      where: { id, organizationId },
    });

    if (!exists) {
      this.logger.warn(`Terms with id ${id} not found for organization ${organizationId}`);
      throw HttpExceptionHelper.notFound(`Term with id:${id} not found for this organization`);
    }

    const newVersion = this.bumpVersion(exists.version);

    return this.databaseService.terms.update({
      where: { id },
      data: {
        content: dto.content,
        language: dto.language,
        country: dto.country,
        version: newVersion,
      },
    });
  }

  async delete(id: number, organizationId: number): Promise<Terms> {
    const exists = await this.databaseService.terms.findFirst({
      where: { id, organizationId },
    });

    if (!exists) {
      this.logger.warn(`Terms with id ${id} not found for org ${organizationId}`);
      throw HttpExceptionHelper.notFound(`Terms with id ${id} not found`);
    }

    return this.databaseService.terms.delete({
      where: { id },
    });
  }

  async findAll(query: QueryTermsDto, organizationId: number) {
    const { language, country, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.TermsWhereInput = {
      organizationId,
      ...(language && { language }),
      ...(country && { country }),
    };

    const [terms, total] = await Promise.all([
      this.databaseService.terms.findMany({
        where,
        skip,
        take: limit,
        orderBy: { version: 'desc' },
      }),
      this.databaseService.terms.count({ where }),
    ]);

    return {
      terms,
      total,
      page,
      limit,
    };
  }

  async getLatest(organizationId: number, query: QueryTermsDto): Promise<Terms> {
    const { language, country } = query;

    const term = await this.databaseService.terms.findFirst({
      where: {
        organizationId,
        language,
        country,
      },
      orderBy: { version: 'desc' },
    });

    if (!term) {
      throw HttpExceptionHelper.notFound(
        `No latest terms found for ${language}-${country} in org ${organizationId}`,
      );
    }

    return term;
  }
}
