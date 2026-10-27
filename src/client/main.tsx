import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { iniciarPildoras } from './pildoraDeslizante';
import { iniciarPestanasFluidas } from './pestanasFluidas';

createRoot(document.getElementById('root')!).render(<App />);
iniciarPildoras();
iniciarPestanasFluidas();
