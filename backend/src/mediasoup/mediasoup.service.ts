import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateMediasoupServerDto } from './dto/create-mediasoup-server.dto';
import { UpdateMediasoupServerDto } from './dto/update-mediasoup-server.dto';
import { QueryMediasoupServerDto } from './dto/query-mediasoup-server.dto';
import { MediasoupServerResponseDto } from './dto/mediasoup-server-response.dto';
import { plainToInstance } from 'class-transformer';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { HttpExceptionHelper } from 'src/common/helpers/execption/http-exception.helper';

@Injectable()
export class MediasoupServerService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(
    createMediasoupServerDto: CreateMediasoupServerDto,
  ): Promise<MediasoupServerResponseDto> {
    const existingServer = await this.databaseService.mediasoupServer.findFirst(
      {
        where: { url: createMediasoupServerDto.url },
      },
    );

    if (existingServer) {
      throw HttpExceptionHelper.conflict('Mediasoup server URL already exists');
    }

    const hashedPassword = await bcrypt.hash(
      createMediasoupServerDto.password,
      10,
    );

    const serverData = {
      ...createMediasoupServerDto,
      password: hashedPassword,
      maxNumberOfSessions: createMediasoupServerDto.maxNumberOfSessions || 100,
      active: createMediasoupServerDto.active ?? true,
    };

    const server = await this.databaseService.mediasoupServer.create({
      data: serverData,
    });

    return plainToInstance(MediasoupServerResponseDto, server, {
      excludeExtraneousValues: true,
    });
  }

  async findAll(query: QueryMediasoupServerDto) {
    const {
      page = 1,
      limit = 10,
      search,
      active,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.MediasoupServerWhereInput = {};

    if (search) {
      where.OR = [
        { url: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (active !== undefined) {
      where.active = active;
    }

    const orderBy: Prisma.MediasoupServerOrderByWithRelationInput = {};
    orderBy[sortBy] = sortOrder;

    const [servers, total] = await Promise.all([
      this.databaseService.mediasoupServer.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      this.databaseService.mediasoupServer.count({ where }),
    ]);

    const transformedServers = servers.map((server) =>
      plainToInstance(MediasoupServerResponseDto, server, {
        excludeExtraneousValues: true,
      }),
    );

    return {
      servers: transformedServers, // Changed from 'servers' to 'items'
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit), // Added totalPages
    };
  }

  async findOne(id: string): Promise<MediasoupServerResponseDto> {
    const server = await this.databaseService.mediasoupServer.findUnique({
      where: { id },
    });

    if (!server) {
      throw HttpExceptionHelper.notFound('Mediasoup server not found');
    }

    return plainToInstance(MediasoupServerResponseDto, server, {
      excludeExtraneousValues: true,
    });
  }

  async update(
    id: string,
    updateMediasoupServerDto: UpdateMediasoupServerDto,
  ): Promise<MediasoupServerResponseDto> {
    const existingServer =
      await this.databaseService.mediasoupServer.findUnique({
        where: { id },
        select: { id: true, url: true },
      });

    if (!existingServer) {
      throw HttpExceptionHelper.notFound('Mediasoup server not found');
    }

    if (
      updateMediasoupServerDto.url &&
      updateMediasoupServerDto.url !== existingServer.url
    ) {
      const urlExists = await this.databaseService.mediasoupServer.findFirst({
        where: {
          url: updateMediasoupServerDto.url,
          id: { not: id },
        },
        select: { id: true },
      });

      if (urlExists) {
        throw HttpExceptionHelper.conflict(
          'Mediasoup server URL already exists',
        );
      }
    }

    const server = await this.databaseService.mediasoupServer.update({
      where: { id },
      data: updateMediasoupServerDto,
    });

    return plainToInstance(MediasoupServerResponseDto, server, {
      excludeExtraneousValues: true,
    });
  }

  async toggleActive(id: string): Promise<MediasoupServerResponseDto> {
    const existingServer =
      await this.databaseService.mediasoupServer.findUnique({
        where: { id },
        select: { id: true, active: true },
      });

    if (!existingServer) {
      throw HttpExceptionHelper.notFound('Mediasoup server not found');
    }

    const server = await this.databaseService.mediasoupServer.update({
      where: { id },
      data: { active: !existingServer.active },
    });

    return plainToInstance(MediasoupServerResponseDto, server, {
      excludeExtraneousValues: true,
    });
  }

  async remove(id: string): Promise<MediasoupServerResponseDto> {
    const existingServer =
      await this.databaseService.mediasoupServer.findUnique({
        where: { id },
        select: { id: true },
      });

    if (!existingServer) {
      throw HttpExceptionHelper.notFound('Mediasoup server not found');
    }

    const server = await this.databaseService.mediasoupServer.delete({
      where: { id },
    });

    return plainToInstance(MediasoupServerResponseDto, server, {
      excludeExtraneousValues: true,
    });
  }

  async getAvailableServer(): Promise<MediasoupServerResponseDto | null> {
    const server = await this.databaseService.mediasoupServer.findFirst({
      where: { active: true },
      orderBy: { maxNumberOfSessions: 'desc' },
    });

    return server
      ? plainToInstance(MediasoupServerResponseDto, server, {
          excludeExtraneousValues: true,
        })
      : null;
  }
}
