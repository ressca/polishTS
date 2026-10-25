# Kontrakt języka PolishTS — wersja 0.3

Ten dokument ustala zakres i reguły języka wejściowego PolishTS. Jest kontraktem projektowym dla implementacji; nie oznacza, że wszystkie wymienione konstrukcje są już obsługiwane przez bieżący tokenizer.

## 1. Cel i granice

PolishTS to polskojęzyczna warstwa składniowa nad TypeScript. Tłumaczy rozpoznane słowa składniowe na ich standardowe odpowiedniki i emituje TypeScript lub TSX. Nie sprawdza typów, nie wykonuje kodu i nie zastępuje `tsc`, Reacta ani bundlera.

Zasady nadrzędne:

1. Kod wynikowy ma zachowywać semantykę źródła.
2. Tłumaczone są wyłącznie słowa pełniące w danym miejscu rolę składniową.
3. Nazwy użytkownika, literały i treść JSX nie są tłumaczone.
4. Poprawna, niepolska składnia TypeScript może być mieszana z polskimi słowami.
5. Brak obsługi rozszerzenia nie może po cichu zmieniać znaczenia programu.

## 2. Gramatyka i zakres

Gramatyka PolishTS jest przyrostowym podzbiorem gramatyki TypeScript obsługiwanej przez wybraną wersję parsera Babel. To nie jest osobny język o niezależnej gramatyce. W miejscach oznaczonych poniżej polskie słowo zastępuje wskazany token TypeScript; pozostała składnia TypeScript przechodzi bez zmian.

| Obszar | Kontrakt docelowy | Status w obecnej implementacji |
| --- | --- | --- |
| Deklaracje | `stała` / `zmienna` / `var` odpowiadają `const` / `let` / `var`; funkcje, klasy, interfejsy, aliasy typów i enumy używają słów z tabeli słownika | Podstawowe zamiany tekstowe; parser akceptuje TypeScript Babel |
| Typy | Polskie nazwy typów prymitywnych; unie, przecięcia, tuple, typy literałowe, `keyof`, `typeof`, typy indeksowane i generyki są obsługiwane jako składnia TypeScript | Składnia parsowana przez Babel; test zgodności kompiluje reprezentatywny wynik przez `tsc` |
| Operatory | Polskie aliasy wybranych operatorów działają wyłącznie w pozycji operatora | Zamiana tokenów bez analizy pozycji, więc obecnie może zmienić identyfikatory |
| Sterowanie przepływem | Warunki, pętle, `return`, `break`, `continue`, `try/catch/finally`, `throw`, standardowe `switch/case/default` | Polskie aliasy podstawowych instrukcji są mapowane; `switch` może być zapisany standardowo |
| Moduły | Import/export TS; `z` jest aliasem `from` tylko wewnątrz instrukcji modułu | Kontekstowa translacja `z`, `importuj`, `eksportuj`, `jako` |
| Klasy | Klasy, dziedziczenie, implementacje interfejsów, konstruktor, widoczność, `readonly`, `static`, `abstract` | Macierz testowa obejmuje `implements` i modyfikatory |
| Generyki | Standardowa składnia `<T>`, ograniczenia `extends` i typ domyślny; `keyof`/`typeof` oraz indeksowane typy standardowo lub przez aliasy | Pokryte testem translacji i kompilacji TypeScript |
| JSX/TSX | Tryb jawny `.pltsx`/`--tsx`; JSX zachowuje tagi, atrybuty i tekst, zaś wyrażenia `{...}` używają translacji PolishTS | Obsługiwane przez lexer i parser Babel w trybie TSX; generator zachowuje JSX |
| Dekoratory | Zależne od obsługiwanej wersji TypeScript/Babel i jawnej konfiguracji | Parser włącza `decorators-legacy`; brak osobnego kontraktu |
| Pozostała składnia TS | Przechodzi bez zmian, o ile parser w aktywnym trybie ją akceptuje | Zasadniczo parser Babel ją akceptuje po naiwnych podmianach |

Przykładowe kształty składni (nie pełna EBNF):

```text
deklaracja-zmiennej := stała | zmienna | var
deklaracja-funkcji := [asynchroniczna] funkcja [nazwa] [generyki] (parametry) [: typ] blok
deklaracja-typu := typ | interfejs | enumeracja
instrukcja-warunkowa := jeżeli (wyrażenie) instrukcja [inaczej instrukcja]
instrukcja-pętli := dla | dopóki | zrób
moduł := importuj ... z "moduł" | eksportuj ...
operator-logiczny := wyrażenie i wyrażenie | wyrażenie lub wyrażenie
jsx := standardowy JSX; wyrażenia w klamrach są kodem PolishTS/TS
```

