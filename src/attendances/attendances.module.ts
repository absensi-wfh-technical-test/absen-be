import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module.js';
import { AdminGuard, EmployeeGuard } from '../common/role.guard.js';
import { AttendancesController } from './attendances.controller.js';
import { AttendanceProxyService } from './attendance-proxy.service.js';
import { PhotoStorageService } from './photo-storage.service.js';

@Module({
  imports: [AuthModule, ClientsModule.registerAsync([{ name: 'ATTENDANCE_CLIENT', imports: [ConfigModule], inject: [ConfigService],
    useFactory: (config: ConfigService) => ({ transport: Transport.TCP, options: {
      host: config.get<string>('ATTENDANCE_TCP_HOST') ?? '127.0.0.1',
      port: Number(config.get<string>('ATTENDANCE_TCP_PORT') ?? 3001),
    } }),
  }])],
  controllers: [AttendancesController],
  providers: [AttendanceProxyService, PhotoStorageService, AdminGuard, EmployeeGuard],
})
export class AttendancesModule {}
