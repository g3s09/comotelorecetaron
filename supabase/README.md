# Configuracion de Supabase

1. Crea un proyecto en Supabase.
2. En SQL Editor, ejecuta schema.sql.
3. En Vercel > Project > Settings > Environment Variables agrega, tanto para Production como Preview:
   - SUPABASE_URL: la URL del proyecto de Supabase.
   - SUPABASE_SERVICE_ROLE_KEY: la clave service_role de Supabase; nunca se expone al navegador.
   - CTLR_ADMIN_TOKEN: una clave nueva y privada para entrar a /admin.html.
4. Haz un nuevo deploy.

La tabla site_catalog guarda todo el menu como JSON y el bucket publico ctlr-images almacena las imagenes que se suben desde el panel. Si no hay una fila todavia, el sitio carga el catalogo inicial incluido en data/catalog.json.
