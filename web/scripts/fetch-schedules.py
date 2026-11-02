"""Print official US release dates (2026-10 .. 2027-12) from public, keyless pages, for checking the built-in schedule."""
import re, urllib.request, html

UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15", "Accept": "text/html,text/calendar,*/*", "Accept-Language": "en-US,en;q=0.9"}

def get(url):
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
            return r.status, r.read().decode("utf-8", "replace")
    except Exception as e:
        return getattr(e, "code", "ERR"), str(e)

# FRED release calendar pages (keyless HTML), one per release and year.
RIDS = {"fomc": 101, "cpi": 10, "nfp": 50, "gdp": 53, "pce": 54, "ppi": 46, "retail": 9, "claims": 180, "jolts": 192}
for name, rid in RIDS.items():
    for y in (2026, 2027):
        st, body = get(f"https://fred.stlouisfed.org/releases/calendar?rid={rid}&y={y}")
        txt = re.sub(r"<[^>]+>", " ", body)
        txt = html.unescape(re.sub(r"\s+", " ", txt))
        dates = re.findall(r"(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday) (\w+ \d{1,2}, \d{4})", txt)
        print(f"FRED {name} rid={rid} y={y} status={st} n={len(dates)} :: {' | '.join(dict.fromkeys(dates))}")

st, body = get("https://www.bls.gov/schedule/news_release/bls.ics")
print("BLS ics status", st, "len", len(body))
if st == 200:
    for ev in body.split("BEGIN:VEVENT")[1:]:
        s = re.search(r"SUMMARY:(.*)", ev); d = re.search(r"DTSTART[^:]*:(\d{8}T?\d*)", ev)
        if s and d and d.group(1)[:4] in ("2026", "2027") and re.search(r"Consumer Price Index|Employment Situation|Producer Price Index|Job Openings", s.group(1)) and "Metropolitan" not in s.group(1):
            print("BLS", d.group(1), s.group(1).strip())

st, body = get("https://www.bea.gov/news/schedule/full")
print("BEA status", st, "len", len(body))
txt = html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", body)))
for m in re.finditer(r"(\w+ \d{1,2}(?:, \d{4})?)\s+(\d{1,2}:\d{2} [AP]M)\s+(?:News|Data)?\s*([^|]{0,120}?(?:GDP|Gross Domestic Product|Personal Income and Outlays)[^|]{0,60})", txt):
    print("BEA", m.group(1), m.group(2), m.group(3)[:140])

st, body = get("https://www.census.gov/economic-indicators/calendar-listview.html")
print("Census status", st, "len", len(body))
