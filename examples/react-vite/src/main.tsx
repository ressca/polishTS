import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Aplikacja from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Aplikacja imię="PolishTS" />
  </StrictMode>,
);
