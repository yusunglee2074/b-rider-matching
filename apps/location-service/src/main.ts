import { NestFactory } from '@nestjs/core';
import { LocationModule } from './location.module';

async function bootstrap() {
  const app = await NestFactory.create(LocationModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
