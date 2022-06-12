# RabbitMQ Persistente

Este projeto busca mostrar como fazer uma conexão de forma pesistente, ou seja, mesmo que um RabbitMQ por algum motivo
seje desligado ainda sim as mensagens serão preservadas.

## Libs

Para trabalhar em projeto que usa RabbitMQ, precisamos instalar um conjunto de libs:

- Lib para usar recursos de microservice:

```bash
  npm install my-project
```

- Libs para poder fazer a comunicação usando RabbitMQ

```bash
  npm i --save amqplib amqp-connection-manager
```

## Receber Mensagens

#### Configuração do projeto

Você precisará, colocar alguns elementos no arquivo main.ts, conforme você ver no exemplo abaixo:

```javascript
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

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
      queue: 'service_father',
      persistent: true,
      noAck: false,
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
```

Deste código, alguns itens precisam ser destrinchados:

- Itens em options: - queue: é o nome da fila usada para receber as mensagens, cada service ou microservice deve usar uma; - persistent e o queueOptions com durable: são usados para configurar a persistência das mensagens; - noAck: é usado para configurar a confirmação da mensagem, assim você poderá indicar via código que mensagem foi ou não processada; - urls: ficam as conexões do RabbitMQ, uma conexão é formação de ampq:// com o nome de usuário da conexão, a senha da conexão, a url da conexão se usar algo como https:// ou http://. Você deve usar algo como localhost:5672/ ou rabbitmq:5672/(para caso trabalhe com docker). Detalhe essa / é que chamado de contexto ele é criado por padrão é possivel, criar contextos diferentes, como /player, e ai nesse caso a url seria localhost:5672/player
  -O app.startAllMicroservices: isso é usado para ativar esses recursos de microservices do Nest Js, só que em versões mais antigas do Nest Js, você usaria app.startAllMicroservicesAsync().

#### Apenas Receber Eventos

Para receber eventos, no controler do códgio devemos ter algo como o demonstrado abaixo:

```javascript
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}
 ...
  @EventPattern('mensage_father') //Aqui é o topico usado para escutar
  public async saveMensage(
    @Payload() mensagem: Mensage,
    @Ctx() context: RmqContext,
  ) {
    await this.appService.saveMensage(mensagem, context);
  }
}
```

