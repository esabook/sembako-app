// better-auth — instance per-request (Fase A, coexist).
//
// WAJIB per-request di CF Workers: secret & kredensial baru tersedia saat
// request (worker.ts inject c.env → process.env). Instansiasi di module-top
// akan membaca env kosong (R2 di todo/auth/BACKLOG.md). Karena itu factory.
//
// Kolom DB snake_case; field better-auth camelCase dipetakan via `fields`.
// Tanggal = tsDate (integer timestamp) karena supportsDates default true.
// Session disimpan di KV (secondaryStorage) + D1 (storeSessionInDatabase) agar
// revoke/list device murah sekaligus persisten untuk audit.
// Password legacy diverify lewat utils/password.ts (PBKDF2/bcrypt) tanpa reset paksa.

import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { env } from '../config/env.ts'
import { prodDb } from '../db/index.ts'
import { ba_account, ba_session, ba_user, ba_verification } from '../db/schema.ts'
import { betterAuthKV } from './cache.ts'
import { sendAuthEmail } from './email.ts'
import { hashPassword, verifyPassword } from '../utils/password.ts'

export function getBetterAuth(env_: { KV?: unknown }) {
  return betterAuth({
    appName: 'Stokasir',
    // basePath /api/auth → redirect URI Google = <baseURL>/api/auth/callback/google
    // (cocok dgn yang diregister di Google console). Handler di-mount di path sama.
    basePath: '/api/auth',
    secret: env.betterAuthSecret,
    // baseURL di-infer dari request bila BETTER_AUTH_URL kosong.
    ...(env.betterAuthUrl ? { baseURL: env.betterAuthUrl } : {}),
    trustedOrigins: env.corsOrigins,

    // Auth identity di DB PROD (bukan demo) — pakai prodDb() eksplisit, jangan
    // proxy `db` yang bisa ter-route ke demo lewat AsyncLocalStorage.
    database: drizzleAdapter(prodDb(), {
      provider: 'sqlite',
      schema: {
        user: ba_user,
        session: ba_session,
        account: ba_account,
        verification: ba_verification,
      },
    }),

    // Session & rate-limit di KV existing (revoke/list murah). LAN: noopKV → DB.
    secondaryStorage: betterAuthKV(env_),
    session: {
      storeSessionInDatabase: true,
      fields: {
        userId: 'user_id',
        expiresAt: 'expires_at',
        ipAddress: 'ip_address',
        userAgent: 'user_agent',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
    },

    emailAndPassword: {
      enabled: true,
      // Hash/verify pakai util existing — verify legacy PBKDF2/bcrypt tanpa reset.
      password: {
        hash: (password) => hashPassword(password),
        verify: ({ hash, password }) => verifyPassword(password, hash),
      },
      // Stub sampai domain siap (P1/P3) — sekarang cuma log link.
      sendResetPassword: async ({ user, url }) => {
        await sendAuthEmail({
          to: user.email,
          subject: 'Reset password Stokasir',
          url,
          text: `Klik untuk reset password: ${url}`,
        })
      },
    },

    emailVerification: {
      sendVerificationEmail: async ({ user, url }) => {
        await sendAuthEmail({
          to: user.email,
          subject: 'Verifikasi email Stokasir',
          url,
          text: `Klik untuk verifikasi email: ${url}`,
        })
      },
    },

    // OAuth Google aktif hanya bila kredensial ada (P2). Tanpa cred → password saja.
    ...(env.oauthEnabled
      ? {
          socialProviders: {
            google: {
              clientId: env.googleClientId,
              clientSecret: env.googleClientSecret,
            },
          },
        }
      : {}),

    user: {
      fields: {
        emailVerified: 'email_verified',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
    },
    account: {
      // Karyawan dibuat dgn account credential (email belum terverifikasi — belum
      // ada domain pengirim). Tanpa ini, login Google ke karyawan existing DITOLAK
      // better-auth (requireLocalEmailVerified default true) → akun google tak
      // tertaut, sesi tak terbuat. Aman di sini: ba_user hanya dibuat admin dari
      // email karyawan terkontrol (bukan signup terbuka), Google = email verified.
      accountLinking: {
        enabled: true,
        trustedProviders: ['google'],
        requireLocalEmailVerified: false,
      },
      fields: {
        userId: 'user_id',
        accountId: 'account_id',
        providerId: 'provider_id',
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
        idToken: 'id_token',
        accessTokenExpiresAt: 'access_token_expires_at',
        refreshTokenExpiresAt: 'refresh_token_expires_at',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
    },
    verification: {
      fields: {
        expiresAt: 'expires_at',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
    },

    advanced: {
      useSecureCookies: env.isProd,
    },
  })
}

export type BetterAuth = ReturnType<typeof getBetterAuth>
