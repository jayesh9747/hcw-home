// src/modules/organization/organization.service.ts
import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { QueryOrganizationDto } from './dto/query-organization.dto';
import { OrganizationResponseDto } from './dto/organization-response.dto';
import { plainToInstance } from 'class-transformer';
import { Prisma } from '@prisma/client';

@Injectable()
export class OrganizationService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(createOrganizationDto: CreateOrganizationDto): Promise<OrganizationResponseDto> {
    // Check if organization name already exists
    const existingOrganization = await this.databaseService.organization.findFirst({
      where: { name: createOrganizationDto.name },
    });

    if (existingOrganization) {
      throw new ConflictException('Organization name already exists');
    }

    // Create organization
    const organizationData = {
      ...createOrganizationDto,
      logo: createOrganizationDto.logo || null,
      primaryColor: createOrganizationDto.primaryColor || null,
      footerMarkdown: createOrganizationDto.footerMarkdown || null,
    };

    const organization = await this.databaseService.organization.create({
      data: organizationData,
    });

    return plainToInstance(OrganizationResponseDto, organization, {
      excludeExtraneousValues: false,
    });
  }

  async findAll(query: QueryOrganizationDto) {
    const {
      page = 1,
      limit = 10,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.OrganizationWhereInput = {};

    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive',
      };
    }

    // Build orderBy clause
    const orderBy: Prisma.OrganizationOrderByWithRelationInput = {};
    orderBy[sortBy] = sortOrder;

    // Execute queries in parallel
    const [organizations, total] = await Promise.all([
      this.databaseService.organization.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      this.databaseService.organization.count({ where }),
    ]);

    // Transform organizations to response DTOs
    const transformedOrganizations = organizations.map((organization) =>
      plainToInstance(OrganizationResponseDto, organization, {
        excludeExtraneousValues: false,
      }),
    );

    return {
      organizations: transformedOrganizations,
      total,
      page,
      limit,
    };
  }

  async findOne(id: number): Promise<OrganizationResponseDto> {
    const organization = await this.databaseService.organization.findUnique({
      where: { id },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return plainToInstance(OrganizationResponseDto, organization, {
      excludeExtraneousValues: false,
    });
  }

  async findByName(name: string): Promise<OrganizationResponseDto | null> {
    const organization = await this.databaseService.organization.findFirst({
      where: { name },
    });

    if (!organization) {
      return null;
    }

    return plainToInstance(OrganizationResponseDto, organization, {
      excludeExtraneousValues: false,
    });
  }

  async update(
    id: number,
    updateOrganizationDto: UpdateOrganizationDto,
  ): Promise<OrganizationResponseDto> {
    // Check if organization exists
    const existingOrganization = await this.databaseService.organization.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existingOrganization) {
      throw new NotFoundException('Organization not found');
    }

    // Check name uniqueness if name is being updated
    if (updateOrganizationDto.name) {
      const nameExists = await this.databaseService.organization.findFirst({
        where: {
          name: updateOrganizationDto.name,
          id: { not: id },
        },
        select: { id: true },
      });

      if (nameExists) {
        throw new ConflictException('Organization name already exists');
      }
    }

    // Prepare update data
    const updateData = {
      ...updateOrganizationDto,
      logo: updateOrganizationDto.logo === '' ? null : updateOrganizationDto.logo,
      primaryColor: updateOrganizationDto.primaryColor === '' ? null : updateOrganizationDto.primaryColor,
      footerMarkdown: updateOrganizationDto.footerMarkdown === '' ? null : updateOrganizationDto.footerMarkdown,
    };

    const organization = await this.databaseService.organization.update({
      where: { id },
      data: updateData,
    });

    return plainToInstance(OrganizationResponseDto, organization, {
      excludeExtraneousValues: false,
    });
  }

  async remove(id: number): Promise<OrganizationResponseDto> {
    // Check if organization exists
    const existingOrganization = await this.databaseService.organization.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existingOrganization) {
      throw new NotFoundException('Organization not found');
    }

    const organization = await this.databaseService.organization.delete({
      where: { id },
    });

    return plainToInstance(OrganizationResponseDto, organization, {
      excludeExtraneousValues: false,
    });
  }

}