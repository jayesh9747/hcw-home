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
import { GroupService } from './group.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { QueryGroupDto } from './dto/query-group.dto';
import { GroupResponseDto } from './dto/group-response.dto';
import { AddMemberToGroupDto } from './dto/add-member-to-group.dto';
import { GroupMemberResponseDto } from './dto/group-member-response.dto';
import { ZodValidationPipe } from 'src/common/pipes/zod-validation.pipe';
import {
  ApiResponseDto,
  PaginatedApiResponseDto,
} from 'src/common/helpers/response/api-response.dto';
import {
  createGroupSchema,
  updateGroupSchema,
  queryGroupSchema,
  addMemberToGroupSchema,
} from './validation/group.validation';

@ApiTags('organizations/groups')
@Controller('organization/:organizationId/groups')
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new group in an organization' })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization ID',
    type: 'number',
  })
  @ApiResponse({
    status: 201,
    description: 'Group created successfully',
    type: GroupResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  @ApiResponse({
    status: 409,
    description: 'Conflict - group name already exists',
  })
  async create(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Body(new ZodValidationPipe(createGroupSchema))
    createGroupDto: CreateGroupDto,
    @Req() req: Request,
  ) {
    const group = await this.groupService.create(
      organizationId,
      createGroupDto,
    );
    return ApiResponseDto.created(group, 'Group created successfully', {
      requestId: req['id'],
      path: req.path,
    });
  }

  @Get()
  @ApiOperation({
    summary: 'Get all groups in an organization with pagination and filtering',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization ID',
    type: 'number',
  })
  @ApiResponse({
    status: 200,
    description: 'Groups retrieved successfully',
    type: [GroupResponseDto],
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
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
    description: 'Search term',
  })
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
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query(new ZodValidationPipe(queryGroupSchema)) query: QueryGroupDto,
    @Req() req: Request,
  ) {
    const result = await this.groupService.findAll(organizationId, query);

    return PaginatedApiResponseDto.paginatedSuccess(
      result.groups,
      result.total,
      result.page,
      result.limit,
      'Groups retrieved successfully',
      {
        requestId: req['id'],
        path: req.path,
      },
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get group by ID' })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization ID',
    type: 'number',
  })
  @ApiParam({ name: 'id', description: 'Group ID', type: 'number' })
  @ApiResponse({
    status: 200,
    description: 'Group retrieved successfully',
    type: GroupResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Group not found' })
  async findOne(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
  ) {
    const group = await this.groupService.findOne(organizationId, id);
    return ApiResponseDto.success(group, 'Group retrieved successfully', 200, {
      requestId: req['id'],
      path: req.path,
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update group by ID' })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization ID',
    type: 'number',
  })
  @ApiParam({ name: 'id', description: 'Group ID', type: 'number' })
  @ApiResponse({
    status: 200,
    description: 'Group updated successfully',
    type: GroupResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 404, description: 'Group not found' })
  @ApiResponse({
    status: 409,
    description: 'Conflict - group name already exists',
  })
  async update(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(updateGroupSchema))
    updateGroupDto: UpdateGroupDto,
    @Req() req: Request,
  ) {
    const group = await this.groupService.update(
      organizationId,
      id,
      updateGroupDto,
    );
    return ApiResponseDto.success(group, 'Group updated successfully', 200, {
      requestId: req['id'],
      path: req.path,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete group by ID' })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization ID',
    type: 'number',
  })
  @ApiParam({ name: 'id', description: 'Group ID', type: 'number' })
  @ApiResponse({
    status: 200,
    description: 'Group deleted successfully',
    type: GroupResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Group not found' })
  async remove(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
  ) {
    const group = await this.groupService.remove(organizationId, id);
    return ApiResponseDto.success(group, 'Group deleted successfully', 200, {
      requestId: req['id'],
      path: req.path,
    });
  }

  // Group Members Management
  @Post(':id/members')
  @ApiOperation({ summary: 'Add a member to a group' })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization ID',
    type: 'number',
  })
  @ApiParam({ name: 'id', description: 'Group ID', type: 'number' })
  @ApiResponse({
    status: 201,
    description: 'Member added to group successfully',
    type: GroupMemberResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 404, description: 'Group not found' })
  @ApiResponse({
    status: 409,
    description: 'User is already a member of this group',
  })
  async addMember(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) groupId: number,
    @Body(new ZodValidationPipe(addMemberToGroupSchema))
    addMemberDto: AddMemberToGroupDto,
    @Req() req: Request,
  ) {
    const member = await this.groupService.addMember(
      organizationId,
      groupId,
      addMemberDto,
    );
    return ApiResponseDto.created(
      member,
      'Member added to group successfully',
      {
        requestId: req['id'],
        path: req.path,
      },
    );
  }

  @Delete(':id/members/:userId')
  @ApiOperation({ summary: 'Remove a member from a group' })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization ID',
    type: 'number',
  })
  @ApiParam({ name: 'id', description: 'Group ID', type: 'number' })
  @ApiParam({ name: 'userId', description: 'User ID', type: 'number' })
  @ApiResponse({
    status: 200,
    description: 'Member removed from group successfully',
    type: GroupMemberResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Group or member not found' })
  async removeMember(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) groupId: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Req() req: Request,
  ) {
    const member = await this.groupService.removeMember(
      organizationId,
      groupId,
      userId,
    );
    return ApiResponseDto.success(
      member,
      'Member removed from group successfully',
      200,
      {
        requestId: req['id'],
        path: req.path,
      },
    );
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Get all members of a group' })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization ID',
    type: 'number',
  })
  @ApiParam({ name: 'id', description: 'Group ID', type: 'number' })
  @ApiResponse({
    status: 200,
    description: 'Group members retrieved successfully',
    type: [GroupMemberResponseDto],
  })
  @ApiResponse({ status: 404, description: 'Group not found' })
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
    description: 'Search term',
  })
  async getGroupMembers(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) groupId: number,
    @Query(new ZodValidationPipe(queryGroupSchema)) query: QueryGroupDto,
    @Req() req: Request,
  ) {
    const result = await this.groupService.getGroupMembers(
      organizationId,
      groupId,
      query,
    );

    return PaginatedApiResponseDto.paginatedSuccess(
      result.members,
      result.total,
      result.page,
      result.limit,
      'Group members retrieved successfully',
      {
        requestId: req['id'],
        path: req.path,
      },
    );
  }
}
