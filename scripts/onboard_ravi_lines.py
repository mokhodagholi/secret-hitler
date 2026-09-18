"""Onboarding guide lines for Sahar (ElevenLabs). Table talk is not here.

Spoken text matches the fa subtitle (`onboard.*` in locales). Intro speaks
the body key, not the title — do not prefix titles here.
"""

from __future__ import annotations

# id → spoken Persian. Same sentence the header types.
ONBOARD_LINES: dict[str, str] = {
    "onboard.piece.welcome": (
        "قبل از اینکه بریم توی بازی واقعی، یه بازی شبیه‌سازی‌شده رو می‌بینیم. "
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
    "onboard.piece.trackerFail1": (
        "دولت که رأی نیاره، شمارنده از چپ شروع می‌کنه پر شدن."
    ),
    "onboard.piece.trackerFail2": "بار دوم هم رأی نیاره، یه خونهٔ دیگه می‌ره جلو.",
    "onboard.piece.trackerChaos": (
        "سه دولت پشت سر هم رأی نیاره، قانون بالای دسته تصویب می‌شه "
        "و رئیس‌جمهور می‌ره نفر بعدی."
    ),
    "onboard.piece.deck": (
        "قانون‌ها از دسته انتخاب می‌شن. اونایی که می‌سوزن می‌رن تو سوخته‌ها."
    ),
    "onboard.piece.laws": "کلاً دو تا قانون داریم: لیبرالی و فاشیستی.",
    "onboard.piece.check": "خب حالا قطعه‌های بازی رو متوجه شدید؟ بریم بازی رو ببینیم؟",
    "onboard.piece.checkReassure": "مشکلی نیست. دوباره با هم مرور می‌کنیم.",
    "onboard.idea.welcome": (
        "وارد بازی شدیم. آره، همه‌چی که تا الان دیدیم اینجا استفاده می‌شه."
    ),
    "onboard.idea.people": "اینا آدمای بازی‌ان. دو دسته تو بازی هست: فاشیست و لیبرال.",
    "onboard.idea.boards": "قانون‌ها که تصویب می‌شن، می‌ذاریم رو تخته‌شون.",
    "onboard.idea.thisPresident": "ایشون رئیس‌جمهوره.",
    "onboard.idea.thisPresidentLaws": "سه تا قانون از بالا برمی‌داره.",
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
        "باید یکی رو صدراعظم کنید. اگه نکنید نوبتتون می‌سوزه و رئیس‌جمهور می‌ره نفر بعدی."
    ),
    "onboard.openNominate": "همین دکمه رو بزنید تا صدراعظم رو انتخاب کنید.",
    "onboard.openNominateTap": "بزنید روش.",
    "onboard.pick": (
        "دست اول چیزی معلوم نیست. معمولاً نفر بعدی رو می‌ذارن تا بازی راه بیفته."
    ),
    "onboard.pickNima": "الان نیما رو بذارید صدراعظم.",
    "onboard.pickRetry": "این یکی رو برای این دست نه. یکی دیگه.",
    "onboard.vote": (
        "دولت پیشنهاده — شما رئیس‌جمهورید، [short pause] نیما صدراعظم. "
        "باید اکثریت آره بدن تا بشینن. [emphasized] الان آره بزنید!"
    ),
    "onboard.voteRetry": "نه رو برای این دست نزنید. آره بزنید.",
    "onboard.draw": "حالا یکی رو بسوزونید. دوتا می‌ره دست صدراعظم؛ یکی‌ش می‌شینه رو تخته.",
    "onboard.secretEnact": "چی اومده و چی می‌ذاره رو فقط صدراعظم می‌بینه.",
    "onboard.comingSoon": "بقیه‌ش به‌زودی می‌آد سر میز.",
    "onboard.settings.name": "اسمی که سر میز می‌بینن همینه. از اینجا عوضش می‌کنید.",
    "onboard.settings.card": "عکسی که بقیه می‌بینن اینه. از اینجا عوضش می‌کنید.",
    "onboard.settings.music": (
        "موسیقی که تو بازی پخش می‌شه. اگه نمی‌خواید پخش بشه، اینو خاموش کنید."
    ),
    "onboard.settings.sound": (
        "صدای اتفاق‌هایی که سر میز می‌افته. اگه نمی‌خواید، اینو خاموش کنید."
    ),
    "onboard.settings.ravi": (
        "اگه صدای [short pause] راوی تو بازی نمی‌خواید، اینو خاموش کنید."
    ),
    "onboard.settings.table": (
        "صدای بقیه [short pause] سر میز. اگه نمی‌خواید بشنوید، اینو خاموش کنید."
    ),
    "onboard.settings.who": "توی بازی کی اتفاقات رو توضیح می‌ده. الان دانیاله.",
    "onboard.settings.motion": (
        "اگه احساس کردید بازی براتون کند هست، اینو خاموش کنید."
    ),
    "onboard.settings.briefing": "چی به بازی اضافه شده. اینجا می‌تونید ببینید.",
    "onboard.settings.support": "حرفی دارید یا چیزی خرابه — از این طریق بگید.",
    "onboard.settings.done": (
        "خب تموم شد. اگه خواستید دوباره بیایید [short pause] اینجا، "
        "کافیه تنظیمات رو باز کنید."
    ),
    "onboard.history.chip": "همه بازی‌هایی که تا الان کردید جزئیاتش اینجاست. بزنید روش.",
    "onboard.history.list": (
        "اینا میزهایی‌ان که تا حالا بازی کردید. اگه هنوز بازی نکرده باشید خالیه."
    ),
    "onboard.history.outcome": "بالاش می‌گه کی برد — لیبرال‌ها یا فاشیست‌ها.",
    "onboard.history.yours": "پایین‌تر مال شماست: بردید یا باختید، و کی تموم شد.",
    "onboard.history.people": "اینا به ترتیب صندلی همونایی‌ان که باهاشون بازی کردید.",
    "onboard.history.you": "این شمایید.",
    "onboard.history.roles": (
        "بعد بازی [short pause] نقش‌ها معلومه. "
        "هر کی نقشش چی بوده، [short pause] اینجاست."
    ),
    "onboard.history.add": (
        "از همین‌جا می‌تونید باهاشون دوست شید. [short pause] روی دوست بزنید."
    ),
    "onboard.history.sent": "و الان می‌گه درخواست دوستی فرستاده شد.",
    "onboard.history.ties": "فرستاده شد، دوستید، درخواست اومده — هر سه‌ش همین‌جاست.",
    "onboard.history.close": "از همین‌جا می‌تونید ببندیدش. ضربدر رو بزنید.",
    "onboard.history.loss": "فرض کنید یه دست دیگه هم زدید و باختید. بزنید روش.",
    "onboard.history.lossCard": "این یکی می‌آد زیرش.",
    "onboard.history.done": "هر موقع خواستید می‌تونید تاریخچه رو باز کنید.",
}

