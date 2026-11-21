import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('smart_print_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 &&
        !['/login', '/register', '/admin/login', '/staff/login'].includes(window.location.pathname)) {
      localStorage.removeItem('smart_print_token');
      localStorage.removeItem('smart_print_user');
      window.dispatchEvent(new Event('smart-print:session-expired'));
    }
    return Promise.reject(error);
  }
);

const normalizeAuthResponse = (response) => ({
  ...response,
  data: {
    ...response.data,
    user: response.data.user || response.data.student || response.data.staff || response.data.admin,
  },
});

export const authService = {
  async login({ email, password, role = 'student' }) {
    const rolePaths = { student: '/students/login', staff: '/staff/login', admin: '/admin/login' };
    const path = rolePaths[role];
    if (!path) throw new Error('Unsupported account role');
    return normalizeAuthResponse(await api.post(path, { email, password }));
  },
  registerInitialAdmin: (data) => api.post('/admin/register-initial', data),
  async register(studentData) {
    const { confirm_password, ...registration } = studentData;
    return api.post('/students/register', registration);
  },
  logout: () => Promise.resolve(),
  async getMe() {
    const user = JSON.parse(localStorage.getItem('smart_print_user') || 'null');
    const paths = {
      student: '/students/profile',
      staff: '/staff/profile',
      admin: '/admin/profile',
    };
    const response = await api.get(paths[user?.role] || '/students/profile');
    return {
      ...response,
      data: { ...response.data, user: response.data.user || response.data.profile || response.data.student },
    };
  },
};

export const studentService = {
  getDashboard: () => api.get('/students/dashboard'),
  getProfile: async () => {
    const response = await api.get('/students/profile');
    return { ...response, data: { ...response.data, profile: response.data.profile || response.data.student } };
  },
  updateProfile: (data) => api.put('/students/profile', data),
  getNotifications: () => api.get('/notifications'),
  markNotificationRead: (id) => api.patch(`/notifications/${id}/read`),
};

export const documentService = {
  upload: async (formData, onProgress) => {
    const documentForm = new FormData();
    const file = formData.get('document') || formData.get('file');
    if (file) documentForm.append('document', file);
    const response = await api.post('/documents/upload', documentForm, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    });
    response.data.document.file_size_formatted =
      `${(response.data.document.file_size_bytes / 1024).toFixed(1)} KB`;
    return response;
  },
  getDocuments: () => api.get('/documents'),
  getPreviewUrl: async (id) => {
    const response = await api.get(`/documents/${id}/download?inline=true`, { responseType: 'blob' });
    return URL.createObjectURL(response.data);
  },
  download: async (id, inline = false) => {
    const response = await api.get(`/documents/${id}/download?inline=${inline}`, { responseType: 'blob' });
    const url = URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    if (inline) {
      link.target = '_blank';
      link.rel = 'noopener';
    } else {
      link.download = `document-${id}.pdf`;
    }
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    return response;
  },
};

export const orderService = {
  calculateQuote: (data) => api.post('/orders/calculate-cost', data),
  createOrder: (data) => api.post('/orders', data),
  getOrders: (params) => api.get('/orders', { params }),
  getOrderById: (id) => api.get(`/orders/${id}`),
  getQueue: () => api.get('/queue'),
  updateStatus: (id, data) => api.patch(`/staff/orders/${id}/status`, data),
  cancelOrder: (id) => api.patch(`/orders/${id}/cancel`),
};

export const staffService = {
  getDashboard: () => api.get('/staff/dashboard'),
  getOrders: (params) => api.get('/staff/orders', { params }),
};

export const adminService = {
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: () => api.get('/admin/students'),
  toggleUser: (id) => api.patch(`/admin/students/${id}/toggle`),
  getStaff: () => api.get('/admin/staff'),
  createStaff: (data) => api.post('/admin/staff', data),
  updateStaffStatus: (id, is_active) => api.patch(`/admin/staff/${id}/status`, { is_active }),
  deleteStaff: (id) => api.delete(`/admin/staff/${id}`),
  activateStaff: (id) => api.patch(`/admin/staff/${id}/activate`),
  getPricing: () => api.get('/admin/pricing'),
  updatePricing: (prices) => api.put('/admin/pricing', { prices }),
  getOrders: () => api.get('/admin/orders'),
  getDocuments: () => api.get('/admin/documents'),
  getReports: () => api.get('/admin/reports'),
};

export default api;
