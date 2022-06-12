import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProxyRMQModule } from './rabbitmq/proxyrmq.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), ProxyRMQModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