Przykład mieszania składni:

```ts
importuj { useState } z "react";

typ Props = { imię: ciąg };

eksportuj funkcja Powitanie({ imię }: Props) {
  zwróć <h1>Cześć, {imię}</h1>;
}
```

Docelowy wynik to TSX ze standardowym `import`, `from`, `type`, `string`, `export`, `function` i `return`; `imię`, `Powitanie`, `useState` oraz tekst `Cześć` zostają takie same.

## 3. Słowa składniowe a nazwy użytkownika

### Reguła docelowa

Mapowanie zależy od roli tokenu w gramatyce, nie od samego zapisu. Tłumacz musi rozpoznawać składnię i pozycje identyfikatorów. Przykłady:

```ts
obiekt.nie       // `nie` jest nazwą właściwości, nie operatorem
funkcja test(prawda: logiczna) { zwróć prawda; }
// `prawda` w deklaracji i odwołaniu jest nazwą parametru
<Panel tytuł="Prawda i fałsz">Treść: prawda</Panel>
// nazwa atrybutu, wartość tekstowa i tekst JSX pozostają bez zmian
```

W pozycji wyrażenia `nie x` oznacza operator negacji, a `prawda` użyte jako samodzielna wartość logiczna oznacza `true`. Słowo w pozycji deklaracji lub nazwy właściwości ma pierwszeństwo jako identyfikator, jeśli gramatyka dopuszcza tam nazwę. Literały tekstowe, komentarze, template literal oraz tekst/atrybuty JSX są nieprzezroczyste dla translacji.

### Nazwy kolidujące ze słowami zarezerwowanymi

Słowa, które są bezwarunkowymi słowami języka (np. `stała` na początku deklaracji), nie mogą być użyte jako zwykłe lokalne identyfikatory w tej samej pozycji składniowej. Nie dodajemy własnego mechanizmu ucieczki w wersji 0.3. Gdy potrzebna jest taka nazwa, należy użyć innej nazwy lokalnej albo aliasu w miejscu, gdzie TS dopuszcza aliasowanie. Nazwy właściwości, parametrów i pól mogą pokrywać się z polskim słowem, jeśli ich pozycja jest jednoznaczna.

Parser/translacja nie może rozstrzygać niejednoznaczności przez ciche przepisanie identyfikatora. Nierozstrzygnięty przypadek ma dać diagnostykę z lokalizacją i sugestią użycia jednoznacznej składni.

## 4. Nieznane konstrukcje TypeScript

Domyślna polityka: składnia TS, której PolishTS nie ma w słowniku, przechodzi bez zmian, jeśli jest poprawna w aktywnym trybie parsera. Dotyczy to m.in. nowych konstrukcji TypeScript, nazw API, nazw typów z bibliotek oraz niepolskich słów kluczowych.

- Nieznane słowa nie są automatycznie tłumaczone ani odrzucane przez sam słownik.
- Niepoprawna składnia w aktywnym trybie daje błąd parsera z pozycją źródłową.
- Parser nie może „naprawiać” nieznanej składni przez zgadywanie zamiany.
- W trybie TSX JSX jest dozwolony; w trybie TS zwykłym parser zgłasza JSX jako błąd.
- Zgodność z nową składnią TS zależy od wersji parsera Babel w danym wydaniu; wersja ta powinna być podana w dokumentacji i testowana.
- Biblioteka domyślnie używa przypiętego zależnościami `@babel/parser`; `transpile(source, { parser })` pozwala przekazać adapter zgodnego wydania parsera. Babel nie emuluje konkretnej wersji gramatyki TypeScript, więc zgodność semantyczna wyniku jest weryfikowana oddzielnie przez `tsc` projektu.

## 5. Słownik: decyzje kontraktowe

Status „zatwierdzone” oznacza zamierzone znaczenie językowe, ale nie gwarantuje poprawności obecnego kodu. Status „odłożone” oznacza, że forma nie jest częścią publicznego kontraktu 0.3.

