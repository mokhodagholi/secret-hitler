# Asset brief — cards, tokens, and table art

Images to generate for the game-page redesign. **Do not bake text into
the art.** We overlay Persian / English in the client so one set of
files serves both locales. If a model still writes letters, regenerate.

**Models:** ChatGPT (DALL·E / GPT-Image) and Gemini both work. Generate
at **2048 px on the long side**. We will crop.

**How to use the tables below**

1. Find the **File** row you want.
2. Copy **only** that prompt. Paste it as-is. It is complete.
3. Do **not** paste a style bible on top. Do **not** attach another
   role portrait as a *face* reference — that clones the person.
4. Each row is a **different person or emblem**. If two results look
   related, discard one.

**Locked look — بافت و رنگ (paper, not the person)**

The Liberal portrait you liked is the master for *material only*:

- Cream-beige stained cardstock, deckled / frayed edges
- Oil-on-canvas painting with visible canvas tooth and thick brushstrokes
- Grainy aged-paper overlay (slightly muted, never neon, never glossy)
- Double gold frame with **ornate gold leaf / floral flourishes** in
  the four corners (not tiny dots)
- Empty cream caption box at the bottom ~18%
- Warm antique gold + cream paper on every card; scene colors change
  (dawn blue vs night burgundy) but the **paper stays cream**

You may attach that Liberal image **only** with this sentence:

```
Match ONLY the paper texture, canvas grain, gold floral corners, and
cream caption box. Invent a completely different face, clothes, and
scene. Do not copy the man.
```

**Output sizes we will use**

| Kind | Ratio | Safe content |
|---|---|---|
| Role / party / vote / policy card | 2:3 portrait | Keep faces and seals out of the bottom 18% (caption bar). |
| Policy tile (board well crop) | same 2:3 file | We crop the centre for the well; do not generate a second landscape size. |
| Card back | 2:3 portrait | Full-bleed pattern, centred emblem. |
| Power seal | 1:1 circle | Transparent-looking disc on dark; we will cut a circle. |
| Tracker pawn | 1:1 | Object on transparent-ish dark, we will cut out. |
| Placard | 3:1 landscape | Empty centre for the office title. |
| Ravi cameo | 1:1 circle | Head and shoulders, dark rim we can mask. |

---

## 1. Card backs

Policy / role / draw piles use the navy-gold eagle (`card-back.png`).
Vote ballots use a separate landscape back (`votes/back.webp`) so a
face-down Ja/Nein never looks like a leftover law.

### Policy back (1 file)

One back, reused for roles and the draw / discard piles. It
must still read at **~28×38 px** (the deck strip). Tiny banknote
filigree turns to brown mush at that size — so the ornament has to be
**big**: a fat gold frame, four corner medallions, one large centre
seal. It should look like a real tabletop component, not a poster logo
on empty navy.

**Filename:** `card-back.png`  
**Ratio:** 2:3 portrait, rounded playing-card corners, **flat fill the
frame** (no table, no drop shadow around the card, no 3D standing card).

**Palette:** deep navy `#0a2344`, orange-gold `#f5852a`, cream `#f3e7c9`.

**If ChatGPT already said “unsafe” in this chat, open a brand-new
chat.** Paste **only** the block — not this heading, not the game name.

| File | Paste this entire prompt |
|---|---|
| `card-back.png` | see block below |

```
Luxury tabletop board-game card BACK, portrait 2:3, filling the whole
image. Flat scan of a physical playing card. Rounded card corners.
No table, no hands, no room, no 3D standing card.

This is a premium European board-game component: layered print on thick
navy cardstock, cream ink, orange-gold foil stamp. Ornate and game-like,
like a collectible card reverse with a centre seal and corner pips.

Build these LARGE layers (readable when the image is the size of a
postage stamp):

1. Thin cream outer edge all the way around.
2. A thick orange-gold inner frame, then a second thin cream line
   inside it, so the border looks stamped and expensive.
3. In each of the four corners, a large gold Art Deco fan medallion /
   scallop, filling the corner — like the pip corners on a playing card.
4. Deep navy field.
5. Centre: a LARGE gold oval cartouche (classic playing-card back oval),
   about one-third of the card height. Inside the oval: a cream wax-seal
   circle. On the seal: a gold sun with 8 thick rays, wrapped in a simple
   gold laurel wreath. No face on the sun. No birds.
6. Between the oval and the corners: four large gold diamond tiles /
   chevrons only. Coarse decoration. Not a tiny repeating pattern, not
   micro-lines, not lace.

Slight paper grain. A little gold-foil shine on the wreath and the
frame only. Graphic print, rich ornament, high contrast. Not a painting
of a room. Not a photo.

No text. No numbers. No people. No animals.
```

If that comes back too empty, add this line at the end and retry in
the **same new chat**:

```
more ornament, bigger centre oval, bigger corner fans, gold foil stamp,
still only large shapes
```

**Reject and retry when:** the centre seal is tiny; the field is beige
or red; there is writing; there is a table around the card; the pattern
is a fine scribble. Shrink the PNG to a 30 px thumbnail — if you cannot
still see “navy + gold oval,” it will fail on the table.

---

## 2. Secret role cards (9 different people)

Shown only to you, for ~12 s, then tucked away. **Nine separate
prompts, nine separate faces.** Do not attach any other portrait as a
face. You may attach the Liberal card you liked for **paper only**.

Never use the words fascist, Hitler, Nazi, skull, peaked cap, or
uniform. Never draw a real historical figure. **No smoke on character
cards** — no cigarette, pipe, cigar, factory smoke, fireplace smoke,
or fog around the person.

Quick map (so you do not mix rows):

