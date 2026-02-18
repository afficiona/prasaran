import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Set API prefix
  app.setGlobalPrefix('api');

  // Enable CORS
  app.enableCors({
    origin: [
      'http://localhost:3000', 'http://localhost:3002', // Manch
      'http://localhost:3001', 'http://localhost:3003', // Prasaran
      'http://localhost:3100', 'http://localhost:3102', // Adda
      'http://localhost:3200', 'http://localhost:3202', // Samooh
    ],
    credentials: true,
  });

  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`Prasaran backend running on port ${port}`);
}

bootstrap();
