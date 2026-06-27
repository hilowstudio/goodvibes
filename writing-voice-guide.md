# Voice & Tone Guide for Shipping Copy

## Two things govern every string

There's a fixed floor and there's a brand voice on top of it.

The **floor** is the mechanical anti-pattern rules below. They're identical on every
project, for every client, in every register. They don't bend for a playful brand
or a formal one. A clean floor is what stops the work from reading as machine
output.

The **brand voice** sits on top: how warm, how formal, how funny, how
much personality. That's the builder's call, and it wins on personality every
time. When a builder has a documented voice, write to it. When they don't, default
to plain, concrete, and human. The floor holds either way. Personality is the
ceiling; the floor is the same height on every job.

## The floor (non-negotiable, every project)

**Buzzwords and corporate jargon.** These are the tells. Never write them in
user-facing copy:

```
delve · explore · navigate · foster · enhance · leverage · transformative
robust · comprehensive · pivotal · dynamic · intricacies · nuances
```

Beyond the list, favor the concrete over the abstract. Name the actual thing. 
Cut "vague nouns" like "aspects," "factors," "elements," "solutions," "offerings." 
A reader should be able to picture what you mean.

**The one carve-out: literal system verbs.** The ban is on these as *voice* words
in copy a user reads. It does not reach code identifiers, a11y semantics, or
technical docs describing a literal mechanism. "Keyboard navigation," a
`dynamic import`, an aria role, a route name: fine, those are machine terms. The
moment the word lands in a button, a heading, a tooltip, or body copy a person
reads, the ban is back and you pick the concrete verb. "Explore plans" becomes
"See plans" or "Compare plans." "Navigate to settings" becomes "Open settings" or
"Go to settings." "Enhance your account" becomes the specific thing the upgrade
does.

**Banned transitions and closers.** No "Furthermore," "Moreover," "In addition,"
"Additionally," "It is important to note that." No summary closers: "In
conclusion," "Overall," "In summary." If the thought is done, stop the sentence.
UI copy rarely needs a connective at all.

**No em dashes.** Not in headings, not in body, not in tooltips, not set off
inside a list. The long dash is a signature machine tell. Use a period, a comma, a
colon, or parentheses. Break the long sentence into two short ones. This is
absolute and it applies to every string that ships.

**Contrastive negation (negative parallelism).** Drop the "not X, it's Y" move
and all its variants:
"This isn't a tool, it's a workspace," "Not just faster, but smarter," "We don't
sell software, we sell time." The denial half is filler that fakes insight. Say
the real claim and stop. If "We sell time" is a strong line, it stands alone. If
it needs a straw man propped up in front of it first, the line is weak. Fix the
line.

