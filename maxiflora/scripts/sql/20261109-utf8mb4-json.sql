-- Preserve all rows; execute after a verified backup. Fully qualified for phpMyAdmin.
ALTER TABLE `p-360380_maxiflora`.`accounts`
  MODIFY `profile` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL;
ALTER TABLE `p-360380_maxiflora`.`workspaces`
  MODIFY `state` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL;
