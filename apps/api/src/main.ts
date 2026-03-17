import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module'; // .js hata diya

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  
  const port = process.env.PORT || 10000;
  
  await app.listen(port, '0.0.0.0'); 
  
  console.log(`🚀 Server is live on port: ${port}`);
}
bootstrap();