| File | Who must be on the card |
|---|---|
| `role-liberal-1.png` | Young man, round face, dawn, dove |
| `role-liberal-2.png` | Woman journalist, bob, rain window, typewriter |
| `role-liberal-3.png` | Elderly scholar, white beard, gold glasses, library |
| `role-fascist-1.png` | Thin cabinet minister, receding hair, red lamp |
| `role-fascist-2.png` | Woman at a night salon, bun, green baize table |
| `role-fascist-3.png` | Heavy factory boss, moustache, light from below |
| `role-hitler-1.png` | Orator, face lost in spotlight, lectern |
| `role-hitler-2.png` | Seen from behind on a balcony, no face |
| `role-hitler-3.png` | Extreme crop: mouth, chin, gloved hand, no eyes |

Each row below is one complete prompt. Copy the fence under the filename.

**`role-liberal-1.png`**

```
Board-game character card, portrait 2:3. LOCKED PAPER — same بافت و رنگ
on every role card: 1930s oil painting on canvas, mounted on thick
cream-beige stained cardstock. Visible canvas tooth, thick painterly
brushstrokes, grainy aged overlay, deckled frayed edges. Double gold
frame with ornate gold leaf / floral flourishes in all four corners
(not tiny dots). Empty cream caption rectangle at the bottom 18 percent.
Colors rich but slightly muted; never neon, never photoreal, never
glossy digital. No letters, no numbers, no logos, no watermarks.

A YOUNG man about 26, ROUND baby face, full cheeks, small nose, light
sandy-brown hair combed with a side part, clean-shaven, blue eyes, looking
straight at the viewer with a calm open expression, not smiling cheesy.
Modest pale-grey flannel suit, sky-blue tie, a small blue enamel
forget-me-not on the lapel. Behind him a pale DAWN sky, peach and navy,
one white dove flying in the upper right. Hopeful navy-and-sky-blue
palette. Invented face, not a celebrity, not photoreal. No smoke, no
cigarettes, no pipes, no fog.

This person is unique: round youthful face. Do not draw an older man,
do not draw a woman, do not draw glasses, do not draw a beard.
```

**`role-liberal-2.png`**

```
Board-game character card, portrait 2:3. LOCKED PAPER — same بافت و رنگ
on every role card: 1930s oil painting on canvas, mounted on thick
cream-beige stained cardstock. Visible canvas tooth, thick painterly
brushstrokes, grainy aged overlay, deckled frayed edges. Double gold
frame with ornate gold leaf / floral flourishes in all four corners
(not tiny dots). Empty cream caption rectangle at the bottom 18 percent.
Colors rich but slightly muted; never neon, never photoreal, never
glossy digital. No letters, no numbers, no logos, no watermarks.

A WOMAN about 44, LONG angular face, high cheekbones, dark auburn bob
cut with a grey streak at the temple, round wire spectacles, olive skin,
looking THREE-QUARTER LEFT (not at the camera). Navy wool coat, cream
high-collar blouse, no jewellery except a small silver watch. She sits
at a black typewriter beside a RAIN-STREAKED window; cool grey-blue
daylight, wet cobblestone suggested outside. Palette steel blue, ivory,
walnut. Invented face, not a celebrity, not photoreal. No smoke, no
cigarettes, no pipes, no fog.

This person is unique: woman, glasses, bob, rain window, typewriter.
Do not draw a young man. Do not draw a dove. Do not draw dawn sky.
```

**`role-liberal-3.png`**

```
Board-game character card, portrait 2:3. LOCKED PAPER — same بافت و رنگ
on every role card: 1930s oil painting on canvas, mounted on thick
cream-beige stained cardstock. Visible canvas tooth, thick painterly
brushstrokes, grainy aged overlay, deckled frayed edges. Double gold
frame with ornate gold leaf / floral flourishes in all four corners
(not tiny dots). Empty cream caption rectangle at the bottom 18 percent.
Colors rich but slightly muted; never neon, never photoreal, never
glossy digital. No letters, no numbers, no logos, no watermarks.

An ELDERLY man about 68, NARROW long face, deep nasolabial folds, a
short WHITE trimmed beard and white hair, round gold spectacles, looking
slightly DOWN at a law book then toward the viewer. Warm brown TWEED
jacket with leather elbow patches, forest-green waistcoat, no flower on
the lapel. Behind him a sunlit LAW LIBRARY: tall walnut shelves, morning
gold light from the RIGHT side only. Palette walnut, antique gold, cream,
soft moss. Invented face, not a celebrity, not photoreal. No smoke, no
cigarettes, no pipes, no fog.

This person is unique: old bearded scholar in a library. Do not draw a
young man, do not draw a woman, do not draw a dove, do not draw night.
```

**`role-fascist-1.png`** — do not put “fascist” in the prompt; this is the block

```
Board-game character card, portrait 2:3, night cabinet office. LOCKED
PAPER — same بافت و رنگ as the cream Liberal portrait card, not a
different print process: 1930s oil on canvas on thick cream-beige
stained cardstock, canvas tooth, thick brushstrokes, grainy aged overlay,
deckled edges. Double gold frame with ornate gold leaf / floral
flourishes in all four corners. Empty cream caption rectangle at the
bottom 18 percent. The PAINTING inside is night-dark (charcoal,
burgundy) but the CARD PAPER around it stays cream-beige. Colors rich
but muted; never neon, never photoreal, never glossy. No letters, no
numbers, no logos, no watermarks.

A THIN man about 51, GAUNT hollow cheeks, receding dark hair with grey
at the temples, heavy straight brows, NO glasses, NO beard, NO moustache.
Civilian clothes only: charcoal three-piece suit, dark wool overcoat
still on his shoulders, white shirt, dark tie. No uniform, no cap, no
medals, no armbands, no flags. He sits behind a walnut desk, hands
clasped on papers. Face half-lit by a RED DESK LAMP on the left, the
other half in shadow. Indoor NIGHT: heavy burgundy drapes, a cold dark
fireplace with no fire and no smoke on the far right. Palette charcoal,
burgundy, antique gold. Invented face, not a celebrity, not photoreal,
not horror, not a mugshot. No smoke, no cigarettes, no pipes, no fog.

This person is unique: thin gaunt night minister, red lamp. Do not draw
a woman. Do not draw a round youthful face. Do not draw a dove or dawn.
```

