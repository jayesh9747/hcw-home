import {
  Body,
  Controller,
  Param,
  Post,
  Put,
  Get,
  Delete,
  Query,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { TermsService } from './terms.service';
import { CreatetermDto, UpdateTermDto } from './dto/terms.dto';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/auth/enums/role.enum';
import { ApiResponseDto } from 'src/common/helpers/response/api-response.dto';
import { ZodValidationPipe } from 'src/common/pipes/zod-validation.pipe';
import { CreateTermSchema } from './validation/term.validation';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Terms')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('terms')
export class TermsController {
  constructor(private readonly termsService: TermsService) {}

  @Post()
  @ApiOperation({ summary: 'Create new terms' })
  @ApiBody({ type: CreatetermDto })
  @ApiResponse({ status: 201, description: 'Terms created successfully' })
  async create(
    @Body(new ZodValidationPipe(CreateTermSchema)) dto: CreatetermDto,
  ) {
    const data = await this.termsService.create(dto);
    return ApiResponseDto.success(data, 'Term created successfully');
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update terms  by ID' })
  @ApiResponse({ status: 200, description: 'Terms updated successfully' })
  async update(@Param('id') id: string, @Body() updateTerm:UpdateTermDto ) {
    const data = await this.termsService.update(Number(id), updateTerm);
    return ApiResponseDto.success(data, 'Term updated successfully');
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete terms by ID' })
  @ApiResponse({ status: 200, description: 'Terms deleted successfully' })
  async delete(@Param('id') id: string) {
    const data = await this.termsService.delete(Number(id));
    return ApiResponseDto.success(data, 'Term deleted successfully');
  }

  @Get()
  @ApiOperation({ summary: 'List all terms' })
  @ApiResponse({ status: 200, description: 'Terms retrieved successfully' })
  async list() {
    const data = await this.termsService.list();
    return ApiResponseDto.success(data, 'Terms retrieved successfully');
  }

  @Get('latest')
  @ApiOperation({ summary: 'Get latest terms for language and country' })
  @ApiQuery({ name: 'language', required: true })
  @ApiQuery({ name: 'country', required: true })
  @ApiResponse({ status: 200, description: 'Latest term retrieved successfully' })
  async latest(
    @Query('language') lang: string,
    @Query('country') country: string,
  ) {
    const data = await this.termsService.getLatest(lang, country);
    return ApiResponseDto.success(data, 'Latest term retrieved successfully');
  }
}
