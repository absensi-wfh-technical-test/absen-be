import { Controller, Inject } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { AttendancePattern } from '../contracts/attendance.contract.js';
import { AttendanceService } from './attendance.service.js';

@Controller()
export class AttendanceController {
  constructor(@Inject(AttendanceService) private readonly service: AttendanceService) {}
  @MessagePattern(AttendancePattern.create) create(payload: unknown) { return this.service.create(payload); }
  @MessagePattern(AttendancePattern.today) today(payload: unknown) { return this.service.today(payload); }
  @MessagePattern(AttendancePattern.listByEmployee) listByEmployee(payload: unknown) { return this.service.listByEmployee(payload); }
  @MessagePattern(AttendancePattern.list) list(payload: unknown) { return this.service.list(payload); }
  @MessagePattern(AttendancePattern.getById) getById(payload: unknown) { return this.service.getById(payload); }
  @MessagePattern(AttendancePattern.replacePhoto) replacePhoto(payload: unknown) { return this.service.replacePhoto(payload); }
  @MessagePattern(AttendancePattern.deleteOwn) deleteOwn(payload: unknown) { return this.service.deleteOwn(payload); }
}
