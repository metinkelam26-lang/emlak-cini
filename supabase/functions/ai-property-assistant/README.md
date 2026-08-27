# AI Property Assistant

This optional function keeps the OpenAI credential on the server and returns generated listing text or customer analysis. The main application uses local templates and deterministic matching by default, so normal usage does not require an OpenAI request.

Configure the secret in Supabase before deploying:

```sh
supabase secrets set OPENAI_API_KEY="your-key"
supabase functions deploy ai-property-assistant
```

The browser sends only `{ type, id }`. The function reads the source record with the service role, calls `gpt-4o-mini`, and returns a validated JSON result. The client falls back to a local template if the function or OpenAI is unavailable. Never use a `VITE_` prefix for this secret because Vite exposes `VITE_*` values to browser code.
