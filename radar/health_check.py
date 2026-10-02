"""Read-only daily freshness check for the 27-state public sample."""
import json
from datetime import datetime,timedelta,timezone
from pathlib import Path
from build_snapshots import public_config,request_json
from national_collector import UFS
def check(rows,now):
    by_uf={r["uf"]:r for r in rows if isinstance(r,dict) and r.get("uf") in UFS}
    stale=[]
    for uf in UFS:
        item=by_uf.get(uf,{})
        try:
            dt=datetime.fromisoformat(item["last_success_at"].replace("Z","+00:00"))
            age=now-dt.astimezone(timezone.utc)
            if age>timedelta(hours=20) or age< -timedelta(minutes=5) or item.get("status") in ("failed","rate_limited"):
                stale.append(uf)
        except (KeyError,AttributeError,ValueError,TypeError):
            stale.append(uf)
    return stale
if __name__=="__main__":
    now=datetime.now(timezone.utc)
    api,key=public_config(Path("site/national.js").read_text())
    rows=request_json(api,key,"editalume_uf_coverage",{
        "select":"uf,status,last_success_at","order":"uf.asc","limit":"27"})
    stale=check(rows,now)
    print(json.dumps({"checked":len(rows),"stale_ufs":stale}))
    if stale:raise SystemExit(1)
