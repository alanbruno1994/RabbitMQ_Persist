import { Controller } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { AppService } from './app.service';
import { Mensage } from './DTOs/mensage';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @EventPattern('mensage_children') //Aqui é o topico usado para escutar
  public async saveMensage(
    @Payload() mensagem: Mensage,
    @Ctx() context: RmqContext,
  ) {
    await this.appService.saveMensage(mensagem, context);
  }
}
