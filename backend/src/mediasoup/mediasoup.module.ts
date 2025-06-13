import { Module } from '@nestjs/common';
import { MediasoupServerService } from './mediasoup.service';
import { MediasoupServerController } from './mediasoup.controller';
import { DatabaseModule } from 'src/database/database.module';
import { UserService } from 'src/user/user.service';
import { UserModule } from 'src/user/user.module';

@Module({
  controllers: [MediasoupServerController],
  providers: [MediasoupServerService],
  imports :[DatabaseModule,UserModule]
})
export class MediasoupModule {}
