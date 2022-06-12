import { Injectable } from '@nestjs/common';
import { RmqContext } from '@nestjs/microservices';
import { ClientRabbitMQ } from './rabbitmq/client.rabbitmq';
import { Mensage } from './DTOs/mensage';

@Injectable()
export class AppService {
  private client;

  constructor(private clientProxy: ClientRabbitMQ) {
    this.client = this.clientProxy.getClientRabbitMQ();
  }

  public async saveMensage(mensagem: Mensage, context: RmqContext) {
    //Aqui é o context usado pelo RabbtMQ, onde podemos usar o channel confirmar que uma mensagem foi processada
    const channel = context.getChannelRef();
    //originalMsg é usado para indicar que mensagem foi processada
    const originalMsg = context.getMessage();
    console.log('receive mensage: ', mensagem);
    if (mensagem.name.length > 10) {
      await channel.nack(originalMsg);
    }
    //Aqui sinaliza que a mensagem foi processada
    await channel.ack(originalMsg);
    this.client.emit('mensage_father', mensagem, {}); //Aqui nos enviamos a informação
  }
}
