import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { LocationModule } from './location.module';

async function bootstrap() {
  const app = await NestFactory.create(LocationModule);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'location',
      protoPath: join(__dirname, './proto/location.proto'),
      url: `0.0.0.0:${process.env.GRPC_PORT || 5003}`,
    },
  });

  await app.startAllMicroservices();
  await app.listen(process.env.HTTP_PORT || 3003);

  console.log(`Location Service HTTP running on port ${process.env.HTTP_PORT || 3003}`);
  console.log(`Location Service gRPC running on port ${process.env.GRPC_PORT || 5003}`);
}
bootstrap();
