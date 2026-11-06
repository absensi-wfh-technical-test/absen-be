import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth.guard.js';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (context.switchToHttp().getRequest<AuthenticatedRequest>().authUser.roleCode !== 'ADMIN') {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Anda tidak memiliki akses.' });
    }
    return true;
  }
}

@Injectable()
export class EmployeeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest<AuthenticatedRequest>().authUser;
    if (user.roleCode !== 'EMPLOYEE' || !user.employeeId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Anda tidak memiliki akses.' });
    }
    return true;
  }
}
