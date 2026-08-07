import { supabase } from "@/integrations/supabase/client";
import { currentUserId } from "./base.repo";
import type { Profile, ProfileUpdate, UserSettings, UserSettingsUpdate } from "@/types/database";

export const profilesRepo = {
  async getMine(): Promise<Profile | null> {
    const userId = await currentUserId();
    const { data, error } = await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle();
    if (error) throw new Error(`[profiles.getMine] ${error.message}`);
    return data;
  },
  async updateMine(values: ProfileUpdate): Promise<Profile> {
    const userId = await currentUserId();
    const { data, error } = await supabase
      .from("profiles")
      .update(values)
      .eq("user_id", userId)
      .select()
      .single();
    if (error) throw new Error(`[profiles.updateMine] ${error.message}`);
    return data;
  },
};

export const userSettingsRepo = {
  async getMine(): Promise<UserSettings | null> {
    const userId = await currentUserId();
    const { data, error } = await supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(`[user_settings.getMine] ${error.message}`);
    return data;
  },
  async upsertMine(values: UserSettingsUpdate): Promise<UserSettings> {
    const userId = await currentUserId();
    const { data, error } = await supabase
      .from("user_settings")
      .upsert({ ...values, user_id: userId }, { onConflict: "user_id" })
      .select()
      .single();
    if (error) throw new Error(`[user_settings.upsertMine] ${error.message}`);
    return data;
  },
};