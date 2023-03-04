import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'

const PORT = 3000

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  const config = new DocumentBuilder()
  .setTitle('Translation API')
  .setDescription('The API for translate service')
  .setVersion('1.0')
  .build()
  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('api', app, document)
  await app.listen(PORT)
  console.log(`server listening at: http://localhost:${PORT}/`)
  console.log(`open API at: http://localhost:${PORT}/api/`)
}
bootstrap()
