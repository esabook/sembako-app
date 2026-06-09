CREATE TABLE `sop_instance` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`rule_id` integer NOT NULL,
	`karyawan_id` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`payload_json` text,
	`hasil_json` text,
	`dibuat_at` text DEFAULT (datetime('now','localtime')) NOT NULL,
	`diselesaikan_at` text,
	FOREIGN KEY (`rule_id`) REFERENCES `sop_rule`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`karyawan_id`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_sop_instance_rule` ON `sop_instance` (`rule_id`);--> statement-breakpoint
CREATE INDEX `idx_sop_instance_karyawan` ON `sop_instance` (`karyawan_id`);--> statement-breakpoint
CREATE INDEX `idx_sop_instance_status` ON `sop_instance` (`status`);--> statement-breakpoint
CREATE TABLE `sop_rule` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nama` text NOT NULL,
	`event_name` text NOT NULL,
	`tipe` text DEFAULT 'checklist' NOT NULL,
	`deskripsi` text,
	`config_json` text,
	`is_active` integer DEFAULT true NOT NULL,
	`urutan` integer DEFAULT 0 NOT NULL,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT (datetime('now','localtime')),
	`updated_at` text DEFAULT (datetime('now','localtime'))
);
--> statement-breakpoint
CREATE INDEX `idx_sop_rule_event` ON `sop_rule` (`event_name`);