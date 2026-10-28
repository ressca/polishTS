# PolishTS

<p align="center"><img src="assets/plts-logo.svg" alt="PolishTS PLTS logo" width="112" /></p>

<p align="center"><a href="https://www.npmjs.com/package/@ressca/polishts?activeTab=readme">PolishTS w npm</a></p>

**PolishTS** to translator źródło-do-źródła dla podzbioru TypeScript ze słowami składniowymi po polsku. Czyta pliki `.plts` i emituje `.ts`. W trybie TSX czyta `.pltsx` i emituje `.tsx`. Nie generuje JavaScriptu, nie sprawdza typów i nie zastępuje `tsc`, Reacta ani bundlera.

Bieżący kontrakt języka ma wersję **0.3** (`LANGUAGE_SPEC.pl.md`; angielski dokument: [`LANGUAGE_SPEC.md`](LANGUAGE_SPEC.md)). Wydanie używa własnego, świadomego Unicode lexera i kontekstowego translatora tokenów, parsera TypeScript z Babel oraz generatora kodu Babel. Błędy parsera są mapowane na pozycje w oryginalnym źródle. Translator nie jest pełną polską gramatyką ani translacją AST TypeScript na AST TypeScript; przed użyciem w dużym projekcie zapoznaj się z ograniczeniami.

- Dokumentacja angielska: [`README.md`](README.md)
- Kontrakt języka i słownika: [`LANGUAGE_SPEC.pl.md`](LANGUAGE_SPEC.pl.md)

## Wymagania

- Node.js `>=18` dla pakietu `@ressca/polishts` i CLI.
- Starter React/Vite używa Vite 8, więc wymaga Node.js 20.19+ lub 22.12+.
- Parser akceptuje składnię TypeScript obsługiwaną przez rozwiązaną wersję `@babel/parser`. Zgodność parsera Babel nie jest tym samym co zgodność kompilatora TypeScript; do sprawdzania wynikowych plików używaj `tsc`.

## Instalacja i CLI

```sh
npm install @ressca/polishts

plts src/program.plts                 # zapisuje ./program.ts
plts src/program.plts --out out.ts    # zapisuje wskazany plik
plts src/program.plts --print         # wypisuje TypeScript na stdout
cat src/program.plts | plts --stdin   # czyta źródło ze stdin
plts --project                        # tłumaczy wszystkie źródła projektu
plts --help
```

Domyślny wynik jest zapisywany w bieżącym katalogu pod nazwą bazową pliku wejściowego. `.pltsx` automatycznie włącza parser JSX i wybiera wynik `.tsx`. Opcja `--tsx` włącza ten tryb dla innej nazwy pliku:

```sh
plts src/App.pltsx                     # zapisuje ./App.tsx
plts src/App.plts --tsx --out App.tsx
```

`--stdin` i `--print` wypisują wygenerowany kod na stdout. Tryb plikowy podaje ścieżkę wyniku. Błędy trafiają na stderr i kończą proces niezerowym kodem.

### Translacja projektu

Uruchom `plts --project` w katalogu głównym projektu, aby znaleźć wszystkie pliki `.plts` i `.pltsx` w skonfigurowanych ścieżkach. Domyślnie PolishTS skanuje `src/` i zapisuje lustrzane drzewo projektu w `pltsxGenerated/`. Polskie źródła zamienia na `.ts`/`.tsx`; pozostałe pliki z katalogu wejściowego, np. zwykły TypeScript, CSS i obrazy, kopiuje, aby zachować działanie importów względnych. Jeśli źródło `.plts`/`.pltsx` i plik `.ts`/`.tsx` wskazują tę samą ścieżkę wynikową, wynik powstaje ze źródła polskiego.

Utwórz `polishts.config.json`, aby zmienić ścieżki wejściowe albo katalog wyjściowy:

```json
{
  "include": ["src"],
  "exclude": ["src/fixtures"],
  "outDir": "pltsxGenerated"
}
```

`include` i `exclude` to ścieżki względem katalogu głównego projektu; katalogi są skanowane rekurencyjnie. Katalog wynikowy jest zastępowany przy każdym uruchomieniu tylko wtedy, gdy PolishTS wcześniej go utworzył i oznaczył. Dodaj skonfigurowany katalog wynikowy do `.gitignore`. Przykład React/Vite pokazuje ten przepływ: skrypt `translate` uruchamia `plts --project`, a Vite i TypeScript korzystają z `pltsxGenerated/`.

### Konfiguracja React i Vite

Trzymaj polskie źródła i zasoby w `src/`. Vite powinien ładować wygenerowany plik wejściowy, a skrypty projektu tłumaczyć pliki przed uruchomieniem Vite lub TypeScriptu:

Odpowiedni fragment `package.json`:

```json
{
  "scripts": {
    "translate": "plts --project",
    "dev": "npm run translate && vite",
    "typecheck": "npm run translate && tsc --noEmit",
    "build": "npm run translate && tsc --noEmit && vite build"
  }
}
```

Konfiguracja projektu skanuje całe `src/`; dodanie kolejnego pliku `.pltsx` nie wymaga zmiany polecenia:

Plik `polishts.config.json`:

```json
{
  "include": ["src"],
  "outDir": "pltsxGenerated"
}
```

Wskaż w HTML Vite'a plik wejściowy z lustrzanego drzewa wynikowego:

Dodaj ten wpis do `index.html`:

```html
<script type="module" src="/pltsxGenerated/src/main.tsx"></script>
```

Jeśli projekt React/Vite używa aliasu importów `@/`, skieruj zarówno Vite, jak i TypeScript do wygenerowanego drzewa `src/`:

Plik `vite.config.ts`:

```ts
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(projectRoot, './pltsxGenerated/src') },
  },
});
```

Dodaj alias i katalog wynikowy do `tsconfig.app.json` (lub `tsconfig.json`):

```json
{
  "compilerOptions": {
    "paths": { "@/*": ["./pltsxGenerated/src/*"] }
  },
  "include": ["pltsxGenerated/src", "vite.config.ts"]
}
```

Na koniec wyklucz wygenerowany katalog z kontroli wersji:

```gitignore
/pltsxGenerated/
```

Starter w [`examples/react-vite/`](examples/react-vite/) zawiera kompletną, działającą konfigurację.

## Użycie biblioteki

```ts
import { transpile, TranspileError, LANGUAGE_VERSION } from '@ressca/polishts';

console.log(LANGUAGE_VERSION); // "0.3"
const output = transpile('stała wynik: liczba przypisz 42');
// const wynik: number = 42;

const tsx = transpile(
  'eksportuj funkcja App() { zwróć <h1>Cześć</h1>; }',
  { jsx: true },
);

try {
  transpile('stała =');
} catch (error) {
  if (error instanceof TranspileError) {
    console.error(error.kind, error.location, error.message);
  }
}
```

`transpile(source, options?)` zwraca tekst. Obecne opcje:

- `jsx?: boolean` — włącza parsowanie JSX; domyślnie `false`.
- `parser?: ParserAdapter` — przyjmuje zgodny parser z etykietą `version` i funkcją `parse`. Etykieta jest informacyjna; PolishTS nie sprawdza, czy parser odpowiada konkretnej wersji TypeScript.

`TranspileError.kind` ma wartość `parse` albo `transform`. `location`, jeśli jest dostępna, używa numeracji linii i kolumn od 1 w oryginalnym źródle. AST Babel jest szczegółem implementacji i nie jest zwracane.

## Słownik w skrócie

Tabela zawiera wszystkie wpisy obecne w słowniku implementacji. Wpis jest kandydatem do translacji, a nie bezwarunkową zamianą tekstową: lexer i translator stosują reguły kontekstowe dla wybranych grup. Jednoznakowe `i` i modułowe `z` mają specjalne heurystyki. Nazwy w pozycjach deklaracji, właściwości, parametrów, aliasów importu i JSX powinny pozostać niezmienione; implementacja jest heurystyczna, więc granice opisuje [`LANGUAGE_SPEC.pl.md`](LANGUAGE_SPEC.pl.md).