Deste código, acima alguns pontos devem ser levados em cosideração quando se trabalha com os mecanismos de envio de mensagem onde não se espera retorno
o ideal(https://docs.nestjs.com/microservices/basics#event-based) é trabalhar com @EventPattern, onde mensage_father se refere a um tópico, onde as mensagens serão trasmitidas.
O item one está @Payload() se refere ao corpo da mensagem que chega, ou seja, é a mensagem em si. Agora para entender a parte do context, vamos olhar o código abaixo, que é função chamada dentro
de saveMensage, através appService:

```javascript
public async saveMensage(mensagem: Mensage, context: RmqContext) {
    //Aqui é o context usado pelo RabbtMQ, onde podemos usar o channel confirmar que uma mensagem foi processada
    const channel = context.getChannelRef();
    //originalMsg é usado para indicar que mensagem foi processada
    const originalMsg = context.getMessage();
    console.log('receive mensage: ', mensagem);
    //Aqui sinaliza que a mensagem foi processada
    await channel.ack(originalMsg);
  }
```

No cóigo acima, context, é usado para trabalhar com algumas coisas importantes. Primeria para obter um canal , e obter a mensagem processada, no RabbitMQ.
Tendo essa mesangem processada ali chamada de originalMsg, podemos usar o channel para fazer a confirmação de processamento da mensagem através da chamada ack e passando a mensagem processada.

#### Receber Eventos e Rejeitar Para Renviar a Filas

Existem situações em que podem acontecer um erro quando processamos uma mensagem, e ai quando este erro aconteca nós vamos querer que a mensagem retorne para fila, e fique tentando enviar a mensagem.

Para ver como isso, funciona observe o código abaixo:

```javascript
@Injectable()
export class AppService {
 ...
   public async saveMensage(mensagem: Mensage, context: RmqContext) {
    //Aqui é o context usado pelo RabbtMQ, onde podemos usar o channel confirmar que uma mensagem foi processada
    // ou não
    const channel = context.getChannelRef();
    //originalMsg é usado para indicar que mensagem foi processada
    const originalMsg = context.getMessage();
    console.log('receive mensage: ', mensagem);
    if (mensagem.name.length > 10) {
      await channel.nack(originalMsg);
    }
    ...
  }
}
```

No códdigo acima, temos que repara que ele tem um ponto onde o channel chama nack, e passa a mensagem processada pelo RabbitMQ,
esse nack diz a mensagem não processada, e ai retorna para fila.

## Enviar Mensagens

Para enviar as mensagens primeiro, temos que criar um arquivo onde vamos usar ele para aproveitar para configurar os
producers, ou seja, aqueles que fazem as mensagens que serão enviadas:

```javascript
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
```

No arquivo, como você ver acima você ver na realidade uma chamada de função que retorna um objeto. Esse objeto tem as configrações necessárias
para um producer, temos informações de noAck, urls, persistent e queueOptions, que já foram explorados ao longo deste material.

Tendo está funcão em mente, vamos considerar que iremos ter um módulo do RabbitMQ, para que, nós possamos reduzir código:

```javascript
import { Module } from "@nestjs/common";
import { ClientRabbitMQ } from "./client.rabbitmq";

@Module({
  providers: [ClientRabbitMQ],
  exports: [ClientRabbitMQ],
})
export class ProxyRMQModule {}
```

Dentro deste modulo, teremos um service chamado ClientRabbitMQ, onde vai ser chamados os producers:

```javascript
import { Injectable } from "@nestjs/common";
import { ClientProxy, ClientProxyFactory } from "@nestjs/microservices";
import { rabbitmq } from "src/common/configs/rabbitmq";

//Aqui vai ficar as conexões cliente
@Injectable()
export class ClientRabbitMQ {
  getClientRabbitMQ(): ClientProxy {
    return ClientProxyFactory.create(rabbitmq("service_father"));
  }
}
```

Neste código, acima temos os dados para um producer que vai fazer uso da fila service_father. Vale sempre ressaltar, que o Nest Js, cria as filas de forma automática.

Agora, tendo esse service em mãos podemos usar ele para emitir uma mensagem, conforme o código abaixo demonstra:

```javascript
@Injectable()
export class AppService {
  private client;

  constructor(private clientProxy: ClientRabbitMQ) {
    this.client = this.clientProxy.getClientRabbitMQ();
  }

  sendMensage(criarCategoriaDto: Mensage) {
    //aqui enviar atraves de um topico para um service children
    this.client.emit('mensage_children', criarCategoriaDto); //Aqui nos enviamos a informação
  }
  ...
```

No códdigo acima, um ponto importante a salienter que ali dentro de emit, você irá passar o tópico usado para transmitir a mensagem, e vai
passar a mensagem em sim. Vale ressaltar, que não precisar fazer processos de trnasfrmar a mensagem em string.

## RabbitMQ Docker

Para trabalhar com o RabbitMQ, vamos usar precisar de um arquivo de orquestração:

```javascript
version: "3.7"

services:
  rabbitmq:
    image: 'rabbitmq:3.8-management-alpine'
    hostname: rabbitmq
    ports:
      - "15672:15672"
      - "5672:5672"
    volumes:
      - './rabbitmq_data:/var/lib/rabbitmq/mnesia'
    environment:
      - RABBITMQ_DEFAULT_USER=admin
      - RABBITMQ_DEFAULT_PASS=admin
    networks:
      - network

networks:
  network:
    driver: bridge

```

O arquivo de arquivo de orquestração acima vai prover os serviços do RabbitMQ.

### RabbitMQ UI

O arquivo de orquestração, prover um serviço muito útil quando se trabalha com RabbitMQ, que uma interface Web que nós permite ter um controle sobre as filas mensagens, entre outras coisas do RabbitMQ.

#### Tela de login

Para acessar esse serviço nos deparamos com a tela mostrada abaixo, o username e a senha, para este caso serão admin:
![alt text](https://github.com/alanbruno1994/RabbitMQ_Persist/blob/master/images/login.png?raw=true)

#### Tela de dashboard

Após fazer o login, vemos a seguinte tela, onde temos várias opções que podemos explorar,mais uma das mais importantes é Queues, onde fica as filas:
![alt text](https://github.com/alanbruno1994/RabbitMQ_Persist/blob/master/images/dashboard.png?raw=true)

#### Tela de qeueu

Na tela de Queues, podemos monitorar quantas mensagens ainda estão para serem lidas:
![alt text](https://github.com/alanbruno1994/RabbitMQ_Persist/blob/master/images/qeueu.png?raw=true)

## O Projeto

Esse projeto, é bem simples basicamente temos um endpoint onde uma mensagem é enviada, ela envia para um outro em service que envia mensgem de volta.

O endpoint usado para o projeto é este:

```http
  POST /
```

Exemplo de requisição

```
{
	"name":"bruno",
	"mensage":"oi"

}
```

## Demonstração

Aqui irei desmostrar três situações que irão que vão ilustrar o funcionamento deste projeto como sua persistência.

### Sucesso

O gif abaixo ilustra um caso de sucesso onde mensagens são enviadas e as mesmas retornam, e são mostradas em um console:
![alt text](https://github.com/alanbruno1994/RabbitMQ_Persist/blob/master/images/sucesso.gif?raw=true)

### Retentativa

O gif abaixo mostra o caso em é provocado uma falha, que necessa caso é coloca o name na requisição é maior que o permitido.
Dessa forma, as mensagens não são porcessadas e a veremos retantivas. No gif, também você verá um ajuste no código para que as mensagens
sejam validadas e ai elas sejam lidas e sejam apagadas da fila
![alt text](https://github.com/alanbruno1994/RabbitMQ_Persist/blob/master/images/tentativa.gif?raw=true)

### Persistência

Aqui é provocado uma situação onde as mensagens acabam não sendo lidas. E ai ela ficam no RabbitMQ. E ai desativamos ele
e ai ativamos ele novamente e ai vemos que as mensagens ainda estão lá. E tiramos o elemento que não fazia as mensagens serem lidas. E ai elas são
apagadas da fila.
![alt text](https://github.com/alanbruno1994/RabbitMQ_Persist/blob/master/images/persistencia.gif?raw=true)

## Autores 🚀

- [Álan Bruno Rios Miguel](https://www.github.com/alanbruno1994)