**`role-fascist-2.png`**

```
Board-game character card, portrait 2:3, night salon. LOCKED PAPER —
same بافت و رنگ as the cream Liberal portrait card: 1930s oil on canvas
on thick cream-beige stained cardstock, canvas tooth, thick brushstrokes,
grainy aged overlay, deckled edges. Double gold frame with ornate gold
leaf / floral flourishes in all four corners. Empty cream caption
rectangle at the bottom 18 percent. The PAINTING inside is night-dark
but the CARD PAPER stays cream-beige. Colors rich but muted; never neon,
never photoreal, never glossy. No letters, no numbers, no logos, no
watermarks.

A WOMAN about 36, SHARP triangular face, very pale skin, black hair in a
TIGHT HIGH BUN, no glasses, a beauty mark on the left cheek. She looks
BACK OVER HER RIGHT SHOULDER at the viewer. Wine-dark velvet dress under
a black wool evening jacket, empty right hand (no cigarette, no holder,
no glass). GREEN BAIZE card table in front of her with a few face-down
playing cards (no readable pips). Warm chandelier light from ABOVE,
deep shadows. Indoor night salon, burgundy wallpaper, no windows. No
uniform, no cap, no medals, no armbands, no flags. Palette emerald,
burgundy, ivory, charcoal. Invented face, not a celebrity, not photoreal.
No smoke, no cigarettes, no pipes, no fog.

This person is unique: woman with bun, salon, green baize, looking over
her shoulder. Do not draw a man at a desk. Do not draw a red lamp.
```

**`role-fascist-3.png`**

```
Board-game character card, portrait 2:3, factory office at night. LOCKED
PAPER — same بافت و رنگ as the cream Liberal portrait card: 1930s oil on
canvas on thick cream-beige stained cardstock, canvas tooth, thick
brushstrokes, grainy aged overlay, deckled edges. Double gold frame with
ornate gold leaf / floral flourishes in all four corners. Empty cream
caption rectangle at the bottom 18 percent. The PAINTING inside is
rust-and-iron dark but the CARD PAPER stays cream-beige. Colors rich but
muted; never neon, never photoreal, never glossy. No letters, no
numbers, no logos, no watermarks.

A HEAVY-SET man about 57, ROUND wide face, thick neck, BALDING with grey
hair only on the sides, a dense IRON-GREY MOUSTACHE, small dark eyes.
Civilian clothes only: brown worsted waistcoat, shirtsleeves rolled,
braces, no jacket, no uniform, no cap, no medals, no armbands, no flags.
He leans both fists on a STEEL industrial desk. LIGHT FROM BELOW: an
amber oil lantern on the desk throwing an unflattering up-light. Behind
him a CLEAN factory window at NIGHT, orange furnace glow through clear
glass, no smoke, no haze. Palette rust, iron, amber, walnut. Invented
face, not a celebrity, not photoreal, not horror. No smoke, no
cigarettes, no pipes, no fog.

This person is unique: balding moustached factory boss, up-lighting.
Do not draw a thin minister. Do not draw a woman. Do not draw a library.
```

**`role-hitler-1.png`** — never name a real leader; this is the block

```
Board-game character card, portrait 2:3, public hall. LOCKED PAPER —
same بافت و رنگ as the cream Liberal portrait card: 1930s oil on canvas
on thick cream-beige stained cardstock, canvas tooth, thick brushstrokes,
grainy aged overlay, deckled edges. Double gold frame with ornate gold
leaf / floral flourishes in all four corners. Empty cream caption
rectangle at the bottom 18 percent. The PAINTING inside is charcoal and
gold but the CARD PAPER stays cream-beige. Colors rich but muted; never
neon, never photoreal, never glossy. No letters, no numbers.

Do not draw any real historical figure. Invented person only. A 1930s
orator seen from a LOW ANGLE. The FACE is mostly LOST in a hard white
spotlight — no readable likeness, no eyes, no moustache visible, just
the suggestion of a jaw in glare. Dark overcoat, empty gloved hand on a
wooden lectern. Behind him a crowd as abstract gold dashes, not people
with faces. Charcoal, gold, burgundy. No uniform, no cap, no medals, no
flags, no armbands, no symbols. Not photoreal, not a celebrity. No
smoke, no cigarettes, no pipes, no fog.

This card is unique: low-angle spotlight orator, face unreadable. Do not
draw a clear portrait. Do not draw a desk. Do not draw a woman.
```

**`role-hitler-2.png`**

```
Board-game character card, portrait 2:3, civic balcony at dusk. LOCKED
PAPER — same بافت و رنگ as the cream Liberal portrait card: 1930s oil on
canvas on thick cream-beige stained cardstock, canvas tooth, thick
brushstrokes, grainy aged overlay, deckled edges. Double gold frame with
ornate gold leaf / floral flourishes in all four corners. Empty cream
caption rectangle at the bottom 18 percent. The PAINTING inside is dusk
purple and charcoal but the CARD PAPER stays cream-beige. Colors rich
but muted; never neon, never photoreal, never glossy. No letters, no
numbers.

Do not draw any real historical figure. The figure is seen FROM BEHIND,
standing on a stone balcony. We see only the back of a dark overcoat,
short black hair at the nape, one ear, and a gloved hand on the railing.
NO FACE. Below, an empty square lit by clear gold streetlamps, sharp
shadows, no fog, no haze, no crowd faces, no flags. Dusk sky: bruised
purple and charcoal. No uniform, no cap, no medals, no armbands, no
symbols. Invented silhouette, not a celebrity. No smoke, no cigarettes,
no pipes.

This card is unique: back view, no face, balcony, empty square. Do not
draw a lectern. Do not draw a spotlight on a face. Do not draw a desk.
```

