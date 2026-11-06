import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service.js';
import { AttendanceController } from './attendance.controller.js';
import { AttendanceService } from './attendance.service.js';

describe('attendance microservice dependency injection', () => {
  it('wires the controller and service in the tsx runtime', async () => {
    const findUnique = vi.fn().mockResolvedValue(null);
    const module = await Test.createTestingModule({
      controllers: [AttendanceController],
      providers: [AttendanceService, { provide: PrismaService, useValue: { attendance: { findUnique } } }],
    }).compile();

    try {
      await expect(module.get(AttendanceController).today({ employeeId: 8 })).resolves.toBeNull();
      expect(findUnique).toHaveBeenCalledOnce();
    } finally {
      await module.close();
    }
  });
});
