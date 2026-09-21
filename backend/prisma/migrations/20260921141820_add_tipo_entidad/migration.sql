-- AlterTable
ALTER TABLE `cotizaciones` ADD COLUMN `entidad` VARCHAR(191) NOT NULL DEFAULT 'Reka Cobranzas',
    ADD COLUMN `tipo_prestamo` VARCHAR(191) NOT NULL DEFAULT 'prendario';
