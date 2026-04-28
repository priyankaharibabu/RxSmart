import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export async function authMiddleware(req, res, next) {
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

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id, name, email, phone, role')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      return res.status(401).json({ error: 'User profile not found' });
    }

    req.user = userProfile;
    next();
  } catch (err) {
    console.error('[Auth Middleware] Error:', err);
    res.status(401).json({ error: 'Authentication failed' });
  }
}

export function requireRole(role) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (req.user.role !== role) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      next();
    } catch (err) {
      console.error('[Role Middleware] Error:', err);
      res.status(403).json({ error: 'Permission denied' });
    }
  };
}
