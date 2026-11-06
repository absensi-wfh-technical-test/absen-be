export const AttendancePattern = {
  create: { cmd: 'attendance.create' }, today: { cmd: 'attendance.today' },
  listByEmployee: { cmd: 'attendance.listByEmployee' }, list: { cmd: 'attendance.list' },
  getById: { cmd: 'attendance.getById' }, replacePhoto: { cmd: 'attendance.replacePhoto' },
  deleteOwn: { cmd: 'attendance.deleteOwn' },
} as const;

export interface AttendanceQuery { page: number; pageSize: number; from?: string; to?: string; employeeId?: number; departmentId?: number; search?: string }
export interface AttendanceRecord {
  id: number; employeeId: number; attendanceDate: string; checkInAt: string;
  photoPath: string; employee: { employeeCode: string; fullName: string; department: { id: number; name: string }; position: { id: number; name: string } };
}
