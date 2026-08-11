// Ask Finora RPC boundary. Thin wrapper only — all logic lives in the
// server-only module so the server-fn splitter can strip it from the client.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  buildAskContext,
  buildContextBlock,
  detectIntent,
  runScenariosFor,
  followUpsFor,
  askGateway,
  NOT_ENOUGH_DATA,
} from "./ask-finora.server";

export type AskFinoraAnswer = {
  answer: string;
  /** Titles of the What-If projections used, for transparency in the UI. */
  projections: string[];
  /** Deterministic follow-up questions to suggest next. */
  followUps: string[];
  usedData: boolean;
};

export const askFinora = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { question: string; history?: Array<{ question: string; answer: string }> }) => {
    const question = String(input?.question ?? "").trim();
    if (!question) throw new Error("Please type a question.");
    if (question.length > 500) throw new Error("Please keep your question under 500 characters.");
    // Session-only memory: at most the two previous turns, never stored.
    const history = (Array.isArray(input?.history) ? input.history : [])
      .slice(-2)
      .map((t) => ({ question: String(t?.question ?? "").slice(0, 500), answer: String(t?.answer ?? "").slice(0, 2000) }))
      .filter((t) => t.question && t.answer);
    return { question, history };
  })
  .handler(async ({ data, context }): Promise<AskFinoraAnswer> => {
    // context.supabase is RLS-scoped to the verified bearer token, so every
    // read below can only return this user's own rows.
    const ctx = await buildAskContext(context.supabase);
    if (!ctx.hasData) {
      return { answer: NOT_ENOUGH_DATA, projections: [], followUps: [], usedData: false };
    }

    const intent = detectIntent(data.question);
    const outcome = runScenariosFor(data.question, intent, ctx);
    const answer = await askGateway(data.question, buildContextBlock(ctx, outcome), data.history);

    return {
      answer,
      projections: outcome.projections.map((p) => p.title),
      followUps: followUpsFor(intent, ctx, outcome),
      usedData: true,
    };
  });
