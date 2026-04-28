import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

router.post('/signup', async (req, res) => {
  const { name, email, phone, password, role = 'patient' } = req.body;

  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role, name }
      }
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    if (!authData?.user?.id) {
      return res.status(400).json({ error: 'Unable to create user account.' });
    }

    const userId = authData.user.id;

    const { error: profileError } = await supabase
      .from('users')
      .upsert({
        id: userId,
        name,
        email,
        phone,
        role,
        created_at: new Date().toISOString()
      });

    if (profileError) {
      return res.status(400).json({ error: profileError.message });
    }

    const user = {
      id: userId,
      name,
      email,
      phone,
      role
    };

    res.json({
      success: true,
      user,
      token: authData.session?.access_token || null,
      session: authData.session || null,
      message: 'Account created successfully'
    });
  } catch (err) {
    console.error('[Auth] Signup error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      return res.status(401).json({ error: authError.message });
    }

    const { data: userData, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError) {
      return res.status(400).json({ error: profileError.message });
    }

    const userProfile = {
      id: userData.id,
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      role: userData.role
    };

    res.json({
      success: true,
      user: userProfile,
      token: authData.session?.access_token || null,
      session: authData.session || null
    });
  } catch (err) {
    console.error('[Auth] Login error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { data: userData, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return res.status(400).json({ error: profileError.message });
    }

    const userInfo = {
      id: userData.id,
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      role: userData.role
    };

    res.json({ user: userInfo });
  } catch (err) {
    console.error('[Auth] Me error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/logout', async (req, res) => {
  try {
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
