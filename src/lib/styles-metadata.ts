export interface StyleMetadata {
  displayName: string;
  description: string;
  benefits: string[];
  forWho: string;
  intensity: 'low' | 'medium' | 'high';
  pace: 'slow' | 'moderate' | 'fast';
}

export const STYLES_METADATA: Record<string, StyleMetadata> = {
  'hatha': {
    displayName: 'Hatha Joga',
    description: 'Klasyczna ścieżka jogi skupiająca się na harmonii ciała i umysłu poprzez asany (pozycje), pranajamę (oddech) i relaksację. Jest to fundament większości współczesnych stylów jogi.',
    benefits: ['Zwiększenie elastyczności', 'Redukcja stresu', 'Poprawa postawy', 'Wzmocnienie kręgosłupa'],
    forWho: 'Idealna dla początkujących oraz osób szukających spokojnej, zrównoważonej praktyki.',
    intensity: 'medium',
    pace: 'moderate'
  },
  'vinyasa': {
    displayName: 'Vinyasa Joga',
    description: 'Dynamiczny styl jogi, w którym ruch jest płynnie połączony z oddechem. Przejścia między pozycjami przypominają taniec, a intensywność sesji pomaga budować siłę i wytrzymałość.',
    benefits: ['Poprawa kondycji', 'Detoksykacja organizmu', 'Budowa siły mięśniowej', 'Poprawa koncentracji'],
    forWho: 'Dla osób lubiących ruch, dynamikę i chcących popracować nad kondycją fizyczną.',
    intensity: 'high',
    pace: 'fast'
  },
  'ashtanga': {
    displayName: 'Ashtanga Joga',
    description: 'Tradycyjny, uporządkowany styl jogi polegający na wykonywaniu stałych sekwencji pozycji. Charakteryzuje się dużą intensywnością i dyscypliną, budując wewnętrzny ogień.',
    benefits: ['Głębokie wzmocnienie ciała', 'Zwiększenie dyscypliny', 'Oczyszczenie organizmu', 'Poprawa wydolności'],
    forWho: 'Dla osób szukających wyzwań fizycznych i lubiących powtarzalną, ustrukturyzowaną praktykę.',
    intensity: 'high',
    pace: 'fast'
  },
  'yin': {
    displayName: 'Yin Joga',
    description: 'Spokojna, medytacyjna forma jogi skupiająca się na tkankach głębokich – powięziach, więzadłach i stawach. Pozycje utrzymuje się przez kilka minut, co pozwala na głęboki relaks i puszczenie napięć.',
    benefits: ['Zwiększenie zakresu ruchu w stawach', 'Głębokie uspokojenie układu nerwowego', 'Nawilżenie tkanek', 'Poprawa przepływu energii'],
    forWho: 'Dla każdego, kto potrzebuje wyciszenia, regeneracji i przeciwwagi dla aktywnego trybu życia.',
    intensity: 'low',
    pace: 'slow'
  },
  'kundalini': {
    displayName: 'Kundalini Joga',
    description: 'Praktyka łącząca asany, techniki oddechowe, mantry i medytacje. Skupia się na przebudzeniu energii życiowej i harmonizacji centrów energetycznych (czakr).',
    benefits: ['Wzmocnienie odporności psychicznej', 'Balans emocjonalny', 'Zwiększenie witalności', 'Głęboki rozwój duchowy'],
    forWho: 'Dla osób szukających w jodze czegoś więcej niż tylko gimnastyki – pracy z energią i umysłem.',
    intensity: 'medium',
    pace: 'moderate'
  },
  'joga w ciąży': {
    displayName: 'Joga w ciąży',
    description: 'Bezpieczny zestaw ćwiczeń przygotowujący ciało i umysł do porodu. Skupia się na łagodnym wzmacnianiu, rozciąganiu oraz nauce świadomego oddechu i relaksu.',
    benefits: ['Łagodzenie bólów kręgosłupa', 'Przygotowanie do porodu', 'Poprawa krążenia', 'Kontakt z dzieckiem'],
    forWho: 'Dla kobiet w ciąży (po konsultacji z lekarzem), niezależnie od wcześniejszego doświadczenia z jogą.',
    intensity: 'low',
    pace: 'slow'
  },
  'aerial': {
    displayName: 'Aerial Joga',
    description: 'Innowacyjna metoda ćwiczeń z wykorzystaniem specjalnego hamaka podwieszonego pod sufitem. Pozwala na odciążenie stawów i kręgosłupa oraz ułatwia wykonywanie pozycji odwróconych.',
    benefits: ['Decompressja kręgosłupa', 'Zwiększenie zaufania do siebie', 'Świetna zabawa', 'Rozciąganie bez wysiłku'],
    forWho: 'Dla osób szukających nowych wrażeń i chcących poczuć lekkość w ruchu.',
    intensity: 'medium',
    pace: 'moderate'
  },
  'power yoga': {
    displayName: 'Power Joga',
    description: 'Intensywna, fitnessowa odmiana jogi inspirowana ashtangą. Skupia się na budowaniu siły, wytrzymałości i elastyczności bez tradycyjnego nacisku na duchowość.',
    benefits: ['Szybkie spalanie kalorii', 'Rzeźbienie sylwetki', 'Wzmocnienie całego ciała', 'Poprawa sprawności'],
    forWho: 'Dla osób aktywnych, które chcą intensywnego treningu fizycznego.',
    intensity: 'high',
    pace: 'fast'
  }
};
