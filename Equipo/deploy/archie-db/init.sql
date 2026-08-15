-- =============================================
-- Init script para MySQL del archie-db-server
-- Crea ambas bases y sus tablas
-- =============================================

-- === Base: archie_team ===
CREATE DATABASE IF NOT EXISTS archie_team CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE archie_team;

CREATE TABLE IF NOT EXISTS proyectos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(20) NOT NULL,
  nombre VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pendientes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  proyecto_id INT NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  descripcion TEXT,
  tipo VARCHAR(50) DEFAULT 'spec',
  prioridad VARCHAR(20) DEFAULT 'media',
  fuente VARCHAR(50) DEFAULT 'telegram',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (proyecto_id) REFERENCES proyectos(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS chat_states (
  chat_id BIGINT PRIMARY KEY,
  proyecto_id INT DEFAULT 0,
  step VARCHAR(50) DEFAULT '',
  titulo VARCHAR(255) DEFAULT '',
  descripcion TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- === Base: coach ===
CREATE DATABASE IF NOT EXISTS coach CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE coach;

CREATE TABLE IF NOT EXISTS coach_users (
  chat_id BIGINT PRIMARY KEY
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS coach_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  chat_id BIGINT NOT NULL,
  ejercicio VARCHAR(100) NOT NULL,
  fecha DATE NOT NULL,
  INDEX idx_chat_fecha (chat_id, fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- === Base: nutricionista ===
CREATE DATABASE IF NOT EXISTS nutricionista CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE nutricionista;

CREATE TABLE IF NOT EXISTS nutri_menus (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dia VARCHAR(20) NOT NULL,
  comida VARCHAR(30) NOT NULL,
  descripcion TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_dia_comida (dia, comida)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed: menus semanales
INSERT INTO nutri_menus (dia, comida, descripcion) VALUES
('lunes', 'desayuno', 'Te o cafe con 250 ml de leche descremada + omelette de 2 huevos + tostada + 1 banana'),
('lunes', 'almuerzo', '200 g pechuga de pollo + ensalada de tomate, cebolla y morron + 5 cucharadas soperas de arroz cocido'),
('lunes', 'almuerzo_alt', '200 g de pescado blanco (como merluza o boga) al horno + ensalada de zanahoria rallada y rucula + 5 cucharadas soperas de quinoa o trigo burgol'),
('lunes', 'merienda', '200 g de yogur descremado + 1 manzana'),
('lunes', 'cena', '200 g carne magra + zapallo y zapallito al horno + acelga salteada'),
('lunes', 'cena_alt', '200 g de pechuga de pavo (o pollo) a la plancha + pure de calabaza + brocoli al vapor'),
('martes', 'desayuno', 'Te con leche + 200 g yogur descremado + 1 naranja'),
('martes', 'almuerzo', '200 g lomo de cerdo + 200 g papa hervida + ensalada de tomate'),
('martes', 'almuerzo_alt', '200 g de pechuga de pollo + 200 g de batata al horno (o mandioca) + ensalada de lechuga y pepino'),
('martes', 'merienda', '2 huevos duros + 1 banana'),
('martes', 'cena', '200 g atun al natural + ensalada de espinaca, cebolla y tomate'),
('martes', 'cena_alt', '200 g de filet de merluza al limon + ensalada de chauchas, zanahoria y huevo (solo claras)'),
('miercoles', 'desayuno', 'Cafe con leche + revuelto de 2 huevos + tostada'),
('miercoles', 'almuerzo', '200 g carne magra + 6 cucharadas de lentejas cocidas + ensalada de tomate y morron'),
('miercoles', 'almuerzo_alt', '200 g de lomo de cerdo + 6 cucharadas de garbanzos cocidos + ensalada de repollo blanco y morron'),
('miercoles', 'merienda', 'Yogur descremado + 1 manzana'),
('miercoles', 'cena', '200 g pollo + zapallo asado + zapallitos salteados'),
('miercoles', 'cena_alt', '200 g de carne magra (nalga o peceto) + berenjenas y morrones asados al horno'),
('jueves', 'desayuno', 'Te con leche + omelette con espinaca + 1 naranja'),
('jueves', 'almuerzo', '200 g pollo + 60 g de fideos secos (aprox 1 1/2 taza cocidos) + salsa de tomate casera con cebolla'),
('jueves', 'almuerzo_alt', '200 g de carne picada magra (albondigas al horno) + 60 g de fideos integrales o monitos + salsa de tomate natural'),
('jueves', 'merienda', 'Yogur descremado + 1 banana'),
('jueves', 'cena', '200 g carne magra + ensalada de tomate, cebolla y acelga'),
('jueves', 'cena_alt', '200 g de lomo de cerdo + ensalada de rucula, tomates cherry y champinones frescos'),
('viernes', 'desayuno', 'Cafe con leche + 2 huevos + 1 manzana + tostada'),
('viernes', 'almuerzo', '200 g atun + 5 cucharadas de arroz cocido + ensalada de tomate y morron'),
('viernes', 'almuerzo_alt', '200 g de pollo desmenuzado + 5 cucharadas de choclo en grano + ensalada de apio y manzana verde'),
('viernes', 'merienda', 'Yogur + 1 naranja'),
('viernes', 'cena', '200 g lomo de cerdo + zapallo al horno + espinaca salteada'),
('viernes', 'cena_alt', '200 g de pescado (filet) a las finas hierbas + coliflor al horno + acelga salteada con ajo'),
('sabado', 'desayuno', 'Cafe con leche + revuelto de 2 huevos + tostada'),
('sabado', 'almuerzo', '200 g pollo + 200 g papa hervida + ensalada de tomate y cebolla'),
('sabado', 'almuerzo_alt', '200 g de carne magra (cuadril) al plato + 200 g de mandioca o batata hervida + ensalada de repollo colorado y zanahoria'),
('sabado', 'merienda', 'Yogur descremado + 1 manzana'),
('sabado', 'cena', '200 g carne magra + 6 cucharadas de lentejas cocidas + ensalada de espinaca'),
('sabado', 'cena_alt', '200 g de pechuga de pollo + 6 cucharadas de arvejas o porotos alubia + ensalada caprese (tomate y albahaca fresca)');

-- === Permisos ===
-- El usuario 'archie' creado por MYSQL_USER necesita acceso a ambas bases
GRANT ALL PRIVILEGES ON archie_team.* TO 'archie'@'%';
GRANT ALL PRIVILEGES ON coach.* TO 'archie'@'%';
GRANT ALL PRIVILEGES ON nutricionista.* TO 'archie'@'%';
FLUSH PRIVILEGES;
