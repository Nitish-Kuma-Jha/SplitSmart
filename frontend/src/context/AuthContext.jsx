import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const API = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api' });
API.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      API.get('/auth/me').then(r => {
        setUser(r.data.user);
      }).catch(() => {
        localStorage.removeItem('token');
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const r = await API.post('/auth/login', { email, password });
    localStorage.setItem('token', r.data.token);
    setUser(r.data.user);
    return r.data;
  };

  const register = async (name, email, password) => {
    const r = await API.post('/auth/register', { name, email, password });
    return r.data;
  };

  const verifyOtp = async (email, otp) => {
    const r = await API.post('/auth/verify-otp', { email, otp });
    localStorage.setItem('token', r.data.token);
    setUser(r.data.user);
    return r.data;
  };

  const resendOtp = async (email) => {
    const r = await API.post('/auth/resend-otp', { email });
    return r.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, verifyOtp, resendOtp, logout, api: API }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
export { API };
