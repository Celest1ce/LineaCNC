import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Pour ES modules, on doit construire __dirname manuellement
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Charger les variables d'environnement depuis le fichier .env à la racine du projet
// Le script seed.ts est dans apps/api/prisma/, donc on remonte de 3 niveaux pour atteindre la racine
const rootEnvPath = path.join(__dirname, '..', '..', '..', '.env');
console.log(`🔍 Tentative de chargement de .env depuis: ${rootEnvPath}`);
const result = dotenv.config({ path: rootEnvPath });
if (result.error) {
  console.log(`⚠️  Fichier .env non trouvé, utilisation des variables d'environnement système`);
}

// Construire DATABASE_URL depuis DB_* si nécessaire (comme dans prisma-wrapper.cjs)
if (!process.env.DATABASE_URL && process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASS && process.env.DB_NAME) {
  process.env.DATABASE_URL = `mysql://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}/${process.env.DB_NAME}`;
  console.log('✓ DATABASE_URL construite depuis les variables DB_*');
} else if (process.env.DATABASE_URL) {
  console.log('✓ DATABASE_URL trouvée dans les variables d\'environnement');
} else {
  console.error('❌ Aucune variable DATABASE_URL ou DB_* trouvée!');
  console.error('Variables disponibles:', Object.keys(process.env).filter(k => k.startsWith('DB_')).join(', '));
}

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding parameter definitions...');

  const now = Date.now();

  // Extrusion parameters
  await prisma.parameterDefinition.upsert({
    where: { parameterKey: 'extrusion.feed_rate' },
    update: {},
    create: {
      id: 'extrusion.feed_rate',
      parameterKey: 'extrusion.feed_rate',
      parameterType: 'number',
      defaultValue: 300,
      minValue: 1,
      maxValue: 3000,
      category: 'extrusion',
      displayOrder: 1,
      createdAt: now,
      updatedAt: now,
    },
  });

  await prisma.parameterDefinition.upsert({
    where: { parameterKey: 'extrusion.min_temp' },
    update: {},
    create: {
      id: 'extrusion.min_temp',
      parameterKey: 'extrusion.min_temp',
      parameterType: 'number',
      defaultValue: 170,
      minValue: 0,
      maxValue: 300,
      category: 'extrusion',
      displayOrder: 2,
      createdAt: now,
      updatedAt: now,
    },
  });

  // Console filter parameters
  await prisma.parameterDefinition.upsert({
    where: { parameterKey: 'console.filters' },
    update: {},
    create: {
      id: 'console.filters',
      parameterKey: 'console.filters',
      parameterType: 'json',
      defaultValue: [
        {
          id: '1',
          name: 'Temperature Reports',
          regex: 'T:\\s*\\d+\\.?\\d*\\s*\\/\\s*\\d+\\.?\\d*.*B:\\s*\\d+\\.?\\d*\\s*\\/\\s*\\d+\\.?\\d*',
          enabled: false,
        },
        {
          id: '2',
          name: 'Position Reports',
          regex: 'X:\\s*-?\\d+\\.?\\d*\\s+Y:\\s*-?\\d+\\.?\\d*\\s+Z:\\s*-?\\d+\\.?\\d*',
          enabled: false,
        },
      ],
      category: 'console',
      displayOrder: 10,
      createdAt: now,
      updatedAt: now,
    },
  });

  // Movement parameters
  await prisma.parameterDefinition.upsert({
    where: { parameterKey: 'movement.distance' },
    update: {},
    create: {
      id: 'movement.distance',
      parameterKey: 'movement.distance',
      parameterType: 'number',
      defaultValue: 10,
      minValue: 0.1,
      maxValue: 100,
      category: 'movement',
      displayOrder: 20,
      createdAt: now,
      updatedAt: now,
    },
  });

  await prisma.parameterDefinition.upsert({
    where: { parameterKey: 'movement.feed_rate' },
    update: {},
    create: {
      id: 'movement.feed_rate',
      parameterKey: 'movement.feed_rate',
      parameterType: 'number',
      defaultValue: 3000,
      minValue: 1,
      maxValue: 10000,
      category: 'movement',
      displayOrder: 21,
      createdAt: now,
      updatedAt: now,
    },
  });

  // Extrusion amount parameter
  await prisma.parameterDefinition.upsert({
    where: { parameterKey: 'extrusion.amount' },
    update: {},
    create: {
      id: 'extrusion.amount',
      parameterKey: 'extrusion.amount',
      parameterType: 'number',
      defaultValue: 10,
      minValue: 0.1,
      maxValue: 100,
      category: 'extrusion',
      displayOrder: 3,
      createdAt: now,
      updatedAt: now,
    },
  });

  // Temperature parameters
  await prisma.parameterDefinition.upsert({
    where: { parameterKey: 'temperature.hotend_target' },
    update: {},
    create: {
      id: 'temperature.hotend_target',
      parameterKey: 'temperature.hotend_target',
      parameterType: 'number',
      defaultValue: 200,
      minValue: 0,
      maxValue: 300,
      category: 'temperature',
      displayOrder: 30,
      createdAt: now,
      updatedAt: now,
    },
  });

  await prisma.parameterDefinition.upsert({
    where: { parameterKey: 'temperature.bed_target' },
    update: {},
    create: {
      id: 'temperature.bed_target',
      parameterKey: 'temperature.bed_target',
      parameterType: 'number',
      defaultValue: 60,
      minValue: 0,
      maxValue: 120,
      category: 'temperature',
      displayOrder: 31,
      createdAt: now,
      updatedAt: now,
    },
  });

  // Temperature profiles (combined hotend and bed)
  await prisma.parameterDefinition.upsert({
    where: { parameterKey: 'temperature.profiles' },
    update: {},
    create: {
      id: 'temperature.profiles',
      parameterKey: 'temperature.profiles',
      parameterType: 'json',
      defaultValue: [
        { id: '1', name: 'PLA', value: 200, type: 'hotend' },
        { id: '2', name: 'PETG', value: 230, type: 'hotend' },
        { id: '3', name: 'ABS', value: 240, type: 'hotend' },
        { id: '4', name: 'PLA', value: 60, type: 'bed' },
        { id: '5', name: 'PETG', value: 80, type: 'bed' },
        { id: '6', name: 'ABS', value: 100, type: 'bed' },
      ],
      category: 'temperature',
      displayOrder: 32,
      createdAt: now,
      updatedAt: now,
    },
  });

  // Print area parameters
  await prisma.parameterDefinition.upsert({
    where: { parameterKey: 'print_area.x' },
    update: {},
    create: {
      id: 'print_area.x',
      parameterKey: 'print_area.x',
      parameterType: 'number',
      defaultValue: 200,
      minValue: 10,
      maxValue: 1000,
      category: 'print_area',
      displayOrder: 40,
      createdAt: now,
      updatedAt: now,
    },
  });

  await prisma.parameterDefinition.upsert({
    where: { parameterKey: 'print_area.y' },
    update: {},
    create: {
      id: 'print_area.y',
      parameterKey: 'print_area.y',
      parameterType: 'number',
      defaultValue: 200,
      minValue: 10,
      maxValue: 1000,
      category: 'print_area',
      displayOrder: 41,
      createdAt: now,
      updatedAt: now,
    },
  });

  await prisma.parameterDefinition.upsert({
    where: { parameterKey: 'print_area.z' },
    update: {},
    create: {
      id: 'print_area.z',
      parameterKey: 'print_area.z',
      parameterType: 'number',
      defaultValue: 200,
      minValue: 10,
      maxValue: 1000,
      category: 'print_area',
      displayOrder: 42,
      createdAt: now,
      updatedAt: now,
    },
  });

  console.log('✅ Parameter definitions seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding parameter definitions:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
