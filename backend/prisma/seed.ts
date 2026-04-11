import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ROLES = [
  { name: 'admin', description: 'Full system access' },
  { name: 'operations', description: 'Manage orders, shipments, receiving' },
  { name: 'warehouse', description: 'Warehouse and inventory management' },
  { name: 'pos_cashier', description: 'Point of sale operations' },
  { name: 'finance', description: 'Financial reports and FX conversions' },
  { name: 'viewer', description: 'Read-only access' },
];

const PERMISSIONS = [
  { code: 'inventory.adjust', description: 'Manual stock adjustment' },
  { code: 'inventory.override_negative', description: 'Allow stock to go below zero' },
  { code: 'sales.void', description: 'Void a completed sale' },
  { code: 'sales.refund', description: 'Issue a refund' },
  { code: 'sales.discount', description: 'Apply discounts at POS' },
  { code: 'shipments.dispatch', description: 'Mark shipment dispatched' },
  { code: 'shipments.receive', description: 'Confirm goods received' },
  { code: 'reports.export', description: 'Export reports to CSV/Excel/PDF' },
  { code: 'users.manage', description: 'Create and edit users' },
  { code: 'fx.convert', description: 'Log cash conversions' },
];

async function main() {
  console.log('Seeding roles...');
  for (const role of ROLES) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: role,
    });
  }

  console.log('Seeding permissions...');
  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: { description: perm.description },
      create: perm,
    });
  }

  // Assign all permissions to admin role
  console.log('Assigning all permissions to admin...');
  const adminRole = await prisma.role.findUnique({ where: { name: 'admin' } });
  const allPerms = await prisma.permission.findMany();
  if (adminRole) {
    for (const perm of allPerms) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id },
        },
        update: {},
        create: { roleId: adminRole.id, permissionId: perm.id },
      });
    }
  }

  // Seed locations
  console.log('Seeding locations...');
  const LOCATIONS = [
    { name: 'UK Warehouse', locationType: 'UK warehouse', country: 'GB', city: 'London', isActive: true },
    { name: 'Ghana Warehouse', locationType: 'Ghana warehouse', country: 'GH', city: 'Accra', isActive: true },
  ];
  for (const loc of LOCATIONS) {
    const existing = await prisma.location.findFirst({ where: { name: loc.name } });
    if (!existing) {
      await prisma.location.create({ data: loc });
    } else {
      await prisma.location.update({
        where: { id: existing.id },
        data: { locationType: loc.locationType, country: loc.country, city: loc.city, isActive: loc.isActive },
      });
    }
  }

  console.log('Seed complete.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
