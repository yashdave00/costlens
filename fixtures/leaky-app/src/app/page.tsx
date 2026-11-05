import { createClient } from "@supabase/supabase-js";
import moment from "moment";
import _ from "lodash";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function Page() {
  // Uncached fetch
  const res = await fetch("https://api.example.com/stats");
  const stats = await res.json();

  // N+1: fetch each user's orders in a loop
  const { data: users } = await supabase.from("users").select("*");
  const orders = [];
  for (const u of users) {
    const { data } = await supabase.from("orders").select("*").eq("user_id", u.id);
    orders.push(data);
  }

  return (
    <div>
      <img src="/hero.png" alt="hero" />
      <p>Joined {moment().format("LLLL")}</p>
      <p>{_.size(users)} users</p>
    </div>
  );
}
