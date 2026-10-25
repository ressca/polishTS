# Kontrakt języka PolishTS 0.3

Wersja angielska: [`LANGUAGE_SPEC.md`](LANGUAGE_SPEC.md). Dokument opisuje słownik obecny w `src/dictionary.ts` i zachowanie zaimplementowane w lexerze, translatorze oraz parserze. „Wpis słownika” nie oznacza bezwarunkowej zamiany — translacja zależy od rodzaju tokenu i sąsiednich tokenów.

## 1. Model przetwarzania

Implementacja wykonuje następujące etapy:

1. `lex(source)` tworzy tokeny z offsetami UTF-16. Rozpoznaje identyfikatory Unicode, białe znaki, komentarze liniowe i blokowe, tekst w pojedynczych/podwójnych cudzysłowach, całe template literal, literały wyglądające jak regex oraz interpunkcję. W trybie JSX dodatkowy przebieg oznacza fragmenty tagów, nazw atrybutów i tekstu dzieci.
2. `translate(source)` zmienia wybrane tokeny identyfikatorów według `DICTIONARY` i heurystyk kontekstu. Komentarze i literały są kopiowane. Tokeny oznaczone jako JSX nie są tłumaczone. Powstaje też tabela offsetów wyniku do źródła.
3. Babel parsuje przetworzony tekst jako moduł TypeScript. `jsx: true` włącza JSX; w obu trybach aktywne są legacy decorators.
4. Generator Babel emituje sformatowany kod z zachowanymi domyślnie komentarzami.

Implementacja nie jest parserem polskiej gramatyki ani translacją AST TypeScript. Podmienia tokeny leksykalne przed parsowaniem. To ważne przy niejednoznacznych słowach słownika: poniżej opisano faktyczne zachowanie, a nie kompletny projekt języka.

## 2. Tryby wejścia i parser

| Wejście/użycie | Parser JSX | Zamierzony wynik |
| --- | --- | --- |
| `transpile(source)` | Wyłączony | Tekst TypeScript |
| `transpile(source, { jsx: true })` | Włączony | TypeScript z zachowanym JSX |
| CLI `.plts` | Wyłączony bez `--tsx` | `.ts` |
| CLI `.pltsx` | Włączany automatycznie | `.tsx` |
| CLI `--tsx` | Włączony | Domyślnie `.tsx` dla pliku |

Domyślnym parserem jest `@babel/parser` rozwiązany przez lockfile pakietu. Używane są pluginy Babel `typescript` i `decorators-legacy`; TSX dodatkowo używa `jsx`. Publiczny `ParserAdapter` pozwala podmienić funkcję parsera. Pole `version` jest informacyjne — implementacja nie wymusza wersji gramatyki TypeScript ani nie ustawia opcji kompilatora.

Gramatyka zależy więc od wybranego wydania parsera Babel. Sprawdzanie typów i zgodności kompilatora/targetu to osobny etap wykonywany przez TypeScript (`tsc`).

## 3. Słownik translacji

Tabela jest wygenerowana na podstawie obecnego słownika implementacji. Kolumna kontekstu podsumowuje działanie; nie gwarantuje rozpoznania każdej możliwej pozycji składniowej.

| Token wejściowy | Token(y) wynikowe | Obecny kontekst/uwagi |
| --- | --- | --- |
| `stała` | `const` | Słowo deklaracji zmiennej |
| `zmienna` | `let` | Słowo deklaracji zmiennej |
| `var` | `var` | Wpis bez zmiany zapisu |
| `liczba` | `number` | Tłumaczone, gdy poprzedni token sugeruje typ (`:`, `<`, `|`, `&`, `as`, `extends`, `implements`, `)`) |
| `ciąg`, `łańcuch` | `string` | Ta sama heurystyka pozycji typu |
| `logiczna` | `boolean` | Ta sama heurystyka pozycji typu |
| `dowolny` | `any` | Ta sama heurystyka pozycji typu |
| `nieznany` | `unknown` | Ta sama heurystyka pozycji typu |
| `nic` | `void` | Ta sama heurystyka pozycji typu |
| `nigdy` | `never` | Ta sama heurystyka pozycji typu |
| `obiekt` | `object` | Ta sama heurystyka pozycji typu |
| `symbol` | `symbol` | Pozycja typu; zapis się nie zmienia |
| `duża_liczba` | `bigint` | Ta sama heurystyka pozycji typu |
| `prawda`, `fałsz` | `true`, `false` | Heurystyka literału logicznego; `:` chroni prawdopodobne nazwy właściwości/parametrów |
| `nieokreślony` | `undefined` | Heurystyka pozycji wartości |
| `i` | `&&` | Tylko gdy poprzedni i następny token wyglądają na argumenty wyrażenia |
| `lub` | `||` | Heurystyka pozycji operatora |
| `nie` | `!` | Heurystyka operatora/wartości; typowe nazwy właściwości/deklaracji są chronione |
| `równa`, `różne` | `===`, `!==` | Heurystyka pozycji operatora |
| `mniejsze`, `większe` | `<`, `>` | Heurystyka operatora; nie używać jako polskich delimitatorów generyków |
| `mniejsze_równe`, `większe_równe` | `<=`, `>=` | Heurystyka pozycji operatora |
| `przypisz` | `=` | Token przypisania |
| `plus_równa`, `minus_równa`, `razy_równa` | `+=`, `-=`, `*=` | Tokeny przypisania z operacją |
| `podziel_równo`, `modulo_równa` | `/=`, `%=` | Tokeny przypisania z operacją |
| `pytajnik_kropka`, `podwójne_pytajnik` | `?.`, `??` | Optional chaining i nullish coalescing |
| `jeżeli`, `inaczej` | `if`, `else` | Heurystyka pozycji instrukcji |
| `dla`, `dopóki`, `zrób` | `for`, `while`, `do` | Heurystyka pozycji instrukcji |
| `przerwij`, `kontynuuj`, `zwróć` | `break`, `continue`, `return` | Heurystyka pozycji instrukcji |
| `przypadku` | `case` | Słowo etykiety switch |
| `domyślny` | `default` | Obecnie rozpoznawane w pozycji podobnej do `default:` |
| `funkcja` | `function` | Heurystyka pozycji deklaracji |
| `asynchroniczna`, `oczekuj` | `async`, `await` | Wpisy słownika; używać/testować w zwykłych pozycjach TS |
| `klasa` | `class` | Heurystyka pozycji deklaracji |
| `rozszerza` | `extends` | Wpis słownika; kontekst klasy/typu parsuje Babel |
| `implementuj` | `implements` | Modyfikator deklaracji klasy |
| `konstruktor` | `constructor` | Token elementu klasy |
| `modyfikator`, `tylko_czytelny` | `readonly` | Modyfikatory |
| `publiczny`, `publiczne` | `public` | Modyfikatory |
| `prywatny`, `prywatne` | `private` | Modyfikatory |
| `chroniony`, `chronione` | `protected` | Modyfikatory |
| `statyczny`, `abstrakcyjna` | `static`, `abstract` | Modyfikatory klasy |
| `ten`, `rodzaj`, `instancja` | `this`, `typeof`, `instanceof` | Zamiany słownika z ochroną identyfikatorów; kontekst nie jest w pełni analizowany przez AST |
| `interfejs`, `typ` | `interface`, `type` | Heurystyka pozycji deklaracji |
| `enumeracja`, `wyliczenie` | `enum` | Heurystyka pozycji deklaracji |
| `importuj`, `eksportuj` | `import`, `export` | Pozycje deklaracji modułu |
| `domyślny_eksport` | `export default` | Zamiana wielotokenowa |
| `jako` | `as` | Token aliasu/asercji typu |
| `z` | `from` | Tylko gdy znaleziono wcześniejszy token import/export, a kolejny istotny token jest literałem |
| `narzędzie`, `klucze` | `keyof` | Heurystyka pozycji typu |
| `spełnia` | `satisfies` | Token TypeScript `satisfies` |
| `spróbuj`, `złap`, `na_koniec`, `rzuć` | `try`, `catch`, `finally`, `throw` | Heurystyka pozycji instrukcji |

Słownik nie zawiera `switch`, `new`, `null`, `implements`, `extends`, `as`, `from` ani `=>` jako polskich aliasów. Można zapisywać standardowe tokeny TypeScript po angielsku. Wpisami słownika nie są obecnie `wybierz`, `pomiń`, `częściowy`, `wymagany`, `ogólny`, `duża_liczca`, `arrow`, `błąd` ani `nowy_błąd`.

## 4. Nazwy, literały, komentarze i JSX

### Nazwy

Zamierzoną konwencją jest zachowanie nazw użytkownika, w tym polskich identyfikatorów: nazw zmiennych, funkcji, klas, komponentów, parametrów, właściwości obiektów, typów, aliasów importu, tagów JSX i propsów. Testy obejmują reprezentatywne deklaracje, parametry, klucze obiektów, właściwości składowe, aliasy importu i nazwy typów.

