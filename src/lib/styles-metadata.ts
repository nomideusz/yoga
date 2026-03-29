export type StyleCategory = 'style' | 'practice' | 'other';

/** Map a DB style name to a locale-aware display name. Falls back to the original name. */
export function styleDisplayName(dbName: string, locale?: string): string {
  const key = dbName.toLowerCase();
  const meta = STYLES_METADATA[key];
  if (!meta) return dbName;
  if (locale && locale !== 'pl' && meta.translations?.[locale]?.displayName) {
    return meta.translations[locale].displayName;
  }
  return meta.displayName;
}

/** Get locale-aware metadata fields (description, benefits, forWho). */
export function getStyleTranslation(meta: StyleMetadata, locale?: string): { description: string; benefits: string[]; forWho: string } {
  if (locale && locale !== 'pl' && meta.translations?.[locale]) {
    const t = meta.translations[locale];
    return { description: t.description, benefits: t.benefits, forWho: t.forWho };
  }
  return { description: meta.description, benefits: meta.benefits, forWho: meta.forWho };
}

export interface StyleTranslation {
  displayName: string;
  description: string;
  benefits: string[];
  forWho: string;
}

export interface StyleMetadata {
  displayName: string;
  description: string;
  benefits: string[];
  forWho: string;
  intensity: 'low' | 'medium' | 'high';
  pace: 'slow' | 'moderate' | 'fast';
  category?: StyleCategory;
  translations?: Record<string, StyleTranslation>;
}

