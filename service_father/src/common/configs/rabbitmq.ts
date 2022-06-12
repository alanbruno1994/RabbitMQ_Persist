import { ConfigService } from '@nestjs/config';
import { RmqOptions, Transport } from '@nestjs/microservices';

const configService: ConfigService = new ConfigService();

export function rabbitmq(queue: string): {
  transport: Transport.RMQ;
} & RmqOptions {
  return {
    transport: Transport.RMQ,
    options: {
      noAck: false,
      persistent: true,
      urls: [
        `amqp://${configService.get<string>(
          'RABBITMQ_USER',
        )}:${configService.get<string>(
          'RABBITMQ_PASSWORD',
        )}@${configService.get<string>('RABBITMQ_URL')}`,
      ],
      //essa fila vai ser comunicar com um service father
      queue,
      queueOptions: {
        durable: true,
      },
    },
  };
}
