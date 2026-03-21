export type StyleCategory = 'style' | 'practice' | 'other';

/** Map a DB style name to its Polish display name. Falls back to the original name. */
export function styleDisplayName(dbName: string): string {
  const key = dbName.toLowerCase();
  return STYLES_METADATA[key]?.displayName ?? dbName;
}

export interface StyleMetadata {
  displayName: string;
  description: string;
  benefits: string[];
  forWho: string;
  intensity: 'low' | 'medium' | 'high';
  pace: 'slow' | 'moderate' | 'fast';
  category?: StyleCategory;
}

export const STYLES_METADATA: Record<string, StyleMetadata> = {
  'hatha': {
    displayName: 'Hatha',
    description: 'Klasyczna ścieżka jogi skupiająca się na harmonii ciała i umysłu poprzez asany (pozycje), pranajamę (oddech) i relaksację. Jest to fundament większości współczesnych stylów jogi.',
    benefits: ['Zwiększenie elastyczności', 'Redukcja stresu', 'Poprawa postawy', 'Wzmocnienie kręgosłupa'],
    forWho: 'Idealna dla początkujących oraz osób szukających spokojnej, zrównoważonej praktyki.',
    intensity: 'medium',
    pace: 'moderate'
  },
  'vinyasa': {
    displayName: 'Vinyasa',
    description: 'Dynamiczny styl jogi, w którym ruch jest płynnie połączony z oddechem. Przejścia między pozycjami przypominają taniec, a intensywność sesji pomaga budować siłę i wytrzymałość.',
    benefits: ['Poprawa kondycji', 'Detoksykacja organizmu', 'Budowa siły mięśniowej', 'Poprawa koncentracji'],
    forWho: 'Dla osób lubiących ruch, dynamikę i chcących popracować nad kondycją fizyczną.',
    intensity: 'high',
    pace: 'fast'
  },
  'ashtanga': {
    displayName: 'Ashtanga',
    description: 'Tradycyjny, uporządkowany styl jogi polegający na wykonywaniu stałych sekwencji pozycji. Charakteryzuje się dużą intensywnością i dyscypliną, budując wewnętrzny ogień.',
    benefits: ['Głębokie wzmocnienie ciała', 'Zwiększenie dyscypliny', 'Oczyszczenie organizmu', 'Poprawa wydolności'],
    forWho: 'Dla osób szukających wyzwań fizycznych i lubiących powtarzalną, ustrukturyzowaną praktykę.',
    intensity: 'high',
    pace: 'fast'
  },
  'yin': {
    displayName: 'Yin',
    description: 'Spokojna, medytacyjna forma jogi skupiająca się na tkankach głębokich – powięziach, więzadłach i stawach. Pozycje utrzymuje się przez kilka minut, co pozwala na głęboki relaks i puszczenie napięć.',
    benefits: ['Zwiększenie zakresu ruchu w stawach', 'Głębokie uspokojenie układu nerwowego', 'Nawilżenie tkanek', 'Poprawa przepływu energii'],
    forWho: 'Dla każdego, kto potrzebuje wyciszenia, regeneracji i przeciwwagi dla aktywnego trybu życia.',
    intensity: 'low',
    pace: 'slow'
  },
  'iyengar': {
    displayName: 'Iyengar',
    description: 'Precyzyjna metoda jogi opracowana przez B.K.S. Iyengara, kładąca nacisk na idealne ustawienie ciała w każdej pozycji. Wykorzystuje rekwizyty — pasy, klocki, koce i ławki — aby pozycje były dostępne dla każdego.',
    benefits: ['Korekta postawy ciała', 'Wzmocnienie głębokich mięśni', 'Precyzja w pozycjach', 'Pomoc w rehabilitacji'],
    forWho: 'Dla osób ceniących precyzję, pracujących z problemami ortopedycznymi lub szukających bezpiecznej, metodycznej praktyki.',
    intensity: 'medium',
    pace: 'slow'
  },
  'kundalini': {
    displayName: 'Kundalini',
    description: 'Praktyka łącząca asany, techniki oddechowe, mantry i medytacje. Skupia się na przebudzeniu energii życiowej i harmonizacji centrów energetycznych (czakr).',
    benefits: ['Wzmocnienie odporności psychicznej', 'Balans emocjonalny', 'Zwiększenie witalności', 'Głęboki rozwój duchowy'],
    forWho: 'Dla osób szukających w jodze czegoś więcej niż tylko gimnastyki – pracy z energią i umysłem.',
    intensity: 'medium',
    pace: 'moderate',
    category: 'practice'
  },
  'restorative': {
    displayName: 'Restorative',
    description: 'Joga regeneracyjna, w której pozycje utrzymywane są przez dłuższy czas z pełnym podparciem ciała za pomocą koców, poduszek i bolsterów. Praktyka skupia się na głębokim odprężeniu i regeneracji układu nerwowego.',
    benefits: ['Regeneracja układu nerwowego', 'Redukcja chronicznego napięcia', 'Poprawa jakości snu', 'Głęboki relaks bez wysiłku'],
    forWho: 'Dla osób zmęczonych, zestresowanych lub po kontuzji — każdy, kto potrzebuje odpoczynku i odbudowy.',
    intensity: 'low',
    pace: 'slow'
  },
  'aerial': {
    displayName: 'Aerial',
    description: 'Innowacyjna metoda ćwiczeń z wykorzystaniem specjalnego hamaka podwieszonego pod sufitem. Pozwala na odciążenie stawów i kręgosłupa oraz ułatwia wykonywanie pozycji odwróconych.',
    benefits: ['Dekompresja kręgosłupa', 'Zwiększenie zaufania do siebie', 'Świetna zabawa', 'Rozciąganie bez wysiłku'],
    forWho: 'Dla osób szukających nowych wrażeń i chcących poczuć lekkość w ruchu.',
    intensity: 'medium',
    pace: 'moderate'
  },
  'hot yoga': {
    displayName: 'Hot Yoga',
    description: 'Joga praktykowana w podgrzanym pomieszczeniu (zazwyczaj 35–40°C). Ciepło wspomaga rozciąganie mięśni, przyspiesza detoksykację przez pot i intensyfikuje pracę serca.',
    benefits: ['Głębsze rozciąganie', 'Intensywna detoksykacja', 'Spalanie kalorii', 'Poprawa krążenia'],
    forWho: 'Dla osób lubiących intensywny wysiłek i ciepło, bez problemów z sercem i ciśnieniem.',
    intensity: 'high',
    pace: 'moderate'
  },
  'pregnancy': {
    displayName: 'Joga w ciąży',
    description: 'Bezpieczny zestaw ćwiczeń przygotowujący ciało i umysł do porodu. Skupia się na łagodnym wzmacnianiu, rozciąganiu oraz nauce świadomego oddechu i relaksu.',
    benefits: ['Łagodzenie bólów kręgosłupa', 'Przygotowanie do porodu', 'Poprawa krążenia', 'Kontakt z dzieckiem'],
    forWho: 'Dla kobiet w ciąży (po konsultacji z lekarzem), niezależnie od wcześniejszego doświadczenia z jogą.',
    intensity: 'low',
    pace: 'slow',
    category: 'practice'
  },
  'nidra': {
    displayName: 'Joga Nidra',
    description: 'Technika głębokiej relaksacji prowadzona w pozycji leżącej, często nazywana „jogicznym snem". Prowadzący kieruje uwagę przez poszczególne części ciała, obrazy i odczucia, wprowadzając w stan między jawą a snem.',
    benefits: ['Redukcja stresu i lęku', 'Poprawa jakości snu', 'Regeneracja psychiczna', 'Wzmocnienie uważności'],
    forWho: 'Dla każdego — nie wymaga sprawności fizycznej. Szczególnie pomocna przy bezsenności, wypaleniu i przewlekłym stresie.',
    intensity: 'low',
    pace: 'slow',
    category: 'practice'
  },
  'mysore': {
    displayName: 'Mysore',
    description: 'Tradycyjna forma praktyki ashtanga jogi, w której każdy ćwiczy we własnym tempie, a nauczyciel indywidualnie koryguje i prowadzi. Nazwa pochodzi od miasta Mysore w Indiach, gdzie rozwinął się ten styl.',
    benefits: ['Indywidualne podejście', 'Rozwój samodzielnej praktyki', 'Głęboka koncentracja', 'Stopniowe budowanie sekwencji'],
    forWho: 'Dla osób znających podstawy ashtangi lub chcących rozwijać niezależną, codzienną praktykę.',
    intensity: 'high',
    pace: 'moderate'
  },
  'power yoga': {
    displayName: 'Power Yoga',
    description: 'Intensywna, fitnessowa odmiana jogi inspirowana ashtangą. Skupia się na budowaniu siły, wytrzymałości i elastyczności bez tradycyjnego nacisku na duchowość.',
    benefits: ['Szybkie spalanie kalorii', 'Rzeźbienie sylwetki', 'Wzmocnienie całego ciała', 'Poprawa sprawności'],
    forWho: 'Dla osób aktywnych, które chcą intensywnego treningu fizycznego.',
    intensity: 'high',
    pace: 'fast'
  },
  'jivamukti': {
    displayName: 'Jivamukti',
    description: 'Holistyczny styl jogi założony w Nowym Jorku, łączący dynamiczną praktykę fizyczną z filozofią, muzyką, śpiewem i medytacją. Każdy miesiąc ma inny temat przewodni oparty na jogicznych tekstach.',
    benefits: ['Rozwój duchowy w ruchu', 'Silna praktyka fizyczna', 'Inspiracja filozoficzna', 'Integracja jogi z życiem codziennym'],
    forWho: 'Dla osób szukających praktyki łączącej wymagające ćwiczenia z głęboką refleksją i inspiracją.',
    intensity: 'high',
    pace: 'fast'
  },
  'pilates mat': {
    displayName: 'Pilates Mat',
    description: 'System ćwiczeń opracowany przez Josepha Pilatesa, wykonywany na macie. Skupia się na wzmacnianiu mięśni głębokich, stabilizacji tułowia i kontroli ruchowej. Poprawia postawę ciała i wspomaga rehabilitację.',
    benefits: ['Wzmocnienie mięśni core', 'Korekta postawy', 'Zapobieganie kontuzjom', 'Poprawa świadomości ciała'],
    forWho: 'Dla osób w każdym wieku szukających wzmocnienia głębokich mięśni, poprawy postawy lub uzupełnienia praktyki jogi.',
    intensity: 'medium',
    pace: 'moderate',
    category: 'other'
  },
  'pilates reformer': {
    displayName: 'Pilates Reformer',
    description: 'Zaawansowana forma pilatesu wykonywana na specjalnym urządzeniu (reformerze) z regulowanym oporem sprężyn. Umożliwia precyzyjną, kontrolowaną pracę mięśniową niedostępną na macie.',
    benefits: ['Precyzyjna praca mięśniowa', 'Rehabilitacja z kontrolowanym obciążeniem', 'Rzeźbienie sylwetki', 'Zwiększenie zakresu ruchu'],
    forWho: 'Dla osób chcących pogłębić praktykę pilatesu, w rehabilitacji lub szukających efektywnego treningu całego ciała.',
    intensity: 'medium',
    pace: 'moderate',
    category: 'other'
  },
  'stretching': {
    displayName: 'Stretching',
    description: 'Zajęcia skupione na rozciąganiu i zwiększaniu elastyczności ciała. Obejmują techniki statyczne i dynamiczne, pomagające rozluźnić napięte mięśnie i poprawić zakres ruchomości.',
    benefits: ['Zwiększenie elastyczności', 'Rozluźnienie napiętych mięśni', 'Zapobieganie kontuzjom', 'Poprawa regeneracji'],
    forWho: 'Dla każdego — od osób siedzących przy biurku po sportowców szukających lepszej regeneracji i mobilności.',
    intensity: 'low',
    pace: 'slow',
    category: 'other'
  },
  'meditation': {
    displayName: 'Medytacja',
    description: 'Praktyka treningu umysłu oparta na technikach skupienia uwagi, uważności (mindfulness) lub wizualizacji. Regularna medytacja zmienia strukturę mózgu i poprawia zdolność radzenia sobie ze stresem.',
    benefits: ['Redukcja stresu i lęku', 'Poprawa koncentracji', 'Lepsze zarządzanie emocjami', 'Większa jasność umysłu'],
    forWho: 'Dla każdego szukającego wyciszenia i narzędzi do pracy z umysłem — nie wymaga sprawności fizycznej.',
    intensity: 'low',
    pace: 'slow',
    category: 'practice'
  },
  'pranayama': {
    displayName: 'Pranayama',
    description: 'Sztuka świadomego oddechu wywodząca się z tradycji jogi. Obejmuje techniki takie jak kapalabhati, nadi shodhana czy ujjayi, które regulują przepływ energii życiowej (prany) i wpływają na układ nerwowy.',
    benefits: ['Regulacja układu nerwowego', 'Zwiększenie pojemności płuc', 'Redukcja lęku', 'Poprawa koncentracji'],
    forWho: 'Dla praktykujących jogę chcących pogłębić pracę z oddechem oraz dla każdego szukającego naturalnych metod radzenia sobie ze stresem.',
    intensity: 'low',
    pace: 'slow',
    category: 'practice'
  },
  'therapeutic': {
    displayName: 'Joga terapeutyczna',
    description: 'Indywidualnie dobierana praktyka jogi nastawiona na leczenie konkretnych dolegliwości — bólów kręgosłupa, problemów ze stawami, nerwic czy zaburzeń hormonalnych. Łączy asany, oddech i relaksację pod okiem terapeuty.',
    benefits: ['Łagodzenie bólu chronicznego', 'Rehabilitacja pooperacyjna', 'Wsparcie w leczeniu depresji', 'Przywrócenie zakresu ruchu'],
    forWho: 'Dla osób z problemami zdrowotnymi, po kontuzjach lub operacjach, szukających bezpiecznej, nadzorowanej praktyki.',
    intensity: 'low',
    pace: 'slow',
    category: 'practice'
  },
  'tai chi': {
    displayName: 'Tai Chi',
    description: 'Starożytna chińska sztuka ruchu łącząca powolne, płynne sekwencje z głębokim oddechem i medytacją w ruchu. Poprawia równowagę, koordynację i przepływ energii chi.',
    benefits: ['Poprawa równowagi', 'Redukcja ryzyka upadków', 'Wyciszenie umysłu', 'Wzmocnienie stawów'],
    forWho: 'Dla osób w każdym wieku, szczególnie seniorów i osób szukających łagodnej formy ruchu poprawiającej równowagę.',
    intensity: 'low',
    pace: 'slow',
    category: 'other'
  },
  'barre': {
    displayName: 'Barre',
    description: 'Trening inspirowany baletem, łączący elementy tańca, pilatesu i jogi przy drążku baletowym. Skupia się na izometrycznych skurczach małych grup mięśniowych i precyzyjnych, małych ruchach.',
    benefits: ['Wyrzeźbiona sylwetka', 'Smukłe, długie mięśnie', 'Poprawa postawy', 'Wzmocnienie nóg i pośladków'],
    forWho: 'Dla osób szukających elegancji baletu w połączeniu z efektywnym treningiem całego ciała.',
    intensity: 'medium',
    pace: 'moderate',
    category: 'other'
  },
};
