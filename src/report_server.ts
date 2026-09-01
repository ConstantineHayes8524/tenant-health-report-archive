import { createServer } from "node:http";
import { ZodError } from "zod";
import { InfraiError } from "./infrai_pdf_client.js";
import { reportRequestSchema } from "./report_policy.js";
import { renderPeriodicReport } from "./report_service.js";

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("Set INFRAI_API_KEY before starting the service");

const port = Number(process.env.PORT ?? "3000");

const server = createServer(async (request, response) => {
  response.setHeader("content-type", "application/json");
  if (request.method !== "POST" || request.url !== "/reports/periodic") {
    response.writeHead(404).end(JSON.stringify({ error: "not_found" }));
    return;
  }

  try {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const input = reportRequestSchema.parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    const result = await renderPeriodicReport(input, apiKey);
    response.writeHead(result.status === "archived" ? 201 : 200).end(JSON.stringify(result));
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      response.writeHead(400).end(JSON.stringify({ error: "invalid_request" }));
      return;
    }
    if (error instanceof InfraiError) {
      const status = error.status >= 400 && error.status < 500 ? error.status : 502;
      response.writeHead(status).end(JSON.stringify({ error: error.code }));
      return;
    }
    response.writeHead(502).end(JSON.stringify({ error: "report_generation_failed" }));
  }
});

server.listen(port, () => console.log(`Report service listening on http://localhost:${port}`));
