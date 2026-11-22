import { join } from 'node:path';
import type { ConfigService } from '@nestjs/config';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const databaseOptions = (
  config: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: config.getOrThrow<string>('app.database.host'),
  port: config.getOrThrow<number>('app.database.port'),
  username: config.getOrThrow<string>('app.database.username'),
  password: config.get<string>('app.database.password'),
  database: config.getOrThrow<string>('app.database.name'),
  ssl: { rejectUnauthorized: false },
  entities: [join(__dirname, '../**/*.entity{.ts,.js}')],
  migrations: [join(__dirname, '../_migrations/[0-9]*-*.js')],
  migrationsTableName: '_migrations',
  migrationsRun: true,
  synchronize: false,
});
