# Kiro costume animation assets

Generated with the built-in ImageGen tool, October 17, 2026. References: the existing `kiro-profile-walk.png`, `kiro-football-emotions.png`, and `kiro-holidays.png`. The selected PNGs retain their generated transparency. They are copied to Windows public assets and Android packaged assets; pose registration is shared through `wardrobe-rig.json`.

`kiro-costume-walk.png`: four walking phases for pumpkin, Santa and party costumes. The figures face right; leftward walking mirrors the complete figure. Actual alpha bounds and foot baselines are registered per frame, rather than assuming equally divided rows.

`kiro-costume-football.png`: three football phases per costume (ready, wind-up, contact). The fourth registered frame returns to ready. A discarded four-column draft had touching figures and is not used. The selected nine-figure sheet has separate complete silhouettes.

Final walk prompt: Create a production animation sprite sheet for the exact referenced chibi Kiro character. Four columns and three rows, transparent background, no lettering, labels, ground, ball or external shadows. Four coherent walk phases facing right, natural opposing arm/leg motion, consistent head sizes, clothes, foot baselines and full figures. Row 1 pumpkin hoodie with hood, stem and leaf; row 2 Santa jacket and hat; row 3 navy hoodie and party cone. Preserve navy hair, amber eyes, shorts and navy/mint sneakers.

Final football prompt: Repack the reference sheet into exactly three columns and three rows, nine complete separate characters on transparent canvas, with large clear gaps. Row 1 pumpkin, row 2 Santa, row 3 party costume. Columns ready stance, wind-up with leg behind, forward kick to the right. Keep consistent reference rendering, body proportions, head sizes, costume details and baseline. No ball, ground, text or gridlines.

Accessory-only outfits use the original profile/football artwork plus registered vector accessories. The hidden lens is omitted for profile walking. No frontal standing sprite is translated sideways as a walking substitute.
