import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

interface AlertaFinanceiro {
  projeto_id: string;
  tipo: string;
  gravidade: string;
  titulo: string;
  descricao: string;
  capitulo?: string;
  factura_id?: string;
  po_id?: string;
  extra_id?: string;
  valor_referencia?: number;
  valor_actual?: number;
  desvio_percentual?: number;
  estado: string;
  analise_ia?: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { projeto_id } = await req.json();

    if (!projeto_id) {
      return new Response(
        JSON.stringify({ error: "projeto_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create Supabase client with service role for full access
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // --- Fetch all required data in parallel ---

    const [orcamentosRes, posRes, facturasRes, extrasRes] = await Promise.all([
      // Orcamentos with chapters
      supabase
        .from("orcamentos")
        .select("id, valor, margem, orcamento_capitulos(id, nome, valor, margem)")
        .eq("projeto_id", projeto_id),

      // Purchase orders
      supabase
        .from("purchase_orders")
        .select("id, capitulo_orcamento, total, estado")
        .eq("projeto_id", projeto_id),

      // Facturas (invoices)
      supabase
        .from("procurement_facturas")
        .select("id, po_id, valor, estado, desvio_percentual")
        .eq("projeto_id", projeto_id),

      // Extras (change orders)
      supabase
        .from("extras")
        .select("id, codigo, titulo, valor, estado, created_at")
        .eq("projeto_id", projeto_id),
    ]);

    if (orcamentosRes.error) throw new Error(`Orcamentos query failed: ${orcamentosRes.error.message}`);
    if (posRes.error) throw new Error(`Purchase orders query failed: ${posRes.error.message}`);
    if (facturasRes.error) throw new Error(`Facturas query failed: ${facturasRes.error.message}`);
    if (extrasRes.error) throw new Error(`Extras query failed: ${extrasRes.error.message}`);

    const orcamentos = orcamentosRes.data || [];
    const purchaseOrders = posRes.data || [];
    const facturas = facturasRes.data || [];
    const extras = extrasRes.data || [];

    // --- Build chapter-level aggregations ---

    // Collect all chapters across orcamentos
    const chapters: Array<{ id: string; nome: string; valor: number; margem: number }> = [];
    for (const orc of orcamentos) {
      if (orc.orcamento_capitulos && Array.isArray(orc.orcamento_capitulos)) {
        for (const cap of orc.orcamento_capitulos) {
          chapters.push(cap);
        }
      }
    }

    // Index POs by capitulo
    const posByCapitulo: Record<string, typeof purchaseOrders> = {};
    for (const po of purchaseOrders) {
      if (po.capitulo_orcamento) {
        if (!posByCapitulo[po.capitulo_orcamento]) posByCapitulo[po.capitulo_orcamento] = [];
        posByCapitulo[po.capitulo_orcamento].push(po);
      }
    }

    // Index facturas by po_id for linking to chapters
    const facturasByPo: Record<string, typeof facturas> = {};
    for (const f of facturas) {
      if (f.po_id) {
        if (!facturasByPo[f.po_id]) facturasByPo[f.po_id] = [];
        facturasByPo[f.po_id].push(f);
      }
    }

    // --- Generate alerts ---

    const newAlertas: AlertaFinanceiro[] = [];

    // Track unique keys for generated alerts (to mark stale ones as resolvido)
    const activeAlertKeys: Set<string> = new Set();

    // Helper to build a unique key for deduplication
    function alertKey(tipo: string, capitulo?: string, factura_id?: string, extra_id?: string): string {
      return `${tipo}|${capitulo || ""}|${factura_id || ""}|${extra_id || ""}`;
    }

    // --- Chapter-level alerts ---
    for (const cap of chapters) {
      const orcamentoCusto = cap.valor * (1 - (cap.margem || 0) / 100);
      const capPOs = posByCapitulo[cap.nome] || [];
      const comprometido = capPOs.reduce((sum, po) => sum + (po.total || 0), 0);

      // Facturado: sum of validated facturas linked to this chapter's POs
      let facturado = 0;
      for (const po of capPOs) {
        const poFacturas = facturasByPo[po.id] || [];
        facturado += poFacturas
          .filter((f) => f.estado === "validada")
          .reduce((sum, f) => sum + (f.valor || 0), 0);
      }

      const percentagemComprometido = orcamentoCusto > 0 ? (comprometido / orcamentoCusto) * 100 : 0;

      // capitulo_100: comprometido >= 100%
      if (percentagemComprometido >= 100) {
        const key = alertKey("capitulo_100", cap.nome);
        activeAlertKeys.add(key);
        newAlertas.push({
          projeto_id,
          tipo: "capitulo_100",
          gravidade: "urgente",
          titulo: `Capítulo "${cap.nome}" ultrapassou 100% do orçamento`,
          descricao: `Comprometido: ${comprometido.toFixed(2)}€ (${percentagemComprometido.toFixed(1)}%) do orçamento de custo ${orcamentoCusto.toFixed(2)}€. Facturado: ${facturado.toFixed(2)}€.`,
          capitulo: cap.nome,
          valor_referencia: orcamentoCusto,
          valor_actual: comprometido,
          desvio_percentual: percentagemComprometido - 100,
          estado: "activo",
        });
      }
      // capitulo_95: >= 95% (only if not already >= 100%)
      else if (percentagemComprometido >= 95) {
        const key = alertKey("capitulo_95", cap.nome);
        activeAlertKeys.add(key);
        newAlertas.push({
          projeto_id,
          tipo: "capitulo_95",
          gravidade: "critico",
          titulo: `Capítulo "${cap.nome}" atingiu ${percentagemComprometido.toFixed(1)}% do orçamento`,
          descricao: `Comprometido: ${comprometido.toFixed(2)}€ de ${orcamentoCusto.toFixed(2)}€. Restam ${(orcamentoCusto - comprometido).toFixed(2)}€ de margem.`,
          capitulo: cap.nome,
          valor_referencia: orcamentoCusto,
          valor_actual: comprometido,
          desvio_percentual: percentagemComprometido - 100,
          estado: "activo",
        });
      }
      // capitulo_85: >= 85%
      else if (percentagemComprometido >= 85) {
        const key = alertKey("capitulo_85", cap.nome);
        activeAlertKeys.add(key);
        newAlertas.push({
          projeto_id,
          tipo: "capitulo_85",
          gravidade: "atencao",
          titulo: `Capítulo "${cap.nome}" atingiu ${percentagemComprometido.toFixed(1)}% do orçamento`,
          descricao: `Comprometido: ${comprometido.toFixed(2)}€ de ${orcamentoCusto.toFixed(2)}€. Monitorizar de perto.`,
          capitulo: cap.nome,
          valor_referencia: orcamentoCusto,
          valor_actual: comprometido,
          desvio_percentual: percentagemComprometido - 100,
          estado: "activo",
        });
      }
    }

    // --- Factura-level alerts ---
    for (const f of facturas) {
      // factura_excede_po: desvio_percentual > 5%
      if (f.desvio_percentual && f.desvio_percentual > 5) {
        const key = alertKey("factura_excede_po", undefined, f.id);
        activeAlertKeys.add(key);
        newAlertas.push({
          projeto_id,
          tipo: "factura_excede_po",
          gravidade: "atencao",
          titulo: `Factura excede PO em ${f.desvio_percentual.toFixed(1)}%`,
          descricao: `Factura ${f.id} tem um desvio de ${f.desvio_percentual.toFixed(1)}% relativamente à encomenda (PO ${f.po_id}).`,
          factura_id: f.id,
          po_id: f.po_id,
          valor_actual: f.valor,
          desvio_percentual: f.desvio_percentual,
          estado: "activo",
        });
      }

      // factura_sem_po: factura without po_id
      if (!f.po_id) {
        const key = alertKey("factura_sem_po", undefined, f.id);
        activeAlertKeys.add(key);
        newAlertas.push({
          projeto_id,
          tipo: "factura_sem_po",
          gravidade: "atencao",
          titulo: `Factura sem encomenda associada`,
          descricao: `Factura ${f.id} (${f.valor?.toFixed(2)}€) não está associada a nenhuma Purchase Order.`,
          factura_id: f.id,
          valor_actual: f.valor,
          estado: "activo",
        });
      }
    }

    // --- Extra-level alerts ---
    const now = new Date();
    for (const extra of extras) {
      if (extra.estado === "pendente") {
        const createdAt = new Date(extra.created_at);
        const daysPending = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

        if (daysPending > 7) {
          const key = alertKey("extra_pendente", undefined, undefined, extra.id);
          activeAlertKeys.add(key);
          newAlertas.push({
            projeto_id,
            tipo: "extra_pendente",
            gravidade: "atencao",
            titulo: `Extra "${extra.codigo}" pendente há ${Math.floor(daysPending)} dias`,
            descricao: `Extra "${extra.titulo}" (${extra.valor?.toFixed(2)}€) está pendente desde ${createdAt.toLocaleDateString("pt-PT")}. Necessita aprovação.`,
            extra_id: extra.id,
            valor_actual: extra.valor,
            estado: "activo",
          });
        }
      }
    }

    // --- AI analysis for urgente alerts ---
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (anthropicApiKey) {
      const urgenteAlertas = newAlertas.filter((a) => a.gravidade === "urgente");
      for (const alerta of urgenteAlertas) {
        try {
          const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": anthropicApiKey,
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
              model: "claude-sonnet-4-20250514",
              max_tokens: 256,
              messages: [
                {
                  role: "user",
                  content: `Analisa este alerta financeiro de construção/arquitectura e dá uma análise de risco em 1-2 frases em português:\nTipo: ${alerta.tipo}\nTítulo: ${alerta.titulo}\nDescrição: ${alerta.descricao}\nValor orçamento: ${alerta.valor_referencia}€\nValor actual: ${alerta.valor_actual}€\nDesvio: ${alerta.desvio_percentual?.toFixed(1)}%`,
                },
              ],
            }),
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            const aiText = aiData?.content?.[0]?.text;
            if (aiText) {
              alerta.analise_ia = aiText;
            }
          }
        } catch (aiErr) {
          console.error(`AI analysis failed for alert ${alerta.tipo}:`, aiErr);
          // Non-fatal: continue without AI analysis
        }
      }
    }

    // --- Upsert alerts into database ---

    let alertasGerados = 0;
    let alertasResolvidos = 0;

    for (const alerta of newAlertas) {
      // Build match filter for upsert uniqueness
      let query = supabase
        .from("alertas_financeiros")
        .select("id")
        .eq("projeto_id", projeto_id)
        .eq("tipo", alerta.tipo);

      if (alerta.capitulo) query = query.eq("capitulo", alerta.capitulo);
      if (alerta.factura_id) query = query.eq("factura_id", alerta.factura_id);
      if (alerta.extra_id) query = query.eq("extra_id", alerta.extra_id);

      const { data: existing } = await query.maybeSingle();

      if (existing) {
        // Update existing alert
        const { error } = await supabase
          .from("alertas_financeiros")
          .update({
            gravidade: alerta.gravidade,
            titulo: alerta.titulo,
            descricao: alerta.descricao,
            valor_referencia: alerta.valor_referencia,
            valor_actual: alerta.valor_actual,
            desvio_percentual: alerta.desvio_percentual,
            estado: "activo",
            resolvido_em: null,
            resolucao_nota: null,
            analise_ia: alerta.analise_ia || null,
          })
          .eq("id", existing.id);

        if (!error) alertasGerados++;
      } else {
        // Insert new alert
        const { error } = await supabase
          .from("alertas_financeiros")
          .insert(alerta);

        if (!error) alertasGerados++;
      }
    }

    // --- Mark stale alerts as resolvido ---
    // Fetch all active alerts for this project
    const { data: activeAlerts } = await supabase
      .from("alertas_financeiros")
      .select("id, tipo, capitulo, factura_id, extra_id")
      .eq("projeto_id", projeto_id)
      .eq("estado", "activo");

    if (activeAlerts) {
      for (const existing of activeAlerts) {
        const key = alertKey(
          existing.tipo,
          existing.capitulo || undefined,
          existing.factura_id || undefined,
          existing.extra_id || undefined
        );

        if (!activeAlertKeys.has(key)) {
          // This alert is no longer triggered — resolve it
          const { error } = await supabase
            .from("alertas_financeiros")
            .update({
              estado: "resolvido",
              resolvido_em: new Date().toISOString(),
              resolucao_nota: "Auto-resolvido: condição já não se verifica.",
            })
            .eq("id", existing.id);

          if (!error) alertasResolvidos++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        alertas_gerados: alertasGerados,
        alertas_resolvidos: alertasResolvidos,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("recalcular-alertas-financeiros error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
