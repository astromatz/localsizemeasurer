#!/usr/bin/env python3
"""Baut das PixInsight-Update-Paket fuer LocalSizeMeasurer.

Aufruf (aus dem Repo-Hauptordner):
    python3 tools/build_update.py

Was passiert:
  1. Sucht das neueste Script LSM_*.js und liest VERSION daraus.
  2. Packt es als src/scripts/LocalSizeMeasurer/LocalSizeMeasurer.js
     zusammen mit LocalSizeMeasurer_Doc.html (gleicher Ordner, damit der
     Doku-Button funktioniert) und dem Icon LocalSizeMeasurer.svg
     (nach rsc/icons/script/LocalSizeMeasurer/, dort sucht PixInsight es fuer
     #feature-icon @script_icons_dir) in
     updates/<Datum>-LocalSizeMeasurer-<Version>.zip
  3. Schreibt updates/updates.xri mit SHA-1, Datum und Version.
  4. Loescht alte Zip-Pakete in updates/.

Das Repository ist unsigniert: PixInsight zeigt vor dem Download eine Warnung.
"""
import datetime
import glob
import hashlib
import os
import re
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPDATES = os.path.join(ROOT, "updates")
DOC = os.path.join(ROOT, "LocalSizeMeasurer_Doc.html")
ICON = os.path.join(ROOT, "LocalSizeMeasurer.svg")
INSTALL_DIR = "src/scripts/LocalSizeMeasurer/"
ICON_DIR = "rsc/icons/script/LocalSizeMeasurer/"
# Ab PixInsight 1.9.4 (V8-Engine, getestet mit 1.9.6) bis einschliesslich 2.9.x
PI_VERSIONS = "1.9.4:2.9.9"


def version_key(path):
    nums = re.findall(r"\d+", os.path.basename(path))
    return [int(n) for n in nums]


def main():
    scripts = sorted(glob.glob(os.path.join(ROOT, "LSM_*.js")), key=version_key)
    if not scripts:
        sys.exit("Kein Script LSM_*.js gefunden.")
    script = scripts[-1]
    src = open(script, "rb").read()
    m = re.search(rb'#define\s+VERSION\s+"([^"]+)"', src)
    if not m:
        sys.exit("VERSION nicht im Script gefunden.")
    version = m.group(1).decode()
    if not os.path.exists(DOC):
        sys.exit("LocalSizeMeasurer_Doc.html fehlt.")
    if not os.path.exists(ICON):
        sys.exit("LocalSizeMeasurer.svg fehlt.")

    today = datetime.datetime.now(datetime.timezone.utc)
    date = today.strftime("%Y%m%d")
    zip_name = f"{date}-LocalSizeMeasurer-{version}.zip"
    os.makedirs(UPDATES, exist_ok=True)

    for old in glob.glob(os.path.join(UPDATES, "*.zip")):
        os.remove(old)

    zip_path = os.path.join(UPDATES, zip_name)
    stamp = (today.year, today.month, today.day, 12, 0, 0)
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
        for arc, data in (
            (INSTALL_DIR + "LocalSizeMeasurer.js", src),
            (INSTALL_DIR + "LocalSizeMeasurer_Doc.html", open(DOC, "rb").read()),
            (ICON_DIR + "LocalSizeMeasurer.svg", open(ICON, "rb").read()),
        ):
            info = zipfile.ZipInfo(arc, date_time=stamp)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            z.writestr(info, data)

    sha1 = hashlib.sha1(open(zip_path, "rb").read()).hexdigest()

    xri = f"""<?xml version="1.0" encoding="UTF-8"?>
<xri version="1.0">
   <description>
      <p>LocalSizeMeasurer – Update-Repository von astromatz (https://github.com/astromatz/localsizemeasurer)</p>
   </description>
   <platform os="all" arch="noarch" version="{PI_VERSIONS}">
      <package fileName="{zip_name}" sha1="{sha1}" type="script" releaseDate="{date}">
         <title>LocalSizeMeasurer {version}</title>
         <description>
            <p>Interaktives Mess-Lineal: zeigt die projizierte physische Größe und Fläche einer gezogenen Strecke oder Kreisfläche (Deepsky in Lichtjahren, Sonnensystem in km). Menü: Script &gt; Utilities &gt; LocalSizeMeasurer.</p>
         </description>
      </package>
   </platform>
</xri>
"""
    with open(os.path.join(UPDATES, "updates.xri"), "w", encoding="utf-8", newline="\n") as f:
        f.write(xri)

    print(f"Script:  {os.path.basename(script)} (v{version})")
    print(f"Paket:   updates/{zip_name}")
    print(f"SHA-1:   {sha1}")
    print("Index:   updates/updates.xri")


if __name__ == "__main__":
    main()
