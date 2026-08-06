import { chromium } from "@playwright/test";
const APP="http://localhost:3000"; const PID="b8145758-8365-49bf-9be1-1bb592092b92";
const clean=(s:string)=>s.replace(/\s+/g," ").trim();
(async () => {
  const b=await chromium.launch();
  const p=await (await b.newContext({viewport:{width:1440,height:1000}})).newPage();
  await p.goto(`${APP}/projects/${PID}/requirements`); await p.waitForTimeout(4500);
  console.log("HEADERS:", (await p.locator("table thead th").allInnerTexts()).map(clean).filter(Boolean).join(" | "));
  for (const r of (await p.locator("table tbody tr").all()).slice(0,4))
    console.log("ROW:", clean(await r.innerText()).slice(0,150));
  const body=clean(await p.locator("main").first().innerText());
  const m=body.match(/(\d+\s+requirements?[\s\S]{0,180})/i); console.log("ROLLUP:", m?m[1]:"(none)");
  // fly-in
  await p.locator("table tbody tr").first().click(); await p.waitForTimeout(2200);
  const d=p.locator('[role="dialog"]').last();
  console.log("FLYIN:", clean(await d.innerText()).slice(0,600));
  await b.close();
})().catch(e=>{console.error("ERR",e.message);process.exit(1)});
