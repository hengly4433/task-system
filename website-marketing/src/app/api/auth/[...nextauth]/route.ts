import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Initialize Supabase client only if credentials are available
let supabase: SupabaseClient | null = null;

const getSupabaseClient = () => {
  if (supabase) return supabase;
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    return null;
  }
  
  supabase = createClient(supabaseUrl, supabaseKey);
  return supabase;
};

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      // Store the lead when user signs in with Google
      if (user.email) {
        const client = getSupabaseClient();
        
        if (client) {
          try {
            await client.from('marketing_leads').upsert({
              email: user.email,
              name: user.name || null,
              source: 'google_signin',
              method: 'google',
              created_at: new Date().toISOString(),
            }, {
              onConflict: 'email',
            });
          } catch (error) {
            console.error('Failed to store lead:', error);
            // Don't block sign in if lead storage fails
          }
        } else {
          console.log('Lead captured via Google (Supabase not configured):', {
            email: user.email,
            name: user.name,
            source: 'google_signin',
            method: 'google',
          });
        }
      }
      return true;
    },
    async redirect({ baseUrl }) {
      return baseUrl;
    },
  },
  pages: {
    signIn: '/', // Redirect to home page where modal handles sign in
  },
});

export { handler as GET, handler as POST };
