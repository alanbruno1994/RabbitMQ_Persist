import { Module } from '@nestjs/common';
import { ClientRabbitMQ } from './client.rabbitmq';

@Module({
  providers: [ClientRabbitMQ],
  exports: [ClientRabbitMQ],
})
export class ProxyRMQModule {}
