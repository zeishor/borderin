# Borderin

Aplicație personală pentru un șofer de transport persoane (Timișoara – Budapesta / aeroport și alte curse): transformă mesajele dispecerului în curse, ține evidența plăților, a cheltuielilor de decontat și a cursei „extra".

Stadiu: ecranele de bază și parserul de mesaje funcționează, cu date locale. Parserul (`src/parser.ts`, teste în `src/parser.test.ts`) recunoaște rezervări în format tabel (cu sau fără prefix WhatsApp), telefoane (cu etichete), data, ora, zbor, rută/direcție, plată, mesajul de plecare al dispecerului și telefoane trimise separat. Un mesaj spart pe mai multe rânduri (fără prefix WhatsApp) se lipește într-o singură rezervare cât timp rândurile au puține coloane; un rând gol, un rând complet sau un telefon singur încheie mesajul. Tichet, calcul „extra" și raport urmează.

Rulare: `npm install`, apoi `npm run dev`; teste: `npm test`; publicare pe GitHub Pages: `./deploy.sh`.

## Contextul

- Cursele vin de la dispecer ca mesaje WhatsApp, în mai multe valuri scurte, de obicei pe zile.
- Mesajul unui client arată ca un rând de tabel (câmpuri separate prin tab), uneori cu prefixul WhatsApp (`[ora, lună/zi/an] număr:`). Formatul variază de la un mesaj la altul.
- Mașinile (mici și microbuze 8+1), motorina (card firmă), vinieta, ITP și asigurarea sunt ale firmei.
- Cheltuiala șoferului: taxa de la aeroport. **La departures** (lăsat pasageri) primele 5 minute sunt gratuite, deci de obicei nu există tichet. **La arrivals** (preluat pasageri) se plătește, deci tichetul apare doar acolo.
- Prețuri tipice: 40 euro / 220 lei Timișoara–Budapesta, 15 euro Timișoara–Arad (de confirmat dacă e per pasager).

## Model

**Cursă** (o creează șoferul)
- Mereu tur-retur din Timișoara: Timișoara → destinație → Timișoara.
- Destinația se propune din rutele rezervărilor (locul care nu e Timișoara).
- Ora de plecare din Timișoara e stabilită de dispecer într-un mesaj separat („Pleci mâine la 12 din Timișoara cu retur de 16:40").
- Are: mașină, rezervări (dus și retur), tichet(e) și cheltuieli, total de încasat, durată totală.

**Rezervare** (client într-o cursă)
- Zbor: cod (ex. FR5249, W6 2289) și oraș/aeroport, extrase din mesajul dispecerului (coloana de oră sau oriunde în text), afișate pe card.
- Nume (o singură valoare, ordinea prenume/nume nu e fixă), unul sau mai multe telefoane cu etichetă, număr de pasageri, pasageri cu nume/telefon/bagaje, locuri de preluare și lăsare, ora (zbor sau preluare), zbor/oraș, observații.
- Plată: de încasat (sume posibile, lei/euro) sau achitat (bancă, OP, factură). Modul de plată decide, nu prezența prețului.
- Păstrează textul original al mesajului.
- Etichete brute (ex. „PRIVAT", sursa/clientul) afișate ca atare, fără reguli deduse din ele.

**Mașină:** nume, număr de locuri, bagaje. Evidența: cu ce mașină s-a făcut fiecare cursă.

## Fluxuri

**Cursă nouă**
1. Caseta de lipit text: un mesaj sau mai multe odată, se poate reveni și adăuga.
2. Aplicația extrage rezervările și le arată într-o listă. Tot ce e extras se poate modifica; ce n-a înțeles e marcat (adresă lipsă, oră neclară).
3. Recunoaște trei feluri de text: rezervări, ora de plecare/retur (se setează pe cursă), alte instrucțiuni (rămân note pe cursă). O instrucțiune care leagă rezervări („aduci și pe fata asta cu cei doi pax…") nu devine rezervare.
4. Datele relative („mâine") se calculează față de ziua mesajului; aplicația arată data înțeleasă, utilizatorul confirmă.
5. Se alege mașina și se salvează.

**Telefoane:** fiecare număr e un link care deschide WhatsApp. Numerele se normalizează (`07…` → `+40…`, `00…` → `+…`, fără spații).

**Cursă „extra"**
- Durata totală = ora de plecare din Timișoara până la sfârșitul estimat (ora de ieșire de pe tichetul de la arrivals + durata drumului Budapesta → Timișoara).
- Peste un prag (aprox. 16 ore, de confirmat) cursa e marcată extra.
- Pragul și durata drumului înapoi sunt setări editabile, posibil pe destinație. Regula cu așteptarea de peste ~3 ore rămâne de clarificat.
- Fără tichet de arrivals, sfârșitul se introduce manual.

**Tichet:** scanare automată cu camera (se oprește singură când citește suma și ora plății) sau din poză/galerie; OCR local (Tesseract), fără API; atașat cursei, folosit pentru decont și pentru ora de ieșire.

## Ecrane

1. Lista curselor (pe zile).
2. Cursă nouă (lipire + verificare).
3. Cursa (plecare/retur, rezervări dus și retur, mașină, tichet, total de încasat, durată/extra).
4. Rezervarea (câmpuri editabile, WhatsApp, text original).
5. Tichet.
6. Raport/decont: cheltuieli de dat firmei și bani încasați cash de predat.
7. Setări: mașini, prag extra, durata drumului înapoi.

## Etape

1. Cursă nouă, lipire și extragere, editare, WhatsApp.
2. Plăți și „de predat la firmă".
3. Tichet din poză.
4. Durată și „extra".
5. Raport lunar.
6. Mai târziu: sincronizare, site pentru dispeceri (cu atenție la GDPR).

## Direcție tehnică (de decis)

- Cross-platform, iPhone fără App Store: **aplicație web instalabilă (PWA)** (decis). Datele stau pe telefon (IndexedDB), funcționează offline; instalare prin „Adaugă pe ecranul principal".
- Extragerea din mesaje: **doar reguli, fără AI, fără API, fără costuri, funcționează offline** (decis). Fiecare celulă din rând se clasifică după conținut, nu după poziție: telefon, dată, oră (inclusiv `12;55`), zbor, sumă și monedă, rută (nume de orașe), mod de plată („achitat", „OP", „cash"). Ce nu e recunoscut rămâne în observații; utilizatorul corectează.
- Date local pe telefon la început, un singur utilizator.
- Pregătit pentru sincronizare ulterioară: ID-uri unice, autor și dată de modificare pe fiecare înregistrare, un singur strat de stocare.

## De clarificat

- Ce înseamnă „PRIVAT" în mesaje.
- Prețul de 15 euro (per pasager sau per cursă) și formulări ca „15 EURO/40 DE EURO".
- Cum se numără cursele pentru firmă (per mașină/drum sau per pasager).
- Regula exactă pentru „extra" (prag, de unde se numără).
- Cursele cu două destinații (ex. Budapesta și apoi Arad) și rezervări cu dus și retur în același mesaj.
- Cine alege mașina și ce se întâmplă cu grupurile mari (15 pasageri).

## Date private

Mesajele reale conțin nume și telefoane. Exemplele pentru teste se pun în `samples/private/` (ignorat de git), cu datele personale schimbate.
