import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import OpenAI from "https://esm.sh/openai@4.77.0";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  if (!req.headers.get("Authorization")) return new Response(JSON.stringify({ error: "Sign in required" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return new Response(JSON.stringify({ error: "OPENAI_API_KEY secret is not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  try {
    const body = await req.json();
    const images = Array.isArray(body.images) ? body.images.slice(0, 4) : [];
    const valid = images.filter((x: any) => typeof x.dataUrl === "string" && /^data:image\/(jpeg|png|webp|gif);base64,/.test(x.dataUrl));
    if (!valid.length) return new Response(JSON.stringify({ error: "Upload at least one supported image" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const client = new OpenAI({ apiKey });
    const content: any[] = [{ type: "input_text", text: `Ты помощник кузовного автомаляра. На русском проанализируй фото. Авто: ${body.car || "не указано"}; элемент: ${body.element || "не указан"}; тип повреждения: ${body.damageType || "не указан"}; регион: ${body.region || "Нижегородская область"}. Опиши видимые повреждения, возможные работы, неопределённости, примерный диапазон стоимости в рублях и какие дополнительные фото/осмотр нужны. Не выдавай оценку за точную рыночную цену, не утверждай, что скрытых повреждений нет. В конце добавь JSON на отдельной строке с полем suggestedLines: массив из 2–5 объектов, у каждого name, qty (число) и price (число). Цены предварительные и требуют проверки мастером.` }];
    for (const img of valid) content.push({ type: "input_image", image_url: img.dataUrl, detail: "high" });
    const response = await client.responses.create({ model: "gpt-4.1-mini", input: [{ role: "user", content }] });
    const text = response.output_text || "Не удалось получить текст оценки";
    let suggestedLines: any[] = [];
    const match = text.match(/\{[\s\S]*"suggestedLines"\s*:\s*\[[\s\S]*?\][\s\S]*\}/);
    if (match) { try { suggestedLines = JSON.parse(match[0]).suggestedLines || []; } catch { suggestedLines = []; } }
    return new Response(JSON.stringify({ assessment: text, suggestedLines }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message || e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
