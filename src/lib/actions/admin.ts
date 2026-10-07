'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createUserSchema, ROLES, DEPARTMENTS } from '@/lib/validations/master-data';
import { dbError, noRowsAffected, type ActionResult } from './result';

// Role/department/active/name edits rely on RLS (profiles_admin_write) to restrict writes to
// system_admin. Anything that needs the service-role key (creating logins, changing an
// email, setting a password) bypasses RLS, so those call requireSystemAdmin() first.

async function currentUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

// Checks is_active as well as the role: a deactivated admin still has role = system_admin
// on their own profile row, and must not be able to use the service role.
async function requireSystemAdmin(): Promise<{ error: string } | { ok: true; userId: string }> {
  const { supabase, user } = await currentUser();
  if (!user) return { error: 'Not authenticated' };
  const { data: me } = await supabase.from('profiles').select('role, is_active').eq('id', user.id).single();
  if (me?.role !== 'system_admin' || !me.is_active) return { error: 'Only a System Admin can do that.' };
  return { ok: true, userId: user.id };
}

export async function updateUserRole(userId: string, role: string, department: string): Promise<ActionResult> {
  if (!(ROLES as readonly string[]).includes(role)) return { error: 'Choose a valid role.' };
  if (!(DEPARTMENTS as readonly string[]).includes(department)) return { error: 'Choose a valid department.' };

  const { supabase, user } = await currentUser();
  // Stops the last admin from accidentally demoting themselves and locking everyone out.
  if (user?.id === userId && role !== 'system_admin') {
    return { error: "You can't remove your own System Admin role. Ask another admin to change it." };
  }

  const { data, error } = await supabase.from('profiles').update({ role, department }).eq('id', userId).select('id');
  if (error) return dbError(error);
  if (!data?.length) return noRowsAffected();

  revalidatePath('/admin/users');
  return { success: true };
}

export async function updateUserName(userId: string, fullName: string): Promise<ActionResult> {
  const name = fullName.trim();
  if (!name) return { error: 'Full name is required.' };

  const { supabase } = await currentUser();
  const { data, error } = await supabase.from('profiles').update({ full_name: name }).eq('id', userId).select('id');
  if (error) return dbError(error);
  if (!data?.length) return noRowsAffected();

  revalidatePath('/admin/users');
  return { success: true };
}

/**
 * Deactivate / reactivate. Two layers: profiles.is_active makes current_app_role() return
 * NULL (migration 0011), which cuts off all data access at once; the auth ban additionally
 * stops the person signing in or refreshing their session at all.
 */
export async function toggleUserActive(userId: string, isActive: boolean): Promise<ActionResult> {
  const { supabase, user } = await currentUser();
  if (user?.id === userId && !isActive) return { error: "You can't deactivate your own account." };

  const { data: updated, error: updateError } = await supabase
    .from('profiles')
    .update({ is_active: isActive })
    .eq('id', userId)
    .select('id');
  if (updateError) return dbError(updateError);
  if (!updated?.length) return noRowsAffected();

  // The update only succeeds for a system_admin (RLS), so the service role is safe to use now.
  // If it fails, is_active has already revoked their access, so this isn't fatal.
  try {
    await createAdminClient().auth.admin.updateUserById(userId, { ban_duration: isActive ? 'none' : '876000h' });
  } catch (e) {
    console.error('Could not update the auth ban for', userId, e);
  }

  revalidatePath('/admin/users');
  return { success: true };
}

/**
 * Creates a login + profile in one step. The on_auth_user_created trigger inserts the
 * profile with placeholder defaults (admin_staff / hr_administration), so this immediately
 * overwrites them with the role/department the admin chose.
 */
export async function createUser(input: unknown): Promise<ActionResult> {
  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const auth = await requireSystemAdmin();
  if ('error' in auth) return { error: auth.error };

  const admin = createAdminClient();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.full_name },
  });
  if (createError || !created.user) {
    const taken = createError?.message?.toLowerCase().includes('already');
    return { error: taken ? 'An account with that email already exists.' : createError?.message ?? 'Could not create user.' };
  }

  const { error: profileError } = await admin
    .from('profiles')
    .update({ full_name: parsed.data.full_name, role: parsed.data.role, department: parsed.data.department })
    .eq('id', created.user.id);
  if (profileError) {
    return { error: `Account created, but setting its role failed (${profileError.message}). Set the role in the table below.` };
  }

  revalidatePath('/admin/users');
  return { success: true };
}

const emailSchema = z.string().trim().email('Enter a valid email address');
const passwordSchema = z.string().min(8, 'Password must be at least 8 characters');

/** Change the address a person signs in with (e.g. a typo at creation, or a new work email). */
export async function updateUserEmail(userId: string, email: string): Promise<ActionResult> {
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const auth = await requireSystemAdmin();
  if ('error' in auth) return { error: auth.error };

  // email_confirm: true applies the change immediately instead of emailing a confirmation
  // link to the new address (which the admin may not own).
  const { error } = await createAdminClient().auth.admin.updateUserById(userId, {
    email: parsed.data,
    email_confirm: true,
  });
  if (error) {
    const taken = /already|registered|exists/i.test(error.message);
    return { error: taken ? 'Another account already uses that email.' : error.message };
  }

  revalidatePath('/admin/users');
  return { success: true };
}

/**
 * Sets a new password for someone directly. This is the fallback when the emailed reset link
 * isn't an option (no inbox access, email not configured). The person can change it again
 * themselves afterwards via "Password" in the top bar.
 */
export async function resetUserPassword(userId: string, password: string): Promise<ActionResult> {
  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const auth = await requireSystemAdmin();
  if ('error' in auth) return { error: auth.error };

  const { error } = await createAdminClient().auth.admin.updateUserById(userId, { password: parsed.data });
  if (error) return { error: error.message };

  return { success: true };
}