Translator ma ograniczony zbiór `declaredNames` oraz heurystyki pozycyjne. Nie jest resolverem symboli ani scope’ów. Forma słownikowa użyta jako nazwa w nieprzetestowanym lub niejednoznacznym miejscu może zostać zmieniona. Nie zakładaj, że każda forma z tabeli jest bezpieczna jako dowolny identyfikator w każdej składni TypeScript.

### Komentarze i literały

Komentarze liniowe/blokowe i tekst w pojedynczych/podwójnych cudzysłowach są nieprzezroczyste dla translacji. Escape’y w cytowanych tekstach są skanowane, by escaped quote nie kończył tokenu. Literały przypominające regex są skanowane i kopiowane z heurystyką rozróżniania `/regex/` i dzielenia.

Cały template literal między backtickami, wraz z interpolacjami `${...}`, jest obecnie traktowany jako jeden nieprzezroczysty literał. Polskie słowa kluczowe wewnątrz interpolacji nie są tłumaczone. Przykładowo do interpolacji `` `${...}` `` wpisz `true`, a nie `prawda`, dopóki lexer nie obsłuży interpolacji.

### JSX

JSX jest dostępny tylko w jawnym trybie JSX. CLI wybiera go dla `.pltsx` i `--tsx`; biblioteka używa `{ jsx: true }`. W tym trybie lexer próbuje chronić nazwy tagów, atrybutów, tekst dzieci oraz cytowane wartości atrybutów. Tokeny wewnątrz `{ ... }` są kodem i mogą podlegać translacji. Rozpoznawanie JSX jest heurystyką leksykalną, a nie przejściem po AST Babel, więc nietypowa składnia może działać niepoprawnie.

PolishTS zachowuje JSX dla dalszego toolchainu TypeScript/React. Nie obniża go do `React.createElement`. Opcję TypeScript `jsx` (`react-jsx`, `react` lub `preserve`) ustawia projekt korzystający z wyniku.

## 5. Składnia TypeScript i pass-through

Translator nie przepisuje nierozpoznanych identyfikatorów ani tokenów składni. Następnie Babel parsuje wynik jako TypeScript (opcjonalnie JSX). Testy w repozytorium obejmują m.in. unie/przecięcia, typy literałowe, tuple, `keyof`, `typeof`, typy indeksowane, parametry generyczne, ograniczenia/wartości domyślne, `implements`, `satisfies`, `switch` i formy TSX. Testy zgodności kompilują wybrane wyniki przez TypeScript; to reprezentatywne pokrycie, a nie gwarancja wszystkich konstrukcji TS.

Niektóre polskie nazwy typów prymitywnych są tłumaczone tylko po określonych poprzedzających tokenach. Reguła sprawdza krótką listę poprzedników, a nie pełny parser typów. Polska nazwa typu po prawej stronie aliasu typu lub w innej nieprzetestowanej pozycji może pozostać bez translacji. W niepewnym miejscu użyj standardowego zapisu TypeScript albo najpierw dodaj regresję i test `tsc`.

Nieznana składnia TypeScript przechodzi przez translator bez zmian, o ile nie zawiera rozpoznanej polskiej formy spełniającej heurystykę zamiany. Wynik nadal musi zaakceptować Babel. Nie ma opcji konfiguracji „wersji języka TypeScript”: gramatykę parsera określa wybrane wydanie Babel. `ParserAdapter` zastępuje funkcję parsującą, lecz nie negocjuje wersji parsera z TypeScriptem.

## 6. Diagnostyka i wynik

`TranspileError` udostępnia `kind: 'parse' | 'transform'`, komunikat, opcjonalne `location` i pierwotny błąd parsera/generatora w `cause`. Pozycje błędów parsowania są mapowane z offsetów tekstu przetworzonego na oryginalne źródło przez tabelę offsetów tokenów. Translator nie emituje obecnie plików source map.

Generator Babel może normalizować białe znaki, średniki i łamanie wierszy. Wynik to źródło TypeScript/TSX, nie JavaScript. PolishTS nie sprawdza typów, nie rozwiązuje importów, nie uruchamia kodu ani nie buduje projektu.

## 7. Wersjonowanie gramatyki

Pakiet eksportuje `LANGUAGE_VERSION`, obecnie `0.3`. Wersjonuje ona udokumentowany słownik/zachowanie, a nie numer npm ani wersję parsera Babel/TypeScript. Zasady kompatybilności i wydawania opisuje [`docs/RELEASING.pl.md`](docs/RELEASING.pl.md). Każda stabilna zmiana słownika powinna aktualizować ten dokument, wersję polską, testy oraz `LANGUAGE_VERSION`, jeśli zmienia się kontrakt.
