import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { ReadMessageDto } from './dto/read-message.dto';
import { EditMessageDto } from './dto/edit-message.dto';
import { BulkMarkReadDto } from './dto/bulk-mark-read.dto';
import { MessageHistoryDto } from './dto/message-history.dto';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { UserIdParamPipe } from 'src/consultation/validation/user-id-param.pipe';

@ApiTags('chat')
@Controller('chat')
@UseGuards(AuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('messages')
  @ApiOperation({ summary: 'Send a message in a consultation' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Message data with optional file attachment',
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'number' },
        consultationId: { type: 'number' },
        content: { type: 'string' },
        clientUuid: { type: 'string' },
        file: {
          type: 'string',
          format: 'binary',
          description: 'Optional file attachment',
        },
      },
      required: ['userId', 'consultationId', 'content', 'clientUuid'],
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async sendMessage(
    @Body() createMessageDto: CreateMessageDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.chatService.createMessage(createMessageDto, file);
  }

  @Get('messages/:consultationId')
  @ApiOperation({ summary: 'Get message history for a consultation' })
  @ApiResponse({
    status: 200,
    description: 'Message history retrieved successfully',
  })
  async getMessages(
    @Param('consultationId', ParseIntPipe) consultationId: number,
    @Query() queryParams: MessageHistoryDto,
  ) {
    return this.chatService.getMessages(
      consultationId,
      queryParams.limit,
      queryParams.offset,
    );
  }

  @Post('messages/read')
  @ApiOperation({ summary: 'Mark a message as read' })
  @ApiResponse({
    status: 201,
    description: 'Message marked as read successfully',
  })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async markMessageRead(@Body() readMessageDto: ReadMessageDto) {
    return this.chatService.markMessageAsRead(readMessageDto);
  }

  @Post('messages/bulk-read')
  @ApiOperation({ summary: 'Mark multiple messages as read' })
  @ApiResponse({
    status: 201,
    description: 'Messages marked as read successfully',
  })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async bulkMarkRead(@Body() bulkMarkReadDto: BulkMarkReadDto) {
    return this.chatService.bulkMarkMessagesAsRead(
      bulkMarkReadDto.messageIds,
      bulkMarkReadDto.userId,
      bulkMarkReadDto.consultationId,
    );
  }

  @Get('messages/:messageId/read-status')
  @ApiOperation({ summary: 'Get read status of a specific message' })
  @ApiResponse({
    status: 200,
    description: 'Read status retrieved successfully',
  })
  async getMessageReadStatus(
    @Param('messageId', ParseIntPipe) messageId: number,
    @Query('consultationId', ParseIntPipe) consultationId: number,
  ) {
    return this.chatService.getMessageReadStatus(messageId, consultationId);
  }

  @Get('unread-count')
  @ApiOperation({
    summary: 'Get unread message count for a user in a consultation',
  })
  @ApiResponse({
    status: 200,
    description: 'Unread count retrieved successfully',
  })
  async getUnreadCount(
    @Query('userId', UserIdParamPipe) userId: number,
    @Query('consultationId', ParseIntPipe) consultationId: number,
  ) {
    const count = await this.chatService.getUnreadMessageCount(
      userId,
      consultationId,
    );
    return { unreadCount: count };
  }

  @Put('messages/:messageId')
  @ApiOperation({ summary: 'Edit a message (within 5 minutes of sending)' })
  @ApiResponse({ status: 200, description: 'Message edited successfully' })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async editMessage(
    @Param('messageId', ParseIntPipe) messageId: number,
    @Body() editMessageDto: EditMessageDto,
  ) {
    return this.chatService.editMessage(
      messageId,
      editMessageDto.userId,
      editMessageDto.content,
      editMessageDto.consultationId,
    );
  }

  @Delete('messages/:messageId')
  @ApiOperation({ summary: 'Delete a message (soft delete)' })
  @ApiResponse({ status: 200, description: 'Message deleted successfully' })
  async deleteMessage(
    @Param('messageId', ParseIntPipe) messageId: number,
    @Query('userId', UserIdParamPipe) userId: number,
    @Query('consultationId', ParseIntPipe) consultationId: number,
  ) {
    return this.chatService.deleteMessage(messageId, userId, consultationId);
  }

  @Post('system-message')
  @ApiOperation({ summary: 'Create a system message (admin only)' })
  @ApiResponse({
    status: 201,
    description: 'System message created successfully',
  })
  async createSystemMessage(
    @Body() body: { consultationId: number; content: string },
  ) {
    return this.chatService.createSystemMessage(
      body.consultationId,
      body.content,
    );
  }
}
