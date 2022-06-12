import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';

const configService = new ConfigService();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.connectMicroservice({
    transport: Transport.RMQ,
    options: {
      urls: [
        `amqp://${configService.get<string>(
          'RABBITMQ_USER',
        )}:${configService.get<string>(
          'RABBITMQ_PASSWORD',
        )}@${configService.get<string>('RABBITMQ_URL')}`,
      ],
      persistent: true,
      queue: 'service_children',
      noAck: false, //By default, NestJS handles acknowledgments automatically. We can do that manually, though. To do that, we need to pass the noAck: false flag when creating a microservice.
      queueOptions: {
        durable: true,
      },
    },
  });

  await app.listen(configService.get<number>('PORT') || 3000, () => {
    console.log('Server Run Port:', configService.get<number>('PORT') || 3000);
  });
  await app.startAllMicroservices();
}
bootstrap();