| Forma wejściowa | Decyzja | Uzasadnienie / uwagi |
| --- | --- | --- |
| `stała`, `zmienna` | Zatwierdzone: `const`, `let` | Deklaracja zmiennej, wyłącznie w pozycji składniowej |
| `liczba`, `ciąg`, `łańcuch`, `logiczna` | Zatwierdzone: `number`, `string`, `string`, `boolean` | Aliasy typów prymitywnych |
| `dowolny`, `nieznany`, `nic`, `nigdy`, `obiekt`, `symbol` | Zatwierdzone: odpowiednie typy TS | Nie są tłumaczone w pozycjach identyfikatorów |
| `duża_liczba` | Zatwierdzone: `bigint` | Poprawna forma; błędna `duża_liczca` nie jest aliasem |
| `prawda`, `fałsz` | Zatwierdzone: `true`, `false` w pozycji literału logicznego | W pozycji nazwy, np. parametr, pozostają identyfikatorem |
| `null` | Zwykły TS: `null` | Angielski token nie potrzebuje translacji; wpis słownika jest zbędny |
| `nieokreślony` | Zatwierdzone: `undefined` w pozycji wartości | Pozycja identyfikatora pozostaje nazwą |
| `i` | Zatwierdzone kontekstowo jako `&&` wyłącznie między wyrażeniami | `i + 1` i samodzielna nazwa `i` pozostają nazwą; `a i b` jest operatorem. Dla przecięcia typów używa się standardowego `&` |
| `lub`, `nie` | Zatwierdzone kontekstowo jako `||`, `!` w pozycji operatora | Pozycje nazw i właściwości są zachowane |
| `równa`, `różne`, `mniejsze`, `większe`, `mniejsze_równe`, `większe_równe` | Zatwierdzone kontekstowo jako operatory porównania | Używać tylko w pozycji operatora |
| `przypisz`, `plus_równa`, `minus_równa`, `razy_równa`, `podziel_równo`, `modulo_równa` | Zatwierdzone kontekstowo jako operatory przypisania | Wymagają rozpoznania operatora, nie podstawienia w nazwach |
| `pytajnik_kropka`, `podwójne_pytajnik` | Zatwierdzone jako `?.`, `??` | Nietypowe, ale jawne aliasy operatorów |
| `jeżeli`, `inaczej`, `dla`, `dopóki`, `zrób`, `przerwij`, `kontynuuj`, `zwróć` | Zatwierdzone dla konstrukcji sterujących | Nie tłumaczyć w nazwach identyfikatorów |
| `wybierz` | Odrzucone jako alias `pick` | `pick` nie jest słowem kluczowym TS; dla utility type należy używać standardowego `Pick` albo bibliotecznego typu |
| `pomiń`, `częściowy`, `wymagany` | Odłożone; obecne cele `omit`, `partial`, `required` są nieprawidłowe jako bezpośrednie odpowiedniki | Jeśli kiedyś zatwierdzone, mapować na standardowe nazwy typów `Omit`, `Partial`, `Required` z zachowaniem wielkości liter i jako utility types, nie keywordy |
| `switch` | Pozostaje standardowym TS `switch` | Wpis angielski jest redundantny; polska propozycja `wybierz` odrzucona z powodu kolizji z utility `Pick` |
| `przypadku`, `domyślny` | Zatwierdzone: `case`, `default` w instrukcji switch | `domyślny` nie jest aliasem `default` w innych konstrukcjach bez osobnej reguły |
| `funkcja`, `asynchroniczna`, `oczekuj` | Zatwierdzone: `function`, `async`, `await` | Wymagają pozycji składniowej |
| `arrow` | Odrzucone jako słowo języka; `=>` zapisuje się standardowo | Angielska nazwa nie jest polskim aliasem ani poprawnym substytutem operatora |
| `klasa`, `rozszerza`, `konstruktor` | Zatwierdzone: `class`, `extends`, `constructor` | Składnia klas |
| `implementuj` | Zatwierdzone jako `implements` | Polska forma; obecny angielski wpis `implements` jest zbędny |
| `implements`, `new` | Pozostają standardową składnią TS | Bez translacji; wpisy angielskie w słowniku usunąć |
| `rozszerz` | Odłożone; nie jest synonimem `rozszerza` w kontrakcie 0.3 | Unikać dwóch form dla tej samej konstrukcji do czasu specyfikacji kontekstu |
| `ten`, `rodzaj`, `instancja` | Zatwierdzone kontekstowo jako `this`, `typeof`, `instanceof` | `typeof` ma odrębne pozycje typowe i wyrażeniowe; translator musi je rozróżniać |
| `interfejs`, `typ`, `enumeracja`, `wyliczenie` | Zatwierdzone: `interface`, `type`, `enum`, `enum` | Dwa aliasy dla enumu zachowane na start; można później ograniczyć |
| `importuj`, `eksportuj`, `domyślny_eksport`, `jako` | Zatwierdzone: `import`, `export`, `export default`, `as` | `export default` to konstrukcja wielotokenowa i wymaga obsługi parsera |
| `z` | Zatwierdzone kontekstowo jako `from` wyłącznie w klauzuli import/export | Nie jest ogólnym słowem kluczowym; nie wolno odfiltrowywać ani podmieniać globalnie |
| `narzędzie`, `klucze` | Zatwierdzone kontekstowo jako `keyof` w typie | `narzędzie` pozostaje aliasem zgodności z dotychczasowym słownikiem; preferowana forma to `klucze` |
| `spełnia` | Zatwierdzone kontekstowo jako `satisfies` | Alternatywnie można pisać standardowe `satisfies` |
| `ogólny` | Odrzucone jako `generic` | `generic` nie jest słowem kluczowym TS. Składnia generyków pozostaje standardowym zapisem `<T>` do czasu ustalenia kompletnej polskiej gramatyki |
| `modyfikator`, `tylko_czytelny` | Zatwierdzone jako aliasy `readonly` | Dwa aliasy utrzymywane tymczasowo; preferowana forma `tylko_czytelny` |
| `publiczny`, `publiczne`, `prywatny`, `prywatne`, `chroniony`, `chronione` | Zatwierdzone jako modyfikatory klas | Zgodność rodzaju jest aliasem; nie zmienia nazw w innych pozycjach |
| `statyczny`, `abstrakcyjna` | Zatwierdzone: `static`, `abstract` | Modyfikatory klas |
| `spróbuj`, `złap`, `na_koniec`, `rzuć` | Zatwierdzone: `try`, `catch`, `finally`, `throw` | Pozycje instrukcji |
| `błąd`, `nowy_błąd` | Odłożone jako substytuty `Error`, `new Error` | Są nazwami/globalnym API, a nie konstrukcjami języka; zapis standardowy `Error`/`new Error` jest czytelniejszy i nie wymaga translacji |
| `var`, `new`, `null`, `switch`, `implements`, `extends` | Standardowe słowa TS, nie wpisy polskiego słownika | Pozostają dozwolone bez zmian |

Wielkość liter jest istotna dla nazw API i typów. W szczególności utility types to `Pick`, `Omit`, `Partial`, `Required`, a nie małe litery.

## 6. Konwencja nazw

- Nazwy zmiennych, parametrów, funkcji, klas, komponentów React, propsów, pól, metod, typów i modułów są zachowywane dokładnie, łącznie z polskimi znakami i wielkością liter.
- Nazwy API z bibliotek, takie jak `useState`, `useEffect`, `React`, `Pick` i `Promise`, zapisuje się zgodnie z ich rzeczywistą nazwą.
- Nie tłumaczy się automatycznie nazw domenowych na angielski.
- Słowo z tabeli słownika może być identyfikatorem, jeśli występuje w jednoznacznej pozycji identyfikatora. Translacja nie może zmienić go na słowo TS.
- W JSX zachowane są nazwy tagów, komponentów, atrybutów/propsów i tekst dzieci. Kod wewnątrz `{...}` jest kodem i podlega regułom pozycji składniowych.

## 7. Niepoprawne i niejednoznaczne przykłady

Poniższe przykłady mają być błędem składni/diagnostyki, a nie okazją do zgadywania:

```ts
stała wynik przypisz ;      // brak wyrażenia po operatorze przypisania
importuj { x } "moduł";    // brakuje `z`/`from`
```

Poniższe przykłady są poprawne i nazwy muszą zostać zachowane:

```ts
funkcja test(prawda: logiczna) { zwróć prawda; }
const wynik = obiekt.nie;
const tekst = `wartość: ${prawda}`;
```

W przykładzie template literal identyfikator `prawda` w interpolacji jest identyfikatorem, jeśli jest zadeklarowany jako taki; sam tekst template literal nie jest tłumaczony.

## 8. Reguły kompatybilności

- Zatwierdzone mapowania są częścią językowego API. Zmiana ich znaczenia wymaga major wersji albo ścieżki deprecjacji.
- Formy oznaczone „odłożone” lub „odrzucone” nie są obsługiwane aliasami w stabilnym kontrakcie 0.3.
- Implementacja może obsługiwać mniej niż kontrakt docelowy wyłącznie wtedy, gdy ograniczenie jest jawnie udokumentowane; nie może twierdzić, że dana pozycja jest bezpiecznie tłumaczona bez testu kontekstowego.
- Każda zatwierdzona forma musi mieć testy: użycie składniowe, użycie jako identyfikator (jeśli dopuszczalne), wystąpienie w literałach/komentarzu oraz wygenerowany wynik.
