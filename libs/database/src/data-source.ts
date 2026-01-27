import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config({ path: '.env' });

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL || 'postgresql://brider:brider_dev_password@localhost:5432/brider',
  entities: ['libs/database/src/entities/*.entity.ts'],
  migrations: ['libs/database/src/migrations/*.ts'],
  synchronize: false,
  logging: true,
});
