// Authentication utility functions
export const logout = () => {
    localStorage.removeItem('token');
    window.location.href = '/';
};

export const isAuthenticated = () => {
    return !!localStorage.getItem('token');
};

export const getToken = () => {
    return localStorage.getItem('token');
};