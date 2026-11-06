import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { Transport, type MicroserviceOptions } from '@nestjs/microservices';
import { AttendanceServiceModule } from './attendance-service.module.js';

const port = Number(process.env.ATTENDANCE_TCP_PORT ?? 3001);
if (!Number.isSafeInteger(port) || port < 1 || port > 65535) throw new Error('ATTENDANCE_TCP_PORT invalid');
const app = await NestFactory.createMicroservice<MicroserviceOptions>(AttendanceServiceModule, {
  transport: Transport.TCP, options: { host: process.env.ATTENDANCE_TCP_HOST ?? '127.0.0.1', port },
});
await app.listen();
