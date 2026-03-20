/**
 * User Service
 * Handles user authentication and management
 */

import { supabase } from './supabase';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateUserData {
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'user';
}

export interface UpdateUserData {
  email?: string;
  name?: string;
  role?: 'admin' | 'user';
  is_active?: boolean;
  password?: string;
}

/**
 * Hash password using SHA-256
 */
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.toUpperCase();
}

export const userService = {
  /**
   * Authenticate user with email and password
   */
  async login(email: string, password: string): Promise<User | null> {
    const passwordHash = await hashPassword(password);

    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('password_hash', passwordHash)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      console.error('Login error:', error);
      return null;
    }

    return data as User;
  },

  /**
   * Get all users
   */
  async getAll(): Promise<User[]> {
    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      return [];
    }

    return data as User[];
  },

  /**
   * Get user by ID
   */
  async getById(id: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      console.error('Error fetching user:', error);
      return null;
    }

    return data as User;
  },

  /**
   * Create new user
   */
  async create(userData: CreateUserData): Promise<User | null> {
    const passwordHash = await hashPassword(userData.password);

    const { data, error } = await supabase
      .from('app_users')
      .insert({
        email: userData.email.toLowerCase(),
        password_hash: passwordHash,
        name: userData.name,
        role: userData.role,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating user:', error);
      throw new Error(
        error.code === '23505'
          ? 'Este email já está cadastrado'
          : 'Erro ao criar usuário'
      );
    }

    return data as User;
  },

  /**
   * Update user
   */
  async update(id: string, userData: UpdateUserData): Promise<User | null> {
    const updateData: Record<string, unknown> = {};

    if (userData.email) updateData.email = userData.email.toLowerCase();
    if (userData.name) updateData.name = userData.name;
    if (userData.role) updateData.role = userData.role;
    if (typeof userData.is_active === 'boolean') updateData.is_active = userData.is_active;
    if (userData.password) {
      updateData.password_hash = await hashPassword(userData.password);
    }

    const { data, error } = await supabase
      .from('app_users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating user:', error);
      throw new Error(
        error.code === '23505'
          ? 'Este email já está cadastrado'
          : 'Erro ao atualizar usuário'
      );
    }

    return data as User;
  },

  /**
   * Delete user
   */
  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('app_users')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting user:', error);
      return false;
    }

    return true;
  },

  /**
   * Change user password
   */
  async changePassword(id: string, newPassword: string): Promise<boolean> {
    const passwordHash = await hashPassword(newPassword);

    const { error } = await supabase
      .from('app_users')
      .update({ password_hash: passwordHash })
      .eq('id', id);

    if (error) {
      console.error('Error changing password:', error);
      return false;
    }

    return true;
  },
};