**`role-hitler-3.png`**

```
Board-game character card, portrait 2:3, extreme close crop. LOCKED
PAPER — same بافت و رنگ as the cream Liberal portrait card: 1930s oil on
canvas on thick cream-beige stained cardstock, canvas tooth, thick
brushstrokes, grainy aged overlay, deckled edges. Double gold frame with
ornate gold leaf / floral flourishes in all four corners. Empty cream
caption rectangle at the bottom 18 percent. The PAINTING inside is
mostly black with hard side-light but the CARD PAPER stays cream-beige.
Colors rich but muted; never neon, never photoreal, never glossy. No
letters, no numbers.
Empty caption rectangle at the bottom 18 percent, no letters, no numbers.

Do not draw any real historical figure. EXTREME CROP of the lower face
only: a closed mouth, a chin, a white shirt collar, and one black leather
gloved hand resting on a bakelite radio microphone. NO EYES, NO FOREHEAD,
NO HAIR, NO MOUSTACHE in frame — the top half of the head is cropped out
into black. Hard side-light, the rest of the card is empty dark. No
uniform, no cap, no medals, no flags, no armbands, no symbols. Invented
fragment, not a celebrity, not photoreal. No smoke, no cigarettes, no
pipes, no fog.

This card is unique: mouth-and-glove radio crop, no eyes. Do not draw a
full face. Do not draw a balcony. Do not draw a lectern from below.
```

A Hitler card that still shows a famous likeness is a reject. A Liberal
or Fascist card that reuses another row’s face is a reject.

---

## 3. Party membership cards (4 different emblems)

Investigate shows **party**, never the secret role. Hitler’s party card
is Fascist. These are identity passes — **no people, no faces.** Same cream canvas
paper and gold floral corners as the role cards (same بافت و رنگ),
different emblems. Do not put the word “fascist” in the dark-party
prompts.

| File | Emblem (must not match the other row of the same party) |
|---|---|
| `party-liberal-1.png` | White dove, olive branch, navy sunburst |
| `party-liberal-2.png` | Open palm + wheat sheaf, sky-blue ring seal, no dove |
| `party-fascist-1.png` | Gold geometric raven, burgundy wax sunburst |
| `party-fascist-2.png` | Closed envelope, heavy red wax blot, no bird |

**`party-liberal-1.png`**

```
Board-game identity-pass card, portrait 2:3. LOCKED PAPER — same بافت و رنگ
as the cream Liberal portrait card: 1930s oil on canvas on thick cream-beige
stained cardstock, canvas tooth, thick brushstrokes, grainy aged overlay,
deckled edges. Double gold frame with ornate gold leaf / floral flourishes
in all four corners. Empty cream caption band at the bottom. No letters,
no numbers, no people, no faces, no photoreal, never neon, never glossy.

LARGE white dove in flight, olive branch in its beak, over a navy
sunburst with gold rays. Ivory field around a dark navy centre. Wax-seal
feeling, woodcut / enamel look. Corner fan motifs in gold. One card only.
```

**`party-liberal-2.png`**

```
Board-game identity-pass card, portrait 2:3. LOCKED PAPER — same بافت و رنگ
as the cream Liberal portrait card: 1930s oil on canvas on thick cream-beige
stained cardstock, canvas tooth, thick brushstrokes, grainy aged overlay,
deckled edges. Double gold frame with ornate gold leaf / floral flourishes
in all four corners. Empty cream caption band at the bottom. No letters,
no numbers, no people, no faces, no photoreal, never neon, never glossy.

NO DOVE. Centre: an OPEN RIGHT PALM in cream enamel holding a gold
WHEAT SHEAF, inside a thick sky-blue circular wax-seal ring. Pale ivory
field, no sunburst rays, no bird, no olive branch. Small forget-me-not
shapes as corner stamps only. Quiet, bureaucratic pass, not a poster of
the sky. One card only.
```

**`party-fascist-1.png`** — do not put “fascist” in the prompt

```
Board-game identity-pass card, portrait 2:3. LOCKED PAPER — same بافت و رنگ
as the cream Liberal portrait card: 1930s oil on canvas on thick cream-beige
stained cardstock, canvas tooth, thick brushstrokes, grainy aged overlay,
deckled edges. Double gold frame with ornate gold leaf / floral flourishes
in all four corners. Empty cream caption band at the bottom. The emblem
is dark (burgundy / charcoal) but the CARD PAPER stays cream-beige. No
letters, no numbers, no people, no faces, never neon, never glossy.

Centre: a geometric RAVEN in gold line-art, wings folded, over a
burgundy wax-seal sunburst. Ivory-to-burgundy field. Stamp texture.
No flags, no skulls, no eagles, no uniforms. One card only.
```

**`party-fascist-2.png`**

