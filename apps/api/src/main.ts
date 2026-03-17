import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  
  // Render automatically sets PORT environment variable
  const port = process.env.PORT || 3001;
  
  // Yahan '0.0.0.0' add karna 100% zaroori hai Render ke liye
  await app.listen(port, '0.0.0.0'); 
  
  console.log(`Application is running on port: ${port}`);
}
bootstrap();
