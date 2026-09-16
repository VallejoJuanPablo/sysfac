-- CreateTable
CREATE TABLE `cotizaciones` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL DEFAULT '',
    `valor_vehiculo` DECIMAL(14, 2) NOT NULL,
    `monto_financiar` DECIMAL(14, 2) NOT NULL,
    `plazo` INTEGER NOT NULL,
    `tna` DECIMAL(6, 2) NOT NULL,
    `sistema` VARCHAR(191) NOT NULL DEFAULT 'frances',
    `condicion` VARCHAR(191) NOT NULL DEFAULT '0km',
    `seguro_auto_anual` DECIMAL(6, 2) NOT NULL DEFAULT 0,
    `seguro_vida_mensual` DECIMAL(6, 4) NOT NULL DEFAULT 0,
    `gasto_admin_mensual` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `iva_intereses` BOOLEAN NOT NULL DEFAULT false,
    `cuota_pura` DECIMAL(14, 2) NOT NULL,
    `cuota_total` DECIMAL(14, 2) NOT NULL,
    `total_intereses` DECIMAL(14, 2) NOT NULL,
    `costo_total` DECIMAL(14, 2) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
