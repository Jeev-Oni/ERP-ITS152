'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

// Both actions rely on RLS (profiles_admin_write, 0002_profiles_and_auth.sql) to actually
// restrict writes to system_admin — this file doesn't re-check the role itself, matching
// how every other module's actions rely on RLS as the real enforcement layer.

export async function updateUserRole(userId: string, role: string, department: string) {
  const supabase = createClient();
  const { error } = await supabase.from('profiles').update({ role, department }).eq('id', userId);
  if (error) return { error: error.message };

  revalidatePath('/admin/users');
  return { success: true };
}

export async function toggleUserActive(userId: string, isActive: boolean) {
  const supabase = createClient();
  const { error } = await supabase.from('profiles').update({ is_active: isActive }).eq('id', userId);
  if (error) return { error: error.message };

  revalidatePath('/admin/users');
  return { success: true };
}
