"""Generate the site's supplementary São Paulo sample from Editalume's OWN
public, read-only Supabase database, never the former monorepo.

The national search uses live Supabase RPC independently. This script only
produces static, explicitly partial fallback snapshots for the SP sample tab.
The publishable key is already shipped to browsers; no service role is used.
"""
from __future__ import annotations
import argparse
import json
import re
from datetime import datetime, timezone, timedelta
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

SCRIPT=Path("site/national.js")
STAMP=timedelta(hours=36)
MAX_ROWS=1000
NOTICE=("Amostra não exaustiva, derivada do banco público do Editalume. "
        "Gerar o arquivo não reconfirma cada edital no PNCP; confira editais e prazos na origem.")

def public_config(text):
    api=re.search(r'const API="(https://[a-z0-9-]+\.supabase\.co/rest/v1)";',text)
    key=re.search(r'const KEY="(sb_publishable_[A-Za-z0-9_-]+)";',text)
    if not api or not key:raise ValueError("Public Supabase API settings missing")
    return api.group(1),key.group(1)

def request_json(api,key,table,params,reader=urlopen):
    url=api+"/"+table+"?"+urlencode(params)
    req=Request(url,headers={"apikey":key,"Accept":"application/json",
                             "User-Agent":"EditalumeStaticSnapshot/1.0"})
    with reader(req,timeout=30) as res:
        doc=json.load(res)
    if not isinstance(doc,list):raise ValueError("Unexpected read-only Supabase response")
    return doc

def valid_record(row,now):
    if not isinstance(row,dict) or row.get("uf")!="SP":return None
    ident=row.get("pncp_id")
    match=re.fullmatch(r"(\d{14})-\d+-(\d+)/(\d{4})",ident or "")
    if not match or int(match[2])<1:return None
    try:
        deadline=datetime.fromisoformat(row["closing_at"].replace("Z","+00:00"))
        seen=datetime.fromisoformat(row["last_observed_at"].replace("Z","+00:00"))
    except (KeyError,TypeError,ValueError,AttributeError):
        return None
    if deadline.tzinfo is None or seen.tzinfo is None or deadline<=now:return None
    if not row.get("title") or not row.get("agency") or not row.get("municipality"):return None
    amount=row.get("estimated_value_brl")
    try:
        amount=float(amount) if amount is not None else None
        if amount is not None and not 0<amount<1e15:amount=None
    except (TypeError,ValueError):
        amount=None
    return {
        "id":ident,"object":str(row["title"])[:1200],
        "organ":str(row["agency"])[:180],"city":str(row["municipality"])[:100],
        "uf":"SP","deadline":deadline.isoformat(),"modality":str(row.get("modality") or "Verificar no PNCP"),
        "estimated_value_brl":amount,
        "source":"PNCP","source_url":f"https://pncp.gov.br/app/editais/{match[1]}/{match[3]}/{int(match[2])}",
        "sector_focus":row.get("sector_focus") is True,"relevance":int(row.get("relevance") or 0),
        "last_seen_at":seen.isoformat(),"first_seen_at":row.get("first_observed_at") or seen.isoformat()
    }

def build(rows,coverage,now):
    sample={}
    for raw in rows:
        x=valid_record(raw,now)
        if x:sample[x["id"]]=x
    items=sorted(sample.values(),key=lambda x:(x["deadline"],-x["relevance"]))[:MAX_ROWS]
    latest=coverage[0] if coverage and isinstance(coverage[0],dict) else {}
    status=latest.get("status")
    last=latest.get("last_success_at")
    try:
        scan=datetime.fromisoformat(last.replace("Z","+00:00"))
        if scan.tzinfo is None or scan>now+timedelta(minutes=5):raise ValueError()
        stamp=scan.isoformat()
        stale=now-scan>STAMP
    except (ValueError,TypeError,AttributeError):
        stamp=None
        stale=True
    # The timestamp belongs to the actual PNCP collection, NEVER to the
    # static JSON file's build date. Count no records as revalidated here.
    generated=stamp
    partial=status!="complete_sample" or stale or len(rows)>=MAX_ROWS
    index={
        "brand":"Editalume","format_version":2,"generated_at":generated,
        "coverage":"SP: amostra adicional derivada de registros públicos no banco do Editalume",
        "exhaustive":False,"region":"São Paulo","partial":partial,"rate_limited":status=="rate_limited",
        "pages_fetched_this_run":0,"records_examined_this_run":0,
        "new_or_reobserved_count":0,"indexed_open_by_recorded_deadline":len(items),
        "observed_this_run":0,"carried_forward_unreconfirmed":len(items),
        "notice":NOTICE,"opportunities":items,
    }
    refresh={"attempted_at":latest.get("last_attempt_at") or stamp,
             "sample_refresh":"failed" if stale or status=="failed" else "partial" if partial else "success",
             "index_refresh":"partial", # Static export is NOT a PNCP recheck.
             "degraded":partial or stale,"notice":NOTICE}
    return index,refresh

def produce(api,key,out,reader=request_json,now=None):
    now=now or datetime.now(timezone.utc)
    cols="pncp_id,uf,municipality,agency,title,modality,estimated_value_brl,closing_at,sector_focus,relevance,first_observed_at,last_observed_at"
    rows=reader(api,key,"editalume_opportunities",{
        "select":cols,"uf":"eq.SP","closing_at":"gt."+now.isoformat(),
        "order":"closing_at.asc","limit":str(MAX_ROWS)})
    coverage=reader(api,key,"editalume_uf_coverage",{
        "select":"status,last_attempt_at,last_success_at,records_examined,pages_examined",
        "uf":"eq.SP","limit":"1"})
    if len(coverage)!=1 or not coverage[0].get("last_success_at"):
        raise RuntimeError("No validated SP collection; will not replace existing snapshots")
    index,refresh=build(rows,coverage,now)
    if not index["generated_at"] or now-datetime.fromisoformat(index["generated_at"])>STAMP:
        raise RuntimeError("SP collection too old; refuse to publish misleading fresh snapshot")
    if not rows:
        raise RuntimeError("Database returned no SP sample; refuse to publish empty index without investigation")
    out.mkdir(parents=True,exist_ok=True)
    for name,data in (("search-index.json",index),("opportunities.json",index),("refresh-status.json",refresh)):
        (out/name).write_text(json.dumps(data,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8")
    print(json.dumps({"source":"own_public_supabase","sp_rows":len(rows),"valid":len(index["opportunities"]),
                      "source_collection_at":index["generated_at"],"partial":index["partial"]}))
    return index

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--out",type=Path,default=Path("site"))
    parser.add_argument("--offline-check",action="store_true")
    args=parser.parse_args()
    if args.offline_check:
        assert valid_record({"pncp_id":"00000000000001-1-1/2026","uf":"SP",
          "closing_at":"2099-01-01T00:00:00Z","last_observed_at":"2026-10-02T00:00:00Z",
          "title":"Aviso sintético de teste","municipality":"SP","agency":"Órgão sintético"},
          datetime(2026,10,2,tzinfo=timezone.utc))
        print("PASS independent snapshot offline validation")
        return
    api,key=public_config(SCRIPT.read_text(encoding="utf-8"))
    produce(api,key,args.out)

if __name__=="__main__":main()
