exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }
    const ADMIN_USER = process.env.ADMIN_USER;
    const ADMIN_PASS = process.env.ADMIN_PASS;
    if (username === ADMIN_USER && password === ADMIN_PASS) {
      return res.json({ success: true, message: 'Login successful' });
    }
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ success: false, message: 'Failed to login' });
  }
};
