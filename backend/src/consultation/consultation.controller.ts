import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UsePipes,
  ValidationPipe
} from '@nestjs/common';
import { ConsultationService } from './consultation.service';
import {
  JoinConsultationDto,
  JoinConsultationResponseDto,
} from './dto/join-consultation.dto';
import { UserIdParamPipe } from './validation/user-id-param.pipe';
import { ConsultationIdParamPipe } from './validation/consultation-id-param.pipe';
import { ApiResponseDto } from 'src/common/helpers/response/api-response.dto';
import { WaitingRoomPreviewResponseDto } from './dto/waiting-room-preview.dto';
import {
  AdmitPatientDto,
  AdmitPatientResponseDto,
} from './dto/admit-patient.dto';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiQuery,
  ApiOkResponse,
} from '@nestjs/swagger';

@ApiTags('consultation')
@Controller('consultation')
export class ConsultationController {
  constructor(private readonly consultationService: ConsultationService) {}

  @Post(':id/join/patient')
  @ApiOperation({ summary: 'Patient joins a consultation' })
  @ApiParam({ name: 'id', type: Number, description: 'Consultation ID' })
  @ApiBody({ type: JoinConsultationDto })
  @ApiOkResponse({
    description: 'Patient joined consultation',
    type: ApiResponseDto,
  })
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async joinPatient(
    @Param('id', ConsultationIdParamPipe) id: number,
    @Body() body: JoinConsultationDto,
  ): Promise<ApiResponseDto<JoinConsultationResponseDto>> {
    return this.consultationService.joinAsPatient(id, body.userId);
  }

  @Post(':id/join/practitioner')
  @ApiOperation({ summary: 'Practitioner joins a consultation' })
  @ApiParam({ name: 'id', type: Number, description: 'Consultation ID' })
  @ApiBody({ type: JoinConsultationDto })
  @ApiOkResponse({
    description: 'Practitioner joined consultation',
    type: ApiResponseDto,
  })
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async joinPractitioner(
    @Param('id', ConsultationIdParamPipe) id: number,
    @Body() body: JoinConsultationDto,
  ): Promise<ApiResponseDto<JoinConsultationResponseDto>> {
    return this.consultationService.joinAsPractitioner(id, body.userId);
  }

  @Post('/admit')
  @ApiOperation({
    summary: 'Admit a patient to a consultation (practitioner or admin only)',
  })
  @ApiBody({ type: AdmitPatientDto })
  @ApiOkResponse({
    description: 'Patient admitted to consultation',
    type: ApiResponseDto,
  })
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async admitPatient(
    @Body() dto: AdmitPatientDto,
    @Query('userId', UserIdParamPipe) userId: number, // Pass userId as query or get from auth context
  ): Promise<ApiResponseDto<AdmitPatientResponseDto>> {
    // In production, get userId and role from JWT/auth context instead of query
    return this.consultationService.admitPatient(dto, userId);
  }

  @Get('/waiting-room')
  @ApiOperation({ summary: 'Get waiting room consultations for a user' })
  @ApiQuery({ name: 'userId', type: Number, description: 'User ID' })
  @ApiOkResponse({
    description: 'Waiting room consultations',
    type: ApiResponseDto,
  })
  async getWaitingRoom(
    @Query('userId', UserIdParamPipe) userId: number,
  ): Promise<ApiResponseDto<WaitingRoomPreviewResponseDto>> {
    return this.consultationService.getWaitingRoomConsultations(userId);
  }
}