```
Board-game identity-pass card, portrait 2:3. LOCKED PAPER — same بافت و رنگ
as the cream Liberal portrait card: 1930s oil on canvas on thick cream-beige
stained cardstock, canvas tooth, thick brushstrokes, grainy aged overlay,
deckled edges. Double gold frame with ornate gold leaf / floral flourishes
in all four corners. Empty cream caption band at the bottom. The emblem
is dark (burgundy / charcoal) but the CARD PAPER stays cream-beige. No
letters, no numbers, no people, no faces, never neon, never glossy.

NO BIRD. Centre: a closed black ENVELOPE sealed with a huge irregular
crimson WAX BLOT, the wax cracked, no imprint readable. Charcoal ivory
field, thin gold inner line, no sunburst, no raven, no eagle, no skull,
no flags. Feels like a secret dispatch pass. One card only.
```

On disk you may already have `party-facist-*` (missing “s”). Same slot
as `party-fascist-*`.

---

## 4. Policy cards (same size, they are the law)

There are only two laws in the game: a **Liberal law** and a **dark
law**. You generate two takes of each, but **every file is the same
card size and the same document layout.** Only the ink colour and the
top seal change.

This is the card the President/Chancellor holds and the card that
slides into the board. In the live game it is a **قانون** (law)
document, not a landscape plaque.

**Locked size (all four files):** portrait **2:3**, **1365 × 2048 px**,
rounded playing-card corners, full-bleed. If the model returns a
different ratio, discard it.

**Locked layout (all four files):** thick coloured border → cream
inner sheet with a dog-ear fold at the top-right → **seal at the top**
(the rule’s emblem) → horizontal bars standing in for legal text (no
real letters) → empty caption band at the bottom 18% for the title we
overlay (لیبرال / قانون or the dark-law title).

| File | Law this card *is* | Seal (must match that rule) |
|---|---|---|
| `policy-liberal-1.png` | Liberal law (5 of these win) | White dove — peace / civil law |
| `policy-liberal-2.png` | Liberal law (same rule, other take) | Gold scales — justice / constitution |
| `policy-fascist-1.png` | Dark emergency law (6 of these win; may grant the President a power) | Broken column — the republic cracked |
| `policy-fascist-2.png` | Dark emergency law (same rule, other take) | Heavy crimson wax blot on a decree — secret order |

Do not put the word “fascist” in the dark-law prompts.

**`policy-liberal-1.png`**

```
Board-game POLICY / LAW card. EXACT SIZE: portrait 2:3, 1365 pixels
wide by 2048 pixels tall, rounded playing-card corners, filling the
entire image. Same size as a standard poker card. Not landscape. Not
square. Not a plaque.

LOCKED PAPER: 1930s oil-print on cream-beige stained cardstock, canvas
tooth, grainy aged overlay, distressed print. Never neon, never glossy.

This card IS a government LAW being enacted — a civil bill. Same inner
layout as every other policy card in the set:

- Thick navy-teal outer border, worn paint chips on the edges
- Inner cream document sheet, small folded dog-ear at the top-RIGHT
  corner of the paper
- TOP: a large white dove in flight, navy ink, the seal of this peace
  law. No people.
- MIDDLE: several horizontal navy bars of different lengths, like lines
  of a legal document. NOT real letters, numbers, or words
- BOTTOM 18 percent: empty cream caption band, no writing

Gold floral corner ticks on the outer frame only. High contrast. One
card only.
```

**`policy-liberal-2.png`**

```
Board-game POLICY / LAW card. EXACT SIZE: portrait 2:3, 1365 pixels
wide by 2048 pixels tall, rounded playing-card corners, filling the
entire image. Same size and same inner layout as policy-liberal-1.
Not landscape. Not square.

LOCKED PAPER: 1930s oil-print on cream-beige stained cardstock, canvas
tooth, grainy aged overlay, distressed print. Never neon, never glossy.

This card IS a government LAW being enacted — a constitution / justice
bill. Same document structure, only the seal changes:

- Thick navy-teal outer border, worn paint chips
- Inner cream document sheet, dog-ear fold at the top-RIGHT
- TOP: gold SCALES OF JUSTICE, two pans level, geometric. NO dove. No
  people.
- MIDDLE: horizontal navy bars of different lengths standing in for
  legal text. NOT real letters or numbers
- BOTTOM 18 percent: empty cream caption band, no writing

This is the same physical card size as the dove law. High contrast.
One card only.
```

**`policy-fascist-1.png`** — do not put “fascist” in the prompt

```
Board-game POLICY / LAW card. EXACT SIZE: portrait 2:3, 1365 pixels
wide by 2048 pixels tall, rounded playing-card corners, filling the
entire image. Same size and same inner layout as the navy-teal law
cards. Not landscape. Not square.

LOCKED PAPER: 1930s oil-print on cream-beige stained cardstock, canvas
tooth, grainy aged overlay, distressed print. Never neon, never glossy.

This card IS a government LAW being enacted — a harsh emergency decree
that cracks the republic. Same document structure, only ink and seal
change:

- Thick crimson outer border, worn paint chips on the edges
- Inner cream document sheet, small folded dog-ear at the top-RIGHT
- TOP: a BROKEN STONE COLUMN on its side, dark crimson ink, the seal
  of this decree. No people, no birds, no flags.
- MIDDLE: several horizontal crimson bars of different lengths, like
  lines of a legal document. NOT real letters, numbers, or words
- BOTTOM 18 percent: empty cream caption band, no writing

Gold floral corner ticks on the outer frame only. High contrast. One
card only.
```

**`policy-fascist-2.png`**

