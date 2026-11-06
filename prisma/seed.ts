import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ==========================================
// DEMO ACCOUNTS - DEVELOPMENT ONLY
// ==========================================
const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD;
if (!DEMO_PASSWORD || DEMO_PASSWORD.length < 8) throw new Error('SEED_DEMO_PASSWORD must be set to at least 8 characters.');

const DEMO_ACCOUNTS = {
    admin: {
        email: 'admin.hr@sample.com',
    },
    employee: {
        email:'developer@sample.com',
        employeeCode: 'EMP001',
        fullName: 'Demo Developer',
        phoneNumber: '081234567890',
        hireDate: new Date('2025-01-15T00:00:00.000Z'),
    }
}

// ==========================================
// DATABASE SEEDING
// ==========================================

async function main() {
    console.log('🌱 Starting database seeding...');

    // Roles seeding
    const adminRole = await prisma.role.upsert({
        where: { code: 'ADMIN' },
        update: {
            name: 'Administrator HRD',
        },
        create: {
            code: 'ADMIN',
            name: 'Administrator HRD',
        },
    });

    const employeeRole = await prisma.role.upsert({
        where: { code: 'EMPLOYEE' },
        update: {
            name: 'Employee',
        },
        create: {
            code: 'EMPLOYEE',
            name: 'Employee',
        }
    });

    console.log('✅ Roles seeded successfully.');

    //Departments seeding
    const departments = [
        {
            code: "HRD",
            name: "Human Resource",
        },
        {
            code: "ENG",
            name: "Engineering",
        },
        {
            code: "DATA",
            name: "Data Engineering",
        },
    ];

    for (const department of departments) {
        await prisma.department.upsert({
            where: {
                code: department.code,
            },
            update: {
                name: department.name,
            },
            create: department,
        });
    }

    console.log('✅ Departments seeded successfully.');

    const positions = [
        {
            code: 'HR_OFFICER',
            name: 'HR Officer',
        },
        {
            code: 'PROJECT_MANAGER',
            name: 'Project Manager',
        },
        {
            code: 'DEVELOPER',
            name: 'Developer',
        },
        {
            code: 'DATA_ANALYST',
            name: 'Data Analyst',
        },
    ];

    for (const position of positions) {
        await prisma.position.upsert({
        where: {
            code: position.code,
        },
        update: {
            name: position.name,
        },
        create: position,
        });
    }

    console.log('✅ Positions seeded successfully.');

    //Hash DEMO PASSWORD
    const passwordHash = await bcrypt.hash(
        DEMO_PASSWORD,
        12,
    );

    //Seed Admin Account
    await prisma.user.upsert({
        where: {
            email: DEMO_ACCOUNTS.admin.email,
        },
        update: { passwordHash, isActive: true },
        create: {
            email: DEMO_ACCOUNTS.admin.email,
            passwordHash,
            roleId: adminRole.id,
            isActive: true,
        },
    });

    console.log('✅ Admin account seeded successfully.');

    //Seed Employee Account
    const employeeUser = await prisma.user.upsert({
        where: {
            email: DEMO_ACCOUNTS.employee.email,
        },
        update: { passwordHash, isActive: true },
        create: {
            email: DEMO_ACCOUNTS.employee.email,
            passwordHash,
            roleId: employeeRole.id,
            isActive: true,
        },
    });
    console.log('✅ Employee account seeded successfully.');

    //Get the department and position
    const engineeringDepartment = await prisma.department.findUniqueOrThrow({
        where: {
            code: 'ENG',
        },
    });

    const developerPosition = await prisma.position.findUniqueOrThrow({
        where: {
            code: 'DEVELOPER',
        },
    });

    //Seed Employee Profile
    await prisma.employee.upsert({
        where: {
            userId: employeeUser.id,
        },
        update: {
            phoneNumber: DEMO_ACCOUNTS.employee.phoneNumber,
            hireDate: DEMO_ACCOUNTS.employee.hireDate,
        },
        create: {
            employeeCode: DEMO_ACCOUNTS.employee.employeeCode,
            fullName: DEMO_ACCOUNTS.employee.fullName,
            userId: employeeUser.id,
            departmentId: engineeringDepartment.id,
            positionId: developerPosition.id,
            phoneNumber: DEMO_ACCOUNTS.employee.phoneNumber,
            hireDate: DEMO_ACCOUNTS.employee.hireDate,
            isActive: true, 
        },
    });

    console.log('✅ Employee profile seeded successfully.');
    console.log('----------------------------------');
    console.log('🎉 Database seeding completed!');
    console.log('----------------------------------');
    console.log('Demo accounts:');
    console.log(`ADMIN    : ${DEMO_ACCOUNTS.admin.email}`);
    console.log(`EMPLOYEE : ${DEMO_ACCOUNTS.employee.email}`);
    console.log('Password : value supplied by SEED_DEMO_PASSWORD');
}

main()
    .catch((error) => {
        console.error('❌ Error during database seeding:', error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
