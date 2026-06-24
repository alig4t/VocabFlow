import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;

async function main() {
  console.log('Starting database seed...');

  // Create learning module
  const module = await prisma.learningModule.upsert({
    where: { slug: 'vocabulary' },
    update: {},
    create: {
      name: '4000 Essential English Words',
      slug: 'vocabulary',
      description: 'Core vocabulary for English learners',
      isActive: true,
      order: 1,
    },
  });
  console.log(`Created module: ${module.name}`);

  // Create admin user
  const adminPasswordHash = await bcrypt.hash('Admin123!', SALT_ROUNDS);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash: adminPasswordHash,
      name: 'Admin',
      role: Role.ADMIN,
    },
  });
  console.log(`Created admin user: ${adminUser.email}`);

  // Create regular user
  const userPasswordHash = await bcrypt.hash('User123!', SALT_ROUNDS);
  const regularUser = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      passwordHash: userPasswordHash,
      name: 'Test User',
      role: Role.USER,
    },
  });
  console.log(`Created regular user: ${regularUser.email}`);

  // Sample words for chapter 1, unit 1
  const wordsData = [
    {
      eng: 'afraid',
      per: 'ترسیده',
      description:
        'Feeling fear or anxiety; frightened about something that might happen.',
      primaryExample: 'She was afraid of the dark.',
      primaryExampleTrs: 'او از تاریکی می‌ترسید.',
      examples: [
        {
          engSentence: 'The child was afraid to cross the busy street alone.',
          perTranslation: 'بچه می‌ترسید تنها از خیابان شلوغ رد شود.',
          order: 0,
        },
        {
          engSentence: 'He is afraid that he might fail the exam.',
          perTranslation: 'او می‌ترسد که در امتحان رد شود.',
          order: 1,
        },
      ],
    },
    {
      eng: 'awful',
      per: 'وحشتناک',
      description:
        'Very bad or unpleasant; used to emphasize how bad something is.',
      primaryExample: 'The weather was awful yesterday.',
      primaryExampleTrs: 'آب و هوا دیروز وحشتناک بود.',
      examples: [
        {
          engSentence: 'The food at that restaurant tasted awful.',
          perTranslation: 'غذای آن رستوران مزه وحشتناکی داشت.',
          order: 0,
        },
        {
          engSentence: 'I feel awful about forgetting her birthday.',
          perTranslation: 'از اینکه تولدش را فراموش کردم احساس بدی دارم.',
          order: 1,
        },
      ],
    },
    {
      eng: 'bad',
      per: 'بد',
      description:
        'Of poor quality or a low standard; not good; unpleasant or harmful.',
      primaryExample: 'Smoking is bad for your health.',
      primaryExampleTrs: 'سیگار کشیدن برای سلامتی شما بد است.',
      examples: [
        {
          engSentence: 'He made a bad decision that cost him his job.',
          perTranslation: 'او تصمیم بدی گرفت که شغلش را از دست داد.',
          order: 0,
        },
        {
          engSentence: 'The milk has gone bad; do not drink it.',
          perTranslation: 'شیر خراب شده است؛ آن را ننوشید.',
          order: 1,
        },
      ],
    },
    {
      eng: 'battle',
      per: 'نبرد',
      description:
        'A fight between armed forces; a determined struggle to achieve something.',
      primaryExample: 'The soldiers prepared for the battle ahead.',
      primaryExampleTrs: 'سربازان برای نبرد پیش رو آماده شدند.',
      examples: [
        {
          engSentence: 'The two armies fought a fierce battle for three days.',
          perTranslation: 'دو ارتش سه روز نبرد شدیدی کردند.',
          order: 0,
        },
        {
          engSentence: 'She faced a long battle with illness before recovering.',
          perTranslation: 'او قبل از بهبودی با بیماری نبرد طولانی داشت.',
          order: 1,
        },
      ],
    },
    {
      eng: 'brave',
      per: 'شجاع',
      description:
        'Ready to face and endure danger or pain without showing fear; courageous.',
      primaryExample: 'The brave firefighter ran into the burning building.',
      primaryExampleTrs: 'آتش‌نشان شجاع به داخل ساختمان در حال سوختن دوید.',
      examples: [
        {
          engSentence: 'It was brave of her to speak up against the injustice.',
          perTranslation: 'شجاعانه بود که او علیه بی‌عدالتی صحبت کرد.',
          order: 0,
        },
        {
          engSentence: 'The brave child saved his friend from drowning.',
          perTranslation: 'بچه شجاع دوستش را از غرق شدن نجات داد.',
          order: 1,
        },
      ],
    },
    {
      eng: 'century',
      per: 'قرن',
      description: 'A period of one hundred years.',
      primaryExample: 'The castle was built in the twelfth century.',
      primaryExampleTrs: 'قلعه در قرن دوازدهم ساخته شد.',
      examples: [
        {
          engSentence:
            'Scientists made great discoveries in the twentieth century.',
          perTranslation: 'دانشمندان در قرن بیستم کشفیات بزرگی کردند.',
          order: 0,
        },
        {
          engSentence: 'This tradition has existed for over a century.',
          perTranslation: 'این سنت بیش از یک قرن است که وجود دارد.',
          order: 1,
        },
      ],
    },
    {
      eng: 'clever',
      per: 'باهوش',
      description:
        'Quick to understand, learn, and devise or apply ideas; intelligent.',
      primaryExample: 'She was clever enough to solve the puzzle quickly.',
      primaryExampleTrs: 'او به اندازه کافی باهوش بود که پازل را سریع حل کند.',
      examples: [
        {
          engSentence: 'The clever student always found creative solutions.',
          perTranslation: 'دانش‌آموز باهوش همیشه راه‌حل‌های خلاقانه پیدا می‌کرد.',
          order: 0,
        },
        {
          engSentence: 'That was a very clever idea to save time.',
          perTranslation: 'آن ایده بسیار باهوشانه‌ای برای صرفه‌جویی در زمان بود.',
          order: 1,
        },
      ],
    },
    {
      eng: 'crime',
      per: 'جرم',
      description:
        'An action or omission that constitutes an offence punishable by law.',
      primaryExample: 'Theft is a crime punishable by imprisonment.',
      primaryExampleTrs: 'دزدی جرمی است که با زندان مجازات می‌شود.',
      examples: [
        {
          engSentence:
            'The police are working hard to reduce crime in the city.',
          perTranslation: 'پلیس سخت کار می‌کند تا جرم را در شهر کاهش دهد.',
          order: 0,
        },
        {
          engSentence: 'It is a crime to drive without a valid license.',
          perTranslation: 'رانندگی بدون گواهینامه معتبر جرم است.',
          order: 1,
        },
      ],
    },
    {
      eng: 'damage',
      per: 'آسیب',
      description:
        'Physical harm caused to something that impairs its value, usefulness, or normal function.',
      primaryExample: 'The storm caused severe damage to the roof.',
      primaryExampleTrs: 'طوفان آسیب شدیدی به سقف وارد کرد.',
      examples: [
        {
          engSentence:
            'The flood caused extensive damage to homes and businesses.',
          perTranslation: 'سیل آسیب گسترده‌ای به خانه‌ها و کسب‌وکارها وارد کرد.',
          order: 0,
        },
        {
          engSentence: 'Too much sun can damage your skin over time.',
          perTranslation: 'آفتاب زیاد می‌تواند با گذشت زمان به پوستت آسیب بزند.',
          order: 1,
        },
      ],
    },
    {
      eng: 'danger',
      per: 'خطر',
      description:
        'The possibility of suffering harm or injury; a person or thing likely to cause harm.',
      primaryExample: 'The hikers were unaware of the danger ahead.',
      primaryExampleTrs: 'کوهنوردان از خطر پیش رو بی‌خبر بودند.',
      examples: [
        {
          engSentence: 'The warning sign alerted drivers to the danger on the road.',
          perTranslation: 'تابلوی هشدار رانندگان را از خطر جاده آگاه کرد.',
          order: 0,
        },
        {
          engSentence: 'She put herself in danger to rescue the drowning boy.',
          perTranslation: 'او خود را به خطر انداخت تا پسر غرق‌شده را نجات دهد.',
          order: 1,
        },
      ],
    },
  ];

  for (const wordData of wordsData) {
    const { examples, ...wordFields } = wordData;

    const word = await prisma.word.upsert({
      where: {
        // Use a composite approach via findFirst then create/update
        id: (
          await prisma.word.findFirst({
            where: {
              eng: wordFields.eng,
              moduleId: module.id,
              chapter: 1,
              unit: 1,
            },
          })
        )?.id ?? 'nonexistent-id',
      },
      update: {
        per: wordFields.per,
        description: wordFields.description,
        primaryExample: wordFields.primaryExample,
        primaryExampleTrs: wordFields.primaryExampleTrs,
      },
      create: {
        eng: wordFields.eng,
        per: wordFields.per,
        description: wordFields.description,
        primaryExample: wordFields.primaryExample,
        primaryExampleTrs: wordFields.primaryExampleTrs,
        chapter: 1,
        unit: 1,
        moduleId: module.id,
      },
    });

    // Delete existing examples and recreate to avoid duplicates
    await prisma.wordExample.deleteMany({ where: { wordId: word.id } });

    await prisma.wordExample.createMany({
      data: examples.map((ex) => ({
        wordId: word.id,
        engSentence: ex.engSentence,
        perTranslation: ex.perTranslation,
        order: ex.order,
      })),
    });

    console.log(`Created word: ${word.eng} (${word.per})`);
  }

  console.log('Database seed completed successfully.');
}

main()
  .catch((error) => {
    console.error('Error during database seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