```
Board-game POLICY / LAW card. EXACT SIZE: portrait 2:3, 1365 pixels
wide by 2048 pixels tall, rounded playing-card corners, filling the
entire image. Same size and same inner layout as the other policy
cards. Not landscape. Not square.

LOCKED PAPER: 1930s oil-print on cream-beige stained cardstock, canvas
tooth, grainy aged overlay, distressed print. Never neon, never glossy.

This card IS a government LAW being enacted — a secret emergency order
stamped in wax. Same document structure, only the seal changes:

- Thick crimson outer border, worn paint chips
- Inner cream document sheet, dog-ear fold at the top-RIGHT
- TOP: a closed black envelope sealed with a huge irregular crimson
  WAX BLOT, no readable imprint. NO column, no bird, no skull, no
  flags. No people.
- MIDDLE: horizontal crimson bars of different lengths standing in for
  legal text. NOT real letters or numbers
- BOTTOM 18 percent: empty cream caption band, no writing

This is the same physical card size as the broken-column law. High
contrast. One card only.
```

---

## 5. Vote cards (Ja = like, Nein = dislike)

Full-screen tap targets. Must read at a glance from a metre away. We
print JA / یا and NEIN / نِین in the UI — no letters in the art.

**Ja is LIKE** (thumb up). **Nein is DISLIKE** (thumb down). Same card
size as the other 2:3 cards. Do not use a blocking palm or a crimson X
for Nein.

| File | Gesture |
|---|---|
| `vote-ja-1.png` | LIKE — brown leather glove, thumb up |
| `vote-ja-2.png` | LIKE — bare right hand, thumb up, wreath |
| `vote-nein-1.png` | DISLIKE — brown leather glove, thumb down |
| `vote-nein-2.png` | DISLIKE — bare right hand, thumb down |

**`vote-ja-1.png`**

```
Board-game ballot card, portrait 2:3. LOCKED PAPER — same بافت و رنگ as
the cream Liberal portrait card: oil on canvas, cream-beige stained
cardstock, canvas tooth, thick brushstrokes, grainy aged overlay,
deckled edges, gold floral corner flourishes, empty cream caption band.
Never neon, never photoreal, never glossy. No letters, no numbers, no
faces.

STRONG YES / LIKE. A raised right hand in a BROWN LEATHER GLOVE, thumb up,
ivory field, green-gold wreath behind the glove. Propaganda-poster oil
ink. One card only.
```

**`vote-ja-2.png`**

```
Board-game ballot card, portrait 2:3. LOCKED PAPER — same بافت و رنگ as
the cream Liberal portrait card: oil on canvas, cream-beige stained
cardstock, canvas tooth, thick brushstrokes, grainy aged overlay,
deckled edges, gold floral corner flourishes, empty cream caption band.
Never neon, never photoreal, never glossy. No letters, no numbers, no
faces.

STRONG YES / LIKE. NO GLOVE. A BARE right hand, THUMB UP, the other
fingers loosely closed. Pale gold circular wreath of oak, sky-blue
field. Same “like” meaning as the gloved card, different hand. One card.
```

**`vote-nein-1.png`**

```
Board-game ballot card, portrait 2:3. LOCKED PAPER — same بافت و رنگ as
the cream Liberal portrait card: oil on canvas, cream-beige stained
cardstock, canvas tooth, thick brushstrokes, grainy aged overlay,
deckled edges, gold floral corner flourishes, empty cream caption band.
The field is charcoal but the paper around it stays cream. Never neon,
never glossy. No letters, no faces.

STRONG NO / DISLIKE. A right hand in a BROWN LEATHER GLOVE, THUMB
DOWN, the other fingers closed in a fist. The dislike twin of the
gloved thumb-up card. Charcoal-ivory field, small crimson inner frame.
No blocking palm, no X, no open hand. Propaganda-poster oil ink. One
card only.
```

**`vote-nein-2.png`**

```
Board-game ballot card, portrait 2:3. LOCKED PAPER — same بافت و رنگ as
the cream Liberal portrait card: oil on canvas, cream-beige stained
cardstock, canvas tooth, thick brushstrokes, grainy aged overlay,
deckled edges, gold floral corner flourishes, empty cream caption band.
The field is dark ivory but the paper stays cream. Never neon, never
glossy. No letters, no faces.

STRONG NO / DISLIKE. NO GLOVE. A BARE right hand, THUMB DOWN, the other
fingers closed. Charcoal-ivory field, a small crimson wreath or inner
frame. Same “dislike” meaning as the gloved card, different hand. No
blocking palm, no X, no wax ribbons. One card only.
```

---

## 6. Office placards (4 different desks)

Hang off the seat the way the current ribbons do, or sit as a small
banner under the portrait.

| File | Object |
|---|---|
| `placard-president-1.png` | Dark walnut, gold eagle on the left |
| `placard-president-2.png` | Pale oak, gold wreath, no eagle |
| `placard-chancellor-1.png` | Dark oak, gold column on the left |
| `placard-chancellor-2.png` | Black lacquer, small gold key emblem |

**`placard-president-1.png`**

```
Wide 3:1 wooden desk placard painted as a 1930s oil on cream-beige
stained cardstock (same بافت و رنگ: canvas tooth, thick brushstrokes,
grainy aged overlay, antique gold inlay). Dark WALNUT, gold inlaid EAGLE
on the left, empty centre for a title, gold bar on the right. No letters,
no people. Never neon, never glossy.
```

**`placard-president-2.png`**

```
Wide 3:1 wooden desk placard painted as a 1930s oil on cream-beige
stained cardstock (same بافت و رنگ: canvas tooth, thick brushstrokes,
grainy aged overlay). Pale washed OAK, no eagle. A gold OAK WREATH on
the left, a large empty centre for a title, thin gold line on the right.
No letters, no people, no bird. Never neon, never glossy.
```

**`placard-chancellor-1.png`**

```
Wide 3:1 wooden desk placard painted as a 1930s oil on cream-beige
stained cardstock (same بافت و رنگ: canvas tooth, thick brushstrokes,
grainy aged overlay). Dark OAK, small gold COLUMN emblem on the left,
empty centre for a title. No letters, no people, no eagle. Never neon,
never glossy.
```

