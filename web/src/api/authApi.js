import apiClient from '../utils/apiClient';

export const authApi = {
  login: async (email, password) => {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data;
  },

  signup: async (email, password, firstName, lastName) => {
    const response = await apiClient.post('/auth/signup', {
      email,
      password,
      firstName,
      lastName,
    });
    return response.data;
  },

  logout: async () => {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  },

  refresh: async () => {
    const response = await apiClient.post('/auth/refresh');
    return response.data;
  },

  forgotPassword: async (email) => {
    const response = await apiClient.post('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token, newPassword) => {
    const response = await apiClient.post('/auth/reset-password', { token, newPassword });
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  // Legacy admin mode
  adminLogin: async (password) => {
    const response = await apiClient.post('/auth/admin/login', { password });
    return response.data;
  },
};
