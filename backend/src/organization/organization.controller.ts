import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Request } from 'express';
import { OrganizationService } from './organization.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { QueryOrganizationDto } from './dto/query-organization.dto';
import { OrganizationResponseDto } from './dto/organization-response.dto';
import { ZodValidationPipe } from 'src/common/pipes/zod-validation.pipe';
import {
  ApiResponseDto,
  PaginatedApiResponseDto,
} from 'src/common/helpers/response/api-response.dto';
import {
  createOrganizationSchema,
  updateOrganizationSchema,
  queryOrganizationSchema,
} from './validation/organization.validation';

@ApiTags('organizations')
@Controller('organization')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new organization' })
  @ApiResponse({
    status: 201,
    description: 'Organization created successfully',
    type: OrganizationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 409, description: 'Conflict - organization name already exists' })
  async create(
    @Body(new ZodValidationPipe(createOrganizationSchema))
    createOrganizationDto: CreateOrganizationDto,
    @Req() req: Request,
  ) {
    const organization = await this.organizationService.create(createOrganizationDto);
    return ApiResponseDto.created(organization, 'Organization created successfully', {
      requestId: req['id'],
      path: req.path,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get all organizations with pagination and filtering' })
  @ApiResponse({
    status: 200,
    description: 'Organizations retrieved successfully',
    type: [OrganizationResponseDto],
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search term' })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['id', 'name', 'createdAt', 'updatedAt'],
    description: 'Sort field',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['asc', 'desc'],
    description: 'Sort order',
  })
  async findAll(
    @Query(new ZodValidationPipe(queryOrganizationSchema))
    query: QueryOrganizationDto,
    @Req() req: Request,
  ) {
    const result = await this.organizationService.findAll(query);

    return PaginatedApiResponseDto.paginatedSuccess(
      result.organizations,
      result.total,
      result.page,
      result.limit,
      'Organizations retrieved successfully',
      {
        requestId: req['id'],
        path: req.path,
      },
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get organization by ID' })
  @ApiParam({ name: 'id', description: 'Organization ID', type: 'number' })
  @ApiResponse({
    status: 200,
    description: 'Organization retrieved successfully',
    type: OrganizationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async findOne(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const organization = await this.organizationService.findOne(id);
    return ApiResponseDto.success(organization, 'Organization retrieved successfully', 200, {
      requestId: req['id'],
      path: req.path,
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update organization by ID' })
  @ApiParam({ name: 'id', description: 'Organization ID', type: 'number' })
  @ApiResponse({
    status: 200,
    description: 'Organization updated successfully',
    type: OrganizationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  @ApiResponse({ status: 409, description: 'Conflict - organization name already exists' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(updateOrganizationSchema))
    updateOrganizationDto: UpdateOrganizationDto,
    @Req() req: Request,
  ) {
    const organization = await this.organizationService.update(id, updateOrganizationDto);
    return ApiResponseDto.success(organization, 'Organization updated successfully', 200, {
      requestId: req['id'],
      path: req.path,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete organization by ID' })
  @ApiParam({ name: 'id', description: 'Organization ID', type: 'number' })
  @ApiResponse({
    status: 200,
    description: 'Organization deleted successfully',
    type: OrganizationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const organization = await this.organizationService.remove(id);
    return ApiResponseDto.success(organization, 'Organization deleted successfully', 200, {
      requestId: req['id'],
      path: req.path,
    });
  }

}