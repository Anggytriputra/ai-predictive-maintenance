import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private redisClient: Redis;
  private subscriberClient: Redis;

  onModuleInit() {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    const isTls = url.startsWith('rediss://');
    const options: any = {
      family: 4,
      maxRetriesPerRequest: null,
      ...(isTls ? { tls: { rejectUnauthorized: false } } : {})
    };
    this.redisClient = new Redis(url, options);
    this.subscriberClient = new Redis(url, options);

    this.redisClient.on('error', (err) => console.error('Redis Client Error:', err.message));
    this.subscriberClient.on('error', (err) => console.error('Redis Subscriber Error:', err.message));
  }

  onModuleDestroy() {
    this.redisClient.quit();
    this.subscriberClient.quit();
  }

  getClient(): Redis {
    return this.redisClient;
  }

  getSubscriber(): Redis {
    return this.subscriberClient;
  }
}
