-- Słowniki startowe: kraje/terytoria i tematy.
-- Uruchom PO utworzeniu konta właściciela (Authentication → Users → Add user).
-- Dane trafiają do jedynego użytkownika w projekcie — nie trzeba niczego podmieniać.
-- Skrypt można bezpiecznie uruchomić ponownie (istniejące wpisy są pomijane).

do $$
declare
  owner uuid;
begin
  if (select count(*) from auth.users) <> 1 then
    raise exception 'Oczekiwano dokładnie jednego użytkownika (właściciela), jest: %', (select count(*) from auth.users);
  end if;
  owner := (select id from auth.users limit 1);

  insert into public.countries (owner_id, name, iso_code, period, sort_order) values
    (owner, 'Polska',                      'PL', null,          1),
    (owner, 'Polska — II Rzeczpospolita',  'PL', '1918–1939',   2),
    (owner, 'Generalne Gubernatorstwo',    null, '1939–1945',   3),
    (owner, 'Polska Ludowa (PRL)',         'PL', '1944–1989',   4),
    (owner, 'Wolne Miasto Gdańsk',         null, '1920–1939',   5),
    (owner, 'Polska Poczta Polowa / emigracyjna', null, null,   6),
    (owner, 'Niemcy',                      'DE', null,        100),
    (owner, 'Czechosłowacja',              'CS', '1918–1992', 100),
    (owner, 'Czechy',                      'CZ', null,        100),
    (owner, 'Litwa',                       'LT', null,        100),
    (owner, 'Ukraina',                     'UA', null,        100),
    (owner, 'ZSRR',                        'SU', '1922–1991', 100),
    (owner, 'Watykan',                     'VA', null,        100)
  on conflict (owner_id, name) do nothing;

  insert into public.themes (owner_id, name) values
    (owner, 'Przyroda'), (owner, 'Fauna'), (owner, 'Flora'), (owner, 'Sport'),
    (owner, 'Historia'), (owner, 'Architektura'), (owner, 'Sztuka'), (owner, 'Kosmos'),
    (owner, 'Transport'), (owner, 'Militaria'), (owner, 'Postacie'), (owner, 'Religia'),
    (owner, 'Herby i symbole'), (owner, 'Nauka i technika'), (owner, 'Muzyka')
  on conflict (owner_id, name) do nothing;
end;
$$;

-- Kontrola: powinno pokazać 13 krajów i 15 tematów.
select
  (select count(*) from public.countries) as kraje,
  (select count(*) from public.themes)    as tematy;
