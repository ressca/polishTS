import { useState } from 'react';
type Właściwości = {
  imię: string;
};
function Aplikacja({
  imię
}: Właściwości) {
  const [licznik, ustawLicznik] = useState<number>(0);
  return <main>
      <h1>Cześć, {imię}!</h1>
      <button onClick={() => ustawLicznik(licznik + 1)}>
        Kliknięto {licznik} razy
      </button>
      <p>Polskie słowa w treści, takie jak prawda i stała, zostają tekstem.</p>
    </main>;
}
export default Aplikacja;