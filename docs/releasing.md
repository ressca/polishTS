# Wydania i kompatybilność

## Dwie wersje

- Wersja npm (`package.json`) opisuje kompatybilność biblioteki, CLI i formatu
  wynikowego według SemVer.
- `LANGUAGE_VERSION` i `LANGUAGE_SPEC.md` opisują kontrakt słownika i składni.
  Wersję języka zmienia się niezależnie od numeru npm.

## Reguły SemVer

- **Patch**: poprawka błędu bez zmiany zamierzonego znaczenia poprawnego kodu,
  poprawki diagnostyki i dokumentacji.
- **Minor**: nowe, opcjonalne aliasy/składnia, tryby CLI/API i kompatybilne
  rozszerzenia gramatyki.
- **Major**: usunięcie lub zmiana znaczenia zatwierdzonej formy, niekompatybilna
  zmiana API/CLI albo domyślnego wyjścia.
- Zmiana kontraktu słownika wymaga aktualizacji `LANGUAGE_VERSION` i
  `LANGUAGE_SPEC.md`: patch dla doprecyzowania bez zmiany akceptowanych źródeł,
  minor dla kompatybilnego rozszerzenia, major dla niekompatybilnej zmiany.
- Nowy wpis w `CHANGELOG.md` musi opisywać zmiany, deprecations, migrację i
  istotne ograniczenia przed wydaniem.

## Deprecations i migracje

Wydanie minor może oznaczyć formę jako deprecated i podać jej zamiennik.
Ostrzeżenie powinno wskazywać plik i pozycję źródłową. Usunięcie jest dozwolone
dopiero w major; changelog major zawiera przykłady migracji. Nie oznaczamy
formy deprecated wstecznie ani nie zmieniamy jej znaczenia w patchu.

## Wspierane środowiska

- Biblioteka i CLI: Node.js `>=18`, zgodnie z `engines` w `package.json`.
- CI sprawdza Node 18, 20, 22, 24 i 26. Jest to macierz sprawdzonych wersji,
  nie deklaracja, że każda przyszła wersja działa bez weryfikacji.
- Parserem domyślnym jest wersja `@babel/parser` z zależności danego wydania;
  Babel nie pozwala przypiąć semantycznej wersji gramatyki TypeScript.
- Test zgodności wyjścia używa TypeScript wskazanego przez dev dependency i
  odpala `tsc --noEmit`. Zmiana głównej wersji TypeScript wymaga aktualizacji
  macierzy w CI lub jawnego wpisu w changelogu.
- Starter Vite ma osobne minimum Node.js narzucone przez wersję Vite; aktualne
  ograniczenie podaje jego własny `package.json`/dokumentacja.

## Procedura wydania

1. Zaktualizować `CHANGELOG.md`, `LANGUAGE_SPEC.md` i wersję, jeśli wymaga tego
   SemVer; zsynchronizować `package-lock.json`.
2. Uruchomić `npm ci`, `npm run build`, `npm test`, `npm run package:smoke`,
   `npm pack --dry-run` oraz `npm run build` startera z katalogu
   `examples/react-vite` po czystej instalacji.
3. Sprawdzić zawartość paczki i poprawność instrukcji migracji.
4. Wypchnąć zatwierdzoną wersję na `main`. CI publikuje pakiet dopiero po
   zaliczeniu testów i czystego buildu przykładu.

`npm run benchmark` mierzy medianę translacji deterministycznego pliku z
deklaracjami. To raport informacyjny; nie jest jeszcze progiem blokującym CI.
