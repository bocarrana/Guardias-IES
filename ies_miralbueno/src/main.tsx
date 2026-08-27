import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <ThemeProvider>
            <AuthProvider>
                <App />
                <Toaster
                    position="bottom-right"
                    toastOptions={{
                        style: {
                            background: 'var(--bg-card)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-md)',
                            fontFamily: 'var(--font-sans)',
                            fontSize: '0.875rem',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                        },
                    }}
                    richColors
                    closeButton
                />
            </AuthProvider>
        </ThemeProvider>
    </StrictMode>
);
