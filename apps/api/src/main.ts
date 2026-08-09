import './env';
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
    .addTag(
      'Master Faskes',
      'Pengaturan organisasi dan lokasi fasilitas kesehatan.',
    )
    .addTag('Medical Records', 'Pencatatan rekam medis elektronik (RME).')
    .addTag('SATUSEHAT', 'Status dan sinkronisasi data ke SATUSEHAT.')
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig, {
    autoTagControllers: false,
  });
  SwaggerModule.setup('api/docs', app, swaggerDocument, {
    jsonDocumentUrl: 'api/docs-json',
  });

  const port = Number(process.env.PORT || 4000);
  const host = process.env.HOST || '0.0.0.0';
  const publicApiUrl = process.env.PUBLIC_API_URL || `http://${host}:${port}`;
  await app.listen(port, host);
  console.log(`====================================================`);
  console.log(`   MITRA FASKES NESTJS API SERVER RUNNING            `);
  console.log(`   API: ${publicApiUrl}                              `);
  console.log(`   Swagger: ${publicApiUrl}/api/docs                 `);
  console.log(`====================================================`);
}
void bootstrap();
