import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { noaaApi } from '../api/noaa';
import axios from 'axios';

interface AuthContextType {
    token: string | null;
    isAuthenticated: boolean;
    login: (u: string, p: string) => Promise<void>;
    logout: () => void;
    user: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [token, setToken] = useState<string | null>(localStorage.getItem('access_token'));
    const [user, setUser] = useState<string | null>(localStorage.getItem('user_sub'));

    // Set header on mount if token exists
    useEffect(() => {
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
    }, [token]);

    const login = async (username: string, password: string) => {
        try {
            const data = await noaaApi.login(username, password);
            const newToken = data.access_token;
            setToken(newToken);
            setUser(username);
            localStorage.setItem('access_token', newToken);
            localStorage.setItem('user_sub', username);
            axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        } catch (error) {
            console.error("Login failed", error);
            throw error;
        }
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_sub');
        delete axios.defaults.headers.common['Authorization'];
    };

    return (
        <AuthContext.Provider value={{
            token,
            isAuthenticated: !!token,
            login,
            logout,
            user
        }}>
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
