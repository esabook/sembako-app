# CLAUDE.md

project: Stokasir App
summary: Aplikasi manajemen stok-kasir grosir/eceran. Multi-toko, multi-cabang, multi-dialect DB. Webview lokal (LAN/Pi) atau cloud (Turso/Supabase/Railway).
team: 1 developer
principles: SIMPEL; RINGAN; OFFLINE; WEBVIEW
detail_refs: claude/identity.md, claude/coding.md, claude/database.md, claude/frontend.md, claude/status.md, claude/deployment.md, claude/sop-engine.md, claude/attachments.md, claude/approval.md, claude/scheduler.md, claude/patterns.md
deployment_notes: Deployment ke Raspberry Pi baca DEPLOY.md; cloud (Turso/PG) baca claude/deployment.md
feature_notes: Pola implementasi fitur baru baca CLAUDE_SKILL_FEATURE_DEV.md

git_commit_format: <type>(<scope>): <deskripsi singkat>
git_commit_types: feat, fix, refactor, style, chore, docs, db
git_commit_scopes: auth, kasir, gudang, keuangan, laporan, karyawan, barang, stok, pengaturan
git_commit_rules: Bahasa Indonesia; imperatif; huruf kecil; body menjelaskan kenapa berubah, bukan apa yang berubah

response_recap_format: <type>(<scope>): <deskripsi singkat>\n\n<body: kenapa berubah - opsional, hanya jika perlu konteks>
response_recap_rules: 1 blok code fence di akhir respons; tanpa label atau header tambahan; pilih scope paling dominan jika banyak file/scope

frontend_stack: Svelte 5; withLoading; async utilities; responsive; anti-pattern rules ada di claude/frontend.md
database_rules: multi-dialect (SQLite/Turso/PG/MySQL), helper builders.ts, pola tenant ada di claude/database.md
backend_modules: SOP engine, event bus, attachment, approval, scheduler, storage driver, backup/restore
status_tracking: Status implementasi, bugfix, dan backlog ada di claude/status.md

# Svelte MCP Tools (jika tersedia)
svelte_mcp_list_sections: Panggil PERTAMA saat ada pertanyaan Svelte/SvelteKit — temukan section relevan
svelte_mcp_get_documentation: Ambil dokumentasi lengkap section yang relevan
svelte_mcp_autofixer: Jalankan pada setiap kode Svelte sebelum dikirim ke user — ulangi sampai 0 issues
svelte_mcp_playground_link: Generate Svelte Playground link — HANYA setelah konfirmasi user, JANGAN jika kode sudah ditulis ke file project