# Eleven v3 audio tags. One tag per line. Host lesson — not theatre.
# Prefer: warmly, calm, gently, thoughtful, curious, encouraging,
# announcing, disappointed, whispering. Skip laughs / shouts / SFX.
ONBOARD_DIRECTION: dict[str, str] = {
    # Intro pieces
    "onboard.piece.welcome": "[warmly]",
    "onboard.piece.roles": "[playful]",
    "onboard.piece.boards": "[calm]",
    "onboard.piece.offices": "[calm]",
    "onboard.piece.vote": "[firm]",
    "onboard.piece.tracker": "[thoughtful]",
    "onboard.piece.trackerFail1": "[disappointed]",
    "onboard.piece.trackerFail2": "[disappointed]",
    "onboard.piece.trackerChaos": "[grave]",
    "onboard.piece.deck": "[calm]",
    "onboard.piece.laws": "[thoughtful]",
    "onboard.piece.check": "[curious]",
    "onboard.piece.checkReassure": "[gently]",
    # Look / idea table
    "onboard.idea.welcome": "[warmly]",
    "onboard.idea.people": "[calm]",
    "onboard.idea.boards": "[calm]",
    "onboard.idea.thisPresident": "[announcing]",
    "onboard.idea.thisPresidentLaws": "[thoughtful]",
    "onboard.idea.talk": "[calm]",
    "onboard.idea.settings": "[encouraging]",
    "onboard.idea.homeSettings": "[encouraging]",
    "onboard.idea.settingsMenu": "[calm]",
    "onboard.idea.messages": "[calm]",
    "onboard.idea.writeHere": "[encouraging]",
    "onboard.idea.whereWereWe": "[curious]",
    "onboard.idea.campaign": "[thoughtful]",
    "onboard.idea.talkAbout": "[curious]",
    "onboard.idea.yourTurn": "[encouraging]",
    "onboard.idea.youChancellor": "[announcing]",
    "onboard.idea.chancellorDoes": "[thoughtful]",
    "onboard.idea.onlyPresidentSees": "[whispering]",
    "onboard.idea.presidentBurns": "[calm]",
    "onboard.idea.youPickLaw": "[encouraging]",
    "onboard.idea.seeNext": "[warmly]",
    # Scripted five-seat hand
    "onboard.letsSit": "[warmly]",
    "onboard.youPresident": "[announcing]",
    "onboard.mustNominate": "[firm]",
    "onboard.openNominate": "[encouraging]",
    "onboard.openNominateTap": "[encouraging]",
    "onboard.pick": "[thoughtful]",
    "onboard.pickNima": "[encouraging]",
    "onboard.pickRetry": "[disappointed]",
    "onboard.vote": "[firm]",
    "onboard.voteRetry": "[disappointed]",
    "onboard.draw": "[whispering]",
    "onboard.secretEnact": "[whispering]",
    "onboard.comingSoon": "[warmly]",
    # Home settings lesson
    "onboard.settings.name": "[gently]",
    "onboard.settings.card": "[gently]",
    "onboard.settings.music": "[calm]",
    "onboard.settings.sound": "[calm]",
    "onboard.settings.ravi": "[calm]",
    "onboard.settings.table": "[calm]",
    "onboard.settings.who": "[curious]",
    "onboard.settings.motion": "[calm]",
    "onboard.settings.briefing": "[calm]",
    "onboard.settings.support": "[gently]",
    "onboard.settings.done": "[warmly]",
    # History lesson
    "onboard.history.chip": "[encouraging]",
    "onboard.history.list": "[calm]",
    "onboard.history.outcome": "[thoughtful]",
    "onboard.history.yours": "[calm]",
    "onboard.history.people": "[calm]",
    "onboard.history.you": "[warmly]",
    "onboard.history.roles": "[thoughtful]",
    "onboard.history.add": "[encouraging]",
    "onboard.history.sent": "[happy]",
    "onboard.history.ties": "[calm]",
    "onboard.history.close": "[encouraging]",
    "onboard.history.loss": "[curious]",
    "onboard.history.lossCard": "[calm]",
    "onboard.history.done": "[warmly]",
}
