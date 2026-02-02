/**
 * Migration Script: Fix Existing Tenant Owners
 * 
 * This script finds all existing tenant owners who don't have an Admin role
 * assigned and creates the Admin role with all permissions for their tenants.
 * 
 * Run with: npx ts-node prisma/scripts/fix-existing-owners.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Starting migration: Fix existing tenant owners...\n');

  // Find all tenant owners who don't have any role assignments
  const tenantOwners = await prisma.tenantMember.findMany({
    where: {
      role: 'OWNER',
      status: 'ACTIVE',
    },
    include: {
      user: {
        include: {
          roles: true,
        },
      },
      tenant: true,
    },
  });

  console.log(`Found ${tenantOwners.length} tenant owner(s) to check.\n`);

  let fixed = 0;
  const errors: string[] = [];

  for (const membership of tenantOwners) {
    const { user, tenant } = membership;

    console.log(`\n📋 Processing: ${user.email} (Tenant: ${tenant.name})`);

    try {
      // First, ensure isDefault is set for the owner's membership
      if (!membership.isDefault) {
        await prisma.tenantMember.update({
          where: { id: membership.id },
          data: { isDefault: true },
        });
        console.log('  ✓ Set tenant as user default.');
        fixed++;
      }

      // Check if user already has a role
      if (user.roles.length > 0) {
        console.log(`  ✓ User already has ${user.roles.length} role(s), skipping role assignment.`);
        continue;
      }

      // Check if Admin role exists for this tenant
      let adminRole = await prisma.role.findFirst({
        where: {
          tenantId: tenant.tenantId,
          roleName: 'Admin',
        },
      });

      if (!adminRole) {
        console.log('  → Creating Admin role...');
        adminRole = await prisma.role.create({
          data: {
            tenantId: tenant.tenantId,
            roleName: 'Admin',
            description: 'Full access to all features',
            color: '#f1184c',
            isSystem: true,
          },
        });

        // Get all permissions and grant them to Admin role
        const allPermissions = await prisma.permission.findMany();

        if (allPermissions.length > 0) {
          await prisma.rolePermission.createMany({
            data: allPermissions.map((p) => ({
              roleId: adminRole!.roleId,
              permissionId: p.permissionId,
              granted: true,
            })),
          });
          console.log(`  → Granted ${allPermissions.length} permissions to Admin role.`);
        } else {
          console.log('  ⚠ No permissions found in database. Run permission seeding first.');
        }
      } else {
        console.log('  → Admin role already exists.');
      }

      // Assign Admin role to user
      const existingMapping = await prisma.userRoleMapping.findFirst({
        where: {
          userId: user.userId,
          roleId: adminRole.roleId,
        },
      });

      if (!existingMapping) {
        await prisma.userRoleMapping.create({
          data: {
            userId: user.userId,
            roleId: adminRole.roleId,
          },
        });
        console.log('  ✓ Assigned Admin role to user.');
        fixed++;
      } else {
        console.log('  → User already has Admin role assigned.');
      }

      // Ensure isDefault is set for the owner's membership
      if (!membership.isDefault) {
        await prisma.tenantMember.update({
          where: { id: membership.id },
          data: { isDefault: true },
        });
        console.log('  ✓ Set tenant as user default.');
      }
    } catch (error) {
      const message = `Failed to process ${user.email}: ${error}`;
      console.error(`  ✗ ${message}`);
      errors.push(message);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Migration complete!`);
  console.log(`   - Processed: ${tenantOwners.length} tenant owner(s)`);
  console.log(`   - Fixed: ${fixed} user(s)`);
  if (errors.length > 0) {
    console.log(`   - Errors: ${errors.length}`);
    errors.forEach((e) => console.log(`     • ${e}`));
  }
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
