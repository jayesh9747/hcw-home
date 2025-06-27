import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { HttpExceptionHelper } from 'src/common/helpers/execption/http-exception.helper';
import { Prisma, Terms } from '@prisma/client';
import { CreatetermDto,QueryTermsDto, UpdateTermDto } from 'src/term/dto/terms.dto';

@Injectable()
export class TermService {
  private readonly logger = new Logger(TermService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  private bumpVersion(current: number, increment = 0.01): number {
    return parseFloat((current + increment).toFixed(2));
  }

  async create(organizationId: number, dto: CreatetermDto): Promise<Terms> {
    this.logger.log('create term called')
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

  async update(id: number, dto: UpdateTermDto): Promise<Terms> {
    this.logger.log('update term called')

    const exists = await this.databaseService.terms.findFirst({
      where: { id },
    });

    if (!exists) {
      this.logger.warn(`Terms with id ${id} not found `);
      throw HttpExceptionHelper.notFound(`Term with id:${id} not found `);
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

  async delete(id: number): Promise<Terms> {
    this.logger.log('delete term called')
    const exists = await this.databaseService.terms.findFirst({
      where: { id },
    });

    if (!exists) {
      this.logger.warn(`Terms with id ${id} not found `);
      throw HttpExceptionHelper.notFound(`Terms with id ${id} not found`);
    }

    return this.databaseService.terms.delete({
      where: { id },
    });
  }

  async findAllunderOrg(query: QueryTermsDto, organizationId: number) {
    this.logger.log('find term with orgs called')
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


  async findAll(query: QueryTermsDto) {
    this.logger.log('terms find all function called')
    const { language, country, page = 1, limit = 10, organizationId } = query;
    const skip = (page - 1) * limit;
    const pageNumber = Number(page) || 1;

  
    const where: Prisma.TermsWhereInput = {
      ...(organizationId &&{organizationId}),
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
  

  async findById(id: number) {
    this.logger.log('find term by id called')

    const term = await this.databaseService.terms.findUnique({
      where: { id },
    });
  
    if (!term) {
      throw HttpExceptionHelper.notFound(`Term with ID ${id} not found`);
    }
  
    return term;
  }
  

  async getLatest( query: QueryTermsDto): Promise<Terms> {
    this.logger.log('latest term called')

    const { language, country,organizationId } = query;

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