| Forma polska                                 | Forma TypeScript                   | Uwagi                                                          |
| -------------------------------------------- | ---------------------------------- | -------------------------------------------------------------- |
| `stała`                                     | `const`                            | Deklaracja zmiennej                                            |
| `zmienna`                                    | `let`                              | Deklaracja zmiennej                                            |
| `var`                                        | `var`                              | Akceptowane bez zmian                                          |
| `liczba`                                     | `number`                           | Pozycja typu prymitywnego                                      |
| `ciąg`, `łańcuch`                         | `string`                           | Pozycja typu prymitywnego                                      |
| `logiczna`                                   | `boolean`                          | Pozycja typu prymitywnego                                      |
| `dowolny`                                    | `any`                              | Pozycja typu prymitywnego                                      |
| `nieznany`                                   | `unknown`                          | Pozycja typu prymitywnego                                      |
| `nic`                                        | `void`                             | Pozycja typu prymitywnego                                      |
| `nigdy`                                      | `never`                            | Pozycja typu prymitywnego                                      |
| `obiekt`                                     | `object`                           | Pozycja typu prymitywnego                                      |
| `symbol`                                     | `symbol`                           | Akceptowane bez zmian                                          |
| `duża_liczba`                               | `bigint`                           | Pozycja typu prymitywnego                                      |
| `prawda`, `fałsz`                           | `true`, `false`                    | Pozycja literału logicznego                                   |
| `nieokreślony`                              | `undefined`                        | Pozycja wartości                                              |
| `i`, `lub`, `nie`                            | `&&`, `                            |                                                                |
| `równa`, `różne`                          | `===`, `!==`                       | Pozycje operatorów porównania                                |
| `mniejsze`, `większe`                       | `<`, `>`                           | Pozycje operatorów porównania                                |
| `mniejsze_równe`, `większe_równe`         | `<=`, `>=`                         | Pozycje operatorów porównania                                |
| `przypisz`                                   | `=`                                | Przypisanie                                                    |
| `plus_równa`, `minus_równa`, `razy_równa` | `+=`, `-=`, `*=`                   | Przypisanie z operacją                                        |
| `podziel_równo`, `modulo_równa`            | `/=`, `%=`                         | Przypisanie z operacją                                        |
| `pytajnik_kropka`, `podwójne_pytajnik`      | `?.`, `??`                         | Optional chaining i nullish coalescing                         |
| `jeżeli`, `inaczej`                         | `if`, `else`                       | Instrukcje warunkowe                                           |
| `dla`, `dopóki`, `zrób`                    | `for`, `while`, `do`               | Pętle                                                         |
| `przerwij`, `kontynuuj`, `zwróć`           | `break`, `continue`, `return`      | Sterowanie przepływem                                         |
| `przypadku`, `domyślny`                     | `case`, `default`                  | `domyślny` jest rozpoznawane w pozycji podobnej do `default:` |
| `funkcja`, `asynchroniczna`, `oczekuj`       | `function`, `async`, `await`       | Składnia funkcji                                              |
| `klasa`, `rozszerza`, `implementuj`          | `class`, `extends`, `implements`   | Składnia klas                                                 |
| `konstruktor`                                | `constructor`                      | Element klasy                                                  |
| `modyfikator`, `tylko_czytelny`              | `readonly`                         | Modyfikator                                                    |
| `publiczny`, `publiczne`                     | `public`                           | Modyfikator                                                    |
| `prywatny`, `prywatne`                       | `private`                          | Modyfikator                                                    |
| `chroniony`, `chronione`                     | `protected`                        | Modyfikator                                                    |
| `statyczny`, `abstrakcyjna`                  | `static`, `abstract`               | Modyfikatory klasy                                             |
| `ten`, `rodzaj`, `instancja`                 | `this`, `typeof`, `instanceof`     | Kandydaci do translacji tokenu                                 |
| `interfejs`, `typ`                           | `interface`, `type`                | Deklaracje                                                     |
| `enumeracja`, `wyliczenie`                   | `enum`                             | Dwa aliasy                                                     |
| `importuj`, `eksportuj`                      | `import`, `export`                 | Deklaracje modułu                                             |
| `domyślny_eksport`                          | `export default`                   | Domyślny eksport                                              |
| `jako`                                       | `as`                               | Alias/asercja typu                                             |
| `z`                                          | `from`                             | Heurystycznie rozpoznawane w klauzuli import/export            |
| `narzędzie`, `klucze`                       | `keyof`                            | Operator typów                                                |
| `spełnia`                                   | `satisfies`                        | Operator TypeScript`satisfies`                                 |
| `spróbuj`, `złap`, `na_koniec`, `rzuć`    | `try`, `catch`, `finally`, `throw` | Obsługa wyjątków                                            |

Standardowe formy TypeScript takie jak `new`, `null`, `switch`, `as`, `implements`, `from`, `extends` i `=>` można zapisywać po angielsku; nie są polskimi aliasami słownika. Bieżący słownik nie zawiera proponowanych tłumaczeń utility types, np. `wybierz` → `Pick` ani `ogólny` → `generic`.

## Przykład: `.plts` → `.ts`

Wejście:

```ts
// greeting.plts
eksportuj funkcja powitaj(imie: ciąg): ciąg {
  zwróć "Cześć, " + imie;
}
```

Wygenerowany TypeScript (formatowanie może zależeć od Babel):

```ts
export function powitaj(imie: string): string {
  return "Cześć, " + imie;
}
```

## React i TSX

Używaj zwykłych tagów JSX, propsów Reacta i nazw hooków. PolishTS nie tłumaczy nazw tagów HTML, nazw komponentów, propsów, API hooków, tekstu JSX ani wartości atrybutów w cudzysłowach. Kod wewnątrz klamrowych wyrażeń JSX jest kodem PolishTS/TypeScript i przechodzi przez ten sam translator słów kluczowych.

```tsx
// App.pltsx
 typ Props = { imię: ciąg };

 eksportuj funkcja Powitanie({ imię }: Props) {
   zwróć <h1>Cześć, {imię}!</h1>;
 }