**`placard-chancellor-2.png`**

```
Wide 3:1 desk placard painted as a 1930s oil on cream-beige stained
cardstock (same بافت و رنگ: canvas tooth, thick brushstrokes, grainy
aged overlay). BLACK lacquer wood, small gold KEY emblem on the left,
empty centre for a title, no column, no eagle, no wreath. Austere. No
letters, no people. Never neon, never glossy.
```

---

## 7. Power seals (5 tokens — one meaning each)

Circular tokens that sit in empty Fascist wells and later fly to the
President. **1:1, 2048 × 2048 px.** The icon must fill most of the disc
so it still reads at ~40 px in a well. These are board-game pieces, not
tiny crests in a puddle of wax.

Each seal **is the power.** If you cannot tell the action from the
picture alone, reject it.

| File | Power | What the picture must mean |
|---|---|---|
| `seal-investigate.png` | Investigate Loyalty | President looks at that player’s **party pass** (not their role) |
| `seal-special-election.png` | Call Special Election | President **points at who sits as President next** |
| `seal-peek.png` | Policy Peek | President **looks at the top 3 laws** of the draw pile |
| `seal-execution.png` | Execution | That player’s **seat is emptied** — they leave the game |
| `seal-veto.png` | Veto (unlocks at 5 dark laws) | President **and** Chancellor **block the remaining bill** |

Do not put skulls, flags, or the words fascist / execute / kill in the
prompts. Do not add a style bible.

**`seal-investigate.png`**

```
Circular board-game TOKEN, 1:1, 2048 pixels by 2048 pixels, filling the
image. Thick navy-wax disc, heavy gold rim, cream paper grain, like a
stamped cabinet seal from a 1930s tabletop game. High contrast. Never
neon, never glossy 3D, never photoreal.

MEANING: the President inspects someone’s party-membership pass.

LARGE gold line-art in the centre, filling most of the disc: a simple
open EYE looking down at a small folded IDENTITY PASS (a tiny 2:3 card
with a wax blot, not a face). Optional: a gold magnifying-glass ring
around the pass. Coarse shapes, few lines, readable as a postage stamp.

No letters, no numbers, no people, no skulls, no weapons, no flags.
One token only.
```

**`seal-special-election.png`**

```
Circular board-game TOKEN, 1:1, 2048 pixels by 2048 pixels, filling the
image. Thick antique-gold wax disc, dark walnut rim, cream paper grain.
1930s tabletop component. High contrast. Never neon, never glossy 3D.

MEANING: the President chooses who becomes President next, skipping
the usual turn order.

LARGE gold-and-walnut line-art filling most of the disc: a wooden
CABINET CHAIR (presidential seat) in three-quarter view, and a gloved
HAND with the index finger pointing at that chair. A small curved
arrow jumping TO the chair (not a circle of many chairs). Big shapes.

No letters, no numbers, no faces, no crowns that look like a real
royal coat of arms, no flags, no weapons. One token only.
```

**`seal-peek.png`**

```
Circular board-game TOKEN, 1:1, 2048 pixels by 2048 pixels, filling the
image. Thick walnut-wax disc, gold rim, cream paper grain. 1930s
tabletop component. High contrast. Never neon, never glossy 3D.

MEANING: the President secretly looks at the top three law cards of
the draw pile, then puts them back in the same order.

LARGE gold line-art filling most of the disc: THREE playing-card
silhouettes fanned, navy backs, the FRONT card lifted a little as if
peeked — still a back, no readable face. A small open EYE above the
fan. Exactly three cards. Big, coarse, readable at postage-stamp size.

No letters, no numbers, no pips, no people, no flags. One token only.
```

**`seal-execution.png`** — do not use the words execute, kill, death, skull

```
Circular board-game TOKEN, 1:1, 2048 pixels by 2048 pixels, filling the
image. Thick crimson-wax disc, gold rim, cream paper grain. 1930s
tabletop component. High contrast. Never neon, never glossy 3D, not
horror, not gore.

MEANING: a player is removed from the table. Their seat is empty.
They no longer vote.

LARGE gold-and-black line-art filling most of the disc: an EMPTY
wooden chair, slightly turned away, a black mourning ribbon tied on
the backrest. No person in the chair. Optional: a small wooden pawn
lying on its side at the foot of the chair. Big shapes, sad and
formal, not bloody.

No letters, no numbers, no faces, no skulls, no weapons, no flags,
no smoke. One token only.
```

**`seal-veto.png`**

```
Circular board-game TOKEN, 1:1, 2048 pixels by 2048 pixels, filling the
image. Thick black wax disc, gold rim, cream paper grain. 1930s
tabletop component. High contrast. Never neon, never glossy 3D.

MEANING: the Chancellor and the President together refuse the remaining
law. Both leftover policy cards are thrown away.

LARGE gold line-art filling most of the disc: a cream LAW CARD (the
same document shape as a policy card, no writing) being stopped by TWO
gloved hands, palms out, or by TWO overlapping wax stamps pressed on
the bill. One card, two blockers. Big, obvious “this bill does not
pass.”

No letters, no numbers, no faces, no skulls, no flags, no weapons.
One token only.
```

---

## 8. Election tracker pawn (1 file)

**`tracker-pawn.png`**

```
A small carved wooden pawn / chess-like minister figure, walnut and
gold, 1930s desk object, three-quarter view, sitting on nothing (plain
dark backdrop we can key out). No letters. Board-game piece, not a toy
robot, not a portrait of a real person.
```

---

## 9. Ravi — on-screen character (4 files)

Locked: Ravi is a visible radio host in a cameo, not a header icon.
Two people, matching the two voices. Each needs idle + speaking.

