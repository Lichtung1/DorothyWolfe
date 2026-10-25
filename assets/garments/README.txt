GARMENTS: what hangs on the gallery rails and shows in Rooms > Collections.

1. Put a photo of each piece in this folder (PNG or JPG).
   - Best: the garment on a hanger or cut out on a TRANSPARENT background (PNG), shot straight on.
     A photo with a background also works; it hangs as a picture card.
   - Size: about 256 x 640 px is plenty for the 3D world (it gets pixelated PS1-style anyway).
     A bigger copy can go in "photo" for the Collections window.
2. Edit garments.json: one entry per piece, in the order they should hang.
   {
     "name":  "Nocturne slip",                 (shown in Collections)
     "image": "nocturne.png",                  (file in this folder, hung on the rail)
     "photo": "nocturne-large.jpg",            (optional: bigger image for the Collections window)
     "note":  "Silk, hand-dyed in the bath.",  (optional: a line of text)
     "price": "$240",                          (optional)
     "link":  "https://..."                    (optional: shop / Instagram link)
   }
3. The first six hang on the gallery rails (three per rail). All of them show in Collections.

Placeholders: placeholder-1..6.png are drawn by tools/make_garments.py. Delete them once real ones are in.
