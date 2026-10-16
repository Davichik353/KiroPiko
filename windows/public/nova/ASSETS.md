# NOVA character asset provenance

`character-states.png` was generated with the built-in ImageGen tool from the user's first attached chibi image. The second attached image is the panel/layout reference. The generated PNG was visually inspected and copied into the project; no original Coucou image or sound was used to generate it.

Prompt:

> Create a production sprite sheet for NOVA desktop companion. Input image is character identity reference. Preserve this exact cute chibi boy, dark navy hair, large warm eyes, navy hoodie, shorts and shoes, clean anime illustration. Transparent background, no shadows, no text, no grid lines. Square sheet with precisely 3 columns and 3 rows of equal square cells. One full-body character per cell, identical scale, feet aligned near cell bottom, centered, ample transparent margin. Row 1: neutral friendly idle; waving hello; celebrating task completion happy arms up. Row 2: thinking finger at chin; concerned error expression; sleeping eyes closed. Row 3: listening with hand near ear; surprised with wide eyes; proud thumbs-up. Entire body and all hair fit each cell with no overlap. Keep clothing and identity identical in all nine cells. No added objects or lettering. Save the sheet as a single transparent PNG.

The runtime crops the top 63% for the capsule pose. Accessories are original Canvas primitives. The source/reference ownership and final startup asset rights still need the owner's release review; this file records generation, not a license determination.

## Follow-up assets

- `character-play.png`: built-in ImageGen transparent 2×2 full-body sprite sheet, inspected and saved locally. Prompt: the exact reference NOVA boy with dark navy hair, hoodie, shorts and shoes; row one two walk-cycle poses facing right with alternating leg/arm movement; row two football preparation and right-leg kick; equal square cells, identical scale/head position, feet at 90% cell height. No ball, floor, shadows, text or borders. The app renders the ball separately. Reference: `character-states.png`.

- `character-ledge.png`: built-in ImageGen output for the user's request to show chest, hoodie and hands resting on the capsule. Prompt: a horizontal five-frame transparent strip of the exact NOVA boy, upper body only; both forearms rest on an invisible ledge, both hands visibly grip its front edge at the same baseline; navy hoodie visible between head and hands. Identical placement and scale across neutral, listening, thinking, speaking and blink expressions. No legs, props, bar, shadows, labels or borders. Reference: `character-states.png`. Runtime crops transparent vertical padding and places the palms on the capsule edge. Original generated PNG is preserved.

Both generated with built-in ImageGen, visually inspected and copied into this directory:

- `integration-characters.png`: 2×2 transparent sheet, ordered Resend courier, n8n mechanic, Vercel astronaut, GitHub programmer with cat ears. Prompt: four distinct full-body chibi companions in NOVA's illustration style, equally sized square cells, consistent scale, distinctive hair/uniforms/silhouettes; silver-haired mail courier with delivery cap and envelope; ginger mechanic with goggles, orange hoodie and wrench; white-haired astronaut with helmet and space suit; dark-haired programmer with cat ears, mint hoodie and laptop. Transparent background, no writing, brand logos or borders. Reference: `character-states.png`.
- `character-blink.png`: 2-frame horizontal transparent strip of the same neutral NOVA pose, open eyes then closed eyes. Prompt: use only top-left neutral character from reference, identical full-body posture, hair, face, mouth, hands, clothes, scale and alignment; change only eyelids for a natural blink. Navy hoodie, dark navy hair, shorts and shoes. No sleeping pose, hand movement, letters, labels, shadows or borders. Reference: `character-states.png`.

## Kiro mint redesign — 15 October 2026

Built-in ImageGen, based on the user-approved preview (exec-3916e5e9-bc07-49b6-b875-7a228b033b0a.png). New files copied into the project; previous sprites kept as historical assets.
- kiro-mint-ledge.png: exact approved navy-haired chibi, simplified highlights, mint drawstring and circular badge; transparent five-column bust sheet with aligned hands and calm/listening/thinking/happy/sleeping expressions, no ledge or text. Generated exec-8078081f-91ee-4a60-a0dc-4a5e74577470.png.
- kiro-mint-states.png: same identity, transparent 3×3 full-body standing atlas, calm/greeting/celebrating/thinking/concerned/sleeping/listening/alert/proud states, navy hoodie/shorts/sneakers, mint accents, aligned cells. Generated exec-cde34138-94eb-4707-8619-5864e42ce53b.png. Neutral cell also powers the walk/football cutout rig.
- kiro-holidays.png: same redesigned character; transparent 4×2 atlas, columns witch/pumpkin/Santa/New Year party, row one hands-on-ledge bust and row two full body. Generated exec-017dc828-e3c3-4032-8447-34ca21139208.png. Calm holiday poses are illustrated; other emotions use the expressive mint atlas with accessory overlays.
All three images visually inspected. These descriptions record the prompts and input roles for built-in generation.
## Profile walking atlas (2026-10-15)
kiro-profile-walk.png — built-in imagegen, source exec-ad429799-a29e-490f-8a7a-302dce83e4d4.png. Prompt: exact existing Kiro, transparent 4x2 atlas, four right-facing profile walk poses with alternate strides and opposite arm swing; navy hoodie first row, fitted purple witch outfit second row; registered scale and baseline, no text or ball.


## Football emotion atlas (2026-10-15)
kiro-football-emotions.png — built-in imagegen, source exec-43c1f0d3-81d0-42fa-b11b-42b4505db532.png. Prompt: exact Kiro, transparent 4x2 registered atlas, right-facing football ready/focused, wind-up/determined, kick/excited, celebration/happy; navy outfit first row, purple witch outfit second row, no ball/text/shadow.
