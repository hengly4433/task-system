import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PermissionsService } from '../src/modules/permissions/permissions.service';
import { PrismaService } from '../src/common/database/prisma.service';
import * as bcrypt from 'bcrypt';

/**
 * Standalone script to seed initial data.
 * This can be run via `npm run seed`.
 */
async function bootstrap() {
  console.log('🌱 Starting database seeding...');
  
  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    const prisma = app.get(PrismaService);
    const permissionsService = await app.resolve(PermissionsService);
    
    // 1. Seed permissions
    console.log('Seeding permissions...');
    await permissionsService.seedInitialPermissions();
    console.log('✅ Permissions seeded successfully');
    
    // 2. Seed system admin user
    console.log('Seeding system admin user...');
    await seedSystemAdmin(prisma);
    console.log('✅ System admin seeded successfully');
    
  } catch (error) {
    console.error('❌ Error during database seeding:', error);
    process.exit(1);
  } finally {
    await app.close();
    console.log('🌱 Database seeding completed.');
  }
}

async function seedSystemAdmin(prisma: PrismaService) {
  const adminEmail = 'sysadmin@task.com';
  const adminPassword = 'sysadmin@2026';
  const adminUsername = 'sysadmin';
  const adminFullName = 'System Administrator';
  const tenantName = 'System Administration';
  const tenantSlug = 'system-admin';

  // Check if admin already exists
  const existingUser = await prisma.user.findFirst({
    where: { email: adminEmail, deletedAt: null },
  });

  if (existingUser) {
    console.log('  ℹ️  System admin already exists, skipping...');
    return;
  }

  // Create the admin user
  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  const user = await prisma.user.create({
    data: {
      username: adminUsername,
      email: adminEmail,
      passwordHash: hashedPassword,
      fullName: adminFullName,
    },
  });

  // Create the system tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: tenantName,
      slug: tenantSlug,
      status: 'ACTIVE',
      plan: 'ENTERPRISE',
      maxUsers: 1000,
      maxProjects: 10000,
    },
  });

  // Assign user as OWNER of the tenant
  await prisma.tenantMember.create({
    data: {
      tenantId: tenant.tenantId,
      userId: user.userId,
      role: 'OWNER',
      status: 'ACTIVE',
      isDefault: true,
      joinedAt: new Date(),
    },
  });

  // Create Admin role for the tenant
  const adminRole = await prisma.role.create({
    data: {
      tenantId: tenant.tenantId,
      roleName: 'Admin',
      description: 'Full access to all features',
      color: '#f1184c',
      isSystem: true,
    },
  });

  // Grant ALL permissions to Admin role
  const allPermissions = await prisma.permission.findMany();
  if (allPermissions.length > 0) {
    await prisma.rolePermission.createMany({
      data: allPermissions.map((p) => ({
        roleId: adminRole.roleId,
        permissionId: p.permissionId,
        granted: true,
      })),
    });
  }

  // Assign Admin role to the user
  await prisma.userRoleMapping.create({
    data: {
      userId: user.userId,
      roleId: adminRole.roleId,
    },
  });

  // Create a default 'User' role for the tenant
  await prisma.role.create({
    data: {
      tenantId: tenant.tenantId,
      roleName: 'User',
      description: 'Standard user with limited access',
      color: '#6B7280',
      isSystem: true,
    },
  });

  console.log(`  📧 Email: ${adminEmail}`);
  console.log(`  🔑 Password: ${adminPassword}`);
  console.log(`  🏢 Tenant: ${tenantName}`);
}

bootstrap();
