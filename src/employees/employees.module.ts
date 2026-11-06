import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AdminGuard } from '../common/role.guard.js';
import { EmployeesController, MasterLookupController } from './employees.controller.js';
import { EmployeesService } from './employees.service.js';

@Module({ imports: [AuthModule, PrismaModule], controllers: [EmployeesController, MasterLookupController], providers: [EmployeesService, AdminGuard] })
export class EmployeesModule {}
