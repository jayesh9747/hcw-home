import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class DatabaseService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'error', 'warn']
          : ['error'],
    });
  }

  async onModuleInit() {
    try {
      console.log('🔗 Attempting to connect to database...');

      const connectWithTimeout = () => {
        return Promise.race([
          this.$connect(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Database connection timeout after 5 seconds')), 5000)
          )
        ]);
      };

      await connectWithTimeout();
      console.log('✅ Database connection established successfully');
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      console.log('⚠️ Application will continue in offline mode');
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    console.log('Database connection closed');
  }
}
