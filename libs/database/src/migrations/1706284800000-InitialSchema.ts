import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1706284800000 implements MigrationInterface {
  name = 'InitialSchema1706284800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enums
    await queryRunner.query(`
      CREATE TYPE "rider_status_enum" AS ENUM ('AVAILABLE', 'BUSY', 'OFFLINE')
    `);
    await queryRunner.query(`
      CREATE TYPE "delivery_status_enum" AS ENUM ('PENDING', 'ASSIGNED', 'PICKED_UP', 'DELIVERED', 'CANCELLED')
    `);
    await queryRunner.query(`
      CREATE TYPE "offer_status_enum" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED')
    `);

    // Create stores table
    await queryRunner.query(`
      CREATE TABLE "stores" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "address" character varying NOT NULL,
        "latitude" numeric(10,7) NOT NULL,
        "longitude" numeric(10,7) NOT NULL,
        "phone" character varying,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_stores" PRIMARY KEY ("id")
      )
    `);

    // Create riders table
    await queryRunner.query(`
      CREATE TABLE "riders" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "phone" character varying NOT NULL,
        "status" "rider_status_enum" NOT NULL DEFAULT 'OFFLINE',
        "latitude" numeric(10,7),
        "longitude" numeric(10,7),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_riders" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_riders_phone" UNIQUE ("phone")
      )
    `);

    // Create deliveries table
    await queryRunner.query(`
      CREATE TABLE "deliveries" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "storeId" uuid NOT NULL,
        "status" "delivery_status_enum" NOT NULL DEFAULT 'PENDING',
        "pickupAddress" character varying NOT NULL,
        "pickupLatitude" numeric(10,7) NOT NULL,
        "pickupLongitude" numeric(10,7) NOT NULL,
        "dropoffAddress" character varying NOT NULL,
        "dropoffLatitude" numeric(10,7) NOT NULL,
        "dropoffLongitude" numeric(10,7) NOT NULL,
        "customerPhone" character varying,
        "note" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_deliveries" PRIMARY KEY ("id"),
        CONSTRAINT "FK_deliveries_store" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

    // Create offers table
    await queryRunner.query(`
      CREATE TABLE "offers" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "deliveryId" uuid NOT NULL,
        "riderId" uuid NOT NULL,
        "status" "offer_status_enum" NOT NULL DEFAULT 'PENDING',
        "expiresAt" TIMESTAMP NOT NULL,
        "respondedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_offers" PRIMARY KEY ("id"),
        CONSTRAINT "FK_offers_delivery" FOREIGN KEY ("deliveryId") REFERENCES "deliveries"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_offers_rider" FOREIGN KEY ("riderId") REFERENCES "riders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

    // Create indexes for better query performance
    await queryRunner.query(`CREATE INDEX "IDX_riders_status" ON "riders" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_deliveries_status" ON "deliveries" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_deliveries_storeId" ON "deliveries" ("storeId")`);
    await queryRunner.query(`CREATE INDEX "IDX_offers_status" ON "offers" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_offers_deliveryId" ON "offers" ("deliveryId")`);
    await queryRunner.query(`CREATE INDEX "IDX_offers_riderId" ON "offers" ("riderId")`);
    await queryRunner.query(`CREATE INDEX "IDX_offers_expiresAt" ON "offers" ("expiresAt")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_offers_expiresAt"`);
    await queryRunner.query(`DROP INDEX "IDX_offers_riderId"`);
    await queryRunner.query(`DROP INDEX "IDX_offers_deliveryId"`);
    await queryRunner.query(`DROP INDEX "IDX_offers_status"`);
    await queryRunner.query(`DROP INDEX "IDX_deliveries_storeId"`);
    await queryRunner.query(`DROP INDEX "IDX_deliveries_status"`);
    await queryRunner.query(`DROP INDEX "IDX_riders_status"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE "offers"`);
    await queryRunner.query(`DROP TABLE "deliveries"`);
    await queryRunner.query(`DROP TABLE "riders"`);
    await queryRunner.query(`DROP TABLE "stores"`);

    // Drop enums
    await queryRunner.query(`DROP TYPE "offer_status_enum"`);
    await queryRunner.query(`DROP TYPE "delivery_status_enum"`);
    await queryRunner.query(`DROP TYPE "rider_status_enum"`);
  }
}
