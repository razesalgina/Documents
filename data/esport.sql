CREATE TABLE competitions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type ENUM('tournament', 'league') NOT NULL,
  name VARCHAR(150) NOT NULL,
  registration_fee INT NOT NULL DEFAULT 0,
  prizepool INT NOT NULL DEFAULT 0,
  final_rank ENUM('1st', '2nd', '3rd', '4th', '8th', '16th', 'failed') DEFAULT 'failed',
  status ENUM('cancel', 'lose', 'win') DEFAULT 'lose',
  team_count INT NOT NULL DEFAULT 0,
  phase_count TINYINT NOT NULL DEFAULT 1,

  phase_format1 ENUM('single_elimination', 'double_elimination', 'group_stage', 'swiss_stage') DEFAULT NULL,
  phase_format2 ENUM('single_elimination', 'double_elimination', 'group_stage', 'swiss_stage') DEFAULT NULL,
  phase_format3 ENUM('single_elimination', 'double_elimination', 'group_stage', 'swiss_stage') DEFAULT NULL,
  phase_format4 ENUM('single_elimination', 'double_elimination', 'group_stage', 'swiss_stage') DEFAULT NULL,

  phase_status1 ENUM('lose', 'win') DEFAULT NULL,
  phase_status2 ENUM('lose', 'win') DEFAULT NULL,
  phase_status3 ENUM('lose', 'win') DEFAULT NULL,
  phase_status4 ENUM('lose', 'win') DEFAULT NULL,

  phase_bracket1 VARCHAR(255) DEFAULT NULL,
  phase_bracket2 VARCHAR(255) DEFAULT NULL,
  phase_bracket3 VARCHAR(255) DEFAULT NULL,
  phase_bracket4 VARCHAR(255) DEFAULT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB
DEFAULT CHARSET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;