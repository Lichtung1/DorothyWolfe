WALL ART: the framed pictures, plates and shawl around the house (ART in decor.js).

Workflow: keep the full-size originals in assets/art-source/ (git-ignored, never uploaded), named after the slot,
then run  python3 tools/import_art.py --fry  to make the textures here: crop to the frame, then 192 px in the house
palette (black, charcoal, two dusty mauve-greys, dusty rose, ivory, light pink) with a light ordered dither.
Pieces finished by hand in that palette are marked done=True in SLOT_OPTIONS and are only scaled up.
tools/make_art_placeholders.py fills empty slots with stand-ins.
To add or move a piece, edit ART in decor.js: file, position, size, which way it faces, frame style, name, line.
Frame sizes match each picture's proportions.

FILE                        WHAT                                                        WHERE
smoke-rings.png             after Alphonse Mucha, JOB (1896)                            entrance, by the front door
plate-flowers.png           porcelain plate, pink blossoms                              entrance, by the telephone
moonlit-river.png           after Arkhip Kuindzhi, Moonlit Night on the Dnieper (1880)  courtyard, north wall
zhostovo-tray.png           Zhostovo tray                                               courtyard, north wall
birch-wood.png              Ivan Shishkin, In the Wild North (1891)                     courtyard, south wall
gzhel-plate.png             porcelain plate, rose                                       courtyard, south wall
painting-reclining.png      Frederic Leighton, Flaming June (1895)                      courtyard, west wall
photo-blonde.png            photograph, platinum blonde with a cigarette                courtyard, east wall
kokoshnik-portrait.png      Mikhail Vrubel, The Swan Princess (1900)                    gallery, back wall
plate-birds.png             pierced porcelain plate, birds                              gallery, back wall
firebird.png                Ivan Bilibin, Ivan Tsarevich and the Firebird (1899)        gallery, back wall
photo-match.png             photograph, a woman lighting a cigarette                    entrance, left of the courtyard door
photo-smoke.png             photograph, a woman smoking in a little hat                 entrance, right of the courtyard door
photo-gun.png               film still, a woman with a gun                              north passage
photo-pearls.png            photograph, pearls and a cigarette holder                   courtyard, west wall
photo-holder.png            photograph, gloves and a long cigarette holder              courtyard, east wall
photo-fur.png               film still, a blonde in white fur                           gallery, back wall by the bedroom
cinema-poster.png           A Life for a Life (1916), with Vera Kholodnaya              gallery, east wall by the TV
tapestry-birds.png          tapestry, birds of paradise                                 atelier, hung from a rod
tapestry-leaves.png         tapestry, acanthus leaves (also half-woven on the loom)     atelier, north wall, from a rod
photo-dancer.png            photograph, a dancer                                        fitting room
