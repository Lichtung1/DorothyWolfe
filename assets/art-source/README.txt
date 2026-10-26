Full-quality ORIGINAL wall art goes here, named after its slot (see ../art/README.txt).
(.png, .jpg or .webp). Then run:  python3 tools/import_art.py --fry
(--fry = the house look: 192 px, the 7-colour dusty-rose palette, light ordered dither.
 --fry=free picks 20 colours from the picture itself, --fry=hard is chunky, --warm skips the colour grade.)
Pieces already finished by hand in the house palette are marked done=True in SLOT_OPTIONS (tools/import_art.py),
so the script only scales them up and never re-processes them.
extras/ and retired/ are alternatives and earlier versions; the script ignores subfolders.
This folder is git-ignored: the originals stay on your computer and are never uploaded.
These files are never changed; the game uses the processed copies in ../art/.
