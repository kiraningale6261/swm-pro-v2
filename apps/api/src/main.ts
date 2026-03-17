import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js'; // .js wapas lagao, NestJS ESM mein ye zaroori hai

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // CORS enable karna taaki frontend connect ho sake
  app.enableCors();
  
  // Render ka default port 10000 hota hai
  const port = process.env.PORT || 10000;
  
  // '0.0.0.0' mandatory hai cloud deployment ke liye
  await app.listen(port, '0.0.0.0'); 
  
  console.log(`🚀 Server is live on port: ${port}`);
}
bootstrap().catch(err => {
  console.error('Error starting server:', err);
  process.exit(1);
});
