# CLAUDE.md

project: Stokasir App
summary: Aplikasi manajemen stok-kasir grosir/eceran. Webview lokal via WiFi LAN. Offline-first, siap migrasi ke Turso/Supabase.
team: 1 developer, 1 toko, < 5 karyawan
principles: SIMPEL; RINGAN; OFFLINE; WEBVIEW
detail_refs: claude/identity.md, claude/coding.md, claude/database.md, claude/frontend.md, claude/status.md, claude/deployment.md, claude/sop-engine.md, claude/attachments.md, claude/approval.md, claude/scheduler.md, claude/patterns.md
deployment_notes: Deployment ke Raspberry Pi baca DEPLOY.md
feature_notes: Pola implementasi fitur baru baca CLAUDE_SKILL_FEATURE_DEV.md

git_commit_format: <type>(<scope>): <deskripsi singkat>
git_commit_types: feat, fix, refactor, style, chore, docs, db
git_commit_scopes: auth, kasir, gudang, keuangan, laporan, karyawan, barang, stok
git_commit_rules: Bahasa Indonesia; imperatif; huruf kecil; body menjelaskan kenapa berubah, bukan apa yang berubah

response_recap_format: <type>(<scope>): <deskripsi singkat>\n\n<body: kenapa berubah - opsional, hanya jika perlu konteks>
response_recap_rules: 1 blok code fence di akhir respons; tanpa label atau header tambahan; pilih scope paling dominan jika banyak file/scope

frontend_stack: Svelte 5; withLoading; async utilities; responsive; anti-pattern rules ada di claude/frontend.md
database_rules: helper schema, audit fields, dan aturan tabel baru ada di claude/database.md
backend_modules: SOP engine, event bus, attachment, approval, dan scheduler dipisah agar cepat dicari
status_tracking: Status implementasi, bugfix, dan backlog ada di claude/status.md