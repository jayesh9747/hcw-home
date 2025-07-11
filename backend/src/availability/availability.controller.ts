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
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AvailabilityService } from './availability.service';
import { CreateAvailabilityDto } from './dto/create-availability.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { AvailabilityResponseDto } from './dto/availability-response.dto';
import { TimeSlotResponseDto } from './dto/time-slot.dto';
import { AuthGuard } from '../auth/guards/auth.guard';

@ApiTags('availability')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Post()
  @ApiResponse({
    status: 201,
    description: 'Availability created successfully.',
    type: AvailabilityResponseDto,
  })
  create(@Body() createAvailabilityDto: CreateAvailabilityDto) {
    return this.availabilityService.createAvailability(createAvailabilityDto);
  }

  @Get('all')
  @ApiResponse({
    status: 200,
    description: 'All availabilities retrieved successfully (Admin only).',
    type: [AvailabilityResponseDto],
  })
  findAll() {
    return this.availabilityService.findAll();
  }

  @Get('practitioner/:practitionerId')
  @ApiResponse({
    status: 200,
    description: 'Practitioner availability retrieved successfully.',
    type: [AvailabilityResponseDto],
  })
  findAllByPractitioner(
    @Param('practitionerId', ParseIntPipe) practitionerId: number,
  ) {
    return this.availabilityService.findAllByPractitioner(practitionerId);
  }

  @Get(':id')
  @ApiResponse({
    status: 200,
    description: 'Availability retrieved successfully.',
    type: AvailabilityResponseDto,
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.availabilityService.findOne(id);
  }

  @Patch(':id')
  @ApiResponse({
    status: 200,
    description: 'Availability updated successfully.',
    type: AvailabilityResponseDto,
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAvailabilityDto: UpdateAvailabilityDto,
  ) {
    return this.availabilityService.update(id, updateAvailabilityDto);
  }

  @Delete(':id')
  @ApiResponse({
    status: 200,
    description: 'Availability deleted successfully.',
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.availabilityService.remove(id);
  }

  @Post('generate-slots/:practitionerId')
  @ApiResponse({
    status: 201,
    description: 'Time slots generated successfully.',
    type: [TimeSlotResponseDto],
  })
  generateTimeSlots(
    @Param('practitionerId', ParseIntPipe) practitionerId: number,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.availabilityService.generateTimeSlots(
      practitionerId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('slots/available')
  @ApiResponse({
    status: 200,
    description: 'Available slots retrieved successfully.',
    type: [TimeSlotResponseDto],
  })
  getAvailableSlots(
    @Query('practitionerId', ParseIntPipe) practitionerId: number,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.availabilityService.getAvailableSlots(
      practitionerId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('my-availability')
  @ApiResponse({
    status: 200,
    description: 'My availability retrieved successfully.',
    type: [AvailabilityResponseDto],
  })
  getMyAvailability(@Req() req: any) {
    const practitionerId = req.user.id;
    return this.availabilityService.findAllByPractitioner(practitionerId);
  }

  @Get('my-slots')
  @ApiResponse({
    status: 200,
    description: 'My time slots retrieved successfully.',
    type: [TimeSlotResponseDto],
  })
  getMyTimeSlots(
    @Req() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const practitionerId = req.user.id;
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate
      ? new Date(endDate)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return this.availabilityService.getAvailableSlots(
      practitionerId,
      start,
      end,
    );
  }

  @Post('generate-slots')
  @ApiResponse({
    status: 201,
    description: 'Time slots generated successfully.',
    type: [TimeSlotResponseDto],
  })
  generateMyTimeSlots(
    @Body() body: { startDate: string; endDate: string },
    @Req() req: any,
  ) {
    const practitionerId = req.user.id;
    return this.availabilityService.generateTimeSlots(
      practitionerId,
      new Date(body.startDate),
      new Date(body.endDate),
    );
  }
}