Farid idle and Farid speaking **are the same man**. Dilara idle and
Dilara speaking **are the same woman**. That pair is the only place you
may attach the idle cameo — so the mouth pose changes and the face does
not. Generate Farid first.

| File | Who |
|---|---|
| `ravi-farid-idle.png` | Man, late 40s, listening |
| `ravi-farid-speaking.png` | Same man, mouth open at the mic |
| `ravi-dilara-idle.png` | Woman, early 40s, listening |
| `ravi-dilara-speaking.png` | Same woman, mouth open at the mic |
| `ravi-plaque.png` | Optional blank ticker |

**`ravi-farid-idle.png`**

```
Circular cameo portrait, 1:1. LOCKED PAPER — same بافت و رنگ as the cream
Liberal portrait card: 1930s oil on canvas, canvas tooth, thick
brushstrokes, grainy aged overlay, ivory paper grain around a dark oval
mat, antique gold rim. Never neon, never photoreal, never glossy.
A man, late 40s, grave, optional thin moustache, dark wool suit, small
gold lapel pin, bakelite microphone. Three-quarter view, looking slightly
off-camera as if listening. Warm walnut studio light. Invented face, not
photoreal, not a celebrity. No letters. No smoke, no cigarettes, no
pipes, no fog.
```

**`ravi-farid-speaking.png`** — attach `ravi-farid-idle.png`

```
Same man as the attached idle cameo, same crop, same clothes, same
studio, same face. Now leaning a little toward a bakelite microphone,
mouth slightly open as if announcing the news. Eyes engaged. No letters.
Do not invent a new person. No smoke, no cigarettes.
```

**`ravi-dilara-idle.png`** — you may attach Farid only for paper, gold
rim, and light; she must still be a different person

```
Circular cameo portrait, 1:1. LOCKED PAPER — same بافت و رنگ as the cream
Liberal portrait card: 1930s oil on canvas, canvas tooth, thick
brushstrokes, grainy aged overlay, ivory paper grain, antique gold rim,
walnut studio light. Never neon, never photoreal, never glossy.
A woman, early 40s, clear-eyed, dark waved hair, high-collar blouse and wool
jacket, small gold pin, bakelite microphone. Three-quarter view,
listening. Invented face, not photoreal, not a celebrity, not the man
from any other card. No letters. No smoke, no cigarettes, no pipes,
no fog.
```

**`ravi-dilara-speaking.png`** — attach `ravi-dilara-idle.png`

```
Same woman as the attached idle cameo, same crop, same clothes, same
studio, same face. Now leaning a little toward the microphone, mouth
slightly open as if announcing the news. No letters. Do not invent a
new person. No smoke, no cigarettes.
```

**`ravi-plaque.png`** (optional)

```
A blank ivory speech plaque / news-ticker card, landscape, painted as
1930s oil on cream-beige cardstock (canvas tooth, grainy aged overlay),
gold floral corners, empty centre for a caption we will typeset. No
letters, no people. Never neon, never glossy.
```

Skip `radio-header.png` if the cameo is in; the portrait *is* the radio.

---

## 10. Night veil (optional)

Win screens stay as they are for now: **background + text only.** Do not
generate ceremonial win tablets.

| File | What |
|---|---|
| `night-veil-1.png` | Navy smoke, closed eyelids in gold line |
| `night-veil-2.png` | Black velvet, gold radio waves, no eyelids |

**`night-veil-1.png`**

```
Full-screen overlay texture, 1930s printed ink: dark navy smoke and
closed eyelids suggested in gold line, very abstract, lots of empty
centre so UI can sit on it. No faces, no letters.
```

**`night-veil-2.png`**

```
Full-screen overlay texture: black velvet field, faint gold concentric
radio waves, no eyelids, no faces, no letters, empty centre for UI.
```

---

## 11. What we already have (do not redraw unless replacing)

Lobby postage, waiting-room portraits, and the **painted Liberal /
Fascist boards** stay. The new policy cards drop *into* those boards (we crop the centre of
the same 2:3 file). If a generated card clashes with the board paint,
regenerate the card to match the board’s blue / red, not the other way
around.

Current policy faces are cropped board art (`liberal_rule` /
`facist_rule`) — those are the ones we replace. The replacements must
all share **1365 × 2048**, portrait 2:3.

---

## How to run the batch in ChatGPT / Gemini

1. Copy **one row’s prompt**. Paste it alone.
2. Do not prepend a style bible. Do not attach a previous role *face*.
   You may attach the Liberal card you liked **only** for paper: canvas
   grain, cream deckle, gold floral corners — never to copy the man.
   (Ravi speaking is the other exception: attach that host’s idle cameo.)
3. Save under the filename in the table. Never overwrite another take.
4. Reject: Latin/Persian letters, swastikas, photoreal celebrity faces,
   the same face as another role row, comic-book shine, modern flags,
   smoke, cigarettes, pipes, or fog on a character card, neon color,
   glossy 3D, or paper that is not cream-beige canvas.
5. Export PNG. We will trim, and we will add the Persian caption in CSS.

## Audio (not ChatGPT / Gemini)

Do not ask those tools for Ravi’s voice, and do not invent lines at
runtime. Bake the catalog in [`ravi-script.md`](./ravi-script.md) with
`scripts/generate-ravi-voices.py` — pocket-tts-farsi, male Farid and
female Dilara, same filenames in two folders. Details in
[`ravi.md`](./ravi.md). If a voice is wrong we change the bake engine; we
do not change the words in a live game.

Table physics (card slides, stamps, gavel, tracker pawn) are a separate
layer: [`sound-effects.md`](./sound-effects.md) and
`scripts/generate-sound-effects.py`. Looping beds (Suno) are
[`background-music.md`](./background-music.md).
