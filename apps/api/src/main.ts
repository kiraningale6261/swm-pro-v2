import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // CORS enable karna zaroori hai taaki Railway wala frontend connect ho sake
  app.enableCors();
  
  // Render default mein 10000 port deta hai, isliye humne ise standard rakha hai
  const port = process.env.PORT || 10000;
  
  // '0.0.0.0' interface Render ke load balancer ke liye mandatory hai
  await app.listen(port, '0.0.0.0'); 
  
  console.log(`🚀 Server is live and kicking on port: ${port}`);
}
bootstrap();
