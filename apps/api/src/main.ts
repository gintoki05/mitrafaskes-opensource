import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  const PORT = process.env.PORT || 4000;
  await app.listen(PORT);
  console.log(`====================================================`);
  console.log(`   MITRA FASKES NESTJS API SERVER RUNNING            `);
  console.log(`   Port: http://localhost:${PORT}                    `);
  console.log(`====================================================`);
}
bootstrap();
