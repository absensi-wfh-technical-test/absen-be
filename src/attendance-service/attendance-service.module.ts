import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AttendanceController } from './attendance.controller.js';
import { AttendanceService } from './attendance.service.js';

@Module({ imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule], controllers: [AttendanceController], providers: [AttendanceService] })
export class AttendanceServiceModule {}
