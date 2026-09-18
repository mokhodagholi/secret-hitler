"""Onboarding guide lines for Sarah (ElevenLabs). Table talk is not here.

Spoken text matches the fa subtitle (`onboard.*` in locales). Intro speaks
the body key, not the title — do not prefix titles here.
"""

from __future__ import annotations

# id → spoken Persian. Same sentence the header types.
ONBOARD_LINES: dict[str, str] = {
    "onboard.piece.welcome": (
        "قبل از میز واقعی، با هم یه دور می‌ریم رو تخته. "
        "حدود دو دقیقه طول می‌کشه — هر وقت خواستید بگذرید."
    ),
    "onboard.piece.roles": "لیبرال، فاشیست، و هیتلر.",
    "onboard.piece.boards": "آبی مال لیبرال‌هاست، قرمز مال فاشیست‌ها.",
    "onboard.piece.offices": "دو مقامی که دولت رو می‌سازن.",
    "onboard.piece.vote": "هر دور همه باید رأی بدن.",
    "onboard.piece.tracker": (
        "اینجا شکست دولت‌ها رو می‌شمره. "
        "سه بار پشت هم که پر بشه، قانون بالای دسته می‌ره رو تخته — بدون دولت."
    ),
    "onboard.piece.trackerFail1": "دولت رأی نیاورد. شمارنده از چپ یکی پر می‌شه.",
    "onboard.piece.trackerFail2": "باز هم خوابید. خونهٔ دوم هم پر شد.",
    "onboard.piece.trackerChaos": (
        "سه‌بار پشت هم که بخوابه، قانون بالای دسته خودش می‌ره رو تخته — بدون دولت."
    ),
    "onboard.piece.deck": "قانون‌های تازه از دسته میان؛ اونی که می‌سوزه می‌ره رو تودهٔ سوخته‌ها.",
    "onboard.piece.laws": (
        "لیبرال یا فاشیست. اینا می‌رن رو تخته؛ "
        "چند تا از یک رنگ که جمع بشه، همون تیم می‌بره."
    ),
    "onboard.piece.check": "قطعه‌های بازی رو دیدید. اوکی‌اید بریم سر میز؟",
    "onboard.piece.checkReassure": "مشکلی نیست. دوباره با هم مرور می‌کنیم.",
    "onboard.idea.welcome": (
        "وارد بازی شدیم. درسته، همه‌چی که تا الان دیدیم اینجا استفاده می‌شه."
    ),
    "onboard.idea.people": "اینا آدمای بازی‌ان. دو دسته تو بازی هست: فاشیست و لیبرال.",
    "onboard.idea.boards": "اینا هم تخته‌های بازی‌ان. قانون‌ها روشون می‌شینه.",
    "onboard.idea.thisPresident": "این یکی رئیس‌جمهوره. هر دست صدراعظم رو همین انتخاب می‌کنه.",
    "onboard.idea.thisPresidentLaws": (
        "اگه دولت رأی بیاره، سه تا قانون از دسته می‌کشه. "
        "یکی رو می‌سوزونه، دوتا رو می‌ده به صدراعظم."
    ),
    "onboard.idea.talk": "آدما با هم حرف می‌زنن — هم با پیام، هم با میکروفون.",
    "onboard.idea.settings": "صدا، نقش‌تون، قوانین — همه‌ش پشت این دکمه‌ست. بزنید روش.",
    "onboard.idea.homeSettings": "اسم، عکس، صدا — از این دکمه عوض می‌شن. بزنید روش.",
    "onboard.idea.settingsMenu": (
        "از اینجا می‌تونید صدا رو قطع کنید، نقش‌تون رو ببینید، یا از میز برید بیرون."
    ),
    "onboard.idea.messages": "پیام‌ها همین‌جا می‌آد.",
    "onboard.idea.writeHere": (
        "هر چی اینجا بنویسید می‌ره تو چت و بقیه می‌بینن. "
        "الان یه چیزی بنویسید، بعد دکمهٔ فرستادن رو بزنید."
    ),
    "onboard.idea.whereWereWe": "خب کجا بودیم؟",
    "onboard.idea.campaign": (
        "اها داشتم می‌گفتم درسته که رئیس‌جمهور صدراعظم رو انتخاب می‌کنه، "
        "ولی این همه هستن که رأی می‌دن کدوم دولت تشکیل شه."
    ),
    "onboard.idea.talkAbout": "با هم ببینیم سر میز چی می‌گن.",
    "onboard.idea.yourTurn": "شما هم حرف بزنید. یه چیزی که بقیه بهش رأی آره بدن.",
    "onboard.idea.youChancellor": "الان شما صدراعظم این دستید.",
    "onboard.idea.chancellorDoes": (
        "صدراعظم دو تا قانون می‌گیره و یکی رو می‌ذاره رو تخته — لیبرال یا فاشیست."
    ),
    "onboard.idea.onlyPresidentSees": "این سه تا فقط دست رئیس‌جمهوره. شما نمی‌بینید چی اومده.",
    "onboard.idea.presidentBurns": "یکی رو سوزوند. دوتا می‌آد دست شما.",
    "onboard.idea.youPickLaw": "الان نوبت شماست. یکی رو بذارید رو تخته.",
    "onboard.idea.seeNext": "بریم ببینیم تو یه بازی ۵ نفره چه اتفاقاتی می‌افته.",
    "onboard.letsSit": "بریم سر میز.",
    "onboard.youPresident": "شما رئیس‌جمهورید. ببینید سر میز چی می‌شه.",
    "onboard.mustNominate": (
        "باید یکی رو صدراعظم بذارید. اگه نذارید نوبتتون می‌سوزه و رئیس‌جمهور می‌ره نفر بعدی."
    ),
    "onboard.openNominate": "همین دکمه رو بزنید تا صدراعظم رو انتخاب کنید.",
    "onboard.openNominateTap": "بزنید روش.",
    "onboard.pick": (
        "دست اول چیزی معلوم نیست. معمولاً نفر بعدی رو می‌ذارن تا بازی راه بیفته."
    ),
    "onboard.pickNima": "الان نیما رو بذارید صدراعظم.",
    "onboard.pickRetry": "این یکی رو برای این دست نه. یکی دیگه.",
    "onboard.vote": (
        "دولت پیشنهاده — شما رئیس‌جمهورید، نیما صدراعظم. "
        "باید اکثریت آره بدن تا بشینن. الان آره بزنید."
    ),
    "onboard.voteRetry": "نه رو برای این دست نزنید. آره بزنید.",
    "onboard.draw": "حالا یکی رو بسوزونید. دوتا می‌ره دست صدراعظم؛ یکی‌ش می‌شینه رو تخته.",
    "onboard.secretEnact": "چی اومده و چی می‌ذاره رو فقط صدراعظم می‌بینه.",
    "onboard.comingSoon": "بقیه‌ش به‌زودی می‌آد سر میز.",
    "onboard.settings.name": "اسمی که سر میز می‌بینن همینه. از اینجا عوضش می‌کنید.",
    "onboard.settings.card": "عکس صندلی‌تون اینه. از اینجا عوضش می‌کنید.",
    "onboard.settings.music": "موسیقی زیر میز. اگه نمی‌خواید پخش بشه، اینو خاموش کنید.",
    "onboard.settings.sound": "صداهای اتفاق‌هایی که سر میز می‌افته. اگه نمی‌خواید، اینو خاموش کنید.",
    "onboard.settings.ravi": "اگه صدای راوی تو بازی نمی‌خواید، اینو خاموش کنید.",
    "onboard.settings.table": "صدای بقیه سر میز. اگه نمی‌خواید بشنوید، اینو خاموش کنید.",
    "onboard.settings.who": "کی داره باهاتون حرف می‌زنه. الان دانیاله.",
    "onboard.settings.motion": "اگه احساس کردید بازی براتون لگ داره، اینو خاموش کنید.",
    "onboard.settings.briefing": "چی به بازی اضافه شده. هر وقت خواستید باز کنید.",
    "onboard.settings.support": "حرفی دارید یا چیزی خرابه — از اینجا بنویسید.",
    "onboard.settings.done": "تموم. از خونه هر وقت خواستید تنظیمات رو باز کنید.",
    "onboard.history.chip": "همه بازی‌هایی که تا الان کردید جزئیاتش اینجاست. بزنید روش.",
    "onboard.history.list": (
        "اینا میزهایی‌ان که تا حالا بازی کردید. اگه هنوز بازی نکرده باشید خالیه."
    ),
    "onboard.history.outcome": "بالاش می‌گه کی برد — لیبرال‌ها یا فاشیست‌ها.",
    "onboard.history.yours": "پایین‌تر مال شماست: بردید یا باختید، و کی تموم شد.",
    "onboard.history.people": "اینا به ترتیب صندلی همونایی‌ان که باهاشون بازی کردید.",
    "onboard.history.you": "این شمایید.",
    "onboard.history.roles": "بعد بازی نقش‌ها معلومه. هر کی نقشش چی بوده، اینجاست.",
    "onboard.history.add": "از همین‌جا می‌تونید باهاشون دوست شید. روی دوست بزنید.",
    "onboard.history.sent": "و الان می‌گه درخواست دوستی فرستاده شد.",
    "onboard.history.ties": "فرستاده شد، دوستید، درخواست اومده — هر سه‌ش همین‌جاست.",
    "onboard.history.close": "از همین‌جا می‌بندیدش. ضربدر رو بزنید.",
    "onboard.history.loss": "فرض کنید یه دست دیگه هم زدید و باختید. بزنید روش.",
    "onboard.history.lossCard": "این یکی می‌آد زیرش.",
    "onboard.history.done": "تموم. از خونه هر وقت خواستید تاریخچه رو باز کنید.",
}

ONBOARD_DIRECTION: dict[str, str] = {
    "onboard.piece.welcome": "[warmly]",
    "onboard.piece.check": "[calm]",
    "onboard.piece.checkReassure": "[calm]",
    "onboard.idea.welcome": "[warmly]",
    "onboard.idea.youChancellor": "[announcing]",
    "onboard.idea.seeNext": "[warmly]",
    "onboard.idea.talkAbout": "[calm]",
    "onboard.letsSit": "[warmly]",
    "onboard.pickRetry": "[disappointed]",
    "onboard.voteRetry": "[disappointed]",
    "onboard.draw": "[whispering]",
    "onboard.secretEnact": "[whispering]",
    "onboard.comingSoon": "[warmly]",
    "onboard.settings.done": "[warmly]",
    "onboard.history.done": "[warmly]",
}
