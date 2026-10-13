# CLAUDE.md

Demo de preconsulta médica por voz con HeyNow. Next.js 16 (App Router) en Vercel +
Asterisk 20.18.1 en un VPS. Toda la UI y la documentación van en español.

## Reglas

- **Datos ficticios siempre.** Nada de datos de pacientes reales en pruebas, fixtures ni
  ejemplos.
- **No inventar APIs de HeyNow.** Lo único verificado es lo que muestra el portal:
  - el canal WSS · Heynow Asterisk (`asterisk/templates/websocket_client.conf` y la línea
    `Dial` de `extensions.conf`, copiados literalmente);
  - la sección "MCPs habilitados".

  Cualquier otra cosa se marca como pendiente de validar.
- **Literal vs. generado:** los campos `*_raw` son palabras del paciente. El único texto
  generado es `summary`, y la UI lo etiqueta "Generado por IA · no verificado".
- **La tool MCP solo escribe** una ficha nueva. No agregues herramientas de lectura o
  borrado al servidor que consume el agente.
- **Secretos solo en variables de entorno.** Nunca en el código ni en el repositorio.
- `src/proxy.ts` protege `/llamar` y `/medico`. Las rutas `/api/*` validan su propio
  token.

## Antes de dar algo por terminado

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```
