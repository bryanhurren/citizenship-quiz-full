// Database client for Supabase
import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from './supabase-config.js';

// Initialize Supabase client
const supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey);

// User Operations
export const db = {
    // Get all users
    async getUsers() {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('best_score', { ascending: false });

        if (error) {
            console.error('Error fetching users:', error);
            return [];
        }
        return data;
    },

    // Get user by username
    async getUser(username) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .single();

        if (error) {
            console.error('Error fetching user:', error);
            return null;
        }
        return data;
    },

    // Create new user
    async createUser(userData) {
        const { data, error } = await supabase
            .from('users')
            .insert([{
                username: userData.name,
                password: userData.password,
                invite_code: userData.inviteCode,
                current_question: 0,
                correct_count: 0,
                partial_count: 0,
                incorrect_count: 0,
                question_results: [],
                completed: false,
                api_provider: userData.apiProvider || '',
                api_key: userData.apiKey || '',
                best_score: 0,
                is_admin: userData.isAdmin || false
            }])
            .select()
            .single();

        if (error) {
            console.error('Error creating user:', error);
            return null;
        }
        return data;
    },

    // Update user
    async updateUser(username, updates) {
        const { data, error } = await supabase
            .from('users')
            .update(updates)
            .eq('username', username)
            .select()
            .single();

        if (error) {
            console.error('Error updating user:', error);
            return null;
        }
        return data;
    },

    // Delete user
    async deleteUser(username) {
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('username', username);

        if (error) {
            console.error('Error deleting user:', error);
            return false;
        }
        return true;
    },

    // Admin Operations
    async getAdmins() {
        const { data, error } = await supabase
            .from('admins')
            .select('*');

        if (error) {
            console.error('Error fetching admins:', error);
            return [];
        }
        return data;
    },

    async createAdmin(adminData) {
        const { data, error } = await supabase
            .from('admins')
            .insert([adminData])
            .select()
            .single();

        if (error) {
            console.error('Error creating admin:', error);
            return null;
        }
        return data;
    },

    // Invite Code Operations
    async getInviteCodes() {
        const { data, error } = await supabase
            .from('invite_codes')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching invite codes:', error);
            return [];
        }
        return data;
    },

    async getInviteCode(code) {
        const { data, error } = await supabase
            .from('invite_codes')
            .select('*')
            .eq('code', code)
            .single();

        if (error) {
            return null;
        }
        return data;
    },

    async createInviteCode(codeData) {
        const { data, error } = await supabase
            .from('invite_codes')
            .insert([codeData])
            .select()
            .single();

        if (error) {
            console.error('Error creating invite code:', error);
            return null;
        }
        return data;
    },

    async markInviteCodeUsed(code, username) {
        const { data, error } = await supabase
            .from('invite_codes')
            .update({
                used: true,
                used_by: username,
                used_at: new Date().toISOString()
            })
            .eq('code', code)
            .select()
            .single();

        if (error) {
            console.error('Error marking invite code used:', error);
            return null;
        }
        return data;
    }
};

export default db;
