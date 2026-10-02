import unittest
from datetime import datetime,timedelta,timezone
from . import health_check
from .national_collector import UFS
NOW=datetime(2026,10,2,12,tzinfo=timezone.utc)
def rows():
    return [{"uf":u,"status":"partial","last_success_at":NOW.isoformat()} for u in UFS]
class HealthCheck(unittest.TestCase):
 def test_all_27_recent(self):
    self.assertEqual(health_check.check(rows(),NOW),[])
 def test_missing_state(self):
    self.assertEqual(len(health_check.check(rows()[:-1],NOW)),1)
 def test_stale_and_failed(self):
    data=rows()
    data[0]["last_success_at"]=(NOW-timedelta(days=2)).isoformat()
    data[1]["status"]="failed"
    self.assertEqual(len(health_check.check(data,NOW)),2)
if __name__=="__main__":unittest.main()
