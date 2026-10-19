import './css/app.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import { AppHost, route } from './runtime';

// The auth/profile pages call a global route(name) helper for their URLs.
window.route = route as typeof window.route;

function App() {
    return <AppHost navigate={useNavigate()} />;
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <BrowserRouter>
            <App />
        </BrowserRouter>
    </StrictMode>,
);
