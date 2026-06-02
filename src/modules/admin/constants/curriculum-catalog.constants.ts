export type CurriculumCatalog = Record<string, Record<string, string[]>>;

export const CURRICULUM_CATALOG: CurriculumCatalog = {
  Nursery: {
    English: ['Alphabets A-Z', 'Letter Recognition'],
    Urdu: ['حروفِ تہجی'],
    Mathematics: [],
    'General Knowledge': [],
  },
  'KG / Prep': {
    English: [
      'Phonics',
      'Sight Words',
      'Rhyming Words',
      'Simple Sentences',
    ],
    Urdu: ['حروف کی آوازیں', 'آسان الفاظ', 'مختصر جملے'],
    Mathematics: [
      'Numbers 1-100',
      'Counting',
      'Shapes',
      'Addition',
      'Subtraction',
    ],
    'General Knowledge': ['Myself', 'My Family', 'Animals', 'Plants'],
  },
  'Class 1': {
    English: [
      'Alphabet: Reading, Writing, Phonics',
      'Word Patterns',
      'Initial Sounds',
      'Introducing Yourself',
      'Describing Common Objects',
    ],
    Urdu: [
      'حروفِ تہجی',
      'آوازوں کی پہچان',
      'الفاظ بنانا',
      'مختصر جملے',
    ],
    Mathematics: [
      'Numbers up to 100',
      'Place Value',
      'Addition',
      'Subtraction',
      'Shapes',
      'Measurement',
    ],
    Science: ['Living and Non-living Things', 'Plants', 'Animals', 'Weather'],
    Computer: ['Parts of Computer', 'Keyboard', 'Mouse', 'Uses of Computer'],
  },
  'Class 2': {
    English: [
      'Nouns',
      'Verbs',
      'Adjectives',
      'Pronouns',
      'Reading Comprehension',
    ],
    Urdu: [
      'واحد جمع',
      'متضاد الفاظ',
      'مختصر کہانی',
      'جملہ سازی',
    ],
    Mathematics: [
      'Numbers up to 1000',
      'Addition',
      'Subtraction',
      'Multiplication',
      'Division',
      'Fractions',
      'Money',
      'Time',
    ],
    Science: ['Plants', 'Animals', 'Human Body', 'Water', 'Light and Shadow'],
    Computer: ['Computer Devices', 'Typing Basics', 'Paint', 'Files and Folders'],
  },
  'Class 3': {
    English: [
      'Formulaic Expressions',
      'Oral Interactions',
      'Nouns',
      'Antonyms',
      'Syllabic Division',
    ],
    Urdu: [
      'اشعار اور نظمیں',
      'تصویر سے کہانی',
      'الفاظ کے اضداد',
      'مرکزی خیال',
    ],
    Mathematics: [
      'Roman Numbers',
      'Even and Odd Numbers',
      'Numbers up to 10,000',
      'Place Values',
      'Common Fractions',
      'Equivalent Fractions',
    ],
    Science: ['Matter', 'Force', 'Simple Machines', 'Solar System', 'Food Chain'],
    Computer: ['Input and Output Devices', 'MS Paint', 'Keyboard Shortcuts', 'Internet Basics'],
  },
  'Class 4': {
    English: [
      'Parts of Speech',
      'Tenses',
      'Prepositions',
      'Paragraph Writing',
      'Comprehension',
    ],
    Urdu: ['اسم', 'فعل', 'زمانے', 'مضمون نویسی', 'تفہیم'],
    Mathematics: [
      'Large Numbers',
      'Factors and Multiples',
      'Fractions',
      'Decimals',
      'Geometry',
      'Data Handling',
    ],
    Science: ['Human Body Systems', 'Electricity', 'Magnetism', 'Environment', 'States of Matter'],
    Computer: ['Word Processing', 'Presentation Basics', 'Internet Safety', 'Algorithms'],
  },
  'Class 5': {
    English: [
      'Direct and Indirect Speech',
      'Active and Passive Voice',
      'Essay Writing',
      'Letter Writing',
      'Comprehension',
    ],
    Urdu: ['مترادف الفاظ', 'محاورے', 'درخواست نویسی', 'خط نویسی', 'تفہیم'],
    Mathematics: [
      'Fractions',
      'Decimals',
      'Percentages',
      'Ratio and Proportion',
      'Perimeter and Area',
      'Volume',
    ],
    Science: ['Cells', 'Plants and Animals', 'Energy', 'Earth and Space', 'Health and Hygiene'],
    Computer: ['Spreadsheets', 'Coding Basics', 'Digital Citizenship', 'Networks'],
  },
};

const GRADE_ALIASES: Record<string, string> = {
  kg: 'KG / Prep',
  prep: 'KG / Prep',
  'kg/prep': 'KG / Prep',
  'kg / prep': 'KG / Prep',
};

const SUBJECT_ALIASES: Record<string, string> = {
  math: 'Mathematics',
  maths: 'Mathematics',
};

function key(value: string) {
  return value.trim().toLowerCase();
}

export function findCatalogGrade(rawGrade: string) {
  const gradeKey = key(rawGrade);
  const alias = GRADE_ALIASES[gradeKey];
  if (alias) return alias;

  return Object.keys(CURRICULUM_CATALOG).find((grade) => key(grade) === gradeKey);
}

export function findCatalogSubject(grade: string, rawSubject: string) {
  const subjectKey = key(rawSubject);
  const alias = SUBJECT_ALIASES[subjectKey];
  const subjects = CURRICULUM_CATALOG[grade];
  return Object.keys(subjects).find(
    (subject) => key(subject) === key(alias ?? rawSubject),
  );
}

export function findCatalogTopic(
  grade: string,
  subject: string,
  rawTopic: string,
) {
  const topicKey = key(rawTopic);
  return CURRICULUM_CATALOG[grade][subject].find(
    (topic) => key(topic) === topicKey,
  );
}
