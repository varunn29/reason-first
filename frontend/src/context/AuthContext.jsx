import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('rf_auth_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem('rf_auth_token') || null;
  });

  const [role, setRole] = useState(() => {
    return localStorage.getItem('rf_auth_role') || null;
  });

  const [classroom, setClassroom] = useState(() => {
    try {
      const savedClass = localStorage.getItem('rf_auth_classroom');
      return savedClass ? JSON.parse(savedClass) : null;
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check token validity on mount
  useEffect(() => {
    if (token && role === 'teacher') {
      api.getMe()
        .then((res) => {
          if (res && res.ok && res.user) {
            setCurrentUser((prev) => ({ ...prev, ...res.user }));
            localStorage.setItem('rf_auth_user', JSON.stringify(res.user));
          } else {
            // Expired or invalid token
            logout();
          }
        })
        .catch(() => {
          // If network error, preserve cached state
        });
    }
  }, []);

  const login = async (email, password) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.login(email, password);
      setToken(data.token);
      setCurrentUser(data.user);
      setRole('teacher');
      setClassroom(data.classroom || null);

      localStorage.setItem('rf_auth_token', data.token);
      localStorage.setItem('rf_auth_user', JSON.stringify(data.user));
      localStorage.setItem('rf_auth_role', 'teacher');
      if (data.classroom) {
        localStorage.setItem('rf_auth_classroom', JSON.stringify(data.classroom));
      }

      setIsLoading(false);
      return data;
    } catch (err) {
      setIsLoading(false);
      setError(err.message || 'Login failed.');
      throw err;
    }
  };

  const register = async ({ name, email, password, schoolName }) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.register({ name, email, password, schoolName });
      setToken(data.token);
      setCurrentUser(data.user);
      setRole('teacher');
      setClassroom(data.classroom || null);

      localStorage.setItem('rf_auth_token', data.token);
      localStorage.setItem('rf_auth_user', JSON.stringify(data.user));
      localStorage.setItem('rf_auth_role', 'teacher');
      if (data.classroom) {
        localStorage.setItem('rf_auth_classroom', JSON.stringify(data.classroom));
      }

      setIsLoading(false);
      return data;
    } catch (err) {
      setIsLoading(false);
      setError(err.message || 'Registration failed.');
      throw err;
    }
  };

  const loginStudent = async (classCode, studentName) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.studentLogin({ classCode, studentName });
      setToken(data.token);
      setCurrentUser(data.user);
      setRole('student');
      setClassroom(data.classroom);

      localStorage.setItem('rf_auth_token', data.token);
      localStorage.setItem('rf_auth_user', JSON.stringify(data.user));
      localStorage.setItem('rf_auth_role', 'student');
      localStorage.setItem('rf_auth_classroom', JSON.stringify(data.classroom));

      setIsLoading(false);
      return data;
    } catch (err) {
      setIsLoading(false);
      setError(err.message || 'Could not find classroom.');
      throw err;
    }
  };

  const logout = () => {
    setToken(null);
    setCurrentUser(null);
    setRole(null);
    setClassroom(null);
    setError(null);
    localStorage.removeItem('rf_auth_token');
    localStorage.removeItem('rf_auth_user');
    localStorage.removeItem('rf_auth_role');
    localStorage.removeItem('rf_auth_classroom');
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        token,
        role,
        classroom,
        isLoading,
        error,
        login,
        register,
        loginStudent,
        logout,
        clearError,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;

