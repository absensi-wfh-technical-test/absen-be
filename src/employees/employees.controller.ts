import { BadRequestException, Body, Controller, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { AdminGuard } from '../common/role.guard.js';
import { EmployeesService } from './employees.service.js';

const id = (raw: string) => {
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1) throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'ID karyawan tidak valid.' });
  return value;
};

@Controller('api/employees')
@UseGuards(AuthGuard, AdminGuard)
export class EmployeesController {
  constructor(private readonly employees: EmployeesService) {}
  @Get() list(@Query() query: Record<string, unknown>) { return this.employees.list(query); }
  @Get(':id') get(@Param('id') raw: string) { return this.employees.get(id(raw)); }
  @Post() create(@Body() body: unknown) { return this.employees.create(body); }
  @Patch(':id') update(@Param('id') raw: string, @Body() body: unknown) { return this.employees.update(id(raw), body); }
  @Patch(':id/status') @HttpCode(200) setStatus(@Param('id') raw: string, @Body() body: unknown) { return this.employees.setStatus(id(raw), body); }
}

@Controller('api')
@UseGuards(AuthGuard)
export class MasterLookupController {
  constructor(private readonly employees: EmployeesService) {}
  @Get('departments') departments() { return this.employees.departments(); }
  @Get('positions') positions() { return this.employees.positions(); }
}
