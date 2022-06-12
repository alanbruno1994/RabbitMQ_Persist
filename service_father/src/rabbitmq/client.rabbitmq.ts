import { Injectable } from '@nestjs/common';
import { ClientProxy, ClientProxyFactory } from '@nestjs/microservices';
import { rabbitmq } from 'src/common/configs/rabbitmq';

//Aqui vai ficar as conexões cliente
@Injectable()
export class ClientRabbitMQ {
  getClientRabbitMQ(): ClientProxy {
    return ClientProxyFactory.create(rabbitmq('service_children'));
  }
}
