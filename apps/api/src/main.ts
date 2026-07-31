import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Mitra Faskes API')
    .setDescription(
      'API Rekam Medis Elektronik Mitra Faskes dengan integrasi SATUSEHAT.',
    )
    .setVersion('1.0')
    .addTag('General', 'Informasi umum layanan API.')
    .addTag(
      'Authentication',
      'Autentikasi pengguna dan pengambilan token sesi.',
    )
    .addTag('Patients', 'Registrasi dan pencarian data pasien.')
    .addTag('Encounters', 'Pengelolaan kunjungan dan antrean pasien.')
    .addTag('Master Data', 'Data referensi klinis, termasuk ICD-10.')
    .addTag('Medical Records', 'Pencatatan rekam medis elektronik (RME).')
    .addTag('SATUSEHAT', 'Status dan sinkronisasi data ke SATUSEHAT.')
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig, {
    autoTagControllers: false,
  });
  SwaggerModule.setup('api/docs', app, swaggerDocument, {
    jsonDocumentUrl: 'api/docs-json',
  });

  const PORT = process.env.PORT || 4000;
  await app.listen(PORT);
  console.log(`====================================================`);
  console.log(`   MITRA FASKES NESTJS API SERVER RUNNING            `);
  console.log(`   Port: http://localhost:${PORT}                    `);
  console.log(`   Swagger: http://localhost:${PORT}/api/docs        `);
  console.log(`====================================================`);
}
bootstrap();
