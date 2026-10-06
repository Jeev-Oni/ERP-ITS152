'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createUserSchema, ROLES, DEPARTMENTS } from '@/lib/validations/master-data';
import { dbError, noRowsAffected, type ActionResult } from './result';

// Role/department/active edits rely on RLS (profiles_admin_write, 0002_profiles_and_auth.sql)
// to restrict writes to system_admin. createUser is different: creating a login needs the
// service-role key, which bypasses RLS, so it verifies the caller is a system_admin itself.

async function currentUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
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

export async function toggleUserActive(userId: string, isActive: boolean): Promise<ActionResult> {
  const { supabase, user } = await currentUser();
  if (user?.id === userId && !isActive) return { error: "You can't deactivate your own account." };

  const { data, error } = await supabase.from('profiles').update({ is_active: isActive }).eq('id', userId).select('id');
  if (error) return dbError(error);
  if (!data?.length) return noRowsAffected();

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

  const { supabase, user } = await currentUser();
  if (!user) return { error: 'Not authenticated' };
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (me?.role !== 'system_admin') return { error: 'Only a System Admin can create users.' };

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