export const STYLES_METADATA: Record<string, StyleMetadata> = {
  'hatha': {
    displayName: 'Hatha',
    description: 'Klasyczna ścieżka jogi skupiająca się na harmonii ciała i umysłu poprzez asany (pozycje), pranajamę (oddech) i relaksację. Jest to fundament większości współczesnych stylów jogi.',
    benefits: ['Zwiększenie elastyczności', 'Redukcja stresu', 'Poprawa postawy', 'Wzmocnienie kręgosłupa'],
    forWho: 'Idealna dla początkujących oraz osób szukających spokojnej, zrównoważonej praktyki.',
    intensity: 'medium',
    pace: 'moderate',
    translations: {
      en: {
        displayName: 'Hatha',
        description: 'A classical yoga path focusing on harmony of body and mind through asanas (poses), pranayama (breathwork) and relaxation. It is the foundation of most modern yoga styles.',
        benefits: ['Increased flexibility', 'Stress reduction', 'Better posture', 'Spine strengthening'],
        forWho: 'Ideal for beginners and those seeking a calm, balanced practice.',
      },
      uk: {
        displayName: 'Хатха',
        description: 'Класичний напрямок йоги, що зосереджується на гармонії тіла та розуму через асани (пози), пранаяму (дихання) та релаксацію. Це основа більшості сучасних стилів йоги.',
        benefits: ['Збільшення гнучкості', 'Зниження стресу', 'Покращення постави', 'Зміцнення хребта'],
        forWho: 'Ідеально для початківців та тих, хто шукає спокійну, збалансовану практику.',
      },
    },
  },
  'vinyasa': {
    displayName: 'Vinyasa',
    description: 'Dynamiczny styl jogi, w którym ruch jest płynnie połączony z oddechem. Przejścia między pozycjami przypominają taniec, a intensywność sesji pomaga budować siłę i wytrzymałość.',
    benefits: ['Poprawa kondycji', 'Detoksykacja organizmu', 'Budowa siły mięśniowej', 'Poprawa koncentracji'],
    forWho: 'Dla osób lubiących ruch, dynamikę i chcących popracować nad kondycją fizyczną.',
    intensity: 'high',
    pace: 'fast',
    translations: {
      en: {
        displayName: 'Vinyasa',
        description: 'A dynamic yoga style where movement flows seamlessly with breath. Transitions between poses resemble a dance, and the intensity helps build strength and endurance.',
        benefits: ['Improved fitness', 'Body detoxification', 'Muscle strength building', 'Better focus'],
        forWho: 'For those who enjoy movement, dynamism and want to work on physical fitness.',
      },
      uk: {
        displayName: 'Віньяса',
        description: 'Динамічний стиль йоги, в якому рух плавно поєднується з диханням. Переходи між позами нагадують танець, а інтенсивність допомагає будувати силу та витривалість.',
        benefits: ['Покращення фізичної форми', 'Детоксикація організму', 'Зміцнення м\'язів', 'Покращення концентрації'],
        forWho: 'Для тих, хто любить рух, динаміку і хоче попрацювати над фізичною формою.',
      },
    },
  },
  'ashtanga': {
    displayName: 'Ashtanga',
    description: 'Tradycyjny, uporządkowany styl jogi polegający na wykonywaniu stałych sekwencji pozycji. Charakteryzuje się dużą intensywnością i dyscypliną, budując wewnętrzny ogień.',
    benefits: ['Głębokie wzmocnienie ciała', 'Zwiększenie dyscypliny', 'Oczyszczenie organizmu', 'Poprawa wydolności'],
    forWho: 'Dla osób szukających wyzwań fizycznych i lubiących powtarzalną, ustrukturyzowaną praktykę.',
    intensity: 'high',
    pace: 'fast',
    translations: {
      en: {
        displayName: 'Ashtanga',
        description: 'A traditional, structured yoga style based on fixed sequences of poses. Known for high intensity and discipline, building inner fire.',
        benefits: ['Deep body strengthening', 'Increased discipline', 'Body cleansing', 'Improved endurance'],
        forWho: 'For those seeking physical challenges and who enjoy a repeatable, structured practice.',
      },
      uk: {
        displayName: 'Аштанга',
        description: 'Традиційний, структурований стиль йоги, що полягає на виконанні сталих послідовностей поз. Характеризується високою інтенсивністю та дисципліною.',
        benefits: ['Глибоке зміцнення тіла', 'Підвищення дисципліни', 'Очищення організму', 'Покращення витривалості'],
        forWho: 'Для тих, хто шукає фізичних викликів і любить повторювану, структуровану практику.',
      },
    },
  },
  'yin': {
    displayName: 'Yin',
    description: 'Spokojna, medytacyjna forma jogi skupiająca się na tkankach głębokich – powięziach, więzadłach i stawach. Pozycje utrzymuje się przez kilka minut, co pozwala na głęboki relaks i puszczenie napięć.',
    benefits: ['Zwiększenie zakresu ruchu w stawach', 'Głębokie uspokojenie układu nerwowego', 'Nawilżenie tkanek', 'Poprawa przepływu energii'],
    forWho: 'Dla każdego, kto potrzebuje wyciszenia, regeneracji i przeciwwagi dla aktywnego trybu życia.',
    intensity: 'low',
    pace: 'slow',
    translations: {
      en: {
        displayName: 'Yin',
        description: 'A calm, meditative yoga form focusing on deep tissues — fascia, ligaments and joints. Poses are held for several minutes, allowing deep relaxation and release of tension.',
        benefits: ['Increased joint range of motion', 'Deep nervous system calming', 'Tissue hydration', 'Improved energy flow'],
        forWho: 'For anyone who needs stillness, recovery and a counterbalance to an active lifestyle.',
      },
      uk: {
        displayName: 'Інь',
        description: 'Спокійна, медитативна форма йоги, зосереджена на глибоких тканинах — фасціях, зв\'язках та суглобах. Пози утримуються кілька хвилин, що дозволяє глибоко розслабитися.',
        benefits: ['Збільшення рухливості суглобів', 'Глибоке заспокоєння нервової системи', 'Зволоження тканин', 'Покращення потоку енергії'],
        forWho: 'Для кожного, хто потребує тиші, відновлення та противаги активному способу життя.',
      },
    },
  },
  'iyengar': {
    displayName: 'Iyengar',
    description: 'Precyzyjna metoda jogi opracowana przez B.K.S. Iyengara, kładąca nacisk na idealne ustawienie ciała w każdej pozycji. Wykorzystuje rekwizyty — pasy, klocki, koce i ławki — aby pozycje były dostępne dla każdego.',
    benefits: ['Korekta postawy ciała', 'Wzmocnienie głębokich mięśni', 'Precyzja w pozycjach', 'Pomoc w rehabilitacji'],
    forWho: 'Dla osób ceniących precyzję, pracujących z problemami ortopedycznymi lub szukających bezpiecznej, metodycznej praktyki.',
    intensity: 'medium',
    pace: 'slow',
    translations: {
      en: {
        displayName: 'Iyengar',
        description: 'A precise yoga method developed by B.K.S. Iyengar, emphasizing perfect body alignment in every pose. Uses props — straps, blocks, blankets and benches — to make poses accessible to everyone.',
        benefits: ['Posture correction', 'Deep muscle strengthening', 'Precision in poses', 'Rehabilitation support'],
        forWho: 'For those who value precision, work with orthopedic issues or seek a safe, methodical practice.',
      },
      uk: {
        displayName: 'Айєнгар',
        description: 'Точний метод йоги, розроблений Б.К.С. Айєнгаром, з акцентом на ідеальне вирівнювання тіла в кожній позі. Використовує реквізит — ремені, блоки, ковдри та лавки.',
        benefits: ['Корекція постави', 'Зміцнення глибоких м\'язів', 'Точність у позах', 'Допомога в реабілітації'],
        forWho: 'Для тих, хто цінує точність, працює з ортопедичними проблемами або шукає безпечну, методичну практику.',
      },
    },
  },
  'kundalini': {
    displayName: 'Kundalini',
    description: 'Praktyka łącząca asany, techniki oddechowe, mantry i medytacje. Skupia się na przebudzeniu energii życiowej i harmonizacji centrów energetycznych (czakr).',
    benefits: ['Wzmocnienie odporności psychicznej', 'Balans emocjonalny', 'Zwiększenie witalności', 'Głęboki rozwój duchowy'],
    forWho: 'Dla osób szukających w jodze czegoś więcej niż tylko gimnastyki – pracy z energią i umysłem.',
    intensity: 'medium',
    pace: 'moderate',
    category: 'practice',
    translations: {
      en: {
        displayName: 'Kundalini',
        description: 'A practice combining asanas, breathwork, mantras and meditation. Focused on awakening life energy and harmonizing energy centers (chakras).',
        benefits: ['Mental resilience', 'Emotional balance', 'Increased vitality', 'Deep spiritual growth'],
        forWho: 'For those seeking more than just physical exercise from yoga — working with energy and mind.',
      },
      uk: {
        displayName: 'Кундаліні',
        description: 'Практика, що поєднує асани, дихальні техніки, мантри та медитації. Зосереджена на пробудженні життєвої енергії та гармонізації енергетичних центрів (чакр).',
        benefits: ['Зміцнення психічної стійкості', 'Емоційний баланс', 'Підвищення життєвої сили', 'Глибокий духовний розвиток'],
        forWho: 'Для тих, хто шукає в йозі більше, ніж просто гімнастику — роботу з енергією та розумом.',
      },
    },
  },
  'restorative': {
    displayName: 'Restorative',
    description: 'Joga regeneracyjna, w której pozycje utrzymywane są przez dłuższy czas z pełnym podparciem ciała za pomocą koców, poduszek i bolsterów. Praktyka skupia się na głębokim odprężeniu i regeneracji układu nerwowego.',
    benefits: ['Regeneracja układu nerwowego', 'Redukcja chronicznego napięcia', 'Poprawa jakości snu', 'Głęboki relaks bez wysiłku'],
    forWho: 'Dla osób zmęczonych, zestresowanych lub po kontuzji — każdy, kto potrzebuje odpoczynku i odbudowy.',
    intensity: 'low',
    pace: 'slow',
    translations: {
      en: {
        displayName: 'Restorative',
        description: 'A restorative yoga where poses are held for extended periods with full body support using blankets, pillows and bolsters. Focused on deep relaxation and nervous system recovery.',
        benefits: ['Nervous system recovery', 'Chronic tension reduction', 'Better sleep quality', 'Deep relaxation without effort'],
        forWho: 'For tired, stressed or injured individuals — anyone who needs rest and recovery.',
      },
      uk: {
        displayName: 'Відновлювальна',
        description: 'Відновлювальна йога, в якій пози утримуються тривалий час з повною підтримкою тіла за допомогою ковдр, подушок та болстерів. Зосереджена на глибокому розслабленні та відновленні нервової системи.',
        benefits: ['Відновлення нервової системи', 'Зменшення хронічного напруження', 'Покращення якості сну', 'Глибока релаксація без зусиль'],
        forWho: 'Для втомлених, стресованих або після травм — для кожного, хто потребує відпочинку та відновлення.',
      },
    },
  },
  'aerial': {
    displayName: 'Aerial',
    description: 'Innowacyjna metoda ćwiczeń z wykorzystaniem specjalnego hamaka podwieszonego pod sufitem. Pozwala na odciążenie stawów i kręgosłupa oraz ułatwia wykonywanie pozycji odwróconych.',
    benefits: ['Dekompresja kręgosłupa', 'Zwiększenie zaufania do siebie', 'Świetna zabawa', 'Rozciąganie bez wysiłku'],
    forWho: 'Dla osób szukających nowych wrażeń i chcących poczuć lekkość w ruchu.',
    intensity: 'medium',
    pace: 'moderate',
    translations: {
      en: {
        displayName: 'Aerial',
        description: 'An innovative exercise method using a special hammock suspended from the ceiling. Relieves joints and spine and makes inverted poses easier.',
        benefits: ['Spine decompression', 'Increased self-confidence', 'Great fun', 'Effortless stretching'],
        forWho: 'For those seeking new experiences and wanting to feel lightness in movement.',
      },
      uk: {
        displayName: 'Аеро',
        description: 'Інноваційний метод вправ з використанням спеціального гамака, підвішеного до стелі. Розвантажує суглоби та хребет, полегшує виконання перевернутих поз.',
        benefits: ['Декомпресія хребта', 'Підвищення впевненості в собі', 'Чудове задоволення', 'Розтяжка без зусиль'],
        forWho: 'Для тих, хто шукає нових вражень і хоче відчути легкість у русі.',
      },
    },
  },
  'hot yoga': {
    displayName: 'Hot Yoga',
    description: 'Joga praktykowana w podgrzanym pomieszczeniu (zazwyczaj 35–40°C). Ciepło wspomaga rozciąganie mięśni, przyspiesza detoksykację przez pot i intensyfikuje pracę serca.',
    benefits: ['Głębsze rozciąganie', 'Intensywna detoksykacja', 'Spalanie kalorii', 'Poprawa krążenia'],
    forWho: 'Dla osób lubiących intensywny wysiłek i ciepło, bez problemów z sercem i ciśnieniem.',
    intensity: 'high',
    pace: 'moderate',
    translations: {
      en: {
        displayName: 'Hot Yoga',
        description: 'Yoga practiced in a heated room (typically 35–40°C). The heat aids muscle stretching, accelerates detoxification through sweat and intensifies cardiovascular work.',
        benefits: ['Deeper stretching', 'Intense detoxification', 'Calorie burning', 'Improved circulation'],
        forWho: 'For those who enjoy intense exercise and heat, without heart or blood pressure issues.',
      },
      uk: {
        displayName: 'Гаряча йога',
        description: 'Йога, що практикується в нагрітому приміщенні (зазвичай 35–40°C). Тепло сприяє розтяжці м\'язів, прискорює детоксикацію через піт та інтенсифікує роботу серця.',
        benefits: ['Глибша розтяжка', 'Інтенсивна детоксикація', 'Спалювання калорій', 'Покращення кровообігу'],
        forWho: 'Для тих, хто любить інтенсивне навантаження і тепло, без проблем з серцем та тиском.',
      },
    },
  },
  'pregnancy': {
    displayName: 'Joga w ciąży',
    description: 'Bezpieczny zestaw ćwiczeń przygotowujący ciało i umysł do porodu. Skupia się na łagodnym wzmacnianiu, rozciąganiu oraz nauce świadomego oddechu i relaksu.',
    benefits: ['Łagodzenie bólów kręgosłupa', 'Przygotowanie do porodu', 'Poprawa krążenia', 'Kontakt z dzieckiem'],
    forWho: 'Dla kobiet w ciąży (po konsultacji z lekarzem), niezależnie od wcześniejszego doświadczenia z jogą.',
    intensity: 'low',
    pace: 'slow',
    category: 'practice',
    translations: {
      en: {
        displayName: 'Prenatal Yoga',
        description: 'A safe set of exercises preparing body and mind for childbirth. Focuses on gentle strengthening, stretching and learning conscious breathing and relaxation.',
        benefits: ['Back pain relief', 'Birth preparation', 'Improved circulation', 'Bonding with baby'],
        forWho: 'For pregnant women (after doctor consultation), regardless of previous yoga experience.',
      },
      uk: {
        displayName: 'Йога для вагітних',
        description: 'Безпечний комплекс вправ, що готує тіло та розум до пологів. Зосереджується на м\'якому зміцненні, розтяжці та навчанні свідомому диханню та релаксації.',
        benefits: ['Полегшення болю в спині', 'Підготовка до пологів', 'Покращення кровообігу', 'Зв\'язок з дитиною'],
        forWho: 'Для вагітних жінок (після консультації з лікарем), незалежно від попереднього досвіду з йогою.',
      },
    },
  },
  'nidra': {
    displayName: 'Joga Nidra',
    description: 'Technika głębokiej relaksacji prowadzona w pozycji leżącej, często nazywana „jogicznym snem". Prowadzący kieruje uwagę przez poszczególne części ciała, obrazy i odczucia, wprowadzając w stan między jawą a snem.',
    benefits: ['Redukcja stresu i lęku', 'Poprawa jakości snu', 'Regeneracja psychiczna', 'Wzmocnienie uważności'],
    forWho: 'Dla każdego — nie wymaga sprawności fizycznej. Szczególnie pomocna przy bezsenności, wypaleniu i przewlekłym stresie.',
    intensity: 'low',
    pace: 'slow',
    category: 'practice',
    translations: {
      en: {
        displayName: 'Yoga Nidra',
        description: 'A deep relaxation technique practiced lying down, often called "yogic sleep". The teacher guides attention through body parts, images and sensations, inducing a state between wakefulness and sleep.',
        benefits: ['Stress and anxiety reduction', 'Better sleep quality', 'Mental recovery', 'Increased mindfulness'],
        forWho: 'For everyone — no physical fitness required. Especially helpful for insomnia, burnout and chronic stress.',
      },
      uk: {
        displayName: 'Йога Нідра',
        description: 'Техніка глибокої релаксації в положенні лежачи, часто називана «йогічним сном». Викладач спрямовує увагу через частини тіла, образи та відчуття, вводячи у стан між неспанням та сном.',
        benefits: ['Зниження стресу та тривоги', 'Покращення якості сну', 'Психічне відновлення', 'Зміцнення усвідомленості'],
        forWho: 'Для кожного — не потребує фізичної підготовки. Особливо корисна при безсонні, вигоранні та хронічному стресі.',
      },
    },
  },
  'mysore': {
    displayName: 'Mysore',
    description: 'Tradycyjna forma praktyki ashtanga jogi, w której każdy ćwiczy we własnym tempie, a nauczyciel indywidualnie koryguje i prowadzi. Nazwa pochodzi od miasta Mysore w Indiach, gdzie rozwinął się ten styl.',
    benefits: ['Indywidualne podejście', 'Rozwój samodzielnej praktyki', 'Głęboka koncentracja', 'Stopniowe budowanie sekwencji'],
    forWho: 'Dla osób znających podstawy ashtangi lub chcących rozwijać niezależną, codzienną praktykę.',
    intensity: 'high',
    pace: 'moderate',
    translations: {
      en: {
        displayName: 'Mysore',
        description: 'A traditional form of ashtanga yoga practice where everyone practices at their own pace while the teacher individually corrects and guides. Named after the city of Mysore in India.',
        benefits: ['Individual approach', 'Self-practice development', 'Deep concentration', 'Gradual sequence building'],
        forWho: 'For those who know ashtanga basics or want to develop an independent daily practice.',
      },
      uk: {
        displayName: 'Майсор',
        description: 'Традиційна форма практики аштанга-йоги, де кожен займається у власному темпі, а вчитель індивідуально коригує та спрямовує. Назва походить від міста Майсор в Індії.',
        benefits: ['Індивідуальний підхід', 'Розвиток самостійної практики', 'Глибока концентрація', 'Поступова побудова послідовностей'],
        forWho: 'Для тих, хто знає основи аштанги або хоче розвивати незалежну щоденну практику.',
      },
    },
  },
  'power yoga': {
    displayName: 'Power Yoga',
    description: 'Intensywna, fitnessowa odmiana jogi inspirowana ashtangą. Skupia się na budowaniu siły, wytrzymałości i elastyczności bez tradycyjnego nacisku na duchowość.',
    benefits: ['Szybkie spalanie kalorii', 'Rzeźbienie sylwetki', 'Wzmocnienie całego ciała', 'Poprawa sprawności'],
    forWho: 'Dla osób aktywnych, które chcą intensywnego treningu fizycznego.',
    intensity: 'high',
    pace: 'fast',
    translations: {
      en: {
        displayName: 'Power Yoga',
        description: 'An intense, fitness-oriented yoga variation inspired by ashtanga. Focuses on building strength, endurance and flexibility without traditional emphasis on spirituality.',
        benefits: ['Fast calorie burning', 'Body sculpting', 'Full-body strengthening', 'Improved fitness'],
        forWho: 'For active individuals who want an intense physical workout.',
      },
      uk: {
        displayName: 'Силова йога',
        description: 'Інтенсивний, фітнес-орієнтований різновид йоги, натхненний аштангою. Зосереджується на побудові сили, витривалості та гнучкості без традиційного акценту на духовність.',
        benefits: ['Швидке спалювання калорій', 'Моделювання фігури', 'Зміцнення всього тіла', 'Покращення фізичної форми'],
        forWho: 'Для активних людей, які хочуть інтенсивного фізичного тренування.',
      },
    },
  },
  'jivamukti': {
    displayName: 'Jivamukti',
    description: 'Holistyczny styl jogi założony w Nowym Jorku, łączący dynamiczną praktykę fizyczną z filozofią, muzyką, śpiewem i medytacją. Każdy miesiąc ma inny temat przewodni oparty na jogicznych tekstach.',
    benefits: ['Rozwój duchowy w ruchu', 'Silna praktyka fizyczna', 'Inspiracja filozoficzna', 'Integracja jogi z życiem codziennym'],
    forWho: 'Dla osób szukających praktyki łączącej wymagające ćwiczenia z głęboką refleksją i inspiracją.',
    intensity: 'high',
    pace: 'fast',
    translations: {
      en: {
        displayName: 'Jivamukti',
        description: 'A holistic yoga style founded in New York, combining dynamic physical practice with philosophy, music, chanting and meditation. Each month has a different theme based on yogic texts.',
        benefits: ['Spiritual growth in motion', 'Strong physical practice', 'Philosophical inspiration', 'Yoga integration into daily life'],
        forWho: 'For those seeking a practice that combines demanding exercises with deep reflection and inspiration.',
      },
      uk: {
        displayName: 'Дживамукті',
        description: 'Холістичний стиль йоги, заснований у Нью-Йорку, що поєднує динамічну фізичну практику з філософією, музикою, співом та медитацією.',
        benefits: ['Духовний розвиток у русі', 'Сильна фізична практика', 'Філософська натхненність', 'Інтеграція йоги в повсякденне життя'],
        forWho: 'Для тих, хто шукає практику, що поєднує вимогливі вправи з глибокою рефлексією та натхненням.',
      },
    },
  },
  'pilates mat': {
    displayName: 'Pilates Mat',
    description: 'System ćwiczeń opracowany przez Josepha Pilatesa, wykonywany na macie. Skupia się na wzmacnianiu mięśni głębokich, stabilizacji tułowia i kontroli ruchowej. Poprawia postawę ciała i wspomaga rehabilitację.',
    benefits: ['Wzmocnienie mięśni core', 'Korekta postawy', 'Zapobieganie kontuzjom', 'Poprawa świadomości ciała'],
    forWho: 'Dla osób w każdym wieku szukających wzmocnienia głębokich mięśni, poprawy postawy lub uzupełnienia praktyki jogi.',
    intensity: 'medium',
    pace: 'moderate',
    category: 'other',
    translations: {
      en: {
        displayName: 'Pilates Mat',
        description: 'An exercise system developed by Joseph Pilates, performed on a mat. Focuses on strengthening deep muscles, core stability and movement control. Improves posture and aids rehabilitation.',
        benefits: ['Core muscle strengthening', 'Posture correction', 'Injury prevention', 'Improved body awareness'],
        forWho: 'For people of all ages seeking deep muscle strengthening, posture improvement or a complement to yoga practice.',
      },
      uk: {
        displayName: 'Пілатес на маті',
        description: 'Система вправ, розроблена Джозефом Пілатесом, що виконується на маті. Зосереджується на зміцненні глибоких м\'язів, стабілізації корпусу та контролі рухів.',
        benefits: ['Зміцнення м\'язів кору', 'Корекція постави', 'Профілактика травм', 'Покращення усвідомлення тіла'],
        forWho: 'Для людей будь-якого віку, що шукають зміцнення глибоких м\'язів, покращення постави або доповнення до практики йоги.',
      },
    },
  },
  'pilates reformer': {
    displayName: 'Pilates Reformer',
    description: 'Zaawansowana forma pilatesu wykonywana na specjalnym urządzeniu (reformerze) z regulowanym oporem sprężyn. Umożliwia precyzyjną, kontrolowaną pracę mięśniową niedostępną na macie.',
    benefits: ['Precyzyjna praca mięśniowa', 'Rehabilitacja z kontrolowanym obciążeniem', 'Rzeźbienie sylwetki', 'Zwiększenie zakresu ruchu'],
    forWho: 'Dla osób chcących pogłębić praktykę pilatesu, w rehabilitacji lub szukających efektywnego treningu całego ciała.',
    intensity: 'medium',
    pace: 'moderate',
    category: 'other',
    translations: {
      en: {
        displayName: 'Pilates Reformer',
        description: 'An advanced Pilates form performed on a special machine (reformer) with adjustable spring resistance. Enables precise, controlled muscle work not available on a mat.',
        benefits: ['Precise muscle work', 'Controlled-load rehabilitation', 'Body sculpting', 'Increased range of motion'],
        forWho: 'For those wanting to deepen Pilates practice, in rehabilitation or seeking an effective full-body workout.',
      },
      uk: {
        displayName: 'Пілатес на реформері',
        description: 'Просунута форма пілатесу, що виконується на спеціальному пристрої (реформері) з регульованим опором пружин. Забезпечує точну, контрольовану роботу м\'язів.',
        benefits: ['Точна м\'язова робота', 'Реабілітація з контрольованим навантаженням', 'Моделювання фігури', 'Збільшення амплітуди рухів'],
        forWho: 'Для тих, хто хоче поглибити практику пілатесу, в реабілітації або шукає ефективного тренування всього тіла.',
      },
    },
  },
  'stretching': {
    displayName: 'Stretching',
    description: 'Zajęcia skupione na rozciąganiu i zwiększaniu elastyczności ciała. Obejmują techniki statyczne i dynamiczne, pomagające rozluźnić napięte mięśnie i poprawić zakres ruchomości.',
    benefits: ['Zwiększenie elastyczności', 'Rozluźnienie napiętych mięśni', 'Zapobieganie kontuzjom', 'Poprawa regeneracji'],
    forWho: 'Dla każdego — od osób siedzących przy biurku po sportowców szukających lepszej regeneracji i mobilności.',
    intensity: 'low',
    pace: 'slow',
    category: 'other',
    translations: {
      en: {
        displayName: 'Stretching',
        description: 'Classes focused on stretching and increasing body flexibility. Include static and dynamic techniques to release tight muscles and improve range of motion.',
        benefits: ['Increased flexibility', 'Tight muscle release', 'Injury prevention', 'Better recovery'],
        forWho: 'For everyone — from desk workers to athletes seeking better recovery and mobility.',
      },
      uk: {
        displayName: 'Стретчинг',
        description: 'Заняття, зосереджені на розтяжці та збільшенні гнучкості тіла. Включають статичні та динамічні техніки, що допомагають розслабити напружені м\'язи.',
        benefits: ['Збільшення гнучкості', 'Розслаблення напружених м\'язів', 'Профілактика травм', 'Покращення відновлення'],
        forWho: 'Для кожного — від офісних працівників до спортсменів, що шукають кращого відновлення та мобільності.',
      },
    },
  },
  'meditation': {
    displayName: 'Medytacja',
    description: 'Praktyka treningu umysłu oparta na technikach skupienia uwagi, uważności (mindfulness) lub wizualizacji. Regularna medytacja zmienia strukturę mózgu i poprawia zdolność radzenia sobie ze stresem.',
    benefits: ['Redukcja stresu i lęku', 'Poprawa koncentracji', 'Lepsze zarządzanie emocjami', 'Większa jasność umysłu'],
    forWho: 'Dla każdego szukającego wyciszenia i narzędzi do pracy z umysłem — nie wymaga sprawności fizycznej.',
    intensity: 'low',
    pace: 'slow',
    category: 'practice',
    translations: {
      en: {
        displayName: 'Meditation',
        description: 'A mind training practice based on attention focus, mindfulness or visualization techniques. Regular meditation changes brain structure and improves stress management.',
        benefits: ['Stress and anxiety reduction', 'Better focus', 'Improved emotion management', 'Greater mental clarity'],
        forWho: 'For anyone seeking stillness and tools for working with the mind — no physical fitness required.',
      },
      uk: {
        displayName: 'Медитація',
        description: 'Практика тренування розуму, заснована на техніках зосередження уваги, усвідомленості (mindfulness) або візуалізації. Регулярна медитація змінює структуру мозку та покращує здатність справлятися зі стресом.',
        benefits: ['Зниження стресу та тривоги', 'Покращення концентрації', 'Краще управління емоціями', 'Більша ясність розуму'],
        forWho: 'Для кожного, хто шукає тиші та інструментів для роботи з розумом — не потребує фізичної підготовки.',
      },
    },
  },
  'pranayama': {
    displayName: 'Pranayama',
    description: 'Sztuka świadomego oddechu wywodząca się z tradycji jogi. Obejmuje techniki takie jak kapalabhati, nadi shodhana czy ujjayi, które regulują przepływ energii życiowej (prany) i wpływają na układ nerwowy.',
    benefits: ['Regulacja układu nerwowego', 'Zwiększenie pojemności płuc', 'Redukcja lęku', 'Poprawa koncentracji'],
    forWho: 'Dla praktykujących jogę chcących pogłębić pracę z oddechem oraz dla każdego szukającego naturalnych metod radzenia sobie ze stresem.',
    intensity: 'low',
    pace: 'slow',
    category: 'practice',
    translations: {
      en: {
        displayName: 'Pranayama',
        description: 'The art of conscious breathing from the yoga tradition. Includes techniques like kapalabhati, nadi shodhana and ujjayi that regulate life energy (prana) flow and influence the nervous system.',
        benefits: ['Nervous system regulation', 'Increased lung capacity', 'Anxiety reduction', 'Better focus'],
        forWho: 'For yoga practitioners wanting to deepen breathwork and anyone seeking natural stress management methods.',
      },
      uk: {
        displayName: 'Пранаяма',
        description: 'Мистецтво свідомого дихання з традиції йоги. Включає техніки, такі як капалабхаті, наді шодхана та уджаї, що регулюють потік життєвої енергії (прани) та впливають на нервову систему.',
        benefits: ['Регуляція нервової системи', 'Збільшення об\'єму легень', 'Зниження тривоги', 'Покращення концентрації'],
        forWho: 'Для практикуючих йогу, що хочуть поглибити роботу з диханням, та для кожного, хто шукає природних методів боротьби зі стресом.',
      },
    },
  },
  'therapeutic': {
    displayName: 'Joga terapeutyczna',
    description: 'Indywidualnie dobierana praktyka jogi nastawiona na leczenie konkretnych dolegliwości — bólów kręgosłupa, problemów ze stawami, nerwic czy zaburzeń hormonalnych. Łączy asany, oddech i relaksację pod okiem terapeuty.',
    benefits: ['Łagodzenie bólu chronicznego', 'Rehabilitacja pooperacyjna', 'Wsparcie w leczeniu depresji', 'Przywrócenie zakresu ruchu'],
    forWho: 'Dla osób z problemami zdrowotnymi, po kontuzjach lub operacjach, szukających bezpiecznej, nadzorowanej praktyki.',
    intensity: 'low',
    pace: 'slow',
    category: 'practice',
    translations: {
      en: {
        displayName: 'Therapeutic Yoga',
        description: 'An individually tailored yoga practice aimed at treating specific ailments — back pain, joint problems, neurosis or hormonal disorders. Combines asanas, breathwork and relaxation under a therapist\'s guidance.',
        benefits: ['Chronic pain relief', 'Post-surgical rehabilitation', 'Depression treatment support', 'Range of motion restoration'],
        forWho: 'For those with health issues, after injuries or surgeries, seeking a safe, supervised practice.',
      },
      uk: {
        displayName: 'Терапевтична йога',
        description: 'Індивідуально підібрана практика йоги, спрямована на лікування конкретних захворювань — болей у спині, проблем із суглобами, неврозів чи гормональних порушень.',
        benefits: ['Полегшення хронічного болю', 'Післяопераційна реабілітація', 'Підтримка в лікуванні депресії', 'Відновлення амплітуди рухів'],
        forWho: 'Для людей з проблемами здоров\'я, після травм або операцій, що шукають безпечну, контрольовану практику.',
      },
    },
  },
  'tai chi': {
    displayName: 'Tai Chi',
    description: 'Starożytna chińska sztuka ruchu łącząca powolne, płynne sekwencje z głębokim oddechem i medytacją w ruchu. Poprawia równowagę, koordynację i przepływ energii chi.',
    benefits: ['Poprawa równowagi', 'Redukcja ryzyka upadków', 'Wyciszenie umysłu', 'Wzmocnienie stawów'],
    forWho: 'Dla osób w każdym wieku, szczególnie seniorów i osób szukających łagodnej formy ruchu poprawiającej równowagę.',
    intensity: 'low',
    pace: 'slow',
    category: 'other',
    translations: {
      en: {
        displayName: 'Tai Chi',
        description: 'An ancient Chinese movement art combining slow, flowing sequences with deep breathing and moving meditation. Improves balance, coordination and chi energy flow.',
        benefits: ['Better balance', 'Reduced fall risk', 'Mind calming', 'Joint strengthening'],
        forWho: 'For people of all ages, especially seniors and those seeking a gentle form of movement that improves balance.',
      },
      uk: {
        displayName: 'Тай Чі',
        description: 'Стародавнє китайське мистецтво руху, що поєднує повільні, плавні послідовності з глибоким диханням та медитацією в русі. Покращує рівновагу, координацію та потік енергії ці.',
        benefits: ['Покращення рівноваги', 'Зменшення ризику падінь', 'Заспокоєння розуму', 'Зміцнення суглобів'],
        forWho: 'Для людей будь-якого віку, особливо літніх та тих, хто шукає м\'яку форму руху для покращення рівноваги.',
      },
    },
  },
  'barre': {
    displayName: 'Barre',
    description: 'Trening inspirowany baletem, łączący elementy tańca, pilatesu i jogi przy drążku baletowym. Skupia się na izometrycznych skurczach małych grup mięśniowych i precyzyjnych, małych ruchach.',
    benefits: ['Wyrzeźbiona sylwetka', 'Smukłe, długie mięśnie', 'Poprawa postawy', 'Wzmocnienie nóg i pośladków'],
    forWho: 'Dla osób szukających elegancji baletu w połączeniu z efektywnym treningiem całego ciała.',
    intensity: 'medium',
    pace: 'moderate',
    category: 'other',
    translations: {
      en: {
        displayName: 'Barre',
        description: 'A ballet-inspired workout combining dance, Pilates and yoga elements at a ballet barre. Focuses on isometric contractions of small muscle groups and precise, small movements.',
        benefits: ['Sculpted body', 'Long, lean muscles', 'Better posture', 'Stronger legs and glutes'],
        forWho: 'For those seeking the elegance of ballet combined with an effective full-body workout.',
      },
      uk: {
        displayName: 'Барре',
        description: 'Тренування, натхнене балетом, що поєднує елементи танцю, пілатесу та йоги біля балетного станка. Зосереджується на ізометричних скороченнях малих м\'язових груп.',
        benefits: ['Підтягнута фігура', 'Стрункі, довгі м\'язи', 'Покращення постави', 'Зміцнення ніг та сідниць'],
        forWho: 'Для тих, хто шукає елегантність балету в поєднанні з ефективним тренуванням усього тіла.',
      },
    },
  },
};
