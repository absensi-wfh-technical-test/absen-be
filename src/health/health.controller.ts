import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Controller('health')
export class HealthController {
    constructor(
        private readonly prisma: PrismaService,
    ) {}
    
    @Get('database')
    async checkDatabase() {
        await this.prisma.role.count();

        return {
            status: 'ok',
            database: 'connected',
        };
    }
}