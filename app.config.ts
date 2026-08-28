// Use hosted Supabase by default. A local self-hosted Supabase environment can
// override these two public values through .env.docker without source changes.
export default ({ config }: { config: typeof import('./app.json')['expo'] }) => ({
  ...config,
  extra: {
    ...config.extra,
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || config.extra?.supabaseUrl,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || config.extra?.supabaseAnonKey,
  },
});
