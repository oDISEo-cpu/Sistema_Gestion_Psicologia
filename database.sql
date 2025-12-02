
-- Crear la base de datos
CREATE DATABASE IF NOT EXISTS `secretaria` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Usar la base de datos
USE `secretaria`;

-- Tabla de estudiantes
CREATE TABLE IF NOT EXISTS `estudiantes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `apellido` varchar(100) NOT NULL,
  `sexo` enum('Masculino','Femenino','Otro') NOT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `carrera` varchar(100) NOT NULL,
  `foto` longtext DEFAULT NULL,
  `fecha_registro` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de citas
CREATE TABLE IF NOT EXISTS `citas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `student_id` int(11) NOT NULL,
  `fecha` date NOT NULL,
  `hora` time NOT NULL,
  `estado` enum('programada','completada','cancelada') NOT NULL DEFAULT 'programada',
  `fecha_completada` timestamp NULL DEFAULT NULL,
  `fecha_creacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `student_id` (`student_id`),
  CONSTRAINT `citas_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `estudiantes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertar algunos datos de ejemplo (opcional)
INSERT INTO `estudiantes` (`nombre`, `apellido`, `sexo`, `telefono`, `carrera`) VALUES
('Juan', 'Pérez', 'Masculino', '04121234567', 'Psicología'),
('María', 'González', 'Femenino', '04261234567', 'Psicología'),
('Carlos', 'Rodríguez', 'Masculino', NULL, 'Psicología');

-- Insertar algunas citas de ejemplo (opcional)
INSERT INTO `citas` (`student_id`, `fecha`, `hora`, `estado`) VALUES
(1, '2024-01-15', '09:00:00', 'programada'),
(2, '2024-01-16', '10:30:00', 'programada'),
(1, '2024-01-10', '14:00:00', 'completada');

