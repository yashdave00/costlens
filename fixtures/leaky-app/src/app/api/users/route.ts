import { NextResponse } from "next/server";
import fs from "fs";
import puppeteer from "puppeteer";
import sharp from "sharp";

export async function GET() {
  // blocking sync call in serverless route
  const data = fs.readFileSync("./data.json", "utf8");
  // heavy lib in route
  const browser = await puppeteer.launch();
  await browser.close();
  return NextResponse.json({ ok: true, data });
}
