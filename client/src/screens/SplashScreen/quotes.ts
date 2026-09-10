import type { Language } from '../../i18n';

export interface SplashQuote {
  readonly text: Record<Language, string>;
  readonly by?: Record<Language, string>;
}

function line(
  en: string,
  fa: string,
  by?: { en: string; fa: string },
): SplashQuote {
  return by ? { text: { en, fa }, by } : { text: { en, fa } };
}

const mk = (en: string, fa: string) => ({ en, fa });

/** Rotating plaque lines. Four table lines, the rest biography. */
export const SPLASH_QUOTES: readonly SplashQuote[] = [
  line(
    'Someone at this table is Hitler. Most of you will vote with him anyway.',
    'یکی سر این میز هیتلره. بیشترتون هم باهاش رأی می‌دید.',
  ),
  line(
    'The liberals have the numbers. The fascists have the names.',
    'لیبرال‌ها تعداد دارن. فاشیست‌ها اسم‌ها رو.',
  ),
  line('Ja or Nein. The rest is theatre.', 'یا موافق یا مخالف. بقیه نمایشه.'),
  line(
    'Trust is the first policy you enact — and the first they burn.',
    'اعتماد اولین قانونیه که تصویب می‌کنی — و اولین قانونی که می‌سوزونن.',
  ),

  line(
    'The great masses of the people will more easily fall victims to a big lie than to a small one.',
    'توده‌ها خیلی راحت‌تر فریب دروغ بزرگ را می‌خورند تا دروغ کوچک را.',
    mk('Mein Kampf', 'نبرد من'),
  ),
  line(
    'Make the lie big. Keep it simple. Keep saying it.',
    'دروغ را بزرگ کن. ساده کن. تکرار کن.',
    mk('on propaganda', 'دربارهٔ تبلیغات'),
  ),
  line(
    'It is always more difficult to fight against faith than against knowledge.',
    'جنگیدن با ایمان همیشه سخت‌تر از جنگیدن با دانش است.',
    mk('Mein Kampf', 'نبرد من'),
  ),
  line(
    'Born in Braunau am Inn, 20 April 1889.',
    '۲۰ آوریل ۱۸۸۹، در براونائو آم این به دنیا آمد.',
  ),
  line(
    'His father Alois was a customs official. He wanted the son to follow.',
    'پدرش آلویس مأمور گمرک بود. می‌خواست پسر هم همان راه را برود.',
  ),
  line(
    'His mother Klara spoiled him. The house never recovered from that.',
    'مادرش کلارا لوسش کرد. خانه از آن حال بیرون نیامد.',
  ),
  line(
    'He was a poor student and left school without the diploma his father wanted.',
    'شاگرد ضعیفی بود و مدرسه را بدون دیپلمی که پدر می‌خواست ترک کرد.',
  ),
  line(
    'He wanted to be a painter. The Academy in Vienna said no. Twice.',
    'می‌خواست نقاش شود. آکادمی وین دو بار ردش کرد.',
  ),
  line(
    'He copied postcards and sold them to tourists. That was the art career.',
    'از کارت‌پستال کپی می‌گرفت و می‌فروخت. شغل هنری‌اش همین بود.',
  ),
  line(
    'He slept in men’s hostels and talked politics at the soup kitchens.',
    'در خوابگاه مردانه می‌خوابید و سر غذاخوری فقرا سیاست می‌گفت.',
  ),
  line(
    'He read pamphlets, not books. He collected grudges the same way.',
    'جزوه می‌خواند، نه کتاب. کینه را هم همان‌طور جمع می‌کرد.',
  ),
  line(
    'He left for Munich in 1913 to dodge Austrian military service.',
    'سال ۱۹۱۳ به مونیخ رفت تا از خدمت سربازی اتریش در برود.',
  ),
  line(
    'When the war came he volunteered for a Bavarian regiment.',
    'وقتی جنگ شروع شد، داوطلب یک هنگ باواریایی شد.',
  ),
  line(
    'He was a dispatch runner. Close enough to danger to win a medal. Far enough to live.',
    'پیک خط مقدم بود. آن‌قدر نزدیک که نشان بگیرد. آن‌قدر دور که زنده بماند.',
  ),
  line(
    'He won the Iron Cross. He wore it for the rest of his life.',
    'صلیب آهنین گرفت. تا آخر عمر به سینه زد.',
  ),
  line(
    'A gas attack put him in hospital. There he heard that Germany had lost.',
    'حملهٔ گاز او را به بیمارستان انداخت. همان‌جا فهمید آلمان باخته.',
  ),
  line(
    'He decided the army had been stabbed in the back. He never let that story go.',
    'تصمیم گرفت ارتش از پشت خنجر خورده. آن قصه را هیچ‌وقت ول نکرد.',
  ),
  line(
    'He stayed in the army as an informant. Politics was his next uniform.',
    'در ارتش ماند به‌عنوان خبرچین. سیاست یونیفرم بعدی‌اش شد.',
  ),
  line(
    'He joined a tiny workers’ party in Munich because someone told him to go listen.',
    'به یک حزب کوچک کارگری در مونیخ پیوست، چون کسی گفت برو بشنو.',
  ),
  line(
    'He discovered the microphone. The room discovered him.',
    'میکروفون را کشف کرد. اتاق هم او را کشف کرد.',
  ),
  line(
    'He could speak for hours without notes. The crowd did the remembering.',
    'ساعت‌ها بدون یادداشت حرف می‌زد. جمعیت حفظ می‌کرد.',
  ),
  line(
    'He rehearsed the gestures. The rage was theatre with a schedule.',
    'حرکات دست را تمرین می‌کرد. خشم تئاتری بود با برنامه.',
  ),
  line(
    'The Beer Hall Putsch of 1923 was a farce. Sixteen of his men died. He ran.',
    'کودتای آبجوفروشی ۱۹۲۳ مسخره بود. شانزده نفر از آدم‌هایش مردند. او فرار کرد.',
  ),
  line(
    'A court that admired him gave a light sentence. Prison became a study.',
    'دادگاهی که دوستش داشت حکم سبک داد. زندان شد اتاق کار.',
  ),
  line(
    'In Landsberg he dictated a book. He called it My Struggle.',
    'در لاندسبرگ کتابی دیکته کرد. اسمش را گذاشت نبرد من.',
  ),
  line(
    'The book was long, bitter, and unread by most who later swore by it.',
    'کتاب بلند بود و تلخ؛ بیشتر کسانی که بعداً به آن قسم خوردند نخوانده بودندش.',
  ),
  line(
    'He learned that ballots could finish what bullets had failed.',
    'فهمید رأی می‌تواند کاری را تمام کند که گلوله نتوانسته.',
  ),
  line(
    'He rebuilt the party around one man. The man was himself.',
    'حزب را دور یک نفر دوباره ساخت. آن یک نفر خودش بود.',
  ),
  line(
    'He flew from rally to rally. The airplane was part of the myth.',
    'از تجمع به تجمع پرواز می‌کرد. هواپیما بخشی از افسانه بود.',
  ),
  line(
    'He waited through the Depression. Hunger made the speeches louder.',
    'رکود را صبر کرد. گرسنگی صدای سخنرانی‌ها را بلندتر کرد.',
  ),
  line(
    'On 30 January 1933 he was appointed chancellor. The old elite thought they could use him.',
    '۳۰ ژانویهٔ ۱۹۳۳ صدراعظم شد. نخبگان کهنه فکر کردند می‌توانند از او استفاده کنند.',
  ),
  line(
    'They were wrong within months.',
    'تا چند ماه بعد فهمیدند اشتباه کرده‌اند.',
  ),
  line(
    'The Reichstag burned. He used the smoke to strangle the law.',
    'رایشتاگ آتش گرفت. او از دودش قانون را خفه کرد.',
  ),
  line(
    'He banned the parties that were not his. Then he banned the idea of parties.',
    'حزب‌هایی که مال او نبودند را بست. بعد ایدهٔ حزب را بست.',
  ),
  line(
    'The Night of the Long Knives was a massacre of his own. Loyalty had a limit: him.',
    'شب کاردهای بلند کشتار خودی‌ها بود. وفاداری یک سقف داشت: خودش.',
  ),
  line(
    'He never learned to drive. Someone else held the wheel. He held the map.',
    'هیچ‌وقت رانندگی یاد نگرفت. دیگری فرمان را می‌گرفت. او نقشه را.',
  ),
  line(
    'He was a night owl. Decisions arrived after midnight, when no one could argue well.',
    'شب‌بیدار بود. تصمیم‌ها بعد از نیمه‌شب می‌آمدند، وقتی کسی حال بحث نداشت.',
  ),
  line(
    'He ate little meat in later years and made a performance of it.',
    'در سال‌های بعد کم گوشت می‌خورد و از آن نمایش می‌ساخت.',
  ),
  line(
    'He did not drink. He did not smoke. He demanded the same piety from a machine of death.',
    'شراب نمی‌خورد. سیگار نمی‌کشید. از ماشین مرگ همان زهد را می‌خواست.',
  ),
  line(
    'He loved dogs, especially German Shepherds. Blondi died with him.',
    'سگ دوست داشت، مخصوصاً ژرمن شپرد. بلوندی با او مرد.',
  ),
  line(
    'He hated the smell of hospitals. Other people’s pain was abstract until it was useful.',
    'از بوی بیمارستان متنفر بود. درد دیگران انتزاعی بود، تا وقتی به دردش می‌خورد.',
  ),
  line(
    'He could be charming at a table and monstrous an hour later. Both were tools.',
    'سر میز می‌توانست دلربا باشد و یک ساعت بعد هیولا. هر دو ابزار بودند.',
  ),
  line(
    'He trusted almost no one. He set deputies against deputies and watched.',
    'تقریباً به هیچ‌کس اعتماد نداشت. معاون‌ها را به جان هم می‌انداخت و نگاه می‌کرد.',
  ),
  line(
    'He remembered slights for decades. Kindness he forgot by morning.',
    'کینه‌ها را دهه‌ها به خاطر می‌سپرد. مهربانی را تا صبح فراموش می‌کرد.',
  ),
  line(
    'He avoided experts who contradicted him. Maps that disagreed were wrong.',
    'از کارشناسانی که خلافش می‌گفتند دوری می‌کرد. نقشه‌ای که نمی‌خواند غلط بود.',
  ),
  line(
    'He believed will could replace industry, fuel, and winter.',
    'باور داشت اراده جای صنعت و سوخت و زمستان را می‌گیرد.',
  ),
  line(
    'He rarely visited the front he sent other people’s sons to.',
    'به جبهه‌ای که پسرهای دیگران را می‌فرستاد کم سر می‌زد.',
  ),
  line(
    'He never set foot in a death camp. Paper did that work.',
    'هیچ‌وقت پا در اردوگاه مرگ نگذاشت. کاغذ آن کار را می‌کرد.',
  ),
  line(
    'What luck for rulers that men do not think.',
    'چه شانسی برای حاکمان که آدم‌ها فکر نمی‌کنند.',
    mk('attributed', 'نقل‌شده'),
  ),
  line(
    'The victor will never be asked if he told the truth.',
    'از فاتح هیچ‌وقت نمی‌پرسند راست گفته یا نه.',
    mk('Mein Kampf', 'نبرد من'),
  ),
  line(
    'Propaganda must be popular and must adapt to the least intelligent.',
    'تبلیغات باید عامه‌پسند باشد و خودش را با کم‌هوش‌ترین‌ها جور کند.',
    mk('Mein Kampf', 'نبرد من'),
  ),
  line(
    'Words build bridges into unexplored regions.',
    'کلمات پل می‌سازند به جاهایی که هنوز دیده نشده.',
    mk('Mein Kampf', 'نبرد من'),
  ),
  line(
    'He called himself an artist to the end. History called him something else.',
    'تا آخر خودش را هنرمند نامید. تاریخ چیز دیگری صداش کرد.',
  ),
  line(
    'He painted decent watercolors of buildings. He could not paint people.',
    'آبرنگ ساختمان‌ها را بدک می‌کشید. آدم‌ها را نمی‌توانست.',
  ),
  line(
    'Human faces bored his brush. Crowds did not bore his voice.',
    'چهرهٔ آدم‌ها قلم‌مویش را خسته می‌کرد. جمعیت صدایش را نه.',
  ),
  line(
    'He kept a simple room and a vast stage. The contrast was the costume.',
    'اتاقی ساده داشت و صحنه‌ای عظیم. تضاد همان لباس بود.',
  ),
  line(
    'He liked Wagner loud and late. The house had to listen.',
    'واگنر را بلند و دیر می‌خواست. خانه مجبور بود بشنود.',
  ),
  line(
    'He could wait years, then move in a week. Patience was a weapon, not a virtue.',
    'می‌توانست سال‌ها صبر کند، بعد در یک هفته حرکت کند. صبر اسلحه بود، نه فضیلت.',
  ),
  line(
    'He entered rooms last. The pause was part of the sentence.',
    'آخر از همه وارد اتاق می‌شد. مکث بخشی از جمله بود.',
  ),
  line(
    'He disliked debate. A speech is not a conversation.',
    'از مناظره خوشش نمی‌آمد. سخنرانی گفت‌وگو نیست.',
  ),
  line(
    'He used radio the way earlier tyrants used the square.',
    'از رادیو همان‌طور استفاده کرد که ستمگرهای قبلی از میدان.',
  ),
  line(
    'Film was a weapon. He sat through the rushes like a general.',
    'فیلم اسلحه بود. راش‌ها را مثل ژنرال می‌دید.',
  ),
  line(
    'He simplified every enemy into one face. Complexity was a liberal vice.',
    'هر دشمنی را به یک چهره ساده می‌کرد. پیچیدگی را عیب لیبرال‌ها می‌دانست.',
  ),
  line(
    'He promised bread, work, and pride. The invoice came later.',
    'نان و کار و غرور وعده داد. صورتحساب بعد آمد.',
  ),
  line(
    'He was legally appointed. That is the sentence that should keep you awake.',
    'قانونی منصوب شد. همین جمله باید بیدارت نگه دارد.',
  ),
  line(
    'He did not seize the state in one night. He was handed keys, then changed the locks.',
    'دولت را یک‌شبه نگرفت. کلید را دادند دستش، بعد قفل‌ها را عوض کرد.',
  ),
  line(
    'He made the lie feel like loyalty. That is harder to vote against.',
    'دروغ را شبیه وفاداری کرد. به آن سخت‌تر می‌شود رأی مخالف داد.',
  ),
  line(
    'He understood shame. He offered a story that turned shame into anger.',
    'شرم را می‌فهمید. قصه‌ای داد که شرم را تبدیل به خشم می‌کرد.',
  ),
  line(
    'He told each listener they were the injured party. Then he named the injurer.',
    'به هر شنونده گفت تو آسیب‌دیده‌ای. بعد مقصر را اسم آورد.',
  ),
  line(
    'He feared ridicule more than opposition. Laughter is hard to ban.',
    'از تمسخر بیشتر از مخالفت می‌ترسید. خنده را سخت می‌شود ممنوع کرد.',
  ),
  line(
    'He kept mistresses off the posters. The myth had to stay unmarried to the nation.',
    'معشوقه‌ها روی پوستر نبودند. افسانه باید مجرد می‌ماند برای ملت.',
  ),
  line(
    'Eva Braun lived in the wings. The crowd was the marriage.',
    'اوا براون پشت صحنه زندگی کرد. جمعیت همان ازدواج بود.',
  ),
  line(
    'He slept badly. The Reich was run on coffee, sweets, and insomnia.',
    'بد می‌خوابید. رایش با قهوه و شیرینی و بی‌خوابی می‌چرخید.',
  ),
  line(
    'He doodled buildings while generals asked for tanks.',
    'وقتی ژنرال‌ها تانک می‌خواستند، او ساختمان می‌کشید.',
  ),
  line(
    'He dreamed of boulevards and domes. Other people paid in cities that already existed.',
    'خیابان و گنبد خواب می‌دید. دیگران در شهرهایی که بود تاوان دادند.',
  ),
  line(
    'He believed coincidence was destiny when it favored him.',
    'اگر اتفاق به نفعش بود، اسمش را سرنوشت می‌گذاشت.',
  ),
  line(
    'He called retreat treason and weather an excuse.',
    'عقب‌نشینی را خیانت می‌نامید و هوا را بهانه.',
  ),
  line(
    'He promoted loyal men over competent ones. The war noticed.',
    'آدم‌های وفادار را به آدم‌های کاربلد ترجیح داد. جنگ فهمید.',
  ),
  line(
    'He spoke of Providence often. He meant his own luck, then his own will.',
    'زیاد از مشیت می‌گفت. منظورش اول شانس خودش بود، بعد ارادهٔ خودش.',
  ),
  line(
    'He was addicted to the sound of his own certainty.',
    'به صدای قطعیت خودش معتاد بود.',
  ),
  line(
    'He punished messengers. After a while the maps grew prettier and falser.',
    'قاصد را تنبیه می‌کرد. بعد از مدتی نقشه‌ها قشنگ‌تر شدند و دروغ‌تر.',
  ),
  line(
    'He could not admit a mistake, so the mistake had to become a plot.',
    'نمی‌توانست اشتباه را بپذیرد؛ پس اشتباه باید توطئه می‌شد.',
  ),
  line(
    'He turned neighbors into categories. After that, anything was permitted.',
    'همسایه را تبدیل به دسته کرد. از آن به بعد همه‌چیز مجاز شد.',
  ),
  line(
    'He made cruelty sound like hygiene.',
    'ظلم را شبیه بهداشت جلوه داد.',
  ),
  line(
    'He made obedience feel like belonging.',
    'اطاعت را شبیه تعلق خاطر کرد.',
  ),
  line(
    'He made belonging feel like a debt you could only pay in other people’s blood.',
    'تعلق را شبیه بدهی کرد که فقط با خون دیگران ادا می‌شد.',
  ),
  line(
    'He died in a bunker in April 1945. The voice stopped. The lesson did not.',
    'آوریل ۱۹۴۵ در یک پناهگاه مرد. صدا ایستاد. درس نه.',
  ),
  line(
    'He took poison and a bullet. Even the ending was staged.',
    'زهر خورد و گلوله. حتی پایان هم صحنه داشت.',
  ),
  line(
    'He wanted a funeral of myth. He got a rumor and a burned garden.',
    'تشییع اسطوره می‌خواست. شایعه گرفت و باغی سوخته.',
  ),
  line(
    'A small man from the provinces taught a continent how cheap a crowd can be.',
    'مرد کوچکی از شهرستان به یک قاره یاد داد جمعیت چقدر ارزان تمام می‌شود.',
  ),
  line(
    'He was not a genius of war. He was a genius of blame.',
    'نابغهٔ جنگ نبود. نابغهٔ مقصرتراشی بود.',
  ),
  line(
    'He was not inevitable. That is the only comforting sentence, and it is not very comforting.',
    'اجتناب‌ناپذیر نبود. تنها جملهٔ تسلی همین است، و خیلی هم تسلی نیست.',
  ),
  line(
    'He needed ordinary people to nod. The nodding is the part that still happens.',
    'به آدم‌های معمولی نیاز داشت که سر تکان بدهند. همان سر تکان دادن هنوز هست.',
  ),
  line(
    'He rose because enough people wanted a simple story more than a true one.',
    'بالا آمد چون به اندازهٔ کافی آدم قصهٔ ساده را بیشتر از قصهٔ راست می‌خواستند.',
  ),
  line(
    'He proved that a voice can outrun an army — until the army comes home.',
    'ثابت کرد صدا می‌تواند از ارتش جلو بزند — تا وقتی ارتش برگردد خانه.',
  ),
  line(
    'He left no dynasty. Only a warning, and people who refuse to read it.',
    'سلسله باقی نگذاشت. فقط یک هشدار، و آدم‌هایی که حاضر نیستند بخوانندش.',
  ),
  line(
    'The last trick was to make you think it could never happen at your table.',
    'آخرین حقه این بود که فکر کنی سر میز تو هیچ‌وقت اتفاق نمی‌افتد.',
  ),
];