```

Repozytorium zawiera uruchamialny [starter React + Vite](examples/react-vite/). Po pobraniu repozytorium:

```sh
cd examples/react-vite
npm ci
npm run dev       # tłumaczy .pltsx, a następnie uruchamia Vite
npm run typecheck # tłumaczy, a następnie uruchamia tsc --noEmit
npm run build     # tłumaczy, sprawdza typy i buduje produkcyjnie w Vite
```

Starter używa `jsx: "react-jsx"` w TypeScripcie. PolishTS zachowuje składnię JSX; wybrany runtime kontroluje konfiguracja TypeScript projektu. PolishTS nie zamienia JSX na `React.createElement`.

## Jak działa translacja

1. Lexer skanuje identyfikatory Unicode, białe znaki/komentarze, literały w cudzysłowach, template literal, literały regex i znaki interpunkcyjne. W trybie TSX oznacza fragmenty tagów i tekstu JSX.
2. Translator rozpatruje polskie tokeny ze słownika i ich sąsiedztwo. Wybrane formy mają osobne reguły kontekstowe; inne używają heurystyk opisanych w specyfikacji.
3. Babel parsuje przetworzony tekst jako moduł TypeScript. Tryb TSX włącza parser JSX. W obu trybach aktywne są legacy decorators.
4. Generator Babel wypisuje program. Może zmieniać odstępy i interpunkcję; domyślnie zachowuje komentarze.

Błędy Babel są opakowywane w `TranspileError`, a ich pozycje są mapowane przez tabelę offsetów tokenów do oryginalnego źródła. Tabela służy diagnostyce — PolishTS nie generuje jeszcze plików source map.

## Bieżące ograniczenia

- To nie jest pełna polska gramatyka, lecz lexer i kontekstowa zamiana tokenów przed parsowaniem.
- Scanner template literal traktuje cały tekst między backtickami jako chroniony literał. Polskie słowa wewnątrz `${...}` **nie są** w tej wersji tłumaczone. W interpolacjach stosuj standardowe angielskie słowa TypeScript.
- Reguły kontekstowe operatorów i słów typów są heurystyczne. Polska forma słownika użyta jako identyfikator w niejednoznacznym wyrażeniu może zostać przetłumaczona albo nie zostać przetłumaczona w oczekiwanym miejscu. Testy obejmują typowe przypadki, nie każdą poprawną składnię TS.
- Rozpoznawanie JSX jest leksykalne i heurystyczne. Testy obejmują standardowe tagi, atrybuty, tekst i wyrażenia; rzadkie lub głęboko zagnieżdżone przypadki mogą wymagać poprawki.
- Akceptacja przez parser Babel nie gwarantuje, że `tsc` zaakceptuje wynik lub że kod będzie typowany poprawnie. PolishTS nie uruchamia TypeScript checkera.
- Wynik formatuje Babel. Brak zachowania formatowania źródła, source maps, watch mode i pluginów Vite. Tryb projektowy wykonuje jednorazową translację katalogu; nie obserwuje zmian i nie sprawdza typów wygenerowanego drzewa.
- Zakres składni TypeScript zależy od wybranej wersji parsera Babel. Adapter parsera może podmienić funkcję parsera, ale pole `version` jest tylko opisowe.

## Rozwój i weryfikacja

```sh
npm ci
npm run build
npm test
npm run package:smoke
npm pack --dry-run
```

`npm test` obejmuje testy CLI, regresje słownika/translacji, fixture’y gramatyki, deterministyczne testy Unicode i dużego wejścia, kompilację TS/TSX oraz kontrakt startera React. `npm run package:smoke` pakuje projekt, instaluje tarball w tymczasowym projekcie i sprawdza CLI oraz API. `npm run benchmark` podaje medianę dla wygenerowanego wejścia z 10 000 deklaracji; to pomiar informacyjny bez progu w CI.

GitHub Actions testuje Node 18, 20, 22, 24 i 26. Osobny job wykonuje `npm ci` i produkcyjny build startera React. Publikacja z `main` wymaga powodzenia obu zadań. Zobacz [`docs/RELEASING.pl.md`](docs/RELEASING.pl.md) oraz [`CHANGELOG.pl.md`](CHANGELOG.pl.md).
