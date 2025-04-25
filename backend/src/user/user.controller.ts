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
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import {
  ApiResponseDto,
  PaginatedApiResponseDto,
} from '../common/dto/api-response.dto';
import { UserResponseDto } from './dto/user-response.dto';

@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    type: () => ApiResponseDto,
  })
  async create(@Body() createUserDto: CreateUserDto) {
    const user = await this.userService.create(createUserDto);
    return ApiResponseDto.success(user, 'User created successfully', 201);
  }

  @Get()
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
    type: () => PaginatedApiResponseDto,
  })
  async findAll(@Query('page') page = 1, @Query('limit') limit = 10) {
    const { users, total } = await this.userService.findAll(+page, +limit);
    return PaginatedApiResponseDto.paginatedSuccess(
      users,
      total,
      +page,
      +limit,
      'Users retrieved successfully',
    );
  }

  @Get(':id')
  @ApiResponse({
    status: 200,
    description: 'User retrieved successfully',
    type: () => ApiResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const user = await this.userService.findOne(id);
    return ApiResponseDto.success(user, 'User retrieved successfully');
  }

  @Patch(':id')
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    type: () => ApiResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const user = await this.userService.update(id, updateUserDto);
    return ApiResponseDto.success(user, 'User updated successfully');
  }

  @Delete(':id')
  @ApiResponse({
    status: 200,
    description: 'User deleted successfully',
    type: () => ApiResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    const user = await this.userService.remove(id);
    return ApiResponseDto.success(user, 'User deleted successfully');
  }
}
