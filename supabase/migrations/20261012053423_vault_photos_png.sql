-- Studio cut-outs keep a transparent background so they sit on the app's
-- tiles: WebP where the browser can encode it, PNG otherwise (Safari).
update storage.buckets
   set allowed_mime_types = array['image/jpeg', 'image/webp', 'image/png']
 where id = 'vault-photos';
