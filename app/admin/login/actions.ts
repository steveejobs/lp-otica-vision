"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

function safeNextPath(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return "/admin";
  }

  return value.startsWith("/admin") && !value.startsWith("//") ? value : "/admin";
}

export async function loginAdmin(formData: FormData) {
  const emailValue = formData.get("email");
  const passwordValue = formData.get("password");
  const nextPath = safeNextPath(formData.get("next"));

  if (
    typeof emailValue !== "string" ||
    typeof passwordValue !== "string" ||
    emailValue.length > 254 ||
    passwordValue.length > 200 ||
    !emailValue.trim() ||
    !passwordValue
  ) {
    redirect("/admin/login?error=invalid");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: emailValue.trim().toLowerCase(),
    password: passwordValue,
  });

  if (error || !data.user) {
    redirect("/admin/login?error=invalid");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("active")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile?.active) {
    await supabase.auth.signOut();
    redirect("/admin/login?status=inactive");
  }

  redirect(nextPath);
}
