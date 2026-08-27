import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import App from './App';
import './index.css';

// --- MOCK DATE FOR SCHOOL YEAR SIMULATION ---
// Shifts the global application date to Wednesday, January 14, 2026, at 09:30:00 AM (a live school day)
const OriginalDate = globalThis.Date;
const mockStartTime = new OriginalDate('2026-01-14T09:30:00').getTime();
const realStartTime = OriginalDate.now();

class MockDate extends OriginalDate {
  constructor(...args: any[]) {
    if (args.length === 0) {
      const elapsed = OriginalDate.now() - realStartTime;
      super(mockStartTime + elapsed);
    } else {
      // @ts-ignore
      super(...args);
    }
  }
}
// @ts-ignore
MockDate.now = () => {
  const elapsed = OriginalDate.now() - realStartTime;
  return mockStartTime + elapsed;
};
// @ts-ignore
globalThis.Date = MockDate;


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
