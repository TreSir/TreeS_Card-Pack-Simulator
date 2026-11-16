# 魔术师分层试作

使用 Codex 内置 image_gen，基于原版 the-magician.jpg 编辑。原图保留。

## 透明前景

Use case: background-extraction.
Asset type: transparent foreground layer for an interactive 2.5D tarot card.
Input image 1 is the EDIT TARGET, the existing The Magician tarot card.
Extract only the red-robed magician INCLUDING his complete raised hand, wand and its tiny golden glow, head, both arms, entire robe, and the entire stone altar/table with golden cup, sword, branch, pentacle, hanging cloth. Include the small white lilies and leaves immediately at the two bottom corners as part of the base.
Remove all garden scenery, tree branches behind him, infinity symbol above him, parchment card border, number and title. Those removed regions must be genuinely TRANSPARENT, not painted black or checkerboard.
Keep the character identity, pose, warm renaissance oil-paint texture, red/gold/ivory colors and the scene objects very close to the reference. Silhouette must be clean, complete, detailed, no clipped hands or wand.
Composition: upright flat front-view illustration, not a perspective card mockup. Portrait canvas 5:7 if possible. Preserve the original placement and scale of the extracted elements relative to the reference full canvas: wand tip approx (24%,10%), head approx (48%,22%), tabletop approx y=69%, altar base approx y=89%; all opaque objects stay inside x=4..96%, y=8..92%, with transparent breathing room around. No new text, no frame, no baked rectangular drop shadow, no extra magician, no 3D-rendered plastic style. Return only this isolated illustrated foreground asset on alpha transparency.

## 花园背景

Use case: precise-object-edit.
Asset type: opaque background plate for a layered interactive tarot card.
Input image 1 is the EDIT TARGET: existing THE MAGICIAN tarot card. Keep its exact flat front-view layout, parchment border, corner gold botanical linework, roman numeral I at top and exact title THE MAGICIAN at bottom, warm antique renaissance oil painting style, palette and 5:7 portrait card proportions.
Remove the entire magician, his red robes, both hands, wand and wand glow, entire altar/table, cup, sword, branch, pentacle, cloth and the two large foreground clusters of white lilies. Seamlessly reconstruct the scenery hidden behind all of these: a deep forest-green enchanted garden with distant cypress shapes, tiny flowers, soft atmospheric foliage and a dim sunlit clearing near the ground. Keep the small golden infinity symbol high in the center, and the climbing branches around the top and sides. Center and lower garden should be calm, dark and softly detailed so a separate red-robed figure layer will read clearly in front.
This is a BACKGROUND-ONLY clean plate: no person, no human silhouette, no altar, no red fabric, no character shadows. No transparency. Absolutely no perspective mockup, no extra card, no new labels. Full finished 5:7 flat card with all text and frame retained.
