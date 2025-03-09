import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'operator' | 'customer';
  must_change_password: boolean;
}

export async function signIn(email: string, password: string): Promise<UserProfile> {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError) throw new Error(authError.message);
  if (!authData.user) throw new Error('No user data returned');

  // Get extended user profile
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select(`
      *,
      user_roles (
        name
      )
    `)
    .eq('id', authData.user.id)
    .single();

  if (profileError) throw new Error(profileError.message);
  if (!profile) throw new Error('User profile not found');

  // Update last login
  await supabase
    .from('users')
    .update({ last_login: new Date().toISOString() })
    .eq('id', profile.id);

  return {
    id: profile.id,
    email: profile.email,
    full_name: profile.full_name,
    role: profile.user_roles.name,
    must_change_password: profile.must_change_password
  };
}

export async function signUp(email: string, password: string, fullName: string) {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) throw new Error(authError.message);
  if (!authData.user) throw new Error('No user data returned');

  // Get customer role id
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('id')
    .eq('name', 'customer')
    .single();

  if (!roleData) throw new Error('Customer role not found');

  // Create user profile
  const { error: profileError } = await supabase
    .from('users')
    .insert({
      id: authData.user.id,
      email,
      full_name: fullName,
      role_id: roleData.id,
      must_change_password: false
    });

  if (profileError) throw new Error(profileError.message);

  return authData.user;
}

export async function changePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({
    password: newPassword
  });

  if (error) throw new Error(error.message);

  // Update must_change_password flag
  const { error: updateError } = await supabase
    .from('users')
    .update({ must_change_password: false })
    .eq('id', (await supabase.auth.getUser()).data.user?.id);

  if (updateError) throw new Error(updateError.message);
}

export async function createUser(email: string, password: string, fullName: string, role: 'admin' | 'operator') {
  // Only admins can create other admins/operators
  const { data: currentUser } = await supabase.auth.getUser();
  if (!currentUser.user) throw new Error('Not authenticated');

  const { data: currentProfile } = await supabase
    .from('users')
    .select(`
      *,
      user_roles (
        name
      )
    `)
    .eq('id', currentUser.user.id)
    .single();

  if (!currentProfile || currentProfile.user_roles.name !== 'admin') {
    throw new Error('Unauthorized');
  }

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });

  if (authError) throw new Error(authError.message);
  if (!authData.user) throw new Error('No user data returned');

  // Get role id
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('id')
    .eq('name', role)
    .single();

  if (!roleData) throw new Error(`${role} role not found`);

  // Create user profile
  const { error: profileError } = await supabase
    .from('users')
    .insert({
      id: authData.user.id,
      email,
      full_name: fullName,
      role_id: roleData.id,
      must_change_password: true
    });

  if (profileError) throw new Error(profileError.message);

  return authData.user;
}

export async function deleteUser(userId: string) {
  // Only admins can delete users
  const { data: currentUser } = await supabase.auth.getUser();
  if (!currentUser.user) throw new Error('Not authenticated');

  const { data: currentProfile } = await supabase
    .from('users')
    .select(`
      *,
      user_roles (
        name
      )
    `)
    .eq('id', currentUser.user.id)
    .single();

  if (!currentProfile || currentProfile.user_roles.name !== 'admin') {
    throw new Error('Unauthorized');
  }

  // Delete user profile first (foreign key constraint)
  const { error: profileError } = await supabase
    .from('users')
    .delete()
    .eq('id', userId);

  if (profileError) throw new Error(profileError.message);

  // Delete auth user
  const { error: authError } = await supabase.auth.admin.deleteUser(userId);

  if (authError) throw new Error(authError.message);
}