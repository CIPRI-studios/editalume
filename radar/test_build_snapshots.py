import unittest
from datetime import datetime,timezone,timedelta
from tempfile import TemporaryDirectory
from pathlib import Path
from . import build_snapshots as snap
NOW=datetime(2026,10,2,15,tzinfo=timezone.utc)
ITEM={"pncp_id":"00000000000001-1-1/2026","uf":"SP","municipality":"Campinas","agency":"Orgao","title":"Aviso sintetico valido","closing_at":(NOW+timedelta(days=4)).isoformat(),"last_observed_at":NOW.isoformat()}
COVER=[{"status":"partial","last_success_at":NOW.isoformat(),"last_attempt_at":NOW.isoformat()}]
class TestSnapshots(unittest.TestCase):
 def test_links_and_regions(self):
  self.assertTrue(snap.valid_record(ITEM,NOW))
  self.assertIsNone(snap.valid_record({**ITEM,"uf":"RJ"},NOW))
  self.assertIsNone(snap.valid_record({**ITEM,"closing_at":NOW.isoformat()},NOW))
 def test_partial_metadata(self):
  data,status=snap.build([ITEM],COVER,NOW)
  self.assertFalse(data["exhaustive"])
  self.assertEqual(data["observed_this_run"],0)
  self.assertEqual(data["carried_forward_unreconfirmed"],1)
  self.assertTrue(status["degraded"])
 def test_files_without_network(self):
  def reader(api,key,table,params):
   return COVER if table=="editalume_uf_coverage" else [ITEM]
  with TemporaryDirectory() as t:
   data=snap.produce("https://demo.supabase.co/rest/v1","public",Path(t),reader,NOW)
   self.assertEqual(len(data["opportunities"]),1)
   self.assertTrue((Path(t)/"search-index.json").is_file())
   self.assertTrue((Path(t)/"opportunities.json").is_file())
   self.assertTrue((Path(t)/"refresh-status.json").is_file())
if __name__=="__main__":unittest.main()
