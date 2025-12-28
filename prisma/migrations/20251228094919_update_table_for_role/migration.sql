-- AlterTable
CREATE SEQUENCE roles_id_seq;
ALTER TABLE "roles" ALTER COLUMN "id" SET DEFAULT nextval('roles_id_seq');
ALTER SEQUENCE roles_id_seq OWNED BY "roles"."id";
