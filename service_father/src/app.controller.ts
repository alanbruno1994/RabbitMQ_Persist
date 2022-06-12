import { Body, Controller, Post } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { AppService } from './app.service';
import { Mensage } from './DTOs/mensage';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post()
  sendMensage(@Body() message: Mensage) {
    console.log('lancou ', message);
    return this.appService.sendMensage(message);
  }

  @EventPattern('mensage_father') //Aqui é o topico usado para escutar
  public async saveMensage(
    @Payload() mensagem: Mensage,
    @Ctx() context: RmqContext,
  ) {
    await this.appService.saveMensage(mensagem, context);
  }
}
