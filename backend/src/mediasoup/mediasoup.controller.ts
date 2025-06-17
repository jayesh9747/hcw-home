import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Request } from 'express';
import { MediasoupServerService } from './mediasoup.service';
import { CreateMediasoupServerDto } from './dto/create-mediasoup-server.dto';
import { UpdateMediasoupServerDto } from './dto/update-mediasoup-server.dto';
import { QueryMediasoupServerDto } from './dto/query-mediasoup-server.dto';
import { ChangeMediasoupServerPasswordDto } from './dto/change-mediasoup-server-password.dto';
import { MediasoupServerResponseDto } from './dto/mediasoup-server-response.dto';
import { ZodValidationPipe } from 'src/common/pipes/zod-validation.pipe';
import {
  ApiResponseDto,
  PaginatedApiResponseDto,
} from 'src/common/helpers/response/api-response.dto';
import {
  createMediasoupServerSchema,
  updateMediasoupServerSchema,
  queryMediasoupServerSchema,
  changeMediasoupServerPasswordSchema,
} from './validation/mediasoup.validation';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Role } from 'src/auth/enums/role.enum';
import { Roles } from 'src/common/decorators/roles.decorator';

@ApiTags('mediasoup-servers')
@Controller('mediasoup-server')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class MediasoupServerController {
  constructor(
    private readonly mediasoupServerService: MediasoupServerService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new mediasoup server' })
  @ApiResponse({
    status: 201,
    description: 'Mediasoup server created successfully',
    type: MediasoupServerResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({
    status: 409,
    description: 'Conflict - server URL already exists',
  })
  async create(
    @Body(new ZodValidationPipe(createMediasoupServerSchema))
    createMediasoupServerDto: CreateMediasoupServerDto,
    @Req() req: Request,
  ) {
    const server = await this.mediasoupServerService.create(
      createMediasoupServerDto,
    );
    return ApiResponseDto.created(
      server,
      'Mediasoup server created successfully',
      {
        requestId: req['id'],
        path: req.path,
      },
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Get all mediasoup servers with pagination and filtering',
  })
  @ApiResponse({
    status: 200,
    description: 'Mediasoup servers retrieved successfully',
    type: [MediasoupServerResponseDto],
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search term for URL or username',
  })
  @ApiQuery({
    name: 'active',
    required: false,
    type: Boolean,
    description: 'Filter by active status',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: [
      'url',
      'username',
      'maxNumberOfSessions',
      'active',
      'createdAt',
      'updatedAt',
    ],
    description: 'Sort field',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['asc', 'desc'],
    description: 'Sort order',
  })
  async findAll(
    @Query(new ZodValidationPipe(queryMediasoupServerSchema))
    query: QueryMediasoupServerDto,
    @Req() req: Request,
  ) {
    const result = await this.mediasoupServerService.findAll(query);

    return PaginatedApiResponseDto.paginatedSuccess(
      result.servers,
      result.total,
      result.page,
      result.limit,
      'Mediasoup servers retrieved successfully',
      {
        requestId: req['id'],
        path: req.path,
      },
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get mediasoup server by ID' })
  @ApiParam({ name: 'id', description: 'Mediasoup server ID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Mediasoup server retrieved successfully',
    type: MediasoupServerResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Mediasoup server not found' })
  async findOne(@Param('id') id: string, @Req() req: Request) {
    const server = await this.mediasoupServerService.findOne(id);
    return ApiResponseDto.success(
      server,
      'Mediasoup server retrieved successfully',
      200,
      {
        requestId: req['id'],
        path: req.path,
      },
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update mediasoup server by ID' })
  @ApiParam({ name: 'id', description: 'Mediasoup server ID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Mediasoup server updated successfully',
    type: MediasoupServerResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 404, description: 'Mediasoup server not found' })
  @ApiResponse({
    status: 409,
    description: 'Conflict - server URL already exists',
  })
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateMediasoupServerSchema))
    updateMediasoupServerDto: UpdateMediasoupServerDto,
    @Req() req: Request,
  ) {
    const server = await this.mediasoupServerService.update(
      id,
      updateMediasoupServerDto,
    );
    return ApiResponseDto.success(
      server,
      'Mediasoup server updated successfully',
      200,
      {
        requestId: req['id'],
        path: req.path,
      },
    );
  }

  @Patch(':id/toggle-active')
  @ApiOperation({ summary: 'Toggle mediasoup server active status' })
  @ApiParam({ name: 'id', description: 'Mediasoup server ID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Mediasoup server active status toggled successfully',
    type: MediasoupServerResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Mediasoup server not found' })
  async toggleActive(@Param('id') id: string, @Req() req: Request) {
    const server = await this.mediasoupServerService.toggleActive(id);
    return ApiResponseDto.success(
      server,
      `Mediasoup server ${server.active ? 'activated' : 'deactivated'} successfully`,
      200,
      {
        requestId: req['id'],
        path: req.path,
      },
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete mediasoup server by ID' })
  @ApiParam({ name: 'id', description: 'Mediasoup server ID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Mediasoup server deleted successfully',
    type: MediasoupServerResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Mediasoup server not found' })
  async remove(@Param('id') id: string, @Req() req: Request) {
    const server = await this.mediasoupServerService.remove(id);
    return ApiResponseDto.success(
      server,
      'Mediasoup server deleted successfully',
      200,
      {
        requestId: req['id'],
        path: req.path,
      },
    );
  }
}
