import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getRepository } from './db';
import { hasAnyContent, intakeInputSchema, intakeInputShape } from './intake';

export const TOOL_NAME = 'registrar_preconsulta';

const TOOL_DESCRIPTION = `Guarda la información de preconsulta para que el médico la revise antes de la cita.
Llámala UNA sola vez, al final de la entrevista (o al activar el protocolo de urgencia).
Reglas:
- En los campos *_raw escribe lo que dijo el paciente, con sus palabras. No interpretes, no traduzcas a términos médicos y no completes lo que no dijo.
- Si el paciente no supo o no quiso responder algo, deja el campo vacío y agrégalo a pending_items.
- summary es tu resumen breve; no incluyas diagnósticos ni recomendaciones.
- Si se activó el protocolo de urgencia, urgent=true y copia la frase exacta en urgent_trigger_raw.`;

/**
 * Servidor MCP que HeyNow consume como herramienta del agente.
 *
 * Solo expone escritura de una ficha nueva: el agente no puede leer, modificar ni borrar
 * fichas existentes, de modo que un prompt manipulado no puede exfiltrar datos de otros
 * pacientes por esta vía.
 */
export const createIntakeMcpServer = (): McpServer => {
  const server = new McpServer({ name: 'preconsulta-demo', version: '0.1.0' });

  server.registerTool(
    TOOL_NAME,
    {
      title: 'Registrar preconsulta',
      description: TOOL_DESCRIPTION,
      inputSchema: intakeInputShape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async (args) => {
      const parsed = intakeInputSchema.safeParse(args);
      if (!parsed.success) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Datos inválidos: ${parsed.error.message}` }],
        };
      }
      if (!hasAnyContent(parsed.data)) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: 'No se guardó: la ficha está vacía. Incluye al menos el motivo, los síntomas o el resumen.',
            },
          ],
        };
      }
      const record = await getRepository().insert(parsed.data, 'heynow-mcp');
      return {
        content: [
          {
            type: 'text',
            text: `Preconsulta registrada con el identificador ${record.id}.`,
          },
        ],
      };
    },
  );

  return server;
};
