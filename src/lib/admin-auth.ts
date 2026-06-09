import { auth, currentUser } from "@clerk/nextjs/server"
import prisma from "@/lib/prisma"

/**
 * Single source of truth for admin authorization on /api/admin/* routes.
 *
 * Previously the admin API routes used three inconsistent strategies (DB role,
 * Clerk publicMetadata, or — in the social routes — nothing but a login check),
 * which let any authenticated user hit admin endpoints. This consolidates the
 * checks: a caller is an admin if EITHER their DB User.role is ADMIN OR their
 * verified Clerk email is in the comma-separated ADMIN_EMAILS allowlist.
 *
 * Returns the userId on success, or null if the caller is not an admin. Routes
 * should treat null as 403 Forbidden (401 if there is no session at all).
 */
export interface AdminCheckResult {
    ok: boolean
    userId: string | null
    status: 401 | 403 | 200
}

function adminEmailAllowlist(): string[] {
    return (process.env.ADMIN_EMAILS || "")
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean)
}

export async function checkAdmin(): Promise<AdminCheckResult> {
    const { userId } = await auth()
    if (!userId) {
        return { ok: false, userId: null, status: 401 }
    }

    // 1. DB role check (authoritative once roles are provisioned).
    const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, email: true },
    })
    if (dbUser?.role === "ADMIN") {
        return { ok: true, userId, status: 200 }
    }

    // 2. Email allowlist fallback (verified Clerk email or DB email).
    const allow = adminEmailAllowlist()
    if (allow.length > 0) {
        const user = await currentUser()
        const clerkEmail = user?.emailAddresses?.[0]?.emailAddress?.toLowerCase()
        const dbEmail = dbUser?.email?.toLowerCase()
        if ((clerkEmail && allow.includes(clerkEmail)) || (dbEmail && allow.includes(dbEmail))) {
            return { ok: true, userId, status: 200 }
        }
    }

    // Authenticated but not an admin.
    return { ok: false, userId, status: 403 }
}