**No template-SaaS theater.** This is the heart of the slop problem. Cut
manufactured urgency ("Only 3 spots left," fake countdowns), confirmshaming ("No
thanks, I like wasting money"), and FOMO badges ("Popular," "Limited," "Trending")
that don't describe anything true. Cut hype-adjective stacking and the
exclamation-point reflex. If a client has a real constraint (an actual sale with
an actual end date, a genuinely limited cohort), state it plainly, once, without
the theater. Describe what's true. Don't pressure.

**Mechanics that read human.** Sentence case for headings, buttons, and labels.
No Title Case Marketing Capitals, no ALL-CAPS shouting (a small tracked overline
label is the only exception, and only as a type device). Contractions, always,
outside formal legal text. Concrete numbers and timeframes: "saved 30 seconds
ago," "exports for 30 days," "8 AM to 6 PM your time." Vary sentence length hard:
a three-word line next to a longer one beats five medium sentences in a row. Have
a point of view. Cut the hedging.

## The figures, by name

Several of the bans above are specific rhetorical figures, and the model leans on
them because they sound like finished writing. Catch them by name. Each entry
gives the proper term, what it is, the form the model defaults to, and the fix.

**Buzzwords and corporate jargon.** Abstract terms that signal importance and
carry no fixed meaning. The banned list up top lives here, with company on it:
"synergy," "ecosystem," "holistic," "best-in-class," "mission-critical." The fix
is the concrete noun or verb that says what happens.

**Cliché and dead metaphor.** Phrases worn smooth from overuse, and metaphors
nobody pictures anymore. "Cutting-edge," "game-changer," "supercharge," "unlock,"
"take it to the next level," "at your fingertips," "the power of." They feel like
writing while saying nothing. Use literal description.

**Antithesis and contrastive negation (negative parallelism).** Antithesis pairs
two opposed ideas in parallel grammar. The form to kill is contrastive negation:
denying one term to assert the next, "not X, but Y" and "not X, it's Y." The
negated half is a straw man propped up to fake depth. Keep the assertion, delete
the denial. This one shows up more than any other figure here.

**Tricolon, and the ascending tricolon (tricolon crescens).** A run of three
parallel items, often swelling toward the third for a sense of arrival. "Fast,
simple, and reliable." "It listens, it learns, it adapts." The model reaches for
threes by reflex because three beats sound complete. Use the count you actually
have. Two reasons are two reasons. Don't pad to three for the cadence.

**Isocolon and parison.** Consecutive clauses built to the same length and the
same structure, so the prose ticks like a metronome. That evenness is a core
synthetic tell. The fix is burstiness: set a long sentence against a short one on
purpose, and let a fragment stand alone when it earns the space.

**Anaphora.** The same opener repeated across consecutive lines or clauses. "You
can track invoices. You can send reminders. You can export everything." Fine once,
tiring by the third pass, a giveaway in feature grids. Vary the opening, or fold
the points into one line.

**Hyperbole and intensifier stacking.** Exaggeration plus the adverb pileup:
"blazingly fast," "effortlessly powerful," "incredibly simple," and the
exclamation reflex behind them. A real number or a plain verb does more. "Loads in
under a second" beats "blazingly fast" every time.

One more, and it's punctuation rather than a figure: the em dash. Still the single
most reliable tell of machine drafting. Zero of them ship, as the floor says.

## How the voice flexes by surface

The floor is constant. The register shifts depending on where the copy lives. Read
these as the shape of good microcopy, with the client's personality layered on
top.

**Hero / marketing.** High signal, low volume. Say what the product does for the
person in a sentence they'd actually repeat. A good hero survives being read
aloud at a normal speaking volume. Example: "Track every invoice in one place.
Know what you're owed without opening a spreadsheet."

**Buttons and CTAs.** A verb plus the object, sentence case. "Save changes," "Send
invoice," "Add a client." The button says what happens when you press it. "Get
Started" tells the user nothing; "Create your first invoice" tells them exactly
what's next.

**Empty states.** Calm and informative. Say what the space is for and what fills
it. "No invoices yet. When you send one, it shows up here." Skip the party. "Add
your first invoice to get started!" with a confetti emoji is the slop reflex.

**Error messages.** Plain, specific, and pointed at the fix. Name what happened
and what to do next, in that order, without blame. "We couldn't save that. Check
your connection and try again." Never "Oops! Something went wrong 😅" with no
information in it.

**Form help and labels.** Tell the user what you need and why, in as few words as
hold up. "Work email. We send receipts here." A label is a noun; helper text earns
its place only when the field is genuinely ambiguous.

**Onboarding.** One idea per step, written like a person showing a friend the
thing. Concrete first action, not a tour of every feature. "Add a client to send
your first invoice. Takes about a minute."

**Confirmations and toasts.** Short, past tense, true. "Invoice sent." "Changes
saved." "Client deleted. Undo?" The toast confirms the thing happened; it doesn't
celebrate.

**Pricing.** Honest to a fault. State the number, the cadence, and what's
included, in the open. "$6 a month. No ads. Cancel anytime from settings." If the
business model has a catch, say the catch.

**Legal and ToS summaries.** Plain language, 8th-grade reading level, concrete
terms. "You own your data. You can export all of it, anytime, in 3 clicks." Save
the dense clauses for the full document; the summary is for being understood.