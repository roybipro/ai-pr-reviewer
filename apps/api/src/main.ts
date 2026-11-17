import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { parseEnv } from './env';

async function bootstrap() {
  let env;
  try {
    env = parseEnv(process.env);
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
  }
  const app = await NestFactory.create(AppModule);
  await app.listen(env.PORT);
}
void bootstrap();
