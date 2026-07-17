import { createClient } from "@supabase/supabase-js";

function required(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Variavel obrigatoria ausente: ${name}.`);
  }

  return value;
}

const url = required("NEXT_PUBLIC_SUPABASE_URL");
const secretKey = required("SUPABASE_SECRET_KEY");
const email = required("BOOTSTRAP_ADMIN_EMAIL").toLowerCase();

if (!secretKey.startsWith("sb_secret_")) {
  throw new Error("SUPABASE_SECRET_KEY invalida para bootstrap server-only.");
}

const supabase = createClient(url, secretKey, {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false,
  },
});

const { data, error } = await supabase.auth.admin.listUsers({
  page: 1,
  perPage: 1000,
});

if (error) {
  throw new Error("Nao foi possivel consultar os usuarios autorizados.");
}

const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email);

if (!user) {
  throw new Error(
    "Usuario nao encontrado. Envie primeiro um convite pelo painel Supabase e execute novamente.",
  );
}

const { error: updateError } = await supabase
  .from("profiles")
  .update({ active: true, role: "admin" })
  .eq("id", user.id);

if (updateError) {
  throw new Error("Nao foi possivel ativar o perfil administrativo.");
}

console.log("Perfil administrativo ativado com sucesso.");
