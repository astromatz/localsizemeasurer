#engine v8
#feature-id    LocalSizeMeasurer : Utilities > LocalSizeMeasurer
#feature-info  Interaktives Mess-Lineal: zeigt die projizierte physische Groesse und \
               Flaeche einer im Dialog-Bild gezogenen Strecke oder Kreisflaeche. \
               Unterstuetzt Deepsky- und Sonnensystem-Objekte mit Katalogen \
               sowie den Export annotierter Bilder als PNG/JPG. \
               Es werden keine Bilddaten veraendert.

#include <pjsr/DataType.jsh>
#include <pjsr/StdButton.jsh>
#include <pjsr/StdIcon.jsh>
#include <pjsr/TextAlign.jsh>
#include <pjsr/StdCursor.jsh>

/*
 * LocalSizeMeasurer v2.4.0
 *
 * Interaktives Mess-Lineal fuer PixInsight (PJSR):
 *  - Echte physikalische Raumdimensionen (Lichtjahre, Lichttage, km, AE)
 *  - Strecken- und Kreis-Flaechenmessung am astronomischen Objekt
 *  - Automatischer Vergleich mit dem Sonnensystem (100 AE) und Erddurchmesser (12.742 km)
 *  - Metadaten- & Astrometrie-Inspektion (FITS & XISF, Brennweite, Pixelgroesse, Plate-Solve)
 *  - Deepsky- & Sonnensystem-Modus mit integrierten wissenschaftlichen Katalogen
 *  - Online-Objektsuche via SIMBAD TAP (CDS / Harvard) und NED (NASA/IPAC), mit Plausibilitaetspruefung
 *  - Export annotierter Bilder als PNG/JPG mit Vektor-Overlays, Mess-Tags, Legende & Banner
 *  - Umfassende HTML-Benutzerdokumentation direkt im PixInsight-Browser
 *
 * Neu in v2.3:
 *  - Sonnensystem: gemessene Strecken, Durchmesser und Flaechen nur noch in km (AE nur fuer die Objektentfernung)
 *  - Faktor-Erkennung bei Skalenabweichung (2, 3, 4, 0,5) mit konkreter Ursache und Abhilfe
 *  - Debayer-Hinweis (BAYERPAT / CFA-Properties), Erkennung von Super-Pixel-Debayer
 *  - Rueckfrage zur Originalaufloesung, wenn kein Plate-Solve vorliegt (mit Faktor-Eingabe)
 *  - Plate-Solve-Skala aus mehreren Quellen (Fenster-Loesung, PCL-Matrix, Astrometry:Resolution, FITS-WCS)
 *    mit Gegenpruefung und Diagnose im Konsolenbericht
 *
 * Neu in v2.3.6:
 *  - Veraltete Plate-Solve-Daten werden erkannt: Weicht die Bildgroesse in beiden Richtungen um denselben
 *    Faktor von NAXIS1/NAXIS2 im Header ab (z. B. Super-Pixel-Debayer), wird die Header-Loesung nicht verwendet
 *  - Super-Pixel-Debayer: Faktor 2 vorbelegt ohne Warnung vor doppelter Korrektur (PixInsight passt XPIXSZ dort nicht an)
 *  - Drizzle-Integration erkannt (PCL:Signature / Image:Id) mit Hinweis zur angepassten Pixelgroesse
 *  - Hinweis, wenn Brennweite und Plate-Solve exakt uebereinstimmen (Brennweite vermutlich aus dem Plate-Solve, z. B. ASIAIR)
 *  - Konsolenbericht zeigt Matrix- und Vektor-Properties mit Werten
 *  - Begriffe: "debayert" statt "entbayert"; Modus-Auswahl Sonnensystem ohne "AE"
 *
 * Neu in v2.4 (Angleichung an LocalSizeMeasurer Web):
 *  - Ergebnisliste im Messfenster (rechts vom Bild), einzelne Messungen loeschbar
 *  - "Eingaben aendern ...": Parameter-Dialog erneut oeffnen, Messungen bleiben erhalten und werden neu berechnet
 *  - Esc bricht nur noch die laufende Messung ab; Beenden ueber "Messmodus beenden"
 *  - Werkzeug Linie/Kreis als Umschaltknoepfe; "Einpassen" statt "Fit"; Einheit "Lj" statt "Lj"
 *
 * Credits & Inspiration:
 *  - Urspruengliche Idee & Excel-Rechner (seit 2021 genutzt): Rainer und Daniel
 *    Quelle: "Rechner! Ausdehnung pro Pixel in Kilometer bzw. Lichtjahre bei Mond Krater oder Planeten bestimmen"
 *    (https://www.youtube.com/watch?v=s6AZzTCcYxc)
 *  - PixInsight-Skript-Umsetzung & Erweiterung via Vibe Coding. Dank und Gruss an die beiden! :-)
 */

// ============================================================================
// Konstanten & Physikalische Referenzen
// ============================================================================
#define VERSION            "2.4.0"
#define TITLE              "LocalSizeMeasurer"

var ARCSEC_PER_RAD     = 648000 / Math.PI;          // 206264,806247...
var AU_PER_LY          = 63241.077088;
var KM_PER_LY          = 9.4607304725808e12;
var KM_PER_AU          = 149597870.7;               // exakte Definition der Astronomischen Einheit
var C_KM_S             = 299792.458;                // Lichtgeschwindigkeit in km/s

var SOLARSYS_AU        = 100;                       // Referenzdurchmesser Sonnensystem (100 AE)
var SOLARSYS_RADIUS_AU = 50;                        // Radius der 100-AE-Scheibe
var SOLARSYS_AREA_AU2  = Math.PI * 50 * 50;         // 2500 * pi ca. 7853,98 AE^2

var EARTH_RADIUS_KM    = 6371.0;                    // Mittlerer Erdradius in km
var EARTH_DIAMETER_KM  = 12742.0;                   // Mittlerer Erddurchmesser
var EARTH_DISK_KM2     = Math.PI * 6371.0 * 6371.0; // ca. 1,27516e8 km^2

var KEY_MODE           = "LocalSizeMeasurer/mode";
var KEY_FOCAL          = "LocalSizeMeasurer/focalLengthMm";
var KEY_PIXEL          = "LocalSizeMeasurer/pixelSizeUm";
var KEY_DISTANCE_LY    = "LocalSizeMeasurer/distanceLy";
var KEY_DISTANCE_KM    = "LocalSizeMeasurer/distanceKm";
var KEY_DEEPSKY_OBJ    = "LocalSizeMeasurer/deepskyObjIndex";
var KEY_SOLAR_OBJ      = "LocalSizeMeasurer/solarObjIndex";
var KEY_SOLAR_STAGE    = "LocalSizeMeasurer/solarStageIndex";

var DEFAULTS = {
   mode:          "deepsky",
   focalLengthMm: 480,
   pixelSizeUm:   3.75,
   distanceLy:    3000,
   distanceKm:    384400,
   deepskyIdx:    0,
   solarObjIdx:   0,
   solarStageIdx: 1
};

var MAX_PREVIEW_DIM    = 1600;
var NATIVE_MAX_PIXELS  = 70e6;
var LINE_COLOR         = 0xFF00E000;
var PALETTE            = [ 0xFFFFC000, 0xFF00D0FF, 0xFFFF7A00, 0xFFFF55FF, 0xFF90FF90, 0xFFFFFFFF ];
var MAX_ZOOM           = 16;
var MIN_ZOOM           = 0.001;

var SCALE_DEV_PCT      = 2;      // ab dieser Abweichung (Optik vs. Plate-Solve) wird gewarnt
var FACTOR_TOL         = 0.03;   // Toleranz der Faktor-Erkennung (wie in LSM Web)

var KEY_ESCAPE = 0x01000000;
var KEY_HOME   = 0x01000010;
var KEY_END    = 0x01000011;
var KEY_LEFT   = 0x01000012;
var KEY_UP     = 0x01000013;
var KEY_RIGHT  = 0x01000014;
var KEY_DOWN   = 0x01000015;
var KEY_PGUP   = 0x01000016;
var KEY_PGDN   = 0x01000017;
var KEY_BACK   = 0x01000003;
var KEY_DEL    = 0x01000007;
var KEY_L      = 0x4C;
var KEY_K      = 0x4B;
var KEY_C      = 0x43;
var KEY_F      = 0x46;
var KEY_ONE    = 0x31;

// ============================================================================
// Dokumentations-Aufruf
// ============================================================================
function openDocumentation()
{
   var docName = "LocalSizeMeasurer_Doc.html";
   var scriptDir = File.extractDrive( #__FILE__ ) + File.extractDirectory( #__FILE__ );
   var docPath = scriptDir + "/" + docName;

   if ( !File.exists( docPath ) )
   {
      ( new MessageBox( "Die Dokumentationsdatei wurde nicht gefunden:\n\n" + docPath +
                        "\n\nBitte " + docName + " in denselben Ordner wie das Script legen.",
                        TITLE + " Dokumentation", StdIcon_Warning, StdButton_Ok ) ).execute();
      return;
   }

   var norm = docPath.replace( /\\/g, "/" );
   var url = ( norm.charAt( 0 ) === "/" ) ? ( "file://" + norm ) : ( "file:///" + norm );
   url = encodeURI( url ).replace( /#/g, "%23" );

   var opened = false;
   try
   {
      if ( typeof Dialog.openBrowser === "function" )
      {
         Dialog.openBrowser( url );
         opened = true;
      }
   }
   catch ( e )
   {
      console.warningln( "** Dokumentation konnte nicht geöffnet werden: " + e );
   }

   if ( !opened )
      ( new MessageBox( "Der PixInsight-Browser konnte die Dokumentation nicht öffnen.\n\n" +
                        "Bitte die Datei manuell in einem Browser öffnen:\n\n" + docPath,
                        TITLE + " Dokumentation", StdIcon_Warning, StdButton_Ok ) ).execute();
}

// ============================================================================
// Kataloge (Deepsky & Sonnensystem)
// ============================================================================
var DEEPSKY_CATALOG = [
   { name: "IC 1805 – Herznebel (Heart Nebula)", ly: 7500, unc: "± 300 Lj", src: "Gaia EDR3", keys: [ "IC1805", "HEARTOHEART", "HEART", "SH2-190", "HERZNEBEL", "HEARTNEBULA" ] },
   { name: "IC 1848 – Seelennebel (Soul Nebula)", ly: 6500, unc: "± 300 Lj", src: "Gaia EDR3", keys: [ "IC1848", "SOUL", "SH2-199", "SEELENNEBEL", "SOULNEBULA" ] },
   { name: "M31 – Andromeda-Galaxie", ly: 2537000, unc: "± 50.000 Lj", src: "Cepheiden (HST)", keys: [ "M31", "ANDROMEDA", "NGC224", "ANDROMEDAGALAXIE", "ANDROMEDAGALAXY" ] },
   { name: "M33 – Dreiecksnebel (Triangulum)", ly: 2730000, unc: "± 100.000 Lj", src: "Cepheiden", keys: [ "M33", "TRIANGULUM", "NGC598" ] },
   { name: "M42 – Großer Orionnebel", ly: 1344, unc: "± 20 Lj", src: "Gaia DR2", keys: [ "M42", "ORION", "NGC1976", "ORIONNEBEL", "ORIONNEBULA", "GROSSERORIONNEBEL" ] },
   { name: "M45 – Plejaden (Siebengestirn)", ly: 444, unc: "± 6 Lj", src: "Gaia EDR3", keys: [ "M45", "PLEIADES", "PLEJADEN", "SIEBENGESTIRN" ] },
   { name: "M51 – Whirlpool-Galaxie", ly: 23500000, unc: "± 2.000.000 Lj", src: "Tully-Fisher / SN", keys: [ "M51", "WHIRLPOOL", "NGC5194", "WHIRLPOOLGALAXIE", "WHIRLPOOLGALAXY" ] },
   { name: "M81 – Bodes Galaxie", ly: 11740000, unc: "± 400.000 Lj", src: "HST Cepheiden", keys: [ "M81", "BODE", "NGC3031" ] },
   { name: "M82 – Zigarren-Galaxie", ly: 11500000, unc: "± 500.000 Lj", src: "TRGB", keys: [ "M82", "CIGAR", "NGC3034" ] },
   { name: "NGC 7000 – Nordamerika-Nebel", ly: 2590, unc: "± 70 Lj", src: "Gaia DR2", keys: [ "NGC7000", "NORTH AMERICA", "NORDAMERIKA" ] },
   { name: "NGC 2359 – Thors Helm (Thor's Helmet)", ly: 15000, unc: "± 1.500 Lj", src: "Gaia EDR3 (WR 7)", keys: [ "NGC2359", "THOR", "THORSHELM", "SH2-298" ] },
   { name: "NGC 6888 – Sichelnebel (Crescent Nebula)", ly: 5000, unc: "± 400 Lj", src: "Gaia EDR3 (WR 136)", keys: [ "NGC6888", "CRESCENT", "SH2-105" ] },
   { name: "NGC 7635 – Blasennebel (Bubble Nebula)", ly: 9100, unc: "± 800 Lj", src: "Gaia EDR3 (BD+60 2522)", keys: [ "NGC7635", "BUBBLE", "SH2-162" ] },
   { name: "IC 1396 – Elefantenrüssel-Nebel", ly: 2400, unc: "± 100 Lj", src: "Gaia EDR3", keys: [ "IC1396", "ELEPHANT", "ELEFANT" ] },
   { name: "M16 – Adlernebel (Säulen der Schöpfung)", ly: 7000, unc: "± 300 Lj", src: "Gaia EDR3", keys: [ "M16", "EAGLE", "NGC6611" ] },
   { name: "M101 – Feuerrad-Galaxie (Pinwheel)", ly: 20900000, unc: "± 600.000 Lj", src: "HST Cepheiden", keys: [ "M101", "PINWHEEL", "NGC5457" ] },
   { name: "NGC 3521 – Bubble-Galaxie (Löwe)", ly: 37300000, unc: "± 2.000.000 Lj", src: "HST Cepheiden / NED", keys: [ "NGC3521" ] },
   { name: "NGC 2237 – Rosettennebel", ly: 5200, unc: "± 200 Lj", src: "Gaia EDR3", keys: [ "NGC2237", "ROSETTE", "NGC2244", "NGC2238", "NGC2239", "NGC2246", "ROSETTENNEBEL", "CALDWELL49", "C49" ] },
   { name: "NGC 6960 – Cirrusnebel (Sturmvogel)", ly: 2400, unc: "± 100 Lj", src: "Gaia EDR3", keys: [ "NGC6960", "VEIL", "CIRRUS" ] },
   { name: "M13 – Großer Herkuleshaufen", ly: 22200, unc: "± 500 Lj", src: "Gaia EDR3", keys: [ "M13", "HERCULES", "NGC6205" ] },
   { name: "M57 – Ringnebel in der Leier", ly: 2570, unc: "± 150 Lj", src: "Gaia EDR3", keys: [ "M57", "RING", "NGC6720" ] },
   { name: "M27 – Hantelnebel (Dumbbell)", ly: 1360, unc: "± 50 Lj", src: "Gaia EDR3", keys: [ "M27", "DUMBBELL", "HANTEL", "NGC6853" ] },
   { name: "NGC 891 – Silver Sliver Galaxie", ly: 31600000, unc: "± 2.000.000 Lj", src: "Tully-Fisher", keys: [ "NGC891" ] },
   { name: "NGC 6820 – Emissionsnebel in der Füchsin (Sh2-86)", ly: 6000, unc: "± 300 Lj", src: "Gaia EDR3 (NGC 6823)", keys: [ "NGC6820", "SH2-86", "NGC6823" ] },
   { name: "Sh2-132 – Löwennebel (Lion Nebula)", ly: 10400, unc: "± 600 Lj", src: "Gaia EDR3", keys: [ "SH2-132", "SH2132", "LION", "LBN473" ] }
];

function makePlanet( name, minKm, maxKm, keys, minLabel, maxLabel )
{
   return { name: name, minKm: minKm, avgKm: 0.5 * ( minKm + maxKm ), maxKm: maxKm, keys: keys,
            minLabel: minLabel, maxLabel: maxLabel, planet: true, desc: "" };
}

var SOLARSYS_CATALOG = [
   { name: "Mond (Erdsatellit)", minKm: 363300, avgKm: 384400, maxKm: 405500,
     desc: "Perigäum: 363.300 km | Mittel: 384.400 km | Apogäum: 405.500 km (± 6 %)", keys: [ "MOON", "MOND", "LUNA" ] },
   { name: "Sonne (1 AE)", minKm: 147098074, avgKm: 149597871, maxKm: 152097701,
     desc: "Perihel: 0,983 AE | Mittel: 1,000 AE (149,6 Mio. km) | Aphel: 1,017 AE", keys: [ "SUN", "SONNE", "SOL" ] },
   makePlanet( "Merkur",  77300000,   221900000,  [ "MERCURY", "MERKUR" ],  "Größte Erdnähe", "Größte Erdferne" ),
   makePlanet( "Venus",   38200000,   261000000,  [ "VENUS" ],              "Unterer Durchgang", "Oberer Durchgang" ),
   makePlanet( "Mars",    55700000,   401300000,  [ "MARS" ],               "Perihel-Opposition", "Konjunktion" ),
   makePlanet( "Jupiter", 588500000,  968100000,  [ "JUPITER" ],            "Opposition", "Konjunktion" ),
   makePlanet( "Saturn",  1195000000, 1660000000, [ "SATURN" ],             "Opposition", "Konjunktion" ),
   makePlanet( "Uranus",  2580000000, 3160000000, [ "URANUS" ],             "Opposition", "Konjunktion" ),
   makePlanet( "Neptun",  4300000000, 4690000000, [ "NEPTUNE", "NEPTUN" ],  "Opposition", "Konjunktion" )
];

function buildSolarDescriptions()
{
   function auKm( km )
   {
      return fmt( km / KM_PER_AU, 2 ) + " AE (" +
             ( km >= 1e9 ? fmt( km / 1e9, 2 ) + " Mrd. km" : fmt( km / 1e6, 1 ) + " Mio. km" ) + ")";
   }
   for ( var i = 0; i < SOLARSYS_CATALOG.length; ++i )
   {
      var o = SOLARSYS_CATALOG[i];
      if ( o.planet )
         o.desc = o.minLabel + ": " + auKm( o.minKm ) + " | Mitte aus Min/Max: " + auKm( o.avgKm ) +
                  " | " + o.maxLabel + ": " + auKm( o.maxKm );
   }
}
buildSolarDescriptions();


// ============================================================================
// Hilfsfunktionen zur Zahlenformatierung (lesbar mit Tsd., Mio., Mrd.)
// ============================================================================
function fmt( v, dec )
{
   if ( typeof v !== "number" || !isFinite( v ) )
      return "–";
   return v.toFixed( dec ).replace( ".", "," );
}

function parseNumber( s, allowGrouping )
{
   if ( s === null || typeof s === "undefined" ) return NaN;
   var t = String( s ).replace( /[\s  ']/g, "" );
   if ( t.length === 0 ) return NaN;
   if ( allowGrouping !== false && /^[+-]?\d{1,3}(\.\d{3})+(,\d+)?$/.test( t ) )
      t = t.replace( /\./g, "" ).replace( ",", "." );          // deutsch: 2.537.000,5
   else if ( /^[+-]?\d{1,3}(,\d{3}){2,}(\.\d+)?$/.test( t ) )
      t = t.replace( /,/g, "" );                              // englisch: 1,234,567.8
   else
      t = t.replace( ",", "." );
   if ( !/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test( t ) ) return NaN;
   return Number( t );
}

function clamp( v, lo, hi )
{
   if ( !isFinite( v ) ) return lo;
   return Math.max( lo, Math.min( hi, v ) );
}

function formatAngle( arcsec )
{
   if ( arcsec < 120 )
      return fmt( arcsec, 2 ) + "″";
   if ( arcsec < 10800 )
      return fmt( arcsec / 60, 2 ) + "′";
   return fmt( arcsec / 3600, 3 ) + "°";
}

function formatLy( ly )
{
   if ( ly >= 1e9 )
      return fmt( ly / 1e9, 2 ) + " Mrd. Lj";
   if ( ly >= 1e6 )
      return fmt( ly / 1e6, 2 ) + " Mio. Lj";
   if ( ly >= 10000 )
      return fmt( ly / 1e3, 1 ) + " Tsd. Lj";
   if ( ly >= 100 )
      return fmt( ly, 0 ) + " Lj";
   if ( ly >= 10 )
      return fmt( ly, 1 ) + " Lj";
   if ( ly >= 0.01 )
      return fmt( ly, 2 ) + " Lj";
   if ( ly >= 0.0001 )
      return fmt( ly, 4 ) + " Lj";
   return fmt( ly * AU_PER_LY, 0 ) + " AE";
}

function formatAreaLy( ly2 )
{
   if ( ly2 >= 1e9 )
      return fmt( ly2 / 1e9, 2 ) + " Mrd. Lj²";
   if ( ly2 >= 1e6 )
      return fmt( ly2 / 1e6, 2 ) + " Mio. Lj²";
   if ( ly2 >= 10000 )
      return fmt( ly2 / 1e3, 1 ) + " Tsd. Lj²";
   if ( ly2 >= 1.0 )
      return fmt( ly2, 2 ) + " Lj²";
   if ( ly2 >= 0.01 )
      return fmt( ly2, 4 ) + " Lj²";
   return fmt( ly2 * AU_PER_LY * AU_PER_LY, 0 ) + " AE²";
}

function formatKm( km )
{
   if ( km >= 1e9 )
      return fmt( km / 1e9, 3 ) + " Mrd. km";
   if ( km >= 1e6 )
      return fmt( km / 1e6, 2 ) + " Mio. km";
   if ( km >= 1000 )
      return fmt( km, 1 ) + " km";
   return fmt( km, 2 ) + " km";
}

function formatAreaKm( km2 )
{
   if ( km2 >= 1e12 )
      return fmt( km2 / 1e12, 2 ) + " Bio. km²";
   if ( km2 >= 1e9 )
      return fmt( km2 / 1e9, 2 ) + " Mrd. km²";
   if ( km2 >= 1e6 )
      return fmt( km2 / 1e6, 2 ) + " Mio. km²";
   if ( km2 >= 1000 )
      return fmt( km2, 1 ) + " km²";
   return fmt( km2, 2 ) + " km²";
}

function formatAu( au )
{
   if ( au >= 100 )
      return fmt( au, 1 ) + " AE";
   if ( au >= 0.01 )
      return fmt( au, 4 ) + " AE";
   return fmt( au, 6 ) + " AE";
}

function formatAreaAu( au2 )
{
   if ( au2 >= 100 )
      return fmt( au2, 1 ) + " AE²";
   if ( au2 >= 0.001 )
      return fmt( au2, 4 ) + " AE²";
   return fmt( au2, 6 ) + " AE²";
}

function formatLightTime( sec )
{
   if ( sec < 60 )
      return fmt( sec, 2 ) + " s";
   if ( sec < 3600 )
      return fmt( sec / 60, 2 ) + " min (" + fmt( sec, 1 ) + " s)";
   return fmt( sec / 3600, 2 ) + " h";
}

function formatMultiplier( n )
{
   if ( n >= 1e9 )
      return fmt( n / 1e9, 2 ) + " Mrd.";
   if ( n >= 1e6 )
      return fmt( n / 1e6, 2 ) + " Mio.";
   if ( n >= 10000 )
      return fmt( n / 1e3, 1 ) + " Tsd.";
   if ( n >= 100 )
      return fmt( n, 0 );
   if ( n >= 1 )
      return fmt( n, 2 );
   if ( n >= 0.001 )
      return fmt( n, 4 );
   return n.toExponential( 2 ).replace( ".", "," );
}

// ============================================================================
// Massstabs-Plausibilitaet: Faktor-Erkennung & Astrometrie aus dem Fenster
// ============================================================================

// k = geloeste Skala / Optik-Skala. k > 1: Bildpixel sind groesser als laut Header
// (Binning, Super-Pixel, Verkleinerung). k < 1: Bildpixel sind kleiner (Drizzle, Vergroesserung).
var SCALE_FACTOR_HINTS = [
   { f: 2,   cause: "Binning 2×2 (nicht in der Pixelgröße enthalten), Super-Pixel-Debayer oder Verkleinerung auf 50 % (IntegerResample/Resample)",
             fix:   "Plate-Solve-Skala verwenden oder die Pixelgröße verdoppeln" },
   { f: 3,   cause: "Binning 3×3 oder Verkleinerung auf 33 %",
             fix:   "Plate-Solve-Skala verwenden oder die Pixelgröße verdreifachen" },
   { f: 4,   cause: "Binning 4×4, Binning 2×2 plus Super-Pixel-Debayer oder Verkleinerung auf 25 %",
             fix:   "Plate-Solve-Skala verwenden oder die Pixelgröße vervierfachen" },
   { f: 0.5, cause: "2×-Drizzle, Vergrößerung auf 200 % oder eine 2×-Barlow, die in der Brennweite fehlt",
             fix:   "Plate-Solve-Skala verwenden oder die Pixelgröße halbieren (fehlende Barlow: Brennweite verdoppeln)" }
];

function scaleFactorHint( solved, opt )
{
   if ( !( solved > 0 ) || !( opt > 0 ) || !isFinite( solved ) || !isFinite( opt ) ) return null;
   var k = solved / opt;
   for ( var i = 0; i < SCALE_FACTOR_HINTS.length; ++i )
   {
      var h = SCALE_FACTOR_HINTS[i];
      if ( Math.abs( k / h.f - 1 ) < FACTOR_TOL )
         return { factor: h.f, ratio: k,
                  text: "Faktor " + fmt( k, 2 ) + " (gelöste Skala ÷ Optik-Skala) – passend zu " + h.cause +
                        ". Abhilfe: " + h.fix + "." };
   }
   return null;
}

// Verhaeltnis auf einen glatten Faktor (2, 3, 4, 0,5, 1/3, 0,25) runden, wenn es nahe genug liegt
function snapFactor( r )
{
   var known = [ 2, 3, 4, 0.5, 1 / 3, 0.25 ];
   for ( var i = 0; i < known.length; ++i )
      if ( Math.abs( r / known[i] - 1 ) < FACTOR_TOL )
         return known[i];
   return r;
}

function angSepDeg( ra1, de1, ra2, de2 )
{
   var d2r = Math.PI / 180;
   var dRa = ( ra2 - ra1 ) * d2r, dDe = ( de2 - de1 ) * d2r;
   var a = Math.sin( dDe / 2 ) * Math.sin( dDe / 2 ) +
           Math.cos( de1 * d2r ) * Math.cos( de2 * d2r ) * Math.sin( dRa / 2 ) * Math.sin( dRa / 2 );
   return 2 * Math.atan2( Math.sqrt( a ), Math.sqrt( Math.max( 0, 1 - a ) ) ) / d2r;
}

// Skala in der Bildmitte aus der astrometrischen Loesung des Fensters (PixInsight >= 1.8.9).
// Liefert Bogensekunden pro Pixel oder null, wenn die API fehlt oder nichts Verwertbares liefert.
function scaleFromWindow( window, w, h )
{
   if ( typeof window.imageToCelestial !== "function" ) return null;

   function toCel( x, y )
   {
      var r = null;
      try { r = window.imageToCelestial( new Point( x, y ) ); } catch ( e ) { r = null; }
      if ( r === null || typeof r === "undefined" )
      {
         try { r = window.imageToCelestial( x, y ); } catch ( e2 ) { r = null; }
      }
      if ( r === null || typeof r === "undefined" ) return null;
      var ra = ( typeof r.x === "number" ) ? r.x : r[0];
      var de = ( typeof r.y === "number" ) ? r.y : r[1];
      return ( isFinite( ra ) && isFinite( de ) ) ? { ra: ra, de: de } : null;
   }

   var step = 10;
   var cx = Math.max( 0, w / 2 - step / 2 ), cy = Math.max( 0, h / 2 - step / 2 );
   var c = toCel( cx, cy ), a = toCel( cx + step, cy ), b = toCel( cx, cy + step );
   if ( c === null || a === null || b === null ) return null;
   var sx = angSepDeg( c.ra, c.de, a.ra, a.de ) / step * 3600;
   var sy = angSepDeg( c.ra, c.de, b.ra, b.de ) / step * 3600;
   if ( !( sx > 0 ) || !( sy > 0 ) ) return null;
   return Math.sqrt( sx * sy );
}

// ============================================================================
// Etappe 4: Online-Suche (SIMBAD TAP / NED) via PJSR FileDownload / NetworkTransfer
// ============================================================================

var NET = { offline: false, failures: 0, deadline: 0 };
var NET_TOTAL_SECONDS = 75;
var LY_PER_PC = 3.2615638;
var MIN_PLAUSIBLE_LY = 1;
var MAX_PLAUSIBLE_LY = 2e10;
var DIST_UNIT_FACTORS = { "pc": 3.2615638, "kpc": 3261.5638, "mpc": 3.2615638e6,
                          "gpc": 3.2615638e9, "ly": 1, "lyr": 1, "al": 1 };
var SIMBAD_ENDPOINTS = [
   "https://simbad.cfa.harvard.edu/simbad/sim-tap/sync",
   "https://simbad.cds.unistra.fr/simbad/sim-tap/sync",
   "https://simbad.idia.ac.za/simbad/sim-tap/sync"
];

function nowMs() { return ( new Date() ).getTime(); }

function netReset( totalSec )
{
   NET.offline = false;
   NET.failures = 0;
   NET.deadline = nowMs() + totalSec * 1000;
}

function netBlocked()
{
   return NET.offline || ( NET.deadline > 0 && nowMs() > NET.deadline );
}

function pumpEvents()
{
   try { CoreApplication.processEvents(); } catch ( e ) {}
}

function plausibleLy( ly )
{
   return isFinite( ly ) && ly >= MIN_PLAUSIBLE_LY && ly <= MAX_PLAUSIBLE_LY;
}

function medianOf( arr )
{
   var a = arr.slice().sort( function( x, y ) { return x - y; } );
   var n = a.length;
   if ( n === 0 ) return NaN;
   return ( n % 2 ) ? a[( n - 1 ) / 2] : 0.5 * ( a[n / 2 - 1] + a[n / 2] );
}

function numOrNaN( s )
{
   if ( s === null || typeof s === "undefined" ) return NaN;
   var t = String( s ).replace( /^\s+|\s+$/g, "" ).replace( ",", "." );
   if ( t.length === 0 ) return NaN;
   return parseFloat( t );
}

function shorten( s, n )
{
   s = String( s );
   return ( s.length > n ) ? s.substring( 0, n ) + " … (gekürzt)" : s;
}

function isHtmlText( text )
{
   return /<html[\s>]/i.test( String( text ).substring( 0, 3000 ) ) ||
          /^\s*<!doctype\s+html/i.test( String( text ) );
}

function isTapErrorResponse( raw )
{
   return /^\s*<\?xml/i.test( raw ) || /QUERY_STATUS[^>]*ERROR/i.test( raw );
}

function isNebulaLikeType( ot )
{
   if ( !ot ) return false;
   return /(HII|PN|SNR|Neb|RNe|GNe|DNe|Cld|MoC|SFR|Cl\*|OpC|\*Ass|Psh|Bub|ISM|Shell)/i.test( ot );
}

// ----------------------------------------------------------------------------
// Namens-Zuordnung
// ----------------------------------------------------------------------------
function normalizeKey( s )
{
   return String( s ).toUpperCase().replace( /[\s\-_]/g, "" );
}

function escapeRegExp( s )
{
   return String( s ).replace( /[.*+?^${}()|[\]\\]/g, "\\$&" );
}

// ID-Schluessel (z.B. M31, NGC7000, SH2-190) duerfen auch als eigenstaendiges Token
// in laengeren Namen vorkommen. Reine Namens-Schluessel (ORION, RING, HEART ...)
// gelten nur bei exakter Uebereinstimmung des ganzen Namens.
function isIdKey( key )
{
   return /^[A-Z]{1,4}\d/.test( normalizeKey( key ) );
}

function matchesObjectKey( objectName, key )
{
   if ( !objectName || !key ) return false;
   var clean = normalizeKey( objectName );
   var kclean = normalizeKey( key );
   if ( clean.length === 0 || kclean.length === 0 ) return false;
   if ( clean === kclean ) return true;
   if ( !isIdKey( key ) ) return false;

   var parts = kclean.split( "" ).map( escapeRegExp );
   var re = new RegExp( "(?:^|[^A-Z0-9])" + parts.join( "[\\s\\-_]*" ) + "(?:$|[^A-Z0-9])" );
   return re.test( String( objectName ).toUpperCase() );
}

function matchesSolarKey( objectName, key )
{
   if ( !objectName || !key ) return false;
   var k = normalizeKey( key );
   if ( normalizeKey( objectName ) === k ) return true;
   var tokens = String( objectName ).toUpperCase().split( /[^A-Z0-9]+/ );
   return tokens.indexOf( k ) !== -1;
}

function findCatalogByHeader( name )
{
   if ( !name ) return null;
   for ( var i = 0; i < DEEPSKY_CATALOG.length; ++i )
      for ( var k = 0; k < DEEPSKY_CATALOG[i].keys.length; ++k )
         if ( matchesObjectKey( name, DEEPSKY_CATALOG[i].keys[k] ) )
            return { index: i, item: DEEPSKY_CATALOG[i] };
   return null;
}

function findSolarByHeader( name )
{
   if ( !name ) return null;
   for ( var i = 0; i < SOLARSYS_CATALOG.length; ++i )
      for ( var k = 0; k < SOLARSYS_CATALOG[i].keys.length; ++k )
         if ( matchesSolarKey( name, SOLARSYS_CATALOG[i].keys[k] ) )
            return { index: i, item: SOLARSYS_CATALOG[i] };
   return null;
}

// strict = true: nur exakte Schluessel-Treffer (fuer den Plausibilitaetsabgleich)
function findInLocalDeepskyCatalog( objectName, strict )
{
   var hit = findCatalogByHeader( objectName );
   if ( hit !== null ) return hit;
   if ( strict ) return null;

   var clean = normalizeKey( objectName );
   if ( clean.length < 5 ) return null;
   for ( var i = 0; i < DEEPSKY_CATALOG.length; ++i )
   {
      var cname = normalizeKey( DEEPSKY_CATALOG[i].name );
      if ( cname.indexOf( clean ) !== -1 )
         return { index: i, item: DEEPSKY_CATALOG[i] };
   }
   return null;
}

function buildAdqlNameVariants( objectName )
{
   var raw = String( objectName ).replace( /^\s+|\s+$/g, "" ).replace( /\s+/g, " " );
   var base = raw.replace( /'/g, "''" );
   var variants = [];
   function add( v ) { if ( v.length > 0 && variants.indexOf( v ) === -1 ) variants.push( v ); }

   add( base );
   var upper = base.toUpperCase();
   add( upper );
   add( upper.replace( /[\s_]/g, "" ) );

   var m = upper.match( /^([A-Z]+)\s*(\d[0-9A-Z.\-+]*)$/ );
   if ( m )
   {
      var pfx = m[1], num = m[2];
      add( pfx + " " + num );
      add( pfx + "  " + num );
      add( pfx + num );
      if ( pfx === "SH" ) { add( "Sh " + num ); add( "Sh" + num ); }
      if ( pfx === "VDB" ) add( "vdB " + num );
   }
   if ( !/\d/.test( raw ) )
   {
      var cap = base.toLowerCase().replace( /(^|\s)([a-z])/g, function( s, a, b ) { return a + b.toUpperCase(); } );
      add( "NAME " + base );
      add( "NAME " + cap );
   }
   return variants;
}

// ----------------------------------------------------------------------------
// Netzwerk
// ----------------------------------------------------------------------------
function httpGetText( url, timeoutSec )
{
   var out = { success: false, text: "", code: 0, reached: false };
   if ( netBlocked() ) return out;
   pumpEvents();

   var tempFile = File.systemTempDirectory + "/LSM_net_" + nowMs() + "_" + Math.floor( Math.random() * 100000 ) + ".tmp";

   // Methode 1: FileDownload
   try
   {
      var dl = new FileDownload( url, tempFile );
      var okDl = dl.perform();
      if ( okDl && File.exists( tempFile ) )
      {
         out.text = File.readTextFile( tempFile );
         out.success = ( out.text.length > 0 );
         out.code = 200;
      }
   }
   catch ( e )
   {
      if ( /HTTP status/i.test( String( e ) ) ) out.reached = true;     // Server antwortet, nur die Anfrage scheitert
      console.warningln( "  FileDownload fehlgeschlagen: " + String( e ).replace( /&/g, "&amp;" ) );
   }
   try { if ( File.exists( tempFile ) ) File.remove( tempFile ); } catch ( e2 ) {}

   // Methode 2: NetworkTransfer (nur wenn Methode 1 nichts lieferte)
   if ( !out.success && !netBlocked() )
   {
      try
      {
         var received = new ByteArray;
         var transfer = new NetworkTransfer;
         transfer.setURL( url );
         transfer.setConnectionTimeout( Math.min( timeoutSec || 15, 10 ) );
         transfer.onDownloadDataAvailable = function( data ) { received.add( data ); return true; };
         var okNt = transfer.download();
         out.code = transfer.responseCode;
         if ( transfer.responseCode > 0 ) out.reached = true;
         if ( okNt && transfer.responseCode === 200 && received.length > 0 )
         {
            out.text = received.toString();
            out.success = ( out.text.length > 0 );
         }
         transfer.closeConnection();
      }
      catch ( e3 )
      {
         console.warningln( "  NetworkTransfer fehlgeschlagen: " + String( e3 ).replace( /&/g, "&amp;" ) );
      }
   }

   if ( out.success )
      NET.failures = 0;
   else if ( !out.reached )       // nur echte Verbindungsfehler zaehlen, keine HTTP-Fehlermeldungen des Servers
   {
      NET.failures++;
      if ( NET.failures >= 3 )
      {
         NET.offline = true;
         console.warningln( "** Online-Suche abgebrochen: 3 Verbindungsversuche in Folge fehlgeschlagen (keine Internetverbindung?)." );
      }
   }
   return out;
}

function parseTsv( text )
{
   var out = { headers: [], rows: [] };
   if ( !text ) return out;
   var lines = String( text ).replace( /^\s+|\s+$/g, "" ).split( /\r?\n/ );
   if ( lines.length < 1 ) return out;
   out.headers = lines[0].split( "\t" ).map( function( h ) { return h.replace( /["'\s]/g, "" ).toLowerCase(); } );
   for ( var i = 1; i < lines.length; ++i )
   {
      if ( lines[i].replace( /\s/g, "" ).length === 0 ) continue;
      var cells = lines[i].split( "\t" );
      var row = {};
      for ( var c = 0; c < out.headers.length; ++c )
         row[ out.headers[c] ] = ( c < cells.length )
            ? cells[c].replace( /^\s+|\s+$/g, "" ).replace( /^["']|["']$/g, "" ).replace( /^\s+|\s+$/g, "" )
            : "";
      out.rows.push( row );
   }
   return out;
}

function performTapQuery( adqlQuery )
{
   for ( var ei = 0; ei < SIMBAD_ENDPOINTS.length; ++ei )
   {
      if ( netBlocked() ) break;
      var baseUrl = SIMBAD_ENDPOINTS[ei];
      var url = baseUrl + "?REQUEST=doQuery&LANG=ADQL&FORMAT=tsv&QUERY=" + encodeURIComponent( adqlQuery );
      console.writeln( "  Endpunkt " + ( ei + 1 ) + "/" + SIMBAD_ENDPOINTS.length + ": " + baseUrl );
      var res = httpGetText( url, 15 );
      var rawText = res.text;
      if ( rawText.length > 0 )
         console.writeln( "<raw>" + shorten( rawText, 1200 ) + "</raw>" );

      if ( res.success && rawText.length > 0 && !isHtmlText( rawText ) )
      {
         if ( isTapErrorResponse( rawText ) )
         {
            console.warningln( "  SIMBAD meldet einen Abfragefehler – kein weiterer Mirror-Versuch." );
            return { success: false, queryError: true, raw: rawText, endpoint: baseUrl };
         }
         return { success: true, raw: rawText, endpoint: baseUrl };
      }
      console.warningln( "  Keine verwertbare Antwort von diesem Endpunkt." );
   }
   return { success: false, raw: "", endpoint: "" };
}

// ----------------------------------------------------------------------------
// SIMBAD: Entfernung eines Objekts
// ----------------------------------------------------------------------------
function querySimbadTap( objectName )
{
   console.writeln( "<end><cbr><b>[Online-Suche]</b> Frage SIMBAD ab für: <i>" + objectName + "</i> …" );

   var variants = buildAdqlNameVariants( objectName );
   var inClause = "'" + variants.join( "', '" ) + "'";
   var adql =
      "SELECT TOP 15 b.main_id, b.otype_txt, b.ra, b.dec, b.plx_value, b.plx_err, " +
      "d.dist, d.unit, d.method, d.bibcode " +
      "FROM basic b " +
      "JOIN ident i ON i.oidref = b.oid " +
      "LEFT JOIN mesDistance d ON d.oidref = b.oid " +
      "WHERE i.id IN (" + inClause + ") " +
      "ORDER BY bibcode DESC";

   var tap = performTapQuery( adql );
   if ( !tap.success )
      return { success: false, error: tap.queryError ? "SIMBAD-Abfragefehler" : "Kein SIMBAD-Server erreichbar" };

   var tsv = parseTsv( tap.raw );
   if ( tsv.rows.length === 0 )
      return { success: false, error: "Objekt in SIMBAD nicht gefunden" };

   var first = tsv.rows[0];
   var mainId = ( first.main_id || "" ).replace( /\s+/g, " " );
   var otype = first.otype_txt || "";
   var ra = numOrNaN( first.ra ), dec = numOrNaN( first.dec );
   var host = tap.endpoint.replace( "https:" + "//", "" ).split( "/" )[0];
   var srcName = "SIMBAD (" + host + ")";

   // 1) Parallaxe des Objekts selbst
   var plx = numOrNaN( first.plx_value ), plxErr = numOrNaN( first.plx_err );
   var lowConf = null;
   if ( isFinite( plx ) && plx > 0.05 )
   {
      var lyP = 1000 / plx * LY_PER_PC;
      var snr = ( isFinite( plxErr ) && plxErr > 0 ) ? plx / plxErr : 0;
      if ( plausibleLy( lyP ) )
      {
         if ( snr >= 5 )
         {
            var uncP = "";
            if ( plxErr < plx )
               uncP = "(+" + fmt( 1000 / ( plx - plxErr ) * LY_PER_PC - lyP, 0 ) + " / −" +
                      fmt( lyP - 1000 / ( plx + plxErr ) * LY_PER_PC, 0 ) + " Lj)";
            return { success: true, source: srcName, mainId: mainId, otype: otype || "Objekt",
                     ly: lyP, method: "Parallaxe " + fmt( plx, 3 ) + " ± " + fmt( plxErr, 3 ) + " mas (S/N " + fmt( snr, 1 ) + ")",
                     unc: uncP, warn: "" };
         }
         lowConf = { ly: lyP, snr: snr };
      }
   }

   // 2) Literatur-Distanzen (nur Einheiten aus der Whitelist)
   var cands = [], seen = {}, skippedUnits = [];
   for ( var ri = 0; ri < tsv.rows.length; ++ri )
   {
      var row = tsv.rows[ri];
      var dv = numOrNaN( row.dist );
      var unit = ( row.unit || "" ).toLowerCase().replace( /["'\s]/g, "" );
      if ( !isFinite( dv ) || dv <= 0 || unit.length === 0 ) continue;
      var fac = DIST_UNIT_FACTORS[ unit ];
      if ( typeof fac !== "number" )
      {
         if ( skippedUnits.indexOf( unit ) === -1 ) skippedUnits.push( unit );
         continue;
      }
      var lyv = dv * fac;
      if ( !plausibleLy( lyv ) ) continue;
      var key = ( row.bibcode || "" ) + "|" + lyv.toFixed( 1 );
      if ( seen[key] ) continue;
      seen[key] = true;
      cands.push( { ly: lyv, method: row.method || "Literatur", bib: row.bibcode || "" } );
   }
   if ( skippedUnits.length > 0 )
      console.warningln( "  Distanzen mit unbekannter Einheit übersprungen: " + skippedUnits.join( ", " ) );

   if ( cands.length > 0 )
   {
      var lys = cands.map( function( c ) { return c.ly; } );
      var med = medianOf( lys );
      var mn = Math.min.apply( null, lys ), mx = Math.max.apply( null, lys );
      var warn = "";
      if ( cands.length > 1 && mx / mn > 1.5 )
         warn = "Die Literaturwerte streuen stark (" + formatLy( mn ) + " – " + formatLy( mx ) + ") – bitte prüfen.";
      var meth = ( cands.length === 1 )
         ? cands[0].method + ( cands[0].bib ? " [" + cands[0].bib + "]" : "" )
         : "Median aus " + cands.length + " Literaturwerten";
      var uncT = ( cands.length > 1 ) ? "(Streuung " + formatLy( mn ) + " – " + formatLy( mx ) + ")" : "";
      return { success: true, source: srcName, mainId: mainId, otype: otype || "Objekt",
               ly: med, method: meth, unc: uncT, warn: warn };
   }

   // 3) Parallaxe mit geringer Genauigkeit
   if ( lowConf !== null )
      return { success: true, source: srcName, mainId: mainId, otype: otype || "Objekt",
               ly: lowConf.ly, method: "Parallaxe (S/N " + fmt( lowConf.snr, 1 ) + ")", unc: "",
               warn: "Die Parallaxe ist ungenau (S/N < 5) – die Entfernung ist unsicher." };

   return { success: false, error: "Keine Entfernungsdaten in SIMBAD", mainId: mainId, otype: otype, ra: ra, dec: dec };
}

// Entfernung aus gut vermessenen Sternen im Umkreis (nur fuer Nebel/Haufen, Richtwert)
function queryCentralStars( info )
{
   if ( !info || !isNebulaLikeType( info.otype ) )
   {
      console.writeln( "  (Sternsuche im Umkreis übersprungen: Objekttyp „" +
                       ( info && info.otype ? info.otype : "?" ) + "“ ist kein Nebel/Haufen.)" );
      return { success: false };
   }
   if ( !isFinite( info.ra ) || !isFinite( info.dec ) ) return { success: false };

   console.writeln( "<end><cbr><b>[Online-Suche]</b> Suche gut vermessene Sterne im Umkreis von 2,4′ …" );
   var adql =
      "SELECT TOP 10 b.main_id, b.otype_txt, b.plx_value, b.plx_err FROM basic b " +
      "WHERE CONTAINS(POINT('ICRS', b.ra, b.dec), CIRCLE('ICRS', " + info.ra.toFixed( 5 ) + ", " +
      info.dec.toFixed( 5 ) + ", 0.04)) = 1 " +
      "AND b.plx_value > 0.1 AND b.plx_err > 0 AND b.plx_value > 5 * b.plx_err " +
      "ORDER BY b.plx_err ASC";
   var tap = performTapQuery( adql );
   if ( !tap.success ) return { success: false };

   var tsv = parseTsv( tap.raw );
   var lys = [];
   for ( var i = 0; i < tsv.rows.length; ++i )
   {
      var p = numOrNaN( tsv.rows[i].plx_value ), e = numOrNaN( tsv.rows[i].plx_err );
      if ( isFinite( p ) && isFinite( e ) && p > 0.1 && e > 0 && p / e > 5 )
      {
         var l = 1000 / p * LY_PER_PC;
         if ( plausibleLy( l ) ) lys.push( l );
      }
   }
   if ( lys.length === 0 ) return { success: false };

   var med = medianOf( lys ), mn = Math.min.apply( null, lys ), mx = Math.max.apply( null, lys );
   var warn = "Abgeleitet aus " + lys.length + " Stern(en) im Umkreis von 2,4′; die Zugehörigkeit zum Objekt ist nicht geprüft (Richtwert).";
   if ( lys.length > 1 && mx / mn > 1.5 )
      warn += " Die Sterne streuen stark (" + formatLy( mn ) + " – " + formatLy( mx ) + "): Vorder-/Hintergrundsterne möglich.";
   return { success: true, source: "SIMBAD (Sterne im Umkreis)", mainId: info.mainId, otype: info.otype,
            ly: med, method: "Median aus " + lys.length + " Stern-Parallaxen (S/N > 5)",
            unc: "(Streuung " + formatLy( mn ) + " – " + formatLy( mx ) + ")", warn: warn, lowConfidence: true };
}

// ----------------------------------------------------------------------------
// NED (nur eindeutig erkennbare Felder, keine Raten)
// ----------------------------------------------------------------------------
function parseNedVOTable( xml )
{
   var fields = [];
   var fre = /<FIELD\b([^>]*)>/gi, fm;
   while ( ( fm = fre.exec( xml ) ) !== null )
   {
      var attrs = fm[1];
      var nm = /name\s*=\s*"([^"]*)"/i.exec( attrs );
      var un = /unit\s*=\s*"([^"]*)"/i.exec( attrs );
      var uc = /ucd\s*=\s*"([^"]*)"/i.exec( attrs );
      fields.push( { name: nm ? nm[1] : "", unit: un ? un[1] : "", ucd: uc ? uc[1] : "" } );
   }
   var trm = /<TR>([\s\S]*?)<\/TR>/i.exec( xml );
   var tds = [];
   if ( trm )
   {
      var tre = /<TD[^>]*>([\s\S]*?)<\/TD>/gi, tm;
      while ( ( tm = tre.exec( trm[1] ) ) !== null )
         tds.push( tm[1].replace( /<[^>]*>/g, "" ).replace( /^\s+|\s+$/g, "" ) );
   }
   return { fields: fields, tds: tds };
}

function queryNedOverview( objectName )
{
   console.writeln( "<end><cbr><b>[Online-Suche]</b> Frage NED ab für: <i>" + objectName + "</i> …" );
   var url;
   url = "https://ned.ipac.caltech.edu/api/NED::API/OverviewOfObject?objname=" + encodeURIComponent( objectName ) + "&HCONST=70";

   var res = httpGetText( url, 15 );
   if ( !res.success || res.text.length === 0 || isHtmlText( res.text ) )
      return { success: false, error: "NED nicht erreichbar oder ohne verwertbare Antwort" };
   if ( /QUERY_STATUS[^>]*ERROR/i.test( res.text ) )
   {
      console.writeln( "  NED kennt das Objekt nicht (Abfragefehler) – NED führt vor allem Galaxien." );
      return { success: false, error: "Objekt in NED nicht gefunden" };
   }
   console.writeln( "<raw>" + shorten( res.text, 1200 ) + "</raw>" );

   var vo = parseNedVOTable( res.text );
   if ( vo.tds.length === 0 || vo.fields.length === 0 )
      return { success: false, error: "Objekt in NED nicht gefunden oder Antwort nicht lesbar" };

   var mainName = objectName;
   var bestLy = null, method = "", unc = "", warn = "", err = "";

   for ( var fi = 0; fi < vo.fields.length && fi < vo.tds.length; ++fi )
   {
      var fn = vo.fields[fi].name.toLowerCase();
      if ( fn === "object name" || fn === "prefname" || fn.indexOf( "preferred" ) !== -1 )
      {
         if ( vo.tds[fi].length > 0 ) mainName = vo.tds[fi];
         break;
      }
   }

   // 1) explizit angegebene Distanz in Mpc
   for ( var di = 0; di < vo.fields.length && di < vo.tds.length; ++di )
   {
      var dn = vo.fields[di].name.toLowerCase();
      var du = vo.fields[di].unit.toLowerCase();
      var duc = vo.fields[di].ucd.toLowerCase();
      if ( ( dn.indexOf( "dist" ) !== -1 || duc.indexOf( "pos.distance" ) !== -1 ) &&
           !/modulus|err|sigma|uncert|method|ref|bibcode|count|number/.test( dn ) &&
           ( du === "mpc" || /mpc/.test( dn ) ) )
      {
         var dMpc = numOrNaN( vo.tds[di] );
         if ( isFinite( dMpc ) && dMpc > 0 && dMpc < 5000 )
         {
            bestLy = dMpc * 3.2615638e6;
            method = "NED, Feld „" + vo.fields[di].name + "“";
            break;
         }
      }
   }

   // 2) Hubble-Fluss nur im gueltigen Bereich
   if ( bestLy === null )
   {
      var zVal = null, vVal = null;
      for ( var zi = 0; zi < vo.fields.length && zi < vo.tds.length; ++zi )
      {
         var zn = vo.fields[zi].name.toLowerCase();
         var zuc = vo.fields[zi].ucd.toLowerCase();
         if ( zVal === null && ( zn === "redshift" || zuc === "src.redshift" ) )
         {
            var zz = numOrNaN( vo.tds[zi] );
            if ( isFinite( zz ) ) zVal = zz;
         }
         else if ( vVal === null && /velocity|radvel/.test( zn ) && !/err|sigma|uncert/.test( zn ) )
         {
            var vv = numOrNaN( vo.tds[zi] );
            if ( isFinite( vv ) ) vVal = vv;
         }
      }
      var zUse = ( zVal !== null ) ? zVal : ( vVal !== null ? vVal / C_KM_S : null );
      if ( zUse !== null )
      {
         if ( zUse < 0.003 )
            err = "Rotverschiebung z = " + fmt( zUse, 5 ) + " ist für eine Hubble-Näherung zu klein (Eigenbewegung dominiert)";
         else if ( zUse > 0.1 )
            err = "Rotverschiebung z = " + fmt( zUse, 3 ) + " ist für die einfache Hubble-Näherung zu groß";
         else
         {
            bestLy = C_KM_S * zUse / 70 * 3.2615638e6;
            method = "NED Hubble-Fluss (z = " + fmt( zUse, 4 ) + ", H₀ = 70 km/s/Mpc)";
            unc = "(± ca. " + fmt( 300 / 70, 1 ) + " Mpc durch Eigenbewegung)";
            warn = "Hubble-Fluss-Näherung – nur eine grobe Richtgröße.";
         }
      }
   }

   if ( bestLy === null )
      return { success: false, error: err.length > 0 ? err : "Keine verwertbare Distanz-/Rotverschiebungsangabe in NED" };
   return { success: true, source: "NED", mainId: mainName, otype: "Objekt", ly: bestLy, method: method, unc: unc, warn: warn };
}

// ----------------------------------------------------------------------------
// Gesamtablauf
// ----------------------------------------------------------------------------
function resolveDeepskyDistance( objectName )
{
   if ( !objectName || objectName.replace( /\s/g, "" ).length === 0 )
      return { success: false, error: "Kein Objektname angegeben." };
   var name = objectName.replace( /^\s+|\s+$/g, "" );
   netReset( NET_TOTAL_SECONDS );

   var notes = [];
   var result = null;

   var sim = querySimbadTap( name );
   if ( sim.success ) result = sim;
   else if ( sim.error ) notes.push( "SIMBAD: " + sim.error );

   if ( result === null && !netBlocked() )
   {
      if ( sim && sim.mainId && isNebulaLikeType( sim.otype ) )
      {
         console.writeln( "  (NED übersprungen: „" + sim.mainId + "“ ist ein Objekt der Milchstraße (" + sim.otype + "); NED führt Galaxien.)" );
         notes.push( "NED: übersprungen (galaktisches Objekt)" );
      }
      else
      {
         var ned = queryNedOverview( name );
         if ( ned.success ) result = ned;
         else if ( ned.error ) notes.push( "NED: " + ned.error );
      }
   }

   if ( result === null && !netBlocked() && sim && isFinite( sim.ra ) )
   {
      var cs = queryCentralStars( sim );
      if ( cs.success ) result = cs;
   }

   if ( result !== null && !plausibleLy( result.ly ) )
   {
      notes.push( "Unplausibler Online-Wert verworfen (" + result.ly + " Lj)." );
      result = null;
   }

   if ( result !== null )
   {
      var strict = findInLocalDeepskyCatalog( name, true );
      if ( strict !== null )
      {
         var ratio = result.ly / strict.item.ly;
         if ( ratio > 1.5 || ratio < 0.67 )
         {
            result.warn = ( result.warn ? result.warn + " " : "" ) +
               "ACHTUNG: Der Wert weicht stark vom lokalen Katalogwert ab (" + formatLy( strict.item.ly ) +
               ", " + strict.item.src + "). Im Zweifel den Katalogwert aus der Liste wählen.";
            result.catalogLy = strict.item.ly;
         }
      }
      return result;
   }

   var offline = netBlocked();
   if ( offline )
      console.warningln( "** Online-Suche nicht möglich (keine Verbindung oder Zeitlimit) – nutze lokalen Katalog." );

   var local = findInLocalDeepskyCatalog( name, false );
   if ( local !== null )
      return { success: true, source: "Lokaler Katalog", mainId: local.item.name, otype: "Katalogobjekt",
               ly: local.item.ly, method: local.item.src, unc: local.item.unc || "",
               warn: offline ? "Online-Abfrage nicht möglich – Richtwert aus dem lokalen Katalog." : "",
               localIdx: local.index };

   var known = ( sim && sim.mainId )
               ? "SIMBAD kennt „" + name + "“ als „" + sim.mainId + "“ (" + ( sim.otype || "?" ) + "), führt dazu aber keine Entfernung. " +
                 "Bei Teilen größerer Nebelkomplexe steht die Entfernung oft beim Hauptobjekt oder beim zugehörigen Sternhaufen."
               : "„" + name + "“ wurde weder online noch im lokalen Katalog gefunden.";
   return { success: false, error: known + ( notes.length > 0 ? "\n\n" + notes.join( "\n" ) : "" ) };
}

// Lesbare Darstellung eines Property-Werts (Matrix/Vektor mit Zahlen, nicht leer)
function describePropertyValue( pval )
{
   if ( pval === null || typeof pval === "undefined" )
      return "null";
   if ( typeof pval !== "object" )
      return String( pval );

   function num( v )
   {
      return ( typeof v === "number" && isFinite( v ) ) ? String( Math.abs( v ) >= 1e-3 || v === 0 ? +v.toPrecision( 8 ) : v.toExponential( 6 ) )
                                                        : String( v );
   }
   try
   {
      if ( typeof ByteArray !== "undefined" && pval instanceof ByteArray )
         return "<ByteArray, " + pval.length + " Bytes>";
   }
   catch ( e0 ) {}
   try
   {
      // Matrix: hat rows/columns
      if ( typeof pval.rows === "number" && typeof pval.columns === "number" )
      {
         var rowsTxt = [];
         for ( var r = 0; r < pval.rows && r < 4; ++r )
         {
            var cells = [];
            for ( var c = 0; c < pval.columns && c < 4; ++c )
               cells.push( num( typeof pval.at === "function" ? pval.at( r, c ) : pval[r][c] ) );
            rowsTxt.push( "[" + cells.join( ", " ) + "]" );
         }
         return "Matrix " + pval.rows + "×" + pval.columns + " " + rowsTxt.join( " " );
      }
      // Vektor / Array: hat length
      if ( typeof pval.length === "number" )
      {
         var items = [];
         for ( var k = 0; k < pval.length && k < 8; ++k )
            items.push( num( typeof pval.at === "function" ? pval.at( k ) : pval[k] ) );
         return "Vektor (" + pval.length + ") [" + items.join( ", " ) + ( pval.length > 8 ? ", …" : "" ) + "]";
      }
   }
   catch ( e1 ) {}
   var t = "";
   try { t = String( pval ); } catch ( e2 ) {}
   return ( t.length > 0 ) ? t : "<Objekt ohne Textdarstellung>";
}

// ============================================================================
// Etappe 1: Metadaten & Astrometrie aus FITS / XISF extrahieren
// ============================================================================
function readMetadata( window, view )
{
   var meta = {
      filePath: ( window && window.filePath ) ? String( window.filePath ) : "",
      fitsKeywords: [],
      xisfProperties: [],
      focalLength: null,
      focalLengthSource: null,
      pixelSize: null,
      pixelSizeSource: null,
      effectivePixelSize: null,
      binningX: 1,
      binningY: 1,
      binningYRead: false,
      objectName: null,
      telescope: null,
      instrument: null,
      dateObs: null,
      astrometryResolution: null,
      astrometrySource: null,
      pclLinearScale: null,
      wcsResolution: null,
      scaleSources: [],
      windowHasSolution: null,
      hasAstrometry: false,
      astrometryRa: null,
      astrometryDec: null,
      pixelIncludesBinning: false,
      bayerPattern: null,
      bayerSource: null,
      cfaInterpolation: null,
      superPixel: false,
      numberOfChannels: 0,
      hdrWidth: null,           // Bildgroesse laut Header (NAXIS1/NAXIS2, ersatzweise IMAGEW/IMAGEH)
      hdrHeight: null,
      hdrSizeSource: null,
      imgWidth: 0,
      imgHeight: 0,
      geomFactor: null,         // Header-Groesse / Bildgroesse, wenn in X und Y gleich und != 1
      geomCropped: false,       // Groesse weicht ab, aber nicht in beiden Richtungen gleich (Zuschnitt)
      staleSources: [],         // verworfene Plate-Solve-Quellen (Loesung vor der Groessenaenderung)
      drizzle: false,
      drizzleSource: null,
      notes: [],
      warnings: []
   };

   // 1. FITS-Keywords
   try
   {
      var kwList = window.keywords;
      if ( kwList && kwList.length > 0 )
      {
         for ( var i = 0; i < kwList.length; ++i )
         {
            var k = kwList[i];
            var name = k.name ? String( k.name ).trim() : "";
            var valStr = ( k.value !== null && typeof k.value !== "undefined" ) ? String( k.value ).trim() : "";
            var cleanVal = valStr.replace( /^'|'$/g, "" ).trim();
            var comment = ( k.comment !== null && typeof k.comment !== "undefined" ) ? String( k.comment ).trim() : "";

            meta.fitsKeywords.push({
               name: name,
               value: cleanVal,
               rawValue: valStr,
               comment: comment
            });

            var upper = name.toUpperCase();
            if ( ( upper === "FOCALLEN" || upper === "FOCAL" || upper === "FOCALLNG" ) && meta.focalLength === null )
            {
               var num = parseFloat( cleanVal );
               if ( isFinite( num ) && num > 0 )
               {
                  meta.focalLength = num;
                  meta.focalLengthSource = "FITS-Keyword " + name;
               }
            }
            else if ( ( upper === "XPIXSZ" || upper === "PIXSIZE" || upper === "PIXSIZE1" || upper === "PIXELX" ) && meta.pixelSize === null )
            {
               var num = parseFloat( cleanVal );
               if ( isFinite( num ) && num > 0 )
               {
                  meta.pixelSize = num;
                  meta.pixelSizeSource = "FITS-Keyword " + name;
                  meta.pixelIncludesBinning = true;
               }
            }
            else if ( upper === "XBINNING" || upper === "BINNING" || upper === "CCDBINX" )
            {
               var b = parseInt( cleanVal, 10 );
               if ( isFinite( b ) && b > 0 )
                  meta.binningX = b;
            }
            else if ( upper === "YBINNING" || upper === "CCDBINY" )
            {
               var b = parseInt( cleanVal, 10 );
               if ( isFinite( b ) && b > 0 )
               {
                  meta.binningY = b;
                  meta.binningYRead = true;
               }
            }
            else if ( ( upper === "BAYERPAT" || upper === "BAYERPATTERN" || upper === "COLORTYP" || upper === "CFATYPE" ) &&
                      meta.bayerPattern === null )
            {
               if ( cleanVal.length > 0 && !/^(MONO|NONE|GRAY|GREY|FALSE|0)$/i.test( cleanVal ) )
               {
                  meta.bayerPattern = cleanVal;
                  meta.bayerSource = "FITS-Keyword " + name;
               }
            }
            else if ( ( upper === "OBJECT" || upper === "OBJNAME" || upper === "TARGET" ) && meta.objectName === null )
            {
               if ( cleanVal.length > 0 )
                  meta.objectName = cleanVal;
            }
            else if ( ( upper === "TELESCOP" || upper === "TELESCOPE" ) && meta.telescope === null )
            {
               if ( cleanVal.length > 0 )
                  meta.telescope = cleanVal;
            }
            else if ( ( upper === "INSTRUME" || upper === "CAMERA" ) && meta.instrument === null )
            {
               if ( cleanVal.length > 0 )
                  meta.instrument = cleanVal;
            }
            else if ( upper === "NAXIS1" || upper === "NAXIS2" || upper === "IMAGEW" || upper === "IMAGEH" )
            {
               var nax = parseInt( cleanVal, 10 );
               if ( isFinite( nax ) && nax > 0 )
               {
                  var isNaxis = ( upper.indexOf( "NAXIS" ) === 0 );
                  // NAXIS hat Vorrang vor IMAGEW/IMAGEH (ASIAIR schreibt dort teils abweichende Werte)
                  if ( isNaxis || meta.hdrSizeSource !== "NAXIS1/NAXIS2" )
                  {
                     if ( upper === "NAXIS1" || upper === "IMAGEW" ) meta.hdrWidth = nax; else meta.hdrHeight = nax;
                     if ( isNaxis ) meta.hdrSizeSource = "NAXIS1/NAXIS2";
                     else if ( meta.hdrSizeSource === null ) meta.hdrSizeSource = "IMAGEW/IMAGEH";
                  }
               }
            }
            else if ( ( upper === "DATE-OBS" || upper === "DATE" ) && meta.dateObs === null )
            {
               if ( cleanVal.length > 0 )
                  meta.dateObs = cleanVal;
            }
         }

         // WCS-Skala (CD-Matrix bevorzugt; sonst CDELT x PC)
         var wk = {};
         for ( var wi = 0; wi < meta.fitsKeywords.length; ++wi )
         {
            var wu = meta.fitsKeywords[wi].name.toUpperCase();
            if ( /^(CD[12]_[12]|PC[12]_[12]|CDELT[12])$/.test( wu ) )
            {
               var wv = parseFloat( meta.fitsKeywords[wi].value );
               if ( isFinite( wv ) && typeof wk[wu] === "undefined" ) wk[wu] = wv;
            }
         }
         var wScaleDeg = null;
         if ( typeof wk.CD1_1 !== "undefined" && typeof wk.CD2_2 !== "undefined" )
         {
            var c12 = ( typeof wk.CD1_2 !== "undefined" ) ? wk.CD1_2 : 0;
            var c21 = ( typeof wk.CD2_1 !== "undefined" ) ? wk.CD2_1 : 0;
            var wdet = Math.abs( wk.CD1_1 * wk.CD2_2 - c12 * c21 );
            if ( wdet > 0 ) wScaleDeg = Math.sqrt( wdet );
         }
         else if ( typeof wk.CD1_1 !== "undefined" )
            wScaleDeg = Math.abs( wk.CD1_1 );
         else if ( typeof wk.CDELT1 !== "undefined" && typeof wk.CDELT2 !== "undefined" )
         {
            var p11 = ( typeof wk.PC1_1 !== "undefined" ) ? wk.PC1_1 : 1;
            var p22 = ( typeof wk.PC2_2 !== "undefined" ) ? wk.PC2_2 : 1;
            var p12 = ( typeof wk.PC1_2 !== "undefined" ) ? wk.PC1_2 : 0;
            var p21 = ( typeof wk.PC2_1 !== "undefined" ) ? wk.PC2_1 : 0;
            var pdet = Math.abs( wk.CDELT1 * wk.CDELT2 * ( p11 * p22 - p12 * p21 ) );
            if ( pdet > 0 ) wScaleDeg = Math.sqrt( pdet );
         }
         else if ( typeof wk.CDELT1 !== "undefined" )
            wScaleDeg = Math.abs( wk.CDELT1 );

         if ( wScaleDeg !== null && wScaleDeg > 0 )
         {
            var wArc = wScaleDeg * 3600;
            if ( wArc >= 0.01 && wArc <= 1000 )
            {
               meta.wcsResolution = wArc;
               meta.hasAstrometry = true;
            }
            else
               meta.warnings.push( "WCS-Skala " + wArc + " ″/px ist unplausibel und wird ignoriert." );
         }
      }
   }
   catch ( e )
   {
      console.warningln( "** Hinweis: FITS-Keywords konnten nicht vollstaendig gelesen werden (" + e + ")." );
   }

   // 2. XISF-Properties
   try
   {
      var propIds = [];
      if ( typeof view.properties !== "undefined" )
         propIds = ( typeof view.properties === "function" ) ? view.properties() : view.properties;
      else if ( typeof view.propertyNames !== "undefined" )
         propIds = ( typeof view.propertyNames === "function" ) ? view.propertyNames() : view.propertyNames;

      if ( propIds && propIds.length > 0 )
      {
         for ( var i = 0; i < propIds.length; ++i )
         {
            var pid = propIds[i];
            var pval = null;
            var ptype = 0;
            try { pval = view.propertyValue( pid ); } catch ( ep ) {}
            try { ptype = view.propertyType( pid ); } catch ( et ) {}

            var displayVal = describePropertyValue( pval );

            meta.xisfProperties.push({
               id: pid,
               value: pval,
               displayValue: displayVal,
               type: ptype
            });

            var lowerPid = pid.toLowerCase();
            if ( lowerPid === "astrometry:resolution" )
            {
               var res = parseFloat( pval );
               if ( isFinite( res ) && res > 0 )
               {
                  meta.astrometryResolution = res;
                  meta.hasAstrometry = true;
               }
            }
            else if ( /(^|:)astrometricsolution:lineartransformationmatrix$/.test( lowerPid ) )
            {
               // Lineare Transformation der Loesung (Grad pro Pixel, entspricht der CD-Matrix)
               try
               {
                  var mAt = function( r, c )
                  {
                     if ( typeof pval.at === "function" ) return pval.at( r, c );
                     if ( typeof pval.element === "function" ) return pval.element( r, c );
                     return pval[r][c];
                  };
                  var m00 = mAt( 0, 0 ), m01 = mAt( 0, 1 ), m10 = mAt( 1, 0 ), m11 = mAt( 1, 1 );
                  var ldet = Math.abs( m00 * m11 - m01 * m10 );
                  if ( ldet > 0 )
                  {
                     var lArc = Math.sqrt( ldet ) * 3600;
                     if ( lArc >= 0.01 && lArc <= 1000 )
                        meta.pclLinearScale = lArc;
                     else
                        meta.warnings.push( "Skala aus " + pid + " (" + lArc + " ″/px) ist unplausibel und wird ignoriert." );
                  }
               }
               catch ( eLin )
               {
                  console.warningln( "** Hinweis: " + pid + " konnte nicht als Matrix gelesen werden (" + eLin + ")." );
               }
            }
            else if ( lowerPid.indexOf( "cfasourcepattern" ) >= 0 )
            {
               if ( meta.bayerPattern === null && String( pval ).trim().length > 0 )
               {
                  meta.bayerPattern = String( pval ).trim();
                  meta.bayerSource = "XISF " + pid;
               }
            }
            else if ( ( lowerPid.indexOf( "signature:integration" ) >= 0 || lowerPid === "image:id" ) &&
                      /drizzle/i.test( String( pval ) ) )
            {
               if ( !meta.drizzle )
               {
                  meta.drizzle = true;
                  meta.drizzleSource = "XISF " + pid;
               }
            }
            else if ( lowerPid.indexOf( "cfasourceinterpolation" ) >= 0 )
            {
               if ( String( pval ).trim().length > 0 )
                  meta.cfaInterpolation = String( pval ).trim();
            }
            else if ( lowerPid === "astrometry:focallength" || lowerPid === "observation:telescope:focallength" ||
                      lowerPid === "instrument:telescope:focallength" )
            {
               var f = parseFloat( pval );
               if ( isFinite( f ) && f > 0 )
               {
                  if ( f < 5 ) f *= 1000;   // XISF-Spezifikation: Meter
                  if ( meta.focalLength === null || lowerPid.indexOf( "astrometry" ) >= 0 )
                  {
                     meta.focalLength = f;
                     meta.focalLengthSource = "XISF " + pid;
                  }
               }
            }
            else if ( lowerPid === "astrometry:pixelsizex" || lowerPid === "observation:sensor:pixelsize1" ||
                      lowerPid === "instrument:sensor:xpixelsize" || lowerPid === "instrument:sensor:pixelsize1" )
            {
               var s = parseFloat( pval );
               if ( isFinite( s ) && s > 0 && ( meta.pixelSize === null || lowerPid.indexOf( "astrometry" ) >= 0 ) )
               {
                  meta.pixelSize = s;
                  meta.pixelSizeSource = "XISF " + pid;
                  meta.pixelIncludesBinning = false;
               }
            }
            else if ( lowerPid === "observation:sensor:binningx" || lowerPid === "observation:sensor:binning" ||
                      lowerPid === "instrument:camera:xbinning" || lowerPid === "instrument:sensor:binning1" )
            {
               var b = parseInt( pval, 10 );
               if ( isFinite( b ) && b > 0 )
                  meta.binningX = b;
            }
            else if ( lowerPid === "observation:object:name" || lowerPid === "observation:celestial:target" || lowerPid === "astrometry:target" )
            {
               if ( !meta.objectName && String( pval ).trim().length > 0 )
                  meta.objectName = String( pval ).trim();
            }
            else if ( ( lowerPid === "observation:telescope:name" || lowerPid === "instrument:telescope:name" ) && !meta.telescope )
            {
               meta.telescope = String( pval ).trim();
            }
            else if ( ( lowerPid === "observation:sensor:name" || lowerPid === "instrument:camera:name" ) && !meta.instrument )
            {
               meta.instrument = String( pval ).trim();
            }
            else if ( lowerPid === "observation:time:start" && !meta.dateObs )
            {
               meta.dateObs = String( pval ).trim();
            }
            else if ( lowerPid === "astrometry:ra" )
            {
               meta.astrometryRa = pval;
            }
            else if ( lowerPid === "astrometry:dec" )
            {
               meta.astrometryDec = pval;
            }
         }
      }
   }
   catch ( e )
   {
      console.warningln( "** Hinweis: XISF-Properties konnten nicht vollstaendig gelesen werden (" + e + ")." );
   }

   // 3. Plate-Solve-Skala: alle Quellen sammeln, die zuverlaessigste verwenden, Widersprueche melden
   try { meta.numberOfChannels = view.image.numberOfChannels; } catch ( eNc ) {}

   var srcList = [];
   try
   {
      var hasSol = window.hasAstrometricSolution;
      if ( typeof hasSol === "boolean" ) meta.windowHasSolution = hasSol;
      if ( hasSol === true )
      {
         var wsc = scaleFromWindow( window, view.image.width, view.image.height );
         if ( wsc !== null && wsc >= 0.01 && wsc <= 1000 )
            srcList.push( { name: "Astrometrische Lösung des Fensters (Bildmitte)", value: wsc, fromWindow: true } );
      }
   }
   catch ( eSol )
   {
      console.warningln( "** Hinweis: Astrometrische Lösung des Fensters nicht abfragbar (" + eSol + ")." );
   }
   if ( meta.pclLinearScale !== null )
      srcList.push( { name: "XISF AstrometricSolution:LinearTransformationMatrix", value: meta.pclLinearScale } );
   if ( meta.astrometryResolution !== null )
      srcList.push( { name: "XISF Astrometry:Resolution", value: meta.astrometryResolution } );
   if ( meta.wcsResolution !== null )
      srcList.push( { name: "FITS-WCS (CD-Matrix / CDELT)", value: meta.wcsResolution } );

   // 3a. Bildgroesse gegen Header pruefen: Hat ein Prozess die Bildgroesse geaendert, die Metadaten aber
   //     unveraendert uebernommen (z. B. Super-Pixel-Debayer), sind Header-Loesung und Header-Pixelgroesse veraltet.
   try { meta.imgWidth = view.image.width; meta.imgHeight = view.image.height; } catch ( eSz ) {}
   if ( meta.hdrWidth !== null && meta.hdrHeight !== null && meta.imgWidth > 0 && meta.imgHeight > 0 )
   {
      var rx = meta.hdrWidth / meta.imgWidth;
      var ry = meta.hdrHeight / meta.imgHeight;
      var sameRatio = Math.abs( rx / ry - 1 ) < 0.01;
      if ( sameRatio && Math.abs( Math.sqrt( rx * ry ) - 1 ) > FACTOR_TOL )
         meta.geomFactor = snapFactor( Math.sqrt( rx * ry ) );
      else if ( !sameRatio || Math.abs( rx - 1 ) > 0.005 )
         meta.geomCropped = true;
   }

   if ( meta.geomFactor !== null )
   {
      var geoTxt = "Bildgröße " + meta.imgWidth + " × " + meta.imgHeight + " px, laut Header [" + meta.hdrSizeSource + "] " +
                   meta.hdrWidth + " × " + meta.hdrHeight + " px: Das Bild ist um Faktor " + fmt( meta.geomFactor, 2 ) +
                   ( meta.geomFactor > 1 ? " verkleinert" : " vergrößert" ) + " worden (Header-Werte stammen von vorher).";
      var winSrc = ( srcList.length > 0 && srcList[0].fromWindow === true );
      if ( srcList.length > 0 && !winSrc )
      {
         // Loesung stammt nur aus Header-Daten der alten Geometrie -> nicht verwenden
         meta.staleSources = srcList;
         srcList = [];
         meta.pclLinearScale = null;
         meta.astrometryResolution = null;
         meta.wcsResolution = null;
         meta.hasAstrometry = false;
         meta.warnings.push( geoTxt + " Die Plate-Solve-Daten im Header (" + fmt( meta.staleSources[0].value, 4 ) +
                             " ″/px) gehören zur alten Bildgröße und werden NICHT verwendet (umgerechnet wären es ca. " +
                             fmt( meta.staleSources[0].value * meta.geomFactor, 4 ) + " ″/px). " +
                             "Für einen geprüften Maßstab das Bild mit ImageSolver neu lösen." );
      }
      else if ( winSrc )
         meta.notes.push( geoTxt + " Die astrometrische Lösung des Fensters ist aktuell und wird verwendet." );
      else
         meta.warnings.push( geoTxt + " Ob die Pixelgröße im Header schon angepasst ist, lässt sich nicht erkennen " +
                             "(IntegerResample passt XPIXSZ an, Super-Pixel-Debayer nicht) – bitte prüfen." );
   }
   else if ( meta.geomCropped )
      meta.notes.push( "Bildgröße " + meta.imgWidth + " × " + meta.imgHeight + " px weicht vom Header ab (" + meta.hdrWidth + " × " +
                       meta.hdrHeight + " px, " + meta.hdrSizeSource + "), aber nicht in beiden Richtungen gleich: vermutlich zugeschnitten. " +
                       "Ein Zuschnitt ändert den Maßstab nicht." );

   meta.scaleSources = srcList;
   if ( srcList.length > 0 )
   {
      meta.astrometryResolution = srcList[0].value;
      meta.astrometrySource = srcList[0].name;
      meta.hasAstrometry = true;
      for ( var si = 1; si < srcList.length; ++si )
      {
         var dvs = Math.abs( srcList[si].value - srcList[0].value ) / srcList[0].value * 100;
         if ( dvs > SCALE_DEV_PCT )
            meta.warnings.push( "Astrometrie-Quellen widersprechen sich: " + srcList[0].name + " = " + fmt( srcList[0].value, 4 ) +
                                " ″/px, " + srcList[si].name + " = " + fmt( srcList[si].value, 4 ) + " ″/px (" + fmt( dvs, 1 ) +
                                " %). Eine davon ist vermutlich veraltet (Bild nach dem Lösen skaliert?). Verwendet wird die erste." );
      }
   }
   else if ( meta.windowHasSolution === true )
      meta.warnings.push( "PixInsight meldet eine astrometrische Lösung, die Skala ließ sich aber nicht auslesen – es gilt Brennweite/Pixelgröße." );

   // 4. Binning
   if ( meta.pixelSize !== null )
   {
      var binF = ( meta.binningX > 1 ) ? meta.binningX : 1;
      var asIs = meta.pixelSize;
      var withBin = meta.pixelSize * binF;
      var eff = meta.pixelIncludesBinning ? asIs : withBin;
      if ( binF > 1 )
      {
         var solved = meta.astrometryResolution || meta.wcsResolution;
         if ( solved && meta.focalLength !== null )
         {
            var sA = ( asIs * 1e-3 / meta.focalLength ) * ARCSEC_PER_RAD;
            var sB = ( withBin * 1e-3 / meta.focalLength ) * ARCSEC_PER_RAD;
            var cand = ( Math.abs( sA - solved ) <= Math.abs( sB - solved ) ) ? asIs : withBin;
            if ( cand !== eff )
               meta.warnings.push( "Binning " + binF + "x: Pixelgröße anhand der Plate-Solve-Skala korrigiert." );
            eff = cand;
         }
         else
            meta.warnings.push( "Binning " + binF + "x erkannt: Ob die Pixelgröße im Header das Binning schon enthält, ist unklar (FITS-Konvention: ja). Bitte prüfen." );
      }
      meta.effectivePixelSize = eff;
   }
   if ( meta.binningYRead && meta.binningY !== meta.binningX )
      meta.warnings.push( "Unsymmetrisches Binning (X " + meta.binningX + " / Y " + meta.binningY + "): Das Script rechnet mit dem X-Binning; " +
                          "Messungen mit Anteil in Y-Richtung können abweichen." );

   // 5. Debayer und Drizzle (Kontext fuer die Plausibilitaetspruefung)
   if ( meta.bayerPattern !== null || meta.cfaInterpolation !== null )
   {
      var patTxt = ( meta.bayerPattern !== null )
                   ? "Bayer-Muster " + meta.bayerPattern + " [" + meta.bayerSource + "]"
                   : "CFA-Angaben im Header";
      if ( meta.numberOfChannels >= 3 )
      {
         var howTxt;
         if ( meta.cfaInterpolation !== null )
            howTxt = "Das Bild wurde debayert (Verfahren laut Header: " + meta.cfaInterpolation + ")";
         else if ( meta.drizzle )
            howTxt = "Farbbild aus CFA-Daten (Debayer oder CFA-Drizzle, Verfahren steht nicht im Header)";
         else
            howTxt = "Das Bild wurde debayert (Verfahren steht nicht im Header)";
         meta.notes.push( patTxt + ", Bild hat " + meta.numberOfChannels + " Kanäle: " + howTxt +
                          ". Normales Debayer (VNG, Bilinear u. ä.) ändert den Maßstab nicht; Super-Pixel-Debayer verdoppelt ihn." );
         if ( meta.cfaInterpolation !== null && /super/i.test( meta.cfaInterpolation ) )
         {
            meta.superPixel = true;
            meta.warnings.push( "Super-Pixel-Debayer erkannt: Ein Bildpixel entspricht 2 × 2 Sensorpixeln. " +
                                "PixInsight passt die Pixelgröße im Header (XPIXSZ) dabei nicht an – ohne aktuelle Plate-Solve-Lösung " +
                                "gilt deshalb Faktor 2 (im Dialog vorbelegt)." );
         }
      }
      else
         meta.notes.push( patTxt + ", Bild hat 1 Kanal: nicht debayertes CFA-Rohbild. Ein Bildpixel entspricht einem Sensorpixel; " +
                          "der Maßstab ist unverändert." );
   }
   if ( meta.drizzle )
      meta.notes.push( "Drizzle-Integration erkannt [" + meta.drizzleSource + "]. PixInsight (DrizzleIntegration/WBPP) passt die " +
                       "Pixelgröße im Header an den Drizzle-Maßstab an (z. B. 2,9 → 1,45 µm bei 2×). Steht oben also schon der " +
                       "kleinere Wert, ist „Ja“ richtig; mit der Sensor-Pixelgröße laut Datenblatt vergleichen." );

   return meta;
}

function printMetadataReport( meta, view )
{
   console.writeln( "" );
   console.writeln( "================================================================================" );
   console.writeln( "<b>LocalSizeMeasurer v" + VERSION + " – Header- und Astrometrie-Inspektion</b>" );
   console.writeln( "================================================================================" );
   console.writeln( "Bild-View: <b>" + view.fullId + "</b> (" + view.image.width + " × " + view.image.height + " px, " +
                    view.image.numberOfChannels + " Kanal/Kanäle)" );

   console.writeln( "" );
   console.writeln( "<b>--- FITS Header Keywords (" + meta.fitsKeywords.length + " gefunden) ---</b>" );
   if ( meta.fitsKeywords.length === 0 )
      console.writeln( "  <i>(Keine FITS-Keywords im Fenster vorhanden)</i>" );
   else
   {
      for ( var i = 0; i < meta.fitsKeywords.length; ++i )
      {
         var kw = meta.fitsKeywords[i];
         var idxStr = ( "    " + ( i + 1 ) ).slice( -3 );
         var namePad = ( kw.name + "            " ).slice( 0, 10 );
         var cmtStr = kw.comment ? "  / " + kw.comment : "";
         console.writeln( "  [" + idxStr + "] " + namePad + " = " + kw.value + cmtStr );
      }
   }

   console.writeln( "" );
   console.writeln( "<b>--- XISF Properties (" + meta.xisfProperties.length + " gefunden) ---</b>" );
   if ( meta.xisfProperties.length === 0 )
      console.writeln( "  <i>(Keine XISF-Properties im View vorhanden)</i>" );
   else
   {
      for ( var i = 0; i < meta.xisfProperties.length; ++i )
      {
         var xp = meta.xisfProperties[i];
         var idxStr = ( "    " + ( i + 1 ) ).slice( -3 );
         console.writeln( "  [" + idxStr + "] " + xp.id + " = " + xp.displayValue );
      }
   }

   console.writeln( "" );
   console.writeln( "<b>--- Erkannte Aufnahme- und Astrometrie-Parameter ---</b>" );
   console.writeln( "  Objektname:        " + ( meta.objectName ? "<b>" + meta.objectName + "</b>" : "<i>(nicht im Header gefunden)</i>" ) );
   console.writeln( "  Teleskop:          " + ( meta.telescope ? meta.telescope : "<i>(nicht im Header gefunden)</i>" ) );
   console.writeln( "  Kamera / Sensor:   " + ( meta.instrument ? meta.instrument : "<i>(nicht im Header gefunden)</i>" ) );
   console.writeln( "  Aufnahmezeit:      " + ( meta.dateObs ? meta.dateObs : "<i>(nicht im Header gefunden)</i>" ) );

   if ( meta.focalLength !== null )
      console.writeln( "  Brennweite:        <b>" + fmt( meta.focalLength, 2 ) + " mm</b>  [" + meta.focalLengthSource + "]" );
   else
      console.writeln( "  Brennweite:        <i>(nicht im Header gefunden → Fallback/Dialog)</i>" );

   if ( meta.pixelSize !== null )
   {
      var binStr = ( meta.binningX > 1 ) ? " (Sensor " + fmt( meta.pixelSize, 3 ) + " µm × Binning " + meta.binningX + " = " + fmt( meta.effectivePixelSize, 3 ) + " µm)" : "";
      console.writeln( "  Pixelgröße:        <b>" + fmt( meta.effectivePixelSize, 3 ) + " µm</b>  [" + meta.pixelSizeSource + "]" + binStr );
   }
   else
      console.writeln( "  Pixelgröße:        <i>(nicht im Header gefunden → Fallback/Dialog)</i>" );

   if ( meta.bayerPattern !== null )
      console.writeln( "  Bayer-Muster:      " + meta.bayerPattern + "  [" + meta.bayerSource + "]" +
                       ( meta.cfaInterpolation !== null ? ", Debayer-Verfahren: " + meta.cfaInterpolation : "" ) );

   if ( meta.hdrWidth !== null && meta.hdrHeight !== null )
      console.writeln( "  Größe laut Header: " + meta.hdrWidth + " × " + meta.hdrHeight + " px  [" + meta.hdrSizeSource + "]" +
                       ( meta.geomFactor !== null ? "  → Bild um Faktor <b>" + fmt( meta.geomFactor, 2 ) + "</b> " +
                                                    ( meta.geomFactor > 1 ? "verkleinert" : "vergrößert" )
                                                  : ( meta.geomCropped ? "  → abweichend (Zuschnitt?)" : "  → passt zum Bild" ) ) );
   if ( meta.drizzle )
      console.writeln( "  Drizzle:           ja  [" + meta.drizzleSource + "]" );

   // Diagnose: alle gefundenen Plate-Solve-Quellen (zum Pruefen mit echten, geloesten Bildern)
   console.writeln( "  Fenster meldet Lösung: " +
                    ( meta.windowHasSolution === true ? "ja" : ( meta.windowHasSolution === false ? "nein" : "unbekannt (API nicht verfügbar)" ) ) );
   if ( meta.scaleSources.length > 0 )
   {
      for ( var si = 0; si < meta.scaleSources.length; ++si )
         console.writeln( "  Plate-Solve-Skala: <b>" + fmt( meta.scaleSources[si].value, 4 ) + " ″/px</b>  [" +
                          meta.scaleSources[si].name + "]" + ( si === 0 ? "  ← verwendet" : "" ) );
   }
   else if ( meta.staleSources.length > 0 )
      console.writeln( "  Astrometrie:       <i>(nur veraltete Header-Lösung vorhanden – nicht verwendet)</i>" );
   else
      console.writeln( "  Astrometrie:       <i>(keine Plate-Solve-Skala gefunden – weder Fenster-Lösung, PCL-Matrix, " +
                       "Astrometry:Resolution noch FITS-WCS)</i>" );
   for ( var ss = 0; ss < meta.staleSources.length; ++ss )
      console.writeln( "  Veraltet:          " + fmt( meta.staleSources[ss].value, 4 ) + " ″/px  [" + meta.staleSources[ss].name +
                       "]  ← NICHT verwendet (gehört zur alten Bildgröße)" );

   if ( meta.focalLength !== null && meta.effectivePixelSize !== null )
   {
      var optScale = ( ( meta.effectivePixelSize * 1e-3 ) / meta.focalLength ) * ARCSEC_PER_RAD;
      console.writeln( "  Berechnete Skala:  <b>" + fmt( optScale, 4 ) + " ″/px</b>  (aus Brennweite und Pixelgröße)" );
      var solvedScale = meta.astrometryResolution || meta.wcsResolution;
      if ( solvedScale )
      {
         var diff = Math.abs( solvedScale - optScale );
         var diffPct = ( diff / solvedScale ) * 100;
         console.writeln( "  Abweichung:        " + fmt( diff, 4 ) + " ″/px (" + fmt( diffPct, 2 ) + " %)" );
         if ( diffPct > SCALE_DEV_PCT )
         {
            var fh = scaleFactorHint( solvedScale, optScale );
            if ( fh !== null )
               console.warningln( "** " + fh.text );
         }
      }
   }

   if ( meta.notes && meta.notes.length > 0 )
      for ( var nn = 0; nn < meta.notes.length; ++nn )
         console.writeln( "<b>Info:</b> " + meta.notes[nn] );
   if ( meta.warnings && meta.warnings.length > 0 )
      for ( var wn = 0; wn < meta.warnings.length; ++wn )
         console.warningln( "** Hinweis: " + meta.warnings[wn] );
   console.writeln( "================================================================================" );
   console.writeln( "" );
}

// ============================================================================
// Persistenz (Settings)
// ============================================================================
function loadParams()
{
   var p = {
      mode:            DEFAULTS.mode,
      focalLengthMm:   DEFAULTS.focalLengthMm,
      pixelSizeUm:     DEFAULTS.pixelSizeUm,
      distanceLy:      DEFAULTS.distanceLy,
      distanceKm:      DEFAULTS.distanceKm,
      deepskyIdx:      DEFAULTS.deepskyIdx,
      solarObjIdx:     DEFAULTS.solarObjIdx,
      solarStageIdx:   DEFAULTS.solarStageIdx,
      useAstrometry:   true,
      resampleFactor:  1,        // gilt nur fuer das aktuelle Bild, wird nicht gespeichert
      scaleUnverified: false     // gilt nur fuer das aktuelle Bild, wird nicht gespeichert
   };
   try
   {
      var s = Settings.read( KEY_MODE, DataType_String );
      if ( Settings.lastReadOK && ( s === "deepsky" || s === "solarsys" ) ) p.mode = s;

      var v = Settings.read( KEY_FOCAL, DataType_Double );
      if ( Settings.lastReadOK && isFinite( v ) && v > 0 ) p.focalLengthMm = v;

      v = Settings.read( KEY_PIXEL, DataType_Double );
      if ( Settings.lastReadOK && isFinite( v ) && v > 0 ) p.pixelSizeUm = v;

      v = Settings.read( KEY_DISTANCE_LY, DataType_Double );
      if ( Settings.lastReadOK && isFinite( v ) && v > 0 ) p.distanceLy = v;

      v = Settings.read( KEY_DISTANCE_KM, DataType_Double );
      if ( Settings.lastReadOK && isFinite( v ) && v > 0 ) p.distanceKm = v;

      var vi = Settings.read( KEY_DEEPSKY_OBJ, DataType_Int32 );
      if ( Settings.lastReadOK && vi >= 0 ) p.deepskyIdx = vi;

      vi = Settings.read( KEY_SOLAR_OBJ, DataType_Int32 );
      if ( Settings.lastReadOK && vi >= 0 ) p.solarObjIdx = vi;

      vi = Settings.read( KEY_SOLAR_STAGE, DataType_Int32 );
      if ( Settings.lastReadOK && vi >= 0 ) p.solarStageIdx = vi;
   }
   catch ( e )
   {
      console.warningln( "** Einstellungen konnten nicht geladen werden (" + e + "). Verwende Standardwerte." );
   }
   return p;
}

function saveParams( p )
{
   try
   {
      Settings.write( KEY_MODE,        DataType_String, p.mode );
      Settings.write( KEY_FOCAL,       DataType_Double, p.focalLengthMm );
      Settings.write( KEY_PIXEL,       DataType_Double, p.pixelSizeUm );
      Settings.write( KEY_DISTANCE_LY, DataType_Double, p.distanceLy );
      Settings.write( KEY_DISTANCE_KM, DataType_Double, p.distanceKm );
      Settings.write( KEY_DEEPSKY_OBJ, DataType_Int32,  p.deepskyIdx );
      Settings.write( KEY_SOLAR_OBJ,   DataType_Int32,  p.solarObjIdx );
      Settings.write( KEY_SOLAR_STAGE, DataType_Int32,  p.solarStageIdx );
   }
   catch ( e )
   {
      console.warningln( "** Einstellungen konnten nicht gespeichert werden (" + e + ")." );
   }
}

// ============================================================================
// Physik: Skalenberechnung & Messwertermittlung
// ============================================================================
function projLength( dist, thetaRad )
{
   if ( !( thetaRad > 0 ) ) return 0;
   if ( thetaRad >= Math.PI ) return dist * thetaRad;
   return 2 * dist * Math.tan( thetaRad / 2 );
}

function getPixelscale( p, meta )
{
   // Faktor aus der Rueckfrage "Originalaufloesung?" (nur ohne Plate-Solve gesetzt, sonst 1)
   var fac = ( typeof p.resampleFactor === "number" && p.resampleFactor > 0 ) ? p.resampleFactor : 1;
   var optTheta = ( p.pixelSizeUm * fac * 1e-3 ) / p.focalLengthMm;
   var optArcsec = optTheta * ARCSEC_PER_RAD;

   var astRes = ( meta && ( meta.astrometryResolution || meta.wcsResolution ) )
                ? ( meta.astrometryResolution || meta.wcsResolution )
                : null;

   var useAst = ( astRes !== null && p.useAstrometry !== false );
   var theta = useAst ? ( astRes / ARCSEC_PER_RAD ) : optTheta;
   var arcsecPerPx = theta * ARCSEC_PER_RAD;
   var dev = ( astRes !== null && isFinite( optArcsec ) ) ? Math.abs( optArcsec - astRes ) / astRes * 100 : null;
   var source = useAst ? "Plate-Solve"
                       : "Brennweite/Pixelgröße" + ( fac !== 1 ? " × Faktor " + fmt( fac, 2 ) : "" ) +
                         ( p.scaleUnverified ? " (ungeprüft)" : "" );

   if ( p.mode === "solarsys" )
   {
      var kmPerPx = p.distanceKm * theta;
      return {
         mode:                  "solarsys",
         thetaRad:              theta,
         arcsecPerPx:           arcsecPerPx,
         kmPerPx:               kmPerPx,
         auPerPx:               kmPerPx / KM_PER_AU,
         astrometryArcsecPerPx: astRes,
         optArcsecPerPx:        optArcsec,
         deviationPct:          dev,
         usesAstrometry:        useAst,
         resampleFactor:        fac,
         source:                source
      };
   }
   var lyPerPx = p.distanceLy * theta;
   return {
      mode:                  "deepsky",
      thetaRad:              theta,
      arcsecPerPx:           arcsecPerPx,
      lyPerPx:               lyPerPx,
      astrometryArcsecPerPx: astRes,
      optArcsecPerPx:        optArcsec,
      deviationPct:          dev,
      usesAstrometry:        useAst,
      resampleFactor:        fac,
      source:                source
   };
}

function computeMeasurement( lengthPx, p, meta )
{
   if ( !isFinite( lengthPx ) || lengthPx < 0 ) lengthPx = 0;
   var sc = getPixelscale( p, meta );
   var arcsec = lengthPx * sc.arcsecPerPx;
   var thetaRad = lengthPx * sc.thetaRad;

   if ( p.mode === "solarsys" )
   {
      var distKm = p.distanceKm;
      var distAu = distKm / KM_PER_AU;
      var km = projLength( distKm, thetaRad );
      var au = km / KM_PER_AU;
      var lightSec = distKm / C_KM_S;

      var radiusKm = km / 2;
      var radiusAu = au / 2;
      var areaKm2 = Math.PI * radiusKm * radiusKm;
      var areaAu2 = Math.PI * radiusAu * radiusAu;
      var earthDisks = areaKm2 / EARTH_DISK_KM2;
      var earthDiameterRatio = km / EARTH_DIAMETER_KM;

      return {
         mode:               "solarsys",
         lengthPx:           lengthPx,
         arcsec:             arcsec,
         km:                 km,
         au:                 au,
         distKm:             distKm,
         distAu:             distAu,
         lightSec:           lightSec,
         radiusKm:           radiusKm,
         radiusAu:           radiusAu,
         areaKm2:            areaKm2,
         areaAu2:            areaAu2,
         earthDisks:         earthDisks,
         earthDiameterRatio: earthDiameterRatio
      };
   }
   else
   {
      var distLy = p.distanceLy;
      var ly = projLength( distLy, thetaRad );
      var au = ly * AU_PER_LY;
      var km = ly * KM_PER_LY;
      var solarSysLinear = au / SOLARSYS_AU;

      var radiusLy = ly / 2;
      var radiusAu = au / 2;
      var radiusKm = km / 2;
      var areaLy2 = Math.PI * radiusLy * radiusLy;
      var areaAu2 = Math.PI * radiusAu * radiusAu;
      var areaKm2 = Math.PI * radiusKm * radiusKm;
      var solarSysArea = ( au / SOLARSYS_AU ) * ( au / SOLARSYS_AU );

      return {
         mode:           "deepsky",
         lengthPx:       lengthPx,
         arcsec:         arcsec,
         ly:             ly,
         lightDays:      ly * 365.25,
         lightHours:     ly * 365.25 * 24,
         au:             au,
         km:             km,
         distLy:         distLy,
         solarSys:       solarSysLinear,
         radiusLy:       radiusLy,
         radiusAu:       radiusAu,
         radiusKm:       radiusKm,
         areaLy2:        areaLy2,
         areaAu2:        areaAu2,
         areaKm2:        areaKm2,
         solarSysArea:   solarSysArea
      };
   }
}

// ============================================================================
// Textausgaben fuer Live-Anzeige, Legende und Konsole
// (Sonnensystem: gemessene Groessen nur in km; AE nur fuer die Objektentfernung)
// ============================================================================
function liveText( m, kind )
{
   var circle = ( kind === "circle" );
   if ( m.mode === "solarsys" )
   {
      if ( circle )
         return fmt( m.lengthPx, 1 ) + " px (Ø)  |  " + formatAngle( m.arcsec ) +
                "  |  Ø " + formatKm( m.km ) + "  |  Fläche: " + formatAreaKm( m.areaKm2 ) +
                "  |  ≈ " + formatMultiplier( m.earthDisks ) + " × Erdscheibe";
      else
         return fmt( m.lengthPx, 1 ) + " px  |  " + formatAngle( m.arcsec ) +
                "  |  " + formatKm( m.km ) +
                "  |  ≈ " + formatMultiplier( m.earthDiameterRatio ) + " × Erddurchmesser";
   }
   else
   {
      if ( circle )
         return fmt( m.lengthPx, 1 ) + " px (Ø)  |  " + formatAngle( m.arcsec ) +
                "  |  Ø " + formatLy( m.ly ) + "  |  Fläche: " + formatAreaLy( m.areaLy2 ) +
                "  |  ≈ " + formatMultiplier( m.solarSysArea ) + " × Sonnensystem-Fläche";
      else
         return fmt( m.lengthPx, 1 ) + " px  |  " + formatAngle( m.arcsec ) +
                "  |  " + formatLy( m.ly ) + "  |  ≈ " + formatMultiplier( m.solarSys ) + " × Sonnensystem";
   }
}

function shortText( m, kind )
{
   var circle = ( kind === "circle" );
   if ( m.mode === "solarsys" )
   {
      if ( circle )
         return "Ø " + formatAngle( m.arcsec ) + " | A: " + formatAreaKm( m.areaKm2 );
      else
         return formatAngle( m.arcsec ) + " | " + formatKm( m.km );
   }
   else
   {
      if ( circle )
         return "Ø " + formatAngle( m.arcsec ) + " | A: " + formatAreaLy( m.areaLy2 );
      else
         return formatAngle( m.arcsec ) + " | " + formatLy( m.ly );
   }
}

function legendText( it )
{
   var m = it.m;
   var circle = ( it.kind === "circle" );
   if ( m.mode === "solarsys" )
   {
      if ( circle )
         return "#" + it.n + "  Kreis: Ø " + formatAngle( m.arcsec ) + " | " + formatKm( m.km ) +
                " | Fläche " + formatAreaKm( m.areaKm2 ) + " (≈ " + formatMultiplier( m.earthDisks ) + " × Erdscheibe)";
      else
         return "#" + it.n + "  Linie: " + formatAngle( m.arcsec ) + " | " + formatKm( m.km ) +
                " (≈ " + formatMultiplier( m.earthDiameterRatio ) + " × Erddurchmesser)";
   }
   else
   {
      if ( circle )
         return "#" + it.n + "  Kreis: Ø " + formatAngle( m.arcsec ) + " | " + formatLy( m.ly ) +
                " | Fläche " + formatAreaLy( m.areaLy2 ) + " (≈ " + formatMultiplier( m.solarSysArea ) + " × Sonnensystem)";
      else
         return "#" + it.n + "  Linie: " + formatAngle( m.arcsec ) + " | " + formatLy( m.ly ) +
                " | ≈ " + formatMultiplier( m.solarSys ) + " × Sonnensystem";
   }
}

function report( it, p )
{
   var m = it.m;
   var circle = ( it.kind === "circle" );
   var isSolar = ( p.mode === "solarsys" );

   console.writeln( "" );
   console.writeln( "<b>=== Messung #" + it.n + ( circle ? " (Kreis / Fläche)" : " (Linie / Strecke)" ) +
                    " [" + ( isSolar ? "Sonnensystem" : "Deepsky" ) + "] ===</b>" );

   if ( isSolar )
   {
      console.writeln( "Angenommene Entfernung: d = " + formatKm( p.distanceKm ) + " (" + formatAu( p.distanceKm / KM_PER_AU ) + ")" +
                       "  [Lichtlaufzeit: " + formatLightTime( p.distanceKm / C_KM_S ) + "]" );

      if ( circle )
      {
         console.writeln( "Mittelpunkt:        (" + fmt( it.x0, 1 ) + " | " + fmt( it.y0, 1 ) + ") px" );
         console.writeln( "Randpunkt:          (" + fmt( it.x1, 1 ) + " | " + fmt( it.y1, 1 ) + ") px" );
         console.writeln( "Radius:             " + fmt( m.lengthPx / 2, 2 ) + " px  =  " + formatAngle( m.arcsec / 2 ) +
                          "  =  " + formatKm( m.radiusKm ) );
         console.writeln( "Durchmesser:        " + fmt( m.lengthPx, 2 ) + " px  =  " + formatAngle( m.arcsec ) +
                          "  =  " + formatKm( m.km ) );
         console.writeln( "<b>Projizierte Kreisfläche:</b>" );
         console.writeln( "   <b>" + formatAreaKm( m.areaKm2 ) + "</b>" );
         console.writeln( "   ≈ <b>" + formatMultiplier( m.earthDisks ) + " × Erdscheibe</b> (Ø 12.742 km, " +
                          formatAreaKm( EARTH_DISK_KM2 ) + ")" );
         console.writeln( "   (Durchmesser ≈ " + formatMultiplier( m.earthDiameterRatio ) + " × Erddurchmesser)" );
      }
      else
      {
         console.writeln( "Start:              (" + fmt( it.x0, 1 ) + " | " + fmt( it.y0, 1 ) + ") px" );
         console.writeln( "Ende:               (" + fmt( it.x1, 1 ) + " | " + fmt( it.y1, 1 ) + ") px" );
         console.writeln( "Laenge:             " + fmt( m.lengthPx, 2 ) + " px" );
         console.writeln( "Winkelausdehnung:   " + formatAngle( m.arcsec ) );
         console.writeln( "Projizierte Strecke:" );
         console.writeln( "   <b>" + formatKm( m.km ) + "</b>" );
         console.writeln( "   ≈ " + formatMultiplier( m.earthDiameterRatio ) + " × Erddurchmesser (12.742 km)" );
      }
   }
   else
   {
      console.writeln( "Angenommene Entfernung: d = " + formatLy( p.distanceLy ) );

      if ( circle )
      {
         console.writeln( "Mittelpunkt:        (" + fmt( it.x0, 1 ) + " | " + fmt( it.y0, 1 ) + ") px" );
         console.writeln( "Randpunkt:          (" + fmt( it.x1, 1 ) + " | " + fmt( it.y1, 1 ) + ") px" );
         console.writeln( "Radius:             " + fmt( m.lengthPx / 2, 2 ) + " px  =  " + formatAngle( m.arcsec / 2 ) +
                          "  =  " + formatLy( m.radiusLy ) );
         console.writeln( "Durchmesser:        " + fmt( m.lengthPx, 2 ) + " px  =  " + formatAngle( m.arcsec ) +
                          "  =  " + formatLy( m.ly ) );
         console.writeln( "<b>Projizierte Kreisfläche:</b>" );
         console.writeln( "   <b>" + formatAreaLy( m.areaLy2 ) + "</b>" );
         console.writeln( "   " + formatAreaAu( m.areaAu2 ) );
         console.writeln( "   " + m.areaKm2.toExponential( 3 ).replace( ".", "," ) + " km²" );
         console.writeln( "   ≈ <b>" + formatMultiplier( m.solarSysArea ) + " × Sonnensystem-Fläche</b> (Scheibe mit Ø 100 AE, " +
                          fmt( SOLARSYS_AREA_AU2, 1 ) + " AE²)" );
      }
      else
      {
         console.writeln( "Start:              (" + fmt( it.x0, 1 ) + " | " + fmt( it.y0, 1 ) + ") px" );
         console.writeln( "Ende:               (" + fmt( it.x1, 1 ) + " | " + fmt( it.y1, 1 ) + ") px" );
         console.writeln( "Laenge:             " + fmt( m.lengthPx, 2 ) + " px" );
         console.writeln( "Winkelausdehnung:   " + formatAngle( m.arcsec ) );
         console.writeln( "Projizierte Groesse:" );
         console.writeln( "   " + formatLy( m.ly ).replace( " Lj", " Lichtjahre" ) );
         console.writeln( "   " + fmt( m.lightDays, 2 )  + " Lichttage" );
         console.writeln( "   " + fmt( m.lightHours, 1 ) + " Lichtstunden" );
         console.writeln( "   " + fmt( m.au, 0 )         + " AE" );
         console.writeln( "   " + m.km.toExponential( 3 ).replace( ".", "," ) + " km" );
         console.writeln( "   ≈ " + formatMultiplier( m.solarSys ) + " × Sonnensystem (" + SOLARSYS_AU + " AE)" );
      }
   }
}

// ============================================================================
// Etappe 3: Bild mit Annotationen speichern (PNG / JPG)
// ============================================================================
function drawExportTag( g, font, x, y, txt, color, centered )
{
   var tw = font.width( txt );
   var th = font.ascent + font.descent;
   if ( centered ) x -= tw / 2;
   g.fillRect( Math.round( x - 4 ), Math.round( y - font.ascent - 3 ),
               Math.round( x + tw + 4 ), Math.round( y + font.descent + 3 ),
               new Brush( 0xC8000000 ) );
   g.pen = new Pen( color, 1 );
   g.drawText( Math.round( x ), Math.round( y ), txt );
}

function drawExportLegend( g, font, bmp, history, params )
{
   if ( !history || history.length === 0 ) return;
   var maxRows = 14;
   var count = Math.min( history.length, maxRows );
   var start = history.length - count;

   var rows = [];
   var isSolar = ( params.mode === "solarsys" );
   rows.push({ txt: "Messungen (" + history.length + ") – " + ( isSolar ? "Sonnensystem" : "Deepsky" ), color: 0xFFFFFFFF, swatch: false });
   for ( var i = start; i < history.length; ++i )
      rows.push({ txt: legendText( history[i] ), color: history[i].color, swatch: true });

   var pad = Math.max( 6, Math.round( font.pixelSize * 0.5 ) );
   var lineH = font.ascent + font.descent + 6;
   var boxW = 0;
   for ( var k = 0; k < rows.length; ++k )
      boxW = Math.max( boxW, font.width( rows[k].txt ) + ( rows[k].swatch ? ( lineH + 4 ) : 0 ) );
   boxW += 2 * pad + 10;
   var boxH = rows.length * lineH + 2 * pad;

   var originX = 16;
   var originY = bmp.height - boxH - 16;
   if ( originY < 16 ) originY = 16;

   g.fillRect( originX, originY, originX + boxW, originY + boxH, new Brush( 0xDD101010 ) );
   g.pen = new Pen( 0xFF707070, 1 );
   g.drawRect( originX, originY, originX + boxW, originY + boxH );

   for ( var j = 0; j < rows.length; ++j )
   {
      var rowY = originY + pad + j * lineH + font.ascent;
      var tx = originX + pad;
      if ( rows[j].swatch )
      {
         g.fillRect( tx, rowY - font.ascent + 2, tx + lineH - 4, rowY + 2, new Brush( rows[j].color ) );
         tx += lineH + 4;
      }
      g.pen = new Pen( rows[j].color, 1 );
      g.drawText( tx, rowY, rows[j].txt );
   }
}

function strokeCircle( g, cx, cy, r )
{
   if ( !( r > 0 ) || !isFinite( r ) ) return;
   var n = clamp( Math.round( r / 3 ), 48, 360 );
   var px = cx + r, py = cy;
   for ( var i = 1; i <= n; ++i )
   {
      var a = 2 * Math.PI * i / n;
      var qx = cx + r * Math.cos( a );
      var qy = cy + r * Math.sin( a );
      g.drawLine( px, py, qx, qy );
      px = qx; py = qy;
   }
}

function niceLength( v )
{
   if ( !( v > 0 ) || !isFinite( v ) ) return 0;
   var e = Math.floor( Math.log( v ) / Math.LN10 );
   var base = Math.pow( 10, e );
   var f = v / base;
   var n = ( f >= 5 ) ? 5 : ( f >= 2 ? 2 : 1 );
   return n * base;
}

// Massstabsleiste unten rechts; scale = Bitmap-Pixel pro Bildpixel
function drawExportScaleBar( g, font, bmp, scale, params, meta )
{
   var sc = getPixelscale( params, meta );
   var solar = ( params.mode === "solarsys" );
   var perPx = solar ? sc.kmPerPx : sc.lyPerPx;
   if ( !( perPx > 0 ) || !isFinite( perPx ) || !( scale > 0 ) ) return;

   var phys = niceLength( ( bmp.width * 0.15 / scale ) * perPx );
   if ( phys <= 0 ) return;
   var barPx = ( phys / perPx ) * scale;
   var label = solar ? formatKm( phys ) : formatLy( phys );

   g.font = font;
   var th = font.ascent + font.descent;
   var tw = font.width( label );
   var boxW = Math.max( barPx, tw ) + 20;
   var bx1 = bmp.width - 16, bx0 = bx1 - boxW;
   var by1 = bmp.height - 16, by0 = by1 - ( th + 26 );
   g.fillRect( bx0, by0, bx1, by1, new Brush( 0xDD101010 ) );

   g.pen = new Pen( 0xFFFFFFFF, 2 );
   var lx1 = bx1 - 10, lx0 = lx1 - barPx, ly = by1 - 10;
   g.drawLine( lx0, ly, lx1, ly );
   g.drawLine( lx0, ly - 6, lx0, ly + 2 );
   g.drawLine( lx1, ly - 6, lx1, ly + 2 );
   g.pen = new Pen( 0xFFFFFFFF, 1 );
   g.drawText( Math.round( lx1 - tw ), Math.round( by0 + 6 + font.ascent ), label );
}

function drawExportBanner( g, font, bmp, params, meta )
{
   var isSolar = ( params.mode === "solarsys" );
   var titleText = TITLE + " v" + VERSION;
   var infoText = "";
   if ( isSolar )
      infoText = "d = " + formatKm( params.distanceKm ) + " (" + formatAu( params.distanceKm / KM_PER_AU ) + ")";
   else
      infoText = "d = " + formatLy( params.distanceLy );

   var scB = getPixelscale( params, meta );
   infoText += "  |  " + fmt( scB.arcsecPerPx, 3 ) + "″/px (" + scB.source + ")";

   if ( meta && meta.objectName )
      infoText = meta.objectName + "  |  " + infoText;

   var bannerFont = new Font( font );
   bannerFont.pixelSize = Math.max( 11, Math.round( font.pixelSize * 1.1 ) );
   bannerFont.bold = true;
   g.font = bannerFont;

   var txt = titleText + "   |   " + infoText;
   var tw = bannerFont.width( txt );
   var th = bannerFont.ascent + bannerFont.descent;
   var pad = 8;

   var x = 16, y = 16;
   g.fillRect( x, y, x + tw + 2 * pad, y + th + 2 * pad, new Brush( 0xDD101010 ) );
   g.pen = new Pen( 0xFF707070, 1 );
   g.drawRect( x, y, x + tw + 2 * pad, y + th + 2 * pad );

   g.pen = new Pen( 0xFF00E000, 1 );
   g.drawText( x + pad, y + pad + bannerFont.ascent, txt );

   g.font = font;
}

function saveAnnotatedImage( baseBitmap, origWidth, origHeight, history, params, meta )
{
   if ( !history || history.length === 0 )
   {
      ( new MessageBox( "Es sind noch keine Messungen vorhanden, die exportiert werden könnten.",
                        TITLE, StdIcon_Warning, StdButton_Ok ) ).execute();
      return false;
   }

   var baseName = ( meta && meta.objectName ) ? meta.objectName.replace( /[^a-zA-Z0-9_\-]/g, "_" ) : "Messung";
   var defaultName = baseName + "_LSM.png";

   var initialDir = "";
   try {
      if ( meta && meta.filePath && meta.filePath.length > 0 )
         initialDir = File.extractDrive( meta.filePath ) + File.extractDirectory( meta.filePath );
   } catch ( e ) {}

   var sfd = new SaveFileDialog();
   sfd.caption = "Bild mit Annotationen speichern";
   sfd.overwritePrompt = true;
   sfd.filters = [
      [ "PNG-Bild (*.png)", "*.png" ],
      [ "JPEG-Bild (*.jpg *.jpeg)", "*.jpg", "*.jpeg" ]
   ];
   sfd.initialPath = ( initialDir.length > 0 ) ? ( initialDir + "/" + defaultName ) : defaultName;

   if ( !sfd.execute() )
      return false;

   var filePath = sfd.fileName;
   var t0 = ( new Date() ).getTime();

   try
   {
      var bmp = new Bitmap( baseBitmap );
      var bw = bmp.width;
      var bh = bmp.height;
      var s = bw / origWidth;

      var g = new Graphics( bmp );
      try
      {
         var fontSize = Math.max( 10, Math.round( bw / 100 ) );
         var font = new Font( "Helvetica", fontSize );
         font.bold = true;
         g.font = font;
         try { g.antialiasing = true; } catch ( eaa ) {}

         for ( var i = 0; i < history.length; ++i )
         {
            var it = history[i];
            var p0 = { x: it.x0 * s, y: it.y0 * s };
            var p1 = { x: it.x1 * s, y: it.y1 * s };
            var dx = p1.x - p0.x;
            var dy = p1.y - p0.y;
            var col = it.color;

            g.pen = new Pen( col, Math.max( 1, Math.round( fontSize / 6 ) ) );

            if ( it.kind === "circle" )
            {
               var r = Math.sqrt( dx * dx + dy * dy );
               strokeCircle( g, p0.x, p0.y, r );
               var mk = Math.max( 4, Math.round( fontSize * 0.4 ) );
               g.drawLine( p0.x - mk, p0.y, p0.x + mk, p0.y );
               g.drawLine( p0.x, p0.y - mk, p0.x, p0.y + mk );

               var rPen = new Pen( col, 1 );
               rPen.style = PenStyle_Dot;
               g.pen = rPen;
               g.drawLine( p0.x, p0.y, p1.x, p1.y );

               var tagTxt = "#" + it.n + "  " + shortText( it.m, it.kind );
               var tagY = p0.y - r - 6;
               if ( tagY < fontSize + 8 ) tagY = p0.y + r + fontSize + 8;
               drawExportTag( g, font, p0.x, tagY, tagTxt, col, true );
            }
            else
            {
               g.drawLine( p0.x, p0.y, p1.x, p1.y );
               var len = Math.sqrt( dx * dx + dy * dy );
               var nx = 0, ny = 1;
               if ( len > 0.5 ) { nx = -dy / len; ny = dx / len; }
               var emk = Math.max( 4, Math.round( fontSize * 0.4 ) );
               g.drawLine( p0.x - emk * nx, p0.y - emk * ny, p0.x + emk * nx, p0.y + emk * ny );
               g.drawLine( p1.x - emk * nx, p1.y - emk * ny, p1.x + emk * nx, p1.y + emk * ny );

               var midX = ( p0.x + p1.x ) / 2;
               var midY = ( p0.y + p1.y ) / 2;
               if ( midY < fontSize + 8 ) midY = fontSize + 12;
               var tagTxt = "#" + it.n + "  " + shortText( it.m, it.kind );
               drawExportTag( g, font, midX + 8, midY - 8, tagTxt, col, false );
            }
         }

         drawExportLegend( g, font, bmp, history, params );
         drawExportBanner( g, font, bmp, params, meta );
         drawExportScaleBar( g, font, bmp, s, params, meta );
      }
      finally
      {
         try { g.end(); } catch ( eg ) {}
      }

      var ext = File.extractExtension( filePath ).toLowerCase();
      if ( ext !== ".png" && ext !== ".jpg" && ext !== ".jpeg" )
      {
         filePath += ".png";
         ext = ".png";
      }
      var quality = ( ext === ".jpg" || ext === ".jpeg" ) ? 95 : -1;
      bmp.save( filePath, quality );

      var dur = ( ( ( new Date() ).getTime() - t0 ) / 1000 ).toFixed( 1 );
      console.writeln( "<b>Bild mit Annotationen gespeichert:</b> " + filePath + " (" + dur + " s)" );
      ( new MessageBox( "Das Bild mit allen Annotationen wurde erfolgreich gespeichert:\n\n" + filePath,
                        TITLE, StdIcon_Information, StdButton_Ok ) ).execute();
      return true;
   }
   catch ( ex )
   {
      console.criticalln( "*** Fehler beim Speichern des Bildes: " + ex );
      ( new MessageBox( "Fehler beim Speichern:\n" + ex, TITLE, StdIcon_Error, StdButton_Ok ) ).execute();
   }
   return false;
}

// ============================================================================
// Parameter-Dialog mit Modus-Auswahl, Katalogen & Doku-Button
// ============================================================================
class ParameterDialog extends Dialog
{
constructor( params, meta )
{
   super();

   var self = this;
   this.windowTitle = TITLE + " v" + VERSION + " – Parameter & Modus";
   this.minWidth = 560;

   this.infoLabel = new Label( this );
   this.infoLabel.useRichText = true;
   this.infoLabel.wordWrapping = true;
   this.infoLabel.text = "<b>" + TITLE + " v" + VERSION + "</b> – Interaktive Größen- und Flächenmessung am astronomischen Objekt. " +
                         "Bilddaten werden nicht verändert.";

   var metaBox = null;
   if ( meta )
   {
      var metaLines = [];
      if ( meta.objectName )
         metaLines.push( "<b>Objekt (Header):</b> " + meta.objectName );
      if ( meta.telescope || meta.instrument )
         metaLines.push( "<b>Setup:</b> " + ( meta.telescope || "?" ) + " | " + ( meta.instrument || "?" ) );
      if ( meta.focalLength !== null )
         metaLines.push( "<b>Brennweite:</b> " + fmt( meta.focalLength, 1 ) + " mm" );
      if ( meta.effectivePixelSize !== null )
      {
         var binTxt = ( meta.binningX > 1 ) ? " (" + meta.binningX + "×" + meta.binningX + " Binning)" : "";
         metaLines.push( "<b>Pixelgröße:</b> " + fmt( meta.effectivePixelSize, 3 ) + " µm" + binTxt );
      }
      var astRes = meta.astrometryResolution || meta.wcsResolution;
      if ( astRes )
         metaLines.push( "<b>Astrometrie:</b> " + fmt( astRes, 4 ) + " ″/px (gelöst" +
                         ( meta.astrometrySource ? ", Quelle: " + meta.astrometrySource : "" ) + ")" );
      if ( meta.notes && meta.notes.length > 0 )
         for ( var ni2 = 0; ni2 < meta.notes.length; ++ni2 )
            metaLines.push( "<span style=\"color:#4A90E2\">ℹ " + meta.notes[ni2] + "</span>" );
      if ( meta.warnings && meta.warnings.length > 0 )
         for ( var wi2 = 0; wi2 < meta.warnings.length; ++wi2 )
            metaLines.push( "<span style=\"color:#FF8000\">⚠ " + meta.warnings[wi2] + "</span>" );

      if ( metaLines.length > 0 )
      {
         metaBox = new GroupBox( this );
         metaBox.title = "Aus Bildmetadaten erkannt";
         var mbSizer = new VerticalSizer;
         mbSizer.margin = 8;
         mbSizer.spacing = 3;
         for ( var mi = 0; mi < metaLines.length; ++mi )
         {
            var ml = new Label( metaBox );
            ml.useRichText = true;
            ml.wordWrapping = true;
            ml.text = metaLines[mi];
            mbSizer.add( ml );
         }
         metaBox.sizer = mbSizer;
      }
   }

   var optBox = new GroupBox( this );
   optBox.title = "Aufnahmeoptik und Sensor";
   var optSizer = new VerticalSizer;
   optSizer.margin = 8;
   optSizer.spacing = 6;

   function addRowIn( parent, sizer, labelText, value, tip )
   {
      var hs = new HorizontalSizer;
      hs.spacing = 6;
      var lbl = new Label( parent );
      lbl.text = labelText;
      lbl.minWidth = 170;
      lbl.textAlignment = TextAlign_Right | TextAlign_VertCenter;
      var ed = new Edit( parent );
      ed.text = String( value ).replace( ".", "," );
      ed.toolTip = tip;
      hs.add( lbl );
      hs.add( ed, 100 );
      sizer.add( hs );
      return ed;
   }

   this.edFocal = addRowIn( optBox, optSizer, "Brennweite [mm]:", params.focalLengthMm,
                            "Effektive Brennweite der Aufnahme in Millimetern." );
   this.edPixel = addRowIn( optBox, optSizer, "Pixelgröße [µm]:", params.pixelSizeUm,
                            "Effektive Pixelgröße des Sensors in Mikrometern (inkl. Binning)." );
   var astScale = ( meta && ( meta.astrometryResolution || meta.wcsResolution ) )
                  ? ( meta.astrometryResolution || meta.wcsResolution ) : null;

   this.chkAst = new CheckBox( optBox );
   this.chkAst.text = "Plate-Solve-Skala für die Messung verwenden (empfohlen)";
   this.chkAst.toolTip = "Nutzt den aus der Astrometrie gewonnenen Bildmaßstab statt Brennweite/Pixelgröße. " +
                         "Nach Resampling, Binning, Drizzle oder Super-Pixel-Debayer ist das die zuverlässigere Quelle – " +
                         "vorausgesetzt, die Lösung wurde nach dem letzten Resampling/Crop erstellt oder vom Prozess mitgeführt.";
   this.chkAst.checked = ( astScale !== null && params.useAstrometry !== false );
   this.chkAst.enabled = ( astScale !== null );

   this.scaleInfoLabel = new Label( optBox );
   this.scaleInfoLabel.useRichText = true;
   this.scaleInfoLabel.wordWrapping = true;

   optSizer.add( this.chkAst );
   optSizer.add( this.scaleInfoLabel );

   // Rueckfrage ohne Plate-Solve: liegt das Bild in Originalaufloesung vor?
   this.origGroup = new Control( optBox );
   var ogSizer = new VerticalSizer;
   ogSizer.margin = 0;
   ogSizer.spacing = 6;

   var origRow = new HorizontalSizer;
   origRow.spacing = 6;
   var origLabel = new Label( this.origGroup );
   origLabel.text = "Pixelgröße passt zum Bild?";
   origLabel.minWidth = 170;
   origLabel.textAlignment = TextAlign_Right | TextAlign_VertCenter;
   this.origCombo = new ComboBox( this.origGroup );
   this.origCombo.addItem( "– bitte beantworten –" );
   this.origCombo.addItem( "Ja: Originalauflösung oder Pixelgröße oben schon angepasst" );
   this.origCombo.addItem( "Nein: Bild verändert, Pixelgröße oben gilt für den Sensor" );
   this.origCombo.addItem( "Weiß ich nicht" );
   this.origCombo.toolTip = "Ohne Plate-Solve kann das Script nicht selbst prüfen, ob die Pixelgröße oben zu den Bildpixeln passt.\n" +
                            "Ja: Bild in Originalauflösung (Zuschneiden ist egal) ODER die Pixelgröße enthält Binning/Resampling schon\n" +
                            "(PixInsight passt XPIXSZ z. B. bei IntegerResample selbst an: 3,8 µm → 7,6 µm bei 50 %).\n" +
                            "Nein: Das Bild wurde gebinnt, skaliert, gedrizzelt oder per Super-Pixel debayert, die Pixelgröße oben ist aber noch die des Sensors.";
   origRow.add( origLabel );
   origRow.add( this.origCombo, 100 );
   ogSizer.add( origRow );

   var facRow = new HorizontalSizer;
   facRow.spacing = 6;
   var facLabel = new Label( this.origGroup );
   facLabel.text = "Pixel größer um Faktor:";
   facLabel.minWidth = 170;
   facLabel.textAlignment = TextAlign_Right | TextAlign_VertCenter;
   this.edFactor = new Edit( this.origGroup );
   this.edFactor.text = "";
   this.edFactor.toolTip = "2 = Binning 2×2, Super-Pixel-Debayer oder Verkleinerung auf 50 %.  0,5 = 2×-Drizzle oder Vergrößerung auf 200 %.\n" +
                           "Binning, das schon in der Pixelgröße oben steckt, nicht noch einmal angeben.";
   facRow.add( facLabel );
   facRow.add( this.edFactor, 100 );
   ogSizer.add( facRow );
   this.origGroup.sizer = ogSizer;
   optSizer.add( this.origGroup );

   this.origGroup.visible = ( astScale === null );
   if ( astScale === null && meta && meta.superPixel )
   {
      this.origCombo.currentItem = 2;      // vorbelegt aus erkanntem Super-Pixel-Debayer
      this.edFactor.text = "2";
   }
   else
   {
      this.origCombo.currentItem = 0;
      // Faktor aus der Bildgroesse nur als Vorschlag fuer "Nein" eintragen: ob XPIXSZ schon angepasst ist, ist unbekannt
      if ( astScale === null && meta && meta.geomFactor !== null )
         this.edFactor.text = fmt( meta.geomFactor, 2 ).replace( /,?0+$/, "" );
   }
   // Erneuter Aufruf aus dem Messfenster ("Eingaben aendern"): vorige Antwort wieder vorbelegen
   if ( astScale === null && typeof params.origAnswer === "number" && params.origAnswer > 0 && params.origAnswer <= 3 )
   {
      this.origCombo.currentItem = params.origAnswer;
      if ( params.origAnswer === 2 && params.resampleFactor > 0 )
         this.edFactor.text = fmt( params.resampleFactor, 4 ).replace( /,?0+$/, "" );
   }
   this.edFactor.enabled = ( this.origCombo.currentItem === 2 );
   // Super-Pixel-Debayer: PixInsight laesst XPIXSZ unveraendert (getestet), Faktor 2 korrigiert also nicht doppelt
   var hdrUnadjusted = !!( meta && meta.superPixel );

   optBox.sizer = optSizer;

   function currentFactor()
   {
      if ( astScale !== null || self.origCombo.currentItem !== 2 ) return 1;
      var k = parseNumber( self.edFactor.text, false );
      return ( isFinite( k ) && k > 0 ) ? k : 1;
   }

   // PixInsight schaetzt die Hoehe umbrochener Rich-Text-Labels zu knapp: Zeilen selbst zaehlen
   // (Schaetzung mit der normalen statt der kleinen Schrift, also eher zu viel als zu wenig Platz)
   function fitInfoHeight( html )
   {
      try
      {
         var lbl = self.scaleInfoLabel;
         var fnt = lbl.font;
         var avail = ( lbl.width > 100 ) ? lbl.width - 8 : 500;
         var lineH = ( typeof fnt.lineSpacing === "number" && fnt.lineSpacing > 0 ) ? fnt.lineSpacing : ( fnt.ascent + fnt.descent + 2 );
         var segs = String( html ).split( /<br\s*\/?>/i );
         var lines = 0;
         for ( var i = 0; i < segs.length; ++i )
         {
            var plain = segs[i].replace( /<[^>]*>/g, "" ).replace( /&[a-z]+;/gi, " " );
            lines += Math.max( 1, Math.ceil( fnt.width( plain ) / avail ) );
         }
         lbl.minHeight = Math.ceil( lines * lineH * 0.9 ) + 6;
      }
      catch ( eFit ) {}
   }

   function updateScaleInfo()
   {
      var f = parseNumber( self.edFocal.text );
      var s = parseNumber( self.edPixel.text, false );
      var opt = ( isFinite( f ) && f > 0 && isFinite( s ) && s > 0 ) ? ( s * 1e-3 / f ) * ARCSEC_PER_RAD : null;
      var txt = "";
      if ( opt !== null )
         txt += "Skala aus Brennweite/Pixelgröße: <b>" + fmt( opt, 4 ) + " ″/px</b>";
      if ( astScale !== null )
      {
         txt += "<br>Skala aus Plate-Solve: <b>" + fmt( astScale, 4 ) + " ″/px</b>";
         if ( opt !== null )
         {
            var dv = Math.abs( opt - astScale ) / astScale * 100;
            if ( dv > SCALE_DEV_PCT )
            {
               var fh = scaleFactorHint( astScale, opt );
               // Ursachenliste nur, wenn kein konkreter Faktor erkannt wurde (sonst doppelt)
               txt += "<br><span style=\"color:#FF8000\"><b>⚠ Abweichung " + fmt( dv, 1 ) + " %</b> – Brennweite/Pixelgröße passen " +
                      "nicht zur gelösten Skala" +
                      ( fh !== null ? ".<br><b>" + fh.text + "</b>"
                                    : " (Binning, Resampling, Drizzle, Super-Pixel-Debayer, Reducer/Barlow?)." ) +
                      "<br>Die Plate-Solve-Skala gilt nur, wenn die Lösung nach dem letzten Resampling/Crop erstellt wurde.</span>";
            }
            else if ( dv < 0.05 )
               txt += "<br>Beide Skalen stimmen exakt überein (Abweichung " + fmt( dv, 3 ) + " %). " +
                      "<i>Vermutlich hat die Aufnahmesoftware (z. B. ASIAIR) die Brennweite aus ihrem Plate-Solve berechnet – " +
                      "dann ist das keine unabhängige Prüfung.</i>";
            else
               txt += "<br>Beide Skalen stimmen überein (Abweichung " + fmt( dv, 2 ) + " %).";
         }
      }
      else
      {
         if ( meta && meta.staleSources && meta.staleSources.length > 0 )
            txt += "<br><span style=\"color:#FF8000\"><b>⚠ Plate-Solve im Header veraltet</b> – er gehört zur Bildgröße vor der Änderung " +
                   "und wird nicht verwendet. Der Maßstab hängt jetzt von Brennweite, Pixelgröße und der Antwort unten ab. " +
                   "Tipp: Das Bild mit ImageSolver neu lösen.</span>";
         else
            txt += "<br><i>Kein Plate-Solve im Header – der Maßstab hängt allein von Brennweite, Pixelgröße und der Antwort unten ab. " +
                   "Tipp: Das Bild vorher mit ImageSolver lösen.</i>";
         if ( meta && meta.geomFactor !== null )
            txt += "<br>Laut Header-Bildgröße wurde das Bild um Faktor <b>" + fmt( meta.geomFactor, 2 ) + "</b> " +
                   ( meta.geomFactor > 1 ? "verkleinert" : "vergrößert" ) + ".";
         var hdrPx = ( meta && meta.effectivePixelSize !== null ) ? meta.effectivePixelSize : null;
         if ( hdrPx !== null && hdrUnadjusted )
            txt += "<br>Die vorgeschlagene Pixelgröße " + fmt( hdrPx, 3 ) + " µm stammt aus dem Header [" + meta.pixelSizeSource + "]. " +
                   "Bei Super-Pixel-Debayer passt PixInsight diesen Wert nicht an – „Nein“ mit Faktor 2 ist richtig.";
         else if ( hdrPx !== null )
            txt += "<br>Die vorgeschlagene Pixelgröße " + fmt( hdrPx, 3 ) + " µm stammt aus dem Header [" + meta.pixelSizeSource + "]. " +
                   "PixInsight passt diesen Wert bei IntegerResample/Resample und Drizzle selbst an (z. B. 3,8 → 7,6 µm bei 50 %, " +
                   "2,9 → 1,45 µm bei 2×-Drizzle) – dann „Ja“ wählen, ein Faktor würde doppelt korrigieren.";
         var k = currentFactor();
         if ( opt !== null && k !== 1 )
            txt += "<br>Mit Faktor " + fmt( k, 2 ) + ": <b>" + fmt( opt * k, 4 ) + " ″/px</b>";
         if ( self.origCombo.currentItem === 2 && !hdrUnadjusted && hdrPx !== null && isFinite( s ) && Math.abs( s / hdrPx - 1 ) < 0.001 )
            txt += "<br><span style=\"color:#FF8000\"><b>⚠ Doppelte Korrektur möglich:</b> Die Pixelgröße oben ist unverändert der Header-Wert. " +
                   "Bitte prüfen, ob er die Änderung schon enthält (Sensor-Pixelgröße laut Datenblatt vergleichen).</span>";
         if ( self.origCombo.currentItem === 3 )
            txt += "<br><span style=\"color:#FF8000\"><b>⚠ Maßstab ungeprüft</b> – ohne Plate-Solve und ohne Bestätigung " +
                   "können die Ergebnisse um den Faktor 2 oder mehr falsch sein.</span>";
      }
      self.scaleInfoLabel.text = "<small>" + txt + "</small>";
      fitInfoHeight( txt );
      if ( self.uiReady )
         try { self.adjustToContents(); } catch ( eAdj ) {}     // Dialoghoehe an mehrzeilige Warnungen anpassen
   }
   this.edFocal.onTextUpdated = function( t ) { updateScaleInfo(); };
   this.edPixel.onTextUpdated = function( t ) { updateScaleInfo(); };
   this.edFactor.onTextUpdated = function( t ) { updateScaleInfo(); };
   this.origCombo.onItemSelected = function( idx )
   {
      self.edFactor.enabled = ( idx === 2 );
      updateScaleInfo();
   };
   updateScaleInfo();

   var modeBox = new GroupBox( this );
   modeBox.title = "Zielbereich und Messmodus";
   var modeSizer = new VerticalSizer;
   modeSizer.margin = 8;
   modeSizer.spacing = 8;

   var modeRow = new HorizontalSizer;
   modeRow.spacing = 8;
   var modeLabel = new Label( modeBox );
   modeLabel.text = "Modus:";
   modeLabel.minWidth = 170;
   modeLabel.textAlignment = TextAlign_Right | TextAlign_VertCenter;

   this.modeCombo = new ComboBox( modeBox );
   this.modeCombo.addItem( "Deepsky (Lichtjahre – Nebel, Sternhaufen, Galaxien)" );
   this.modeCombo.addItem( "Sonnensystem (Kilometer – Mond, Planeten, Sonne)" );
   this.modeCombo.currentItem = ( params.mode === "solarsys" ) ? 1 : 0;
   modeRow.add( modeLabel );
   modeRow.add( this.modeCombo, 100 );
   modeSizer.add( modeRow );

   // Deepsky-Bereich
   this.deepskyControlGroup = new Control( modeBox );
   var dsSizer = new VerticalSizer;
   dsSizer.margin = 0;
   dsSizer.spacing = 6;

   // 1. Zeile: Online-Suche (SIMBAD / NED)
   var searchRow = new HorizontalSizer;
   searchRow.spacing = 8;
   var searchLabel = new Label( this.deepskyControlGroup );
   searchLabel.text = "Objekt (SIMBAD/NED):";
   searchLabel.minWidth = 170;
   searchLabel.textAlignment = TextAlign_Right | TextAlign_VertCenter;

   this.edObjSearch = new Edit( this.deepskyControlGroup );
   this.edObjSearch.text = ( meta && meta.objectName ) ? meta.objectName : "";
   this.edObjSearch.toolTip = "Name des Deepsky-Objekts (z. B. M31, NGC 7000, IC 1805, M42) für die Online-Suche.";

   this.btnOnlineSearch = new PushButton( this.deepskyControlGroup );
   this.btnOnlineSearch.text = "Online suchen";
   this.btnOnlineSearch.toolTip = "Fragt SIMBAD TAP (CDS) und NED online via NetworkTransfer nach Entfernung und Objektdaten ab.";
   this.btnOnlineSearch.minWidth = 110;

   searchRow.add( searchLabel );
   searchRow.add( this.edObjSearch, 100 );
   searchRow.add( this.btnOnlineSearch );
   dsSizer.add( searchRow );

   // 2. Zeile: Lokaler Objektkatalog
   var dsRow = new HorizontalSizer;
   dsRow.spacing = 8;
   var dsCatLabel = new Label( this.deepskyControlGroup );
   dsCatLabel.text = "Objektkatalog:";
   dsCatLabel.minWidth = 170;
   dsCatLabel.textAlignment = TextAlign_Right | TextAlign_VertCenter;

   this.dsCombo = new ComboBox( this.deepskyControlGroup );
   for ( var di = 0; di < DEEPSKY_CATALOG.length; ++di )
   {
      var obj = DEEPSKY_CATALOG[di];
      this.dsCombo.addItem( obj.name + " (" + formatLy( obj.ly ) + ")" );
   }
   this.dsCombo.addItem( "-- Freie Entfernungseingabe --" );
   dsRow.add( dsCatLabel );
   dsRow.add( this.dsCombo, 100 );
   dsSizer.add( dsRow );

   // 3. Zeile: Entfernung in Lichtjahren
   var dsDistRow = new HorizontalSizer;
   dsDistRow.spacing = 8;
   var dsDistLabel = new Label( this.deepskyControlGroup );
   dsDistLabel.text = "Entfernung [Lichtjahre]:";
   dsDistLabel.minWidth = 170;
   dsDistLabel.textAlignment = TextAlign_Right | TextAlign_VertCenter;
   this.edDistLy = new Edit( this.deepskyControlGroup );
   this.edDistLy.text = String( params.distanceLy ).replace( ".", "," );
   this.edDistLy.toolTip = "Entfernung des Zielobjekts in Lichtjahren.";
   dsDistRow.add( dsDistLabel );
   dsDistRow.add( this.edDistLy, 100 );
   dsSizer.add( dsDistRow );

   this.dsMetaLabel = new Label( this.deepskyControlGroup );
   this.dsMetaLabel.useRichText = true;
   this.dsMetaLabel.wordWrapping = true;
   this.dsMetaLabel.textAlignment = TextAlign_Right | TextAlign_VertCenter;
   dsSizer.add( this.dsMetaLabel );
   this.deepskyControlGroup.sizer = dsSizer;
   modeSizer.add( this.deepskyControlGroup );

   // Sonnensystem-Bereich
   this.solarControlGroup = new Control( modeBox );
   var solSizer = new VerticalSizer;
   solSizer.margin = 0;
   solSizer.spacing = 6;

   var solRow = new HorizontalSizer;
   solRow.spacing = 8;
   var solCatLabel = new Label( this.solarControlGroup );
   solCatLabel.text = "Himmelskörper:";
   solCatLabel.minWidth = 170;
   solCatLabel.textAlignment = TextAlign_Right | TextAlign_VertCenter;

   this.solCombo = new ComboBox( this.solarControlGroup );
   for ( var si = 0; si < SOLARSYS_CATALOG.length; ++si )
      this.solCombo.addItem( SOLARSYS_CATALOG[si].name );
   this.solCombo.addItem( "-- Freie Entfernungseingabe --" );
   solRow.add( solCatLabel );
   solRow.add( this.solCombo, 100 );
   solSizer.add( solRow );

   var stageRow = new HorizontalSizer;
   stageRow.spacing = 8;
   var stageLabel = new Label( this.solarControlGroup );
   stageLabel.text = "Entfernungs-Stufe:";
   stageLabel.minWidth = 170;
   stageLabel.textAlignment = TextAlign_Right | TextAlign_VertCenter;

   this.solStageCombo = new ComboBox( this.solarControlGroup );
   this.solStageCombo.addItem( "Minimal (Perigäum / Opposition / Erdnähe)" );
   this.solStageCombo.addItem( "Mittelwert (Referenz-Abstand)" );
   this.solStageCombo.addItem( "Maximal (Apogäum / Konjunktion / Erdferne)" );
   this.solStageCombo.addItem( "Freie Eingabe" );
   this.solStageCombo.currentItem = params.solarStageIdx;
   stageRow.add( stageLabel );
   stageRow.add( this.solStageCombo, 100 );
   solSizer.add( stageRow );

   var solDistKmRow = new HorizontalSizer;
   solDistKmRow.spacing = 8;
   var solDistKmLabel = new Label( this.solarControlGroup );
   solDistKmLabel.text = "Entfernung [km]:";
   solDistKmLabel.minWidth = 170;
   solDistKmLabel.textAlignment = TextAlign_Right | TextAlign_VertCenter;
   this.edDistKm = new Edit( this.solarControlGroup );
   this.edDistKm.text = String( params.distanceKm ).replace( ".", "," );
   this.edDistKm.toolTip = "Entfernung in Kilometern.";
   solDistKmRow.add( solDistKmLabel );
   solDistKmRow.add( this.edDistKm, 100 );
   solSizer.add( solDistKmRow );

   var solDistAuRow = new HorizontalSizer;
   solDistAuRow.spacing = 8;
   var solDistAuLabel = new Label( this.solarControlGroup );
   solDistAuLabel.text = "Entfernung [AE]:";
   solDistAuLabel.minWidth = 170;
   solDistAuLabel.textAlignment = TextAlign_Right | TextAlign_VertCenter;
   this.edDistAu = new Edit( this.solarControlGroup );
   this.edDistAu.text = fmt( params.distanceKm / KM_PER_AU, 6 );
   this.edDistAu.toolTip = "Entfernung in Astronomischen Einheiten (1 AE ≈ 149.597.871 km).";
   solDistAuRow.add( solDistAuLabel );
   solDistAuRow.add( this.edDistAu, 100 );
   solSizer.add( solDistAuRow );

   this.solDescLabel = new Label( this.solarControlGroup );
   this.solDescLabel.useRichText = true;
   this.solDescLabel.wordWrapping = true;
   this.solDescLabel.textAlignment = TextAlign_Right | TextAlign_VertCenter;
   solSizer.add( this.solDescLabel );
   this.solarControlGroup.sizer = solSizer;
   modeSizer.add( this.solarControlGroup );

   modeBox.sizer = modeSizer;

   function syncModeUI()
   {
      var isSol = ( self.modeCombo.currentItem === 1 );
      self.deepskyControlGroup.visible = !isSol;
      self.solarControlGroup.visible = isSol;
      self.adjustToContents();
   }

   function updateDeepskyMeta()
   {
      var idx = self.dsCombo.currentItem;
      if ( idx >= 0 && idx < DEEPSKY_CATALOG.length )
      {
         var obj = DEEPSKY_CATALOG[idx];
         self.edObjSearch.text = obj.name.split( " – " )[0];
         self.edDistLy.text = String( obj.ly ).replace( ".", "," );
         self.dsMetaLabel.text = "<small>Unsicherheit: <b>" + obj.unc + "</b> | Quelle: <b>" + obj.src + "</b></small>";
      }
      else
         self.dsMetaLabel.text = "<small>Freie Entfernungseingabe oder Online-Abfrage (SIMBAD/NED)</small>";
   }

   var onlineIdx = null;
   this.btnOnlineSearch.onClick = function()
   {
      var name = self.edObjSearch.text.trim();
      if ( name.length === 0 )
      {
         ( new MessageBox( "Bitte geben Sie einen Objektnamen für die Suche ein (z. B. M31, NGC 7000, Sh2-132).",
                           TITLE, StdIcon_Warning, StdButton_Ok ) ).execute();
         return;
      }

      self.btnOnlineSearch.enabled = false;
      self.btnOnlineSearch.text = "Suche …";
      self.dsMetaLabel.text = "<small><i>Online-Abfrage läuft (höchstens ca. " + NET_TOTAL_SECONDS + " s) …</i></small>";
      CoreApplication.processEvents();

      try
      {
         var res = resolveDeepskyDistance( name );
         if ( res.success )
         {
            params.distanceLy = res.ly;
            self.edDistLy.text = ( res.ly >= 100 ) ? String( Math.round( res.ly ) ) : fmt( res.ly, 3 );
            if ( res.localIdx !== undefined )
            {
               self.dsCombo.currentItem = res.localIdx;
            }
            else
            {
               if ( onlineIdx !== null )
               {
                  try { self.dsCombo.removeItem( onlineIdx ); } catch ( er ) {}
                  onlineIdx = null;
               }
               var onlineItemText = res.mainId + " (" + formatLy( res.ly ) + ") [" + res.source + "]";
               self.dsCombo.addItem( onlineItemText );
               onlineIdx = self.dsCombo.numberOfItems - 1;
               self.dsCombo.currentItem = onlineIdx;
            }
            self.dsMetaLabel.text = "<small><b>" + res.mainId + "</b> (" + res.otype + ") | <b>" +
                                    formatLy( res.ly ) + "</b>" + ( res.unc ? " " + res.unc : "" ) +
                                    "<br><i>Quelle: " + res.source + ( res.method ? " – " + res.method : "" ) + "</i>" +
                                    ( res.warn ? "<br><span style=\"color:#FF8000\">⚠ " + res.warn + "</span>" : "" ) + "</small>";
            ( new MessageBox( "Objekt gefunden:\n\n" + res.mainId + " (" + res.otype + ")\n" +
                              "Entfernung: " + formatLy( res.ly ) + ( res.unc ? " " + res.unc : "" ) + "\n" +
                              "Quelle: " + res.source + ( res.method ? " (" + res.method + ")" : "" ) +
                              ( res.warn ? "\n\n⚠ " + res.warn : "" ) + "\n\n" +
                              "Die Entfernung wurde in den Parameter-Dialog übernommen.",
                              TITLE + " – Treffer", res.warn ? StdIcon_Warning : StdIcon_Information, StdButton_Ok ) ).execute();
         }
         else
         {
            updateDeepskyMeta();
            ( new MessageBox( res.error + "\n\nBitte prüfen Sie die Schreibweise oder geben Sie die Entfernung manuell ein.",
                              TITLE + " – Kein Treffer", StdIcon_Warning, StdButton_Ok ) ).execute();
         }
      }
      catch ( ex )
      {
         ( new MessageBox( "Fehler bei der Online-Suche:\n" + ex, TITLE, StdIcon_Error, StdButton_Ok ) ).execute();
      }
      finally
      {
         self.btnOnlineSearch.enabled = true;
         self.btnOnlineSearch.text = "Online suchen";
      }
   };

   function updateSolarValues()
   {
      var objIdx = self.solCombo.currentItem;
      var stageIdx = self.solStageCombo.currentItem;
      if ( objIdx >= 0 && objIdx < SOLARSYS_CATALOG.length )
      {
         var obj = SOLARSYS_CATALOG[objIdx];
         var kmVal = obj.avgKm;
         if ( stageIdx === 0 ) kmVal = obj.minKm;
         else if ( stageIdx === 1 ) kmVal = obj.avgKm;
         else if ( stageIdx === 2 ) kmVal = obj.maxKm;
         else if ( stageIdx === 3 )
         {
            var curKm = parseNumber( self.edDistKm.text );
            if ( isFinite( curKm ) && curKm > 0 ) kmVal = curKm;
         }

         if ( stageIdx < 3 )
         {
            self.edDistKm.text = String( kmVal ).replace( ".", "," );
            self.edDistAu.text = fmt( kmVal / KM_PER_AU, 6 );
         }
         var sec = kmVal / C_KM_S;
         self.solDescLabel.text = "<small>" + obj.desc + " | Lichtlaufzeit: <b>" + formatLightTime( sec ) + "</b><br>Hinweis: Richtwerte – für genaue Messungen die tagesaktuelle Entfernung (Ephemeride, z. B. JPL Horizons) als freie Eingabe verwenden.</small>";
      }
      else
         self.solDescLabel.text = "<small>Freie Entfernungseingabe für Kometen, Asteroiden oder Sonden</small>";
   }

   this.modeCombo.onItemSelected = function( idx ) { syncModeUI(); };
   this.dsCombo.onItemSelected = function( idx ) { updateDeepskyMeta(); };
   this.solCombo.onItemSelected = function( idx ) { updateSolarValues(); };
   this.solStageCombo.onItemSelected = function( idx ) { updateSolarValues(); };

   this.edDistKm.onTextUpdated = function( t )
   {
      self.solStageCombo.currentItem = 3;     // manuelle Eingabe = "Freie Eingabe"
      var km = parseNumber( t );
      if ( isFinite( km ) && km > 0 )
      {
         self.edDistAu.text = fmt( km / KM_PER_AU, 6 );
         var sec = km / C_KM_S;
         self.solDescLabel.text = "<small>Lichtlaufzeit zur Erde: <b>" + formatLightTime( sec ) + "</b></small>";
      }
   };

   this.edDistAu.onTextUpdated = function( t )
   {
      self.solStageCombo.currentItem = 3;
      var au = parseNumber( t );
      if ( isFinite( au ) && au > 0 )
      {
         var km = au * KM_PER_AU;
         self.edDistKm.text = fmt( km, 1 );
         var sec = km / C_KM_S;
         self.solDescLabel.text = "<small>Lichtlaufzeit zur Erde: <b>" + formatLightTime( sec ) + "</b></small>";
      }
   };

   this.edDistLy.onTextUpdated = function( t )
   {
      self.dsCombo.currentItem = DEEPSKY_CATALOG.length;     // "Freie Entfernungseingabe"
      self.dsMetaLabel.text = "<small>Freie Entfernungseingabe</small>";
   };

   var autoSelected = false;
   var distNote = "";
   if ( meta && meta.objectName )
   {
      var dsHit = findCatalogByHeader( meta.objectName );
      if ( dsHit !== null )
      {
         this.modeCombo.currentItem = 0;
         this.dsCombo.currentItem = dsHit.index;
         params.distanceLy = dsHit.item.ly;
         autoSelected = true;
         console.writeln( "Katalog-Treffer (Deepsky): Objekt <b>" + meta.objectName + "</b> → <b>" + dsHit.item.name + "</b> (" + formatLy( dsHit.item.ly ) + ")" );
      }
      else
      {
         var solHit = findSolarByHeader( meta.objectName );
         if ( solHit !== null )
         {
            this.modeCombo.currentItem = 1;
            this.solCombo.currentItem = solHit.index;
            autoSelected = true;
            console.writeln( "Katalog-Treffer (Sonnensystem): Objekt <b>" + meta.objectName + "</b> → <b>" + solHit.item.name + "</b>" );
         }
      }
      if ( !autoSelected )
         distNote = "<span style=\"color:#FF8000\">⚠ Das Objekt „" + meta.objectName + "“ steht nicht im Katalog. " +
                    "Die vorbelegte Entfernung stammt aus der letzten Sitzung und ist NICHT geprüft – bitte „Online suchen“ nutzen oder die Entfernung selbst eintragen.</span>";
   }

   if ( !autoSelected )
   {
      this.dsCombo.currentItem = clamp( params.deepskyIdx, 0, DEEPSKY_CATALOG.length );
      this.solCombo.currentItem = clamp( params.solarObjIdx, 0, SOLARSYS_CATALOG.length );
   }

   updateDeepskyMeta();
   updateSolarValues();
   syncModeUI();
   if ( distNote.length > 0 )
   {
      this.dsMetaLabel.text = "<small>" + distNote + "</small>";
      this.solDescLabel.text = "<small>" + distNote + "</small>";
   }

   // Doku-Button
   this.docButton = new PushButton( this );
   this.docButton.text = "Dokumentation";
   this.docButton.toolTip = "Öffnet die ausführliche Dokumentation im PixInsight-Browser.";
   this.docButton.onClick = function() { openDocumentation(); };

   this.okButton = new PushButton( this );
   this.okButton.text = "OK";
   this.okButton.defaultButton = true;
   this.okButton.onClick = function()
   {
      var f = parseNumber( self.edFocal.text );
      var s = parseNumber( self.edPixel.text, false );
      var bad = null;
      var warn = [];

      if ( !isFinite( f ) || f <= 0 ) bad = "Die Brennweite muss eine positive Zahl sein (z. B. 480).";
      else if ( !isFinite( s ) || s <= 0 ) bad = "Die Pixelgröße muss eine positive Zahl sein (z. B. 3,75).";

      var isSol = ( self.modeCombo.currentItem === 1 );
      var distLy = 3000;
      var distKm = 384400;

      if ( bad === null )
      {
         if ( !isSol )
         {
            distLy = parseNumber( self.edDistLy.text );
            if ( !isFinite( distLy ) || distLy <= 0 ) bad = "Die Deepsky-Entfernung muss eine positive Zahl sein (in Lichtjahren).";
            else if ( distLy < 1 || distLy > 2e10 )
               warn.push( "Die Entfernung " + fmt( distLy, 3 ) + " Lichtjahre ist ungewöhnlich (erwartet: ca. 1 bis 13 Milliarden)." );
         }
         else
         {
            distKm = parseNumber( self.edDistKm.text );
            if ( !isFinite( distKm ) || distKm <= 0 ) bad = "Die Sonnensystem-Entfernung muss eine positive Zahl sein (in km).";
            else if ( distKm < 1000 || distKm > 1e11 )
               warn.push( "Die Entfernung " + fmt( distKm, 1 ) + " km ist ungewöhnlich für ein Sonnensystem-Objekt." );
         }
      }

      // Rueckfrage zur Originalaufloesung (nur ohne Plate-Solve)
      var fac = 1;
      var unverified = false;
      if ( bad === null && astScale === null )
      {
         var oa = self.origCombo.currentItem;
         if ( oa === 0 )
            bad = "Ohne Plate-Solve bitte angeben, ob die Pixelgröße zu den Bildpixeln passt (Feld „Pixelgröße passt zum Bild?“). " +
                  "Binning, Resampling, Drizzle oder Super-Pixel-Debayer ändern den Maßstab.";
         else if ( oa === 2 )
         {
            fac = parseNumber( self.edFactor.text, false );
            if ( !isFinite( fac ) || fac <= 0 )
               bad = "Bitte den Faktor angeben, um den die Pixel größer wurden (z. B. 2 für Binning 2×2 oder Super-Pixel-Debayer, 0,5 für 2×-Drizzle).";
            else
            {
               if ( fac < 0.2 || fac > 8 )
                  warn.push( "Der Faktor " + fmt( fac, 2 ) + " ist ungewöhnlich (üblich 0,25 bis 4)." );
               var hdrPxOk = ( meta && meta.effectivePixelSize !== null ) ? meta.effectivePixelSize : null;
               if ( fac !== 1 && !hdrUnadjusted && hdrPxOk !== null && Math.abs( s / hdrPxOk - 1 ) < 0.001 )
                  warn.push( "Doppelte Korrektur möglich: Die Pixelgröße " + fmt( s, 3 ) + " µm ist unverändert der Header-Wert. " +
                             "Enthält er die Änderung schon (z. B. XPIXSZ nach IntegerResample), wäre der Maßstab mit Faktor " +
                             fmt( fac, 2 ) + " falsch. Im Zweifel die Sensor-Pixelgröße laut Datenblatt eintragen." );
            }
         }
         else if ( oa === 3 )
         {
            unverified = true;
            warn.push( "Ohne Plate-Solve und ohne bestätigte Pixelgröße ist der Maßstab UNGEPRÜFT. " +
                       "Binning, Resampling, Drizzle oder Super-Pixel-Debayer können die Ergebnisse um den Faktor 2 oder mehr verfälschen." );
         }
      }

      if ( bad != null )
      {
         ( new MessageBox( bad, TITLE, StdIcon_Error, StdButton_Ok ) ).execute();
         return;
      }

      if ( f < 5 || f > 20000 ) warn.push( "Die Brennweite " + fmt( f, 1 ) + " mm ist ungewöhnlich." );
      if ( s < 0.3 || s > 50 )  warn.push( "Die Pixelgröße " + fmt( s, 3 ) + " µm ist ungewöhnlich." );

      if ( warn.length > 0 )
      {
         var mb = new MessageBox( "Plausibilitätswarnung:\n\n• " + warn.join( "\n• " ) + "\n\nTrotzdem fortfahren?",
                                  TITLE, StdIcon_Warning, StdButton_Yes, StdButton_No );
         if ( mb.execute() !== StdButton_Yes ) return;
      }

      self.values = {
         mode:            isSol ? "solarsys" : "deepsky",
         focalLengthMm:   f,
         pixelSizeUm:     s,
         distanceLy:      distLy,
         distanceKm:      distKm,
         deepskyIdx:      Math.min( self.dsCombo.currentItem, DEEPSKY_CATALOG.length ),
         solarObjIdx:     self.solCombo.currentItem,
         solarStageIdx:   self.solStageCombo.currentItem,
         useAstrometry:   ( astScale !== null && self.chkAst.checked ),
         resampleFactor:  fac,
         scaleUnverified: unverified,
         origAnswer:      ( astScale === null ) ? self.origCombo.currentItem : 0
      };
      self.ok();
   };

   this.cancelButton = new PushButton( this );
   this.cancelButton.text = "Abbrechen";
   this.cancelButton.onClick = function() { self.cancel(); };

   var btnSizer = new HorizontalSizer;
   btnSizer.spacing = 6;
   btnSizer.add( this.docButton );
   btnSizer.addStretch();
   btnSizer.add( this.okButton );
   btnSizer.add( this.cancelButton );

   this.sizer = new VerticalSizer;
   this.sizer.margin = 10;
   this.sizer.spacing = 8;
   this.sizer.add( this.infoLabel );
   if ( metaBox != null )
   {
      this.sizer.add( metaBox );
      this.sizer.addSpacing( 2 );
   }
   this.sizer.add( optBox );
   this.sizer.add( modeBox );
   this.sizer.addSpacing( 6 );
   this.sizer.add( btnSizer );
   this.adjustToContents();
   this.uiReady = true;
}
}

// ============================================================================
// AutoSTF: Parameter einmalig in JS
// ============================================================================
function mtf( m, x )
{
   if ( x <= 0 ) return 0;
   if ( x >= 1 ) return 1;
   return ( m - 1 ) * x / ( ( 2 * m - 1 ) * x - m );
}

function computeStretchStats( image )
{
   var w = image.width;
   var h = image.height;
   var nc = image.numberOfChannels;
   var chans = ( nc >= 3 ) ? 3 : 1;

   var gridStep = Math.max( 1, Math.floor( Math.sqrt( ( w * h ) / 60000 ) ) );
   var vals = [];
   for ( var y = 0; y < h; y += gridStep )
      for ( var x = 0; x < w; x += gridStep )
         for ( var c = 0; c < chans; ++c )
         {
            var smp = image.sample( x, y, c );
            if ( isFinite( smp ) )
               vals.push( smp );
         }
   if ( vals.length === 0 )
      return { median: 0.1, mad: 0.05, c0: 0, m: 0.5, range: 1, degenerate: false, hi: 1 };
   vals.sort( function( a, b ) { return a - b; } );
   var n = vals.length;
   var median = vals[ Math.floor( n / 2 ) ];
   var dev = new Array( n );
   for ( var i = 0; i < n; ++i )
      dev[i] = Math.abs( vals[i] - median );
   dev.sort( function( a, b ) { return a - b; } );
   var mad = dev[ Math.floor( n / 2 ) ];

   var c0 = clamp( median + ( -2.8 ) * 1.4826 * mad, 0, 1 );
   var range = 1 - c0;
   if ( range <= 0 ) range = 1;
   var mid = clamp( ( median - c0 ) / range, 0.0000001, 0.9999999 );
   var m = mtf( 0.25, mid );
   if ( !isFinite( m ) || m <= 0 || m >= 1 )
      m = 0.5;

   var degenerate = ( median < 0.000001 || mad < 0.0000001 );
   var hi = vals[ Math.min( n - 1, Math.floor( 0.999 * n ) ) ];
   if ( !( hi > 0 ) ) hi = 1;

   return { median: median, mad: mad, c0: c0, m: m, range: range,
            degenerate: degenerate, hi: hi };
}

function stretchValue( st, v, autoSTF )
{
   if ( !autoSTF )
      return clamp( v, 0, 1 );
   if ( st.degenerate )
      return Math.sqrt( clamp( v / st.hi, 0, 1 ) );
   return mtf( st.m, ( v - st.c0 ) / st.range );
}

function nativeExpression( st )
{
   if ( st.degenerate )
      return "sqrt(min(1,max(0,$T/" + st.hi.toFixed( 12 ) + ")))";
   return "mtf(" + st.m.toFixed( 12 ) + ",max(0,min(1,($T-" + st.c0.toFixed( 12 ) + ")/" +
          st.range.toFixed( 12 ) + ")))";
}

// ============================================================================
// Bildvorschau: Nativ & JS-Rueckfall
// ============================================================================
function verifyNative( src, dst, st )
{
   var w = src.width, h = src.height;
   var chMax = Math.min( 2, src.numberOfChannels );
   var bad = 0, tested = 0;
   for ( var iy = 0; iy < 5; ++iy )
      for ( var ix = 0; ix < 5; ++ix )
      {
         var x = Math.min( w - 1, Math.floor( ( ix + 0.5 ) * w / 5 ) );
         var y = Math.min( h - 1, Math.floor( ( iy + 0.5 ) * h / 5 ) );
         for ( var c = 0; c < chMax; ++c )
         {
            var expect = stretchValue( st, src.sample( x, y, c ), true );
            var actual = dst.sample( x, y, c );
            ++tested;
            if ( !isFinite( actual ) || Math.abs( actual - expect ) > 0.03 )
               ++bad;
         }
      }
   if ( bad > tested * 0.1 )
      throw new Error( "natives AutoSTF weicht von der JS-Rechnung ab (" + bad + " von " + tested + " Stichproben)" );
}

function buildNativePreview( image, st, autoSTF )
{
   var win = new ImageWindow( image.width, image.height, image.numberOfChannels,
                              image.bitsPerSample, image.isReal, image.isColor );
   var bmp = null;
   try
   {
      var v = win.mainView;
      v.beginProcess();
      v.image.assign( image );
      v.endProcess();

      if ( autoSTF )
      {
         var P = new PixelMath;
         P.expression = nativeExpression( st );
         P.useSingleExpression = true;
         P.createNewImage = false;
         P.rescale = false;
         P.truncate = true;
         P.truncateLower = 0;
         P.truncateUpper = 1;
         if ( P.executeOn( v ) === false )
            throw new Error( "PixelMath wurde nicht ausgefuehrt" );
         verifyNative( image, v.image, st );
      }

      bmp = v.image.render();
   }
   finally
   {
      try { win.forceClose(); } catch ( e ) {}
   }
   if ( bmp == null || !( bmp.width > 0 ) )
      throw new Error( "render() lieferte keine Bitmap" );
   return { bitmap: bmp, mode: "nativ, volle Auflösung" };
}

function buildJsPreview( image, st, autoSTF )
{
   var w = image.width;
   var h = image.height;
   var nc = image.numberOfChannels;
   var chans = ( nc >= 3 ) ? 3 : 1;

   var scale = Math.min( 1, MAX_PREVIEW_DIM / Math.max( w, h ) );
   var dw = Math.max( 1, Math.round( w * scale ) );
   var dh = Math.max( 1, Math.round( h * scale ) );

   function s8( v )
   {
      return clamp( Math.round( stretchValue( st, v, autoSTF ) * 255 ), 0, 255 );
   }

   var bmp = new Bitmap( dw, dh );
   for ( var by = 0; by < dh; ++by )
   {
      var sy = Math.min( h - 1, Math.floor( ( by + 0.5 ) / scale ) );
      for ( var bx = 0; bx < dw; ++bx )
      {
         var sx = Math.min( w - 1, Math.floor( ( bx + 0.5 ) / scale ) );
         var r8, g8, b8;
         if ( chans == 3 )
         {
            r8 = s8( image.sample( sx, sy, 0 ) );
            g8 = s8( image.sample( sx, sy, 1 ) );
            b8 = s8( image.sample( sx, sy, 2 ) );
         }
         else
            r8 = g8 = b8 = s8( image.sample( sx, sy, 0 ) );
         bmp.setPixel( bx, by, 0xFF000000 | ( r8 << 16 ) | ( g8 << 8 ) | b8 );
      }
   }
   return { bitmap: bmp, mode: "JS-Rückfall, verkleinert auf " + dw + " x " + dh };
}

function buildPreview( image, st, autoSTF )
{
   var t0 = ( new Date() ).getTime();
   var pv = null;

   if ( image.width * image.height <= NATIVE_MAX_PIXELS )
   {
      try
      {
         pv = buildNativePreview( image, st, autoSTF );
      }
      catch ( e )
      {
         console.warningln( "** Native Vorschau fehlgeschlagen (" + e + ") – wechsle auf JS-Rückfall." );
         pv = null;
      }
   }
   else
      console.warningln( "** Bild sehr groß – verwende JS-Vorschau (Speicherschutz)." );

   if ( pv == null )
      pv = buildJsPreview( image, st, autoSTF );

   console.writeln( "Vorschau: " + pv.mode + ( autoSTF ? ", AutoSTF" : ", linear" ) +
                    " (" + fmt( ( ( new Date() ).getTime() - t0 ) / 1000, 1 ) + " s)." );
   return pv;
}

function halveBitmap( b )
{
   var w = Math.max( 1, Math.round( b.width / 2 ) );
   var h = Math.max( 1, Math.round( b.height / 2 ) );
   try { if ( typeof b.scaledTo == "function" ) { var r1 = b.scaledTo( w, h ); if ( r1 != null && r1.width > 0 ) return r1; } } catch ( e ) {}
   try { if ( typeof b.scaled   == "function" ) { var r2 = b.scaled( 0.5 );     if ( r2 != null && r2.width > 0 ) return r2; } } catch ( e ) {}
   return null;
}

// ============================================================================
// Mess-Dialog mit interaktiven Werkzeugen & Export
// ============================================================================
class MeasureDialog extends Dialog
{
constructor( preview, imgW, imgH, params, rebuildFn, meta )
{
   super();

   var self = this;

   var levels = [ preview.bitmap ];
   var tryCache = ( imgW * imgH <= 40e6 );
   var stfCache = { on: levels, off: null };
   var dirty = false;
   var pyramidOK = true;
   var scale = 1;
   var fitMode = true;
   var sx = 0, sy = 0;
   var ox = 0, oy = 0;
   var hmax = 0, vmax = 0;
   var dragging = false;
   var panning = false;
   var panX = 0, panY = 0, panSx = 0, panSy = 0;
   var haveLine = false;
   var tool = 0;
   var showLabels = true;
   var showLegend = true;
   var history = [];
   var p0 = { x: 0, y: 0 }, p1 = { x: 0, y: 0 };
   this.measureCount = 0;

   var isSolar = ( params.mode === "solarsys" );
   var objSuffix = ( meta && meta.objectName ) ? " – " + meta.objectName : "";
   function updateTitle()
   {
      self.windowTitle = TITLE + " v" + VERSION + ( isSolar ? " [Sonnensystem]" : " [Deepsky]" ) + objSuffix + " – Messmodus";
   }
   updateTitle();
   this.minWidth = 1000;
   this.minHeight = 600;

   this.headLabel = new Label( this );
   this.headLabel.useRichText = true;
   this.headLabel.wordWrapping = true;

   // Kopfzeile mit Massstab, Entfernung und Quelle (wird nach "Eingaben aendern" neu aufgebaut)
   function updateHead()
   {
      var pixScale = getPixelscale( params, meta );
      var srcHint = "   |   Quelle: " + pixScale.source;
      var warnHint = "";
      if ( pixScale.deviationPct !== null && pixScale.deviationPct > SCALE_DEV_PCT )
      {
         var fhM = scaleFactorHint( pixScale.astrometryArcsecPerPx, pixScale.optArcsecPerPx );
         warnHint = "<br><span style=\"color:#FF8000\">⚠ Brennweite/Pixelgröße weichen " + fmt( pixScale.deviationPct, 1 ) +
                    " % von der Plate-Solve-Skala ab (" +
                    ( pixScale.usesAstrometry ? "die Plate-Solve-Skala wird verwendet" : "die Plate-Solve-Skala wird NICHT verwendet – Messwerte evtl. falsch" ) + ")." +
                    ( fhM !== null ? " " + fhM.text : "" ) + "</span>";
      }
      if ( !pixScale.usesAstrometry && params.scaleUnverified )
         warnHint += "<br><span style=\"color:#FF8000\">⚠ Maßstab ungeprüft: kein Plate-Solve und Pixelgröße nicht bestätigt.</span>";
      if ( isSolar )
         self.headLabel.text = "<b>Maßstab:</b> " + fmt( pixScale.arcsecPerPx, 3 ) + " ″/px   |   " +
                               fmt( pixScale.kmPerPx, 2 ) + " km/px" + srcHint +
                               "   |   d = " + formatKm( params.distanceKm ) + " (" + formatAu( params.distanceKm / KM_PER_AU ) + ")" + warnHint;
      else
         self.headLabel.text = "<b>Maßstab:</b> " + fmt( pixScale.arcsecPerPx, 3 ) + " ″/px   |   " +
                               fmt( pixScale.lyPerPx, 7 ) + " Lj/px" + srcHint +
                               "   |   d = " + formatLy( params.distanceLy ) + warnHint;
   }
   updateHead();

   this.liveLabel = new Label( this );
   this.liveLabel.useRichText = true;
   this.liveLabel.text = "Live: –";

   this.statusLabel = new Label( this );
   this.statusLabel.wordWrapping = true;
   this.statusLabel.text = "Linksklick + Ziehen = messen (L = Linie, K = Kreis/Fläche)  |  Mausrad = Zoom  |  Mitteltaste oder Pfeiltasten = Pan  |  " +
                           "1 = 100 %, F = Einpassen  |  Rechtsklick oder Esc = laufende Messung abbrechen  |  Beenden über „Messmodus beenden“";

   this.scaleHint = new Label( this );
   this.scaleHint.wordWrapping = true;
   this.scaleHint.text = "Hinweis: Mit aktueller Plate-Solve-Skala (nach dem letzten Resampling/Crop gelöst oder mitgeführt) sind Resampling, " +
                         "Binning, Drizzle und Debayer unkritisch; ohne Plate-Solve gilt nur die Original-Pixelskala bzw. der angegebene Faktor. " +
                         "Entfernungen sind Richtwerte mit Unsicherheit (siehe Dokumentation).";

   this.sb = new ScrollBox( this );
   this.sb.autoScroll = true;
   this.sb.tracking = true;
   var sb = this.sb;
   var vp = sb.viewport;
   try { vp.cursor = new Cursor( StdCursor_Cross ); } catch ( e ) {}

   function readScroll()
   {
      try
      {
         if ( typeof sb.horizontalScrollPosition == "number" ) sx = sb.horizontalScrollPosition;
         if ( typeof sb.verticalScrollPosition == "number" )   sy = sb.verticalScrollPosition;
      }
      catch ( e ) {}
   }

   function writeScroll( nx, ny )
   {
      sx = nx; sy = ny;
      try { sb.horizontalScrollPosition = nx; } catch ( e ) {}
      try { sb.verticalScrollPosition = ny; } catch ( e ) {}
   }

   sb.onHorizontalScrollPosUpdated = function( pos ) { sx = pos; vp.update(); };
   sb.onVerticalScrollPosUpdated = function( pos ) { sy = pos; vp.update(); };

   function updateZoomLabel()
   {
      self.zoomLabel.text = "Zoom: " + Math.round( scale * 100 ) + " %";
   }

   function layout()
   {
      var vw = vp.width, vh = vp.height;
      var cw = imgW * scale, ch = imgH * scale;
      ox = ( cw < vw ) ? ( vw - cw ) / 2 : 0;
      oy = ( ch < vh ) ? ( vh - ch ) / 2 : 0;
      hmax = Math.max( 0, Math.ceil( cw - vw ) );
      vmax = Math.max( 0, Math.ceil( ch - vh ) );
      try { sb.setHorizontalScrollRange( 0, hmax ); } catch ( e ) {}
      try { sb.setVerticalScrollRange( 0, vmax ); } catch ( e ) {}
      readScroll();
      var nx = clamp( sx, 0, hmax ), ny = clamp( sy, 0, vmax );
      if ( nx != sx || ny != sy )
         writeScroll( nx, ny );
   }

   function toView( ix, iy )
   {
      return { x: ix * scale - sx + ox, y: iy * scale - sy + oy };
   }

   function toImage( vx, vy )
   {
      return { x: clamp( ( vx + sx - ox ) / scale, 0, imgW ),
               y: clamp( ( vy + sy - oy ) / scale, 0, imgH ) };
   }

   function fitZoom()
   {
      var vw = Math.max( 1, vp.width ), vh = Math.max( 1, vp.height );
      scale = Math.max( MIN_ZOOM, Math.min( vw / imgW, vh / imgH ) );
      fitMode = true;
      layout();
      writeScroll( 0, 0 );
      updateZoomLabel();
      vp.update();
   }

   function zoomAt( factor, vx, vy )
   {
      readScroll();
      var ix = ( vx + sx - ox ) / scale;
      var iy = ( vy + sy - oy ) / scale;
      scale = clamp( scale * factor, MIN_ZOOM, MAX_ZOOM );
      fitMode = false;
      layout();
      writeScroll( clamp( ix * scale + ox - vx, 0, hmax ),
                   clamp( iy * scale + oy - vy, 0, vmax ) );
      updateZoomLabel();
      vp.update();
   }

   function zoomOne()
   {
      zoomAt( 1 / scale, vp.width / 2, vp.height / 2 );
   }

   function bitmapFor()
   {
      var base = levels[0];
      var disp = scale * imgW / base.width;
      var l = 0;
      if ( pyramidOK && disp < 0.5 )
         l = Math.min( 6, Math.floor( Math.log( 1 / disp ) / Math.LN2 ) );
      while ( levels.length <= l )
      {
         var nb = halveBitmap( levels[ levels.length - 1 ] );
         if ( nb == null )
         {
            pyramidOK = false;
            break;
         }
         levels.push( nb );
      }
      return levels[ Math.min( l, levels.length - 1 ) ];
   }

   function updateLive( textOrNull )
   {
      self.liveLabel.text = "Live: " + ( textOrNull == null ? "–" : textOrNull );
   }

   function currentMeasurement()
   {
      var dx = p1.x - p0.x, dy = p1.y - p0.y;
      var d = Math.sqrt( dx * dx + dy * dy );
      return computeMeasurement( ( tool == 1 ) ? 2 * d : d, params, meta );
   }

   function setTool( t )
   {
      tool = t;
      try { self.lineButton.checked = ( t == 0 ); self.circleButton.checked = ( t == 1 ); } catch ( e ) {}
      self.statusLabel.text = ( t == 1 ) ? "Werkzeug Kreis: Mittelpunkt klicken, zum Rand ziehen (misst Durchmesser & Fläche)."
                                         : "Werkzeug Linie: Anfangspunkt klicken, zum Endpunkt ziehen (misst Länge & Strecke).";
   }

   function requestEnd()
   {
      if ( history.length > 0 && dirty )
      {
         var mb = new MessageBox( "Es gibt " + history.length + " Messung(en), die noch nicht als Bild gespeichert wurden.\n\n" +
                                  "Messmodus trotzdem beenden? (Der Konsolenbericht bleibt erhalten.)",
                                  TITLE, StdIcon_Question, StdButton_Yes, StdButton_No );
         if ( mb.execute() !== StdButton_Yes ) return;
      }
      self.ok();
   }

   function cancelDrag()
   {
      dragging = false;
      panning = false;
      haveLine = false;
      try { vp.cursor = new Cursor( StdCursor_Cross ); } catch ( ec ) {}
      updateLive( null );
      vp.update();
   }

   function removeLast()
   {
      if ( history.length == 0 )
         return;
      history.pop();
      updateLive( null );
      refreshList();
      vp.update();
   }

   // Laenge in Bildpixeln aus den gespeicherten Koordinaten (Kreis: Durchmesser)
   function itemLengthPx( it )
   {
      var dx = it.x1 - it.x0, dy = it.y1 - it.y0;
      var d = Math.sqrt( dx * dx + dy * dy );
      return ( it.kind === "circle" ) ? 2 * d : d;
   }

   // Spanne nur im Sonnensystem mit Katalog-Koerper (Erdnaehe bis Erdferne); sonst "–"
   function spanText( it )
   {
      if ( !isSolar || params.solarStageIdx === 3 || !( params.solarObjIdx >= 0 && params.solarObjIdx < SOLARSYS_CATALOG.length ) )
         return "–";
      var obj = SOLARSYS_CATALOG[ params.solarObjIdx ];
      var th = itemLengthPx( it ) * getPixelscale( params, meta ).thetaRad;
      return formatKm( projLength( obj.minKm, th ) ) + " – " + formatKm( projLength( obj.maxKm, th ) );
   }

   function refreshList()
   {
      var tb = self.resultTree;
      if ( !tb ) return;
      tb.clear();
      for ( var i = 0; i < history.length; ++i )
      {
         var it = history[i], m = it.m, circle = ( it.kind === "circle" );
         var node = new TreeBoxNode( tb );
         node.setText( 0, "#" + it.n );
         node.setText( 1, circle ? "Kreis Ø" : "Linie" );
         node.setText( 2, formatAngle( m.arcsec ) );
         node.setText( 3, ( m.mode === "solarsys" ) ? formatKm( m.km ) : formatLy( m.ly ) );
         node.setText( 4, spanText( it ) );
         try { node.setTextColor( 0, it.color ); } catch ( ec ) {}
         node.setToolTip( 3, legendText( it ) );
      }
      for ( var c = 0; c < 5; ++c )
         try { tb.adjustColumnWidthToContents( c ); } catch ( ew ) {}
      self.delSelButton.enabled = ( history.length > 0 );
   }

   function removeSelected()
   {
      var tb = self.resultTree, keep = [], removed = 0;
      for ( var i = 0; i < history.length; ++i )
      {
         var node = ( i < tb.numberOfChildren ) ? tb.child( i ) : null;
         if ( node != null && node.selected ) ++removed; else keep.push( history[i] );
      }
      if ( removed == 0 )
      {
         self.statusLabel.text = "Erst eine Messung in der Liste anklicken, dann „Markierte löschen“.";
         return;
      }
      history = keep;
      updateLive( null );
      refreshList();
      vp.update();
   }

   function editParams()
   {
      if ( dragging || panning || haveLine ) cancelDrag();
      var cp = {};
      for ( var k in params ) cp[k] = params[k];
      var pd = new ParameterDialog( cp, meta );
      if ( !pd.execute() )
         return;
      params = pd.values;
      saveParams( params );
      isSolar = ( params.mode === "solarsys" );
      for ( var i = 0; i < history.length; ++i )
         history[i].m = computeMeasurement( itemLengthPx( history[i] ), params, meta );
      if ( history.length > 0 ) dirty = true;
      updateTitle();
      updateHead();
      refreshList();
      updateLive( null );
      vp.update();
      console.writeln( "" );
      console.writeln( "<b>=== Eingaben geändert – ab jetzt gelten diese Werte ===</b>" );
      printParamSummary( params, meta );
      if ( history.length > 0 )
      {
         console.writeln( "Vorhandene Messungen, neu berechnet:" );
         for ( var j = 0; j < history.length; ++j )
            report( history[j], params );
      }
   }

   function textWidth( g, txt )
   {
      var w = txt.length * 7;
      try { if ( typeof g.font.width == "function" ) w = g.font.width( txt ); } catch ( e ) {}
      return w;
   }

   function drawTag( g, x, y, txt, color, centered )
   {
      var tw = textWidth( g, txt ), th = 16;
      if ( centered ) x -= tw / 2;
      x = clamp( x, 4, Math.max( 4, vp.width - tw - 8 ) );
      y = clamp( y, th + 2, Math.max( th + 2, vp.height - 8 ) );
      g.fillRect( new Rect( Math.round( x - 3 ), Math.round( y - th + 2 ),
                            Math.round( x + tw + 3 ), Math.round( y + 4 ) ),
                  new Brush( 0xC0000000 ) );
      g.pen = new Pen( color, 1 );
      g.drawText( x, y, txt );
   }

   function drawShape( g, kind, a, b, color )
   {
      var v0 = toView( a.x, a.y );
      var v1 = toView( b.x, b.y );
      g.pen = new Pen( color, 1 );
      var dx = v1.x - v0.x, dy = v1.y - v0.y;

      if ( kind == "circle" )
      {
         var r = Math.sqrt( dx * dx + dy * dy );
         strokeCircle( g, v0.x, v0.y, r );
         g.drawLine( v0.x - 5, v0.y, v0.x + 5, v0.y );
         g.drawLine( v0.x, v0.y - 5, v0.x, v0.y + 5 );
         g.drawLine( v0.x, v0.y, v1.x, v1.y );
         return { x: v0.x, y: v0.y - r - 6, centered: true };
      }

      g.drawLine( v0.x, v0.y, v1.x, v1.y );
      var len = Math.sqrt( dx * dx + dy * dy );
      var nx = 0, ny = 1;
      if ( len > 0.5 ) { nx = -dy / len; ny = dx / len; }
      g.drawLine( v0.x - 5 * nx, v0.y - 5 * ny, v0.x + 5 * nx, v0.y + 5 * ny );
      g.drawLine( v1.x - 5 * nx, v1.y - 5 * ny, v1.x + 5 * nx, v1.y + 5 * ny );
      return { x: ( v0.x + v1.x ) / 2 + 8, y: ( v0.y + v1.y ) / 2 - 8, centered: false };
   }

   function drawLegend( g )
   {
      if ( !showLegend || history.length == 0 )
         return;
      var maxRows = 12;
      var start = Math.max( 0, history.length - maxRows );
      var rows = [];
      rows.push( { txt: "Messungen (" + history.length + ") – " + ( isSolar ? "Sonnensystem" : "Deepsky" ), color: 0xFFFFFFFF, swatch: false } );
      if ( start > 0 )
         rows.push( { txt: "… " + start + " ältere nicht angezeigt", color: 0xFFB0B0B0, swatch: false } );
      for ( var i = start; i < history.length; ++i )
         rows.push( { txt: legendText( history[i] ), color: history[i].color, swatch: true } );

      var rowH = 18, pad = 8, w = 0;
      for ( var k = 0; k < rows.length; ++k )
         w = Math.max( w, textWidth( g, rows[k].txt ) + ( rows[k].swatch ? 18 : 0 ) );
      w += 2 * pad;
      var h = rows.length * rowH + 12;
      var x = 10;
      var y = Math.max( 4, vp.height - 10 - h );

      g.fillRect( new Rect( x, y, x + w, y + h ), new Brush( 0xCC000000 ) );
      for ( var j = 0; j < rows.length; ++j )
      {
         var top = y + 6 + j * rowH;
         var tx = x + pad;
         if ( rows[j].swatch )
         {
            g.fillRect( new Rect( x + pad, top + 4, x + pad + 10, top + rowH - 4 ), new Brush( rows[j].color ) );
            tx += 18;
         }
         g.pen = new Pen( rows[j].color, 1 );
         g.drawText( tx, top + rowH - 5, rows[j].txt );
      }
   }

   vp.onPaint = function( x0, y0, x1, y1 )
   {
      var g = new Graphics( vp );
      try
      {
         g.fillRect( vp.boundsRect, new Brush( 0xFF202020 ) );
         try { g.antialiasing = true; } catch ( eaa ) {}
         try { g.smoothInterpolation = ( scale < 1 ); } catch ( esi ) {}

         var a = toView( 0, 0 );
         var b = toView( imgW, imgH );
         g.drawScaledBitmap( new Rect( Math.round( a.x ), Math.round( a.y ), Math.round( b.x ), Math.round( b.y ) ),
                             bitmapFor() );

         for ( var i = 0; i < history.length; ++i )
         {
            var it = history[i];
            var anc = drawShape( g, it.kind, { x: it.x0, y: it.y0 }, { x: it.x1, y: it.y1 }, it.color );
            if ( showLabels )
               drawTag( g, anc.x, anc.y, "#" + it.n + "  " + shortText( it.m, it.kind ), it.color, anc.centered );
         }

         if ( haveLine )
         {
            var liveM = currentMeasurement();
            var liveKind = ( tool == 1 ) ? "circle" : "line";
            var liveAnc = drawShape( g, liveKind, p0, p1, LINE_COLOR );
            drawTag( g, liveAnc.x, liveAnc.y, liveText( liveM, liveKind ), LINE_COLOR, liveAnc.centered );
         }

         drawLegend( g );
      }
      catch ( e )
      {
         console.criticalln( "** Fehler in onPaint: " + e );
      }
      finally
      {
         g.end();
      }
   };

   vp.onMousePress = function( x, y, button, buttons, modifiers )
   {
      readScroll();
      if ( button == 4 )
      {
         panning = true;
         panX = x; panY = y;
         panSx = sx; panSy = sy;
         try { vp.cursor = new Cursor( StdCursor_SizeAll ); } catch ( e ) {}
         return;
      }
      if ( button == 2 )
      {
         cancelDrag();     // Rechtsklick bricht nur die laufende Messung ab
         return;
      }
      if ( button == 1 )
      {
         p0 = toImage( x, y );
         p1 = { x: p0.x, y: p0.y };
         dragging = true;
         haveLine = true;
         updateLive( liveText( currentMeasurement(), ( tool == 1 ) ? "circle" : "line" ) );
         vp.update();
      }
   };

   vp.onMouseMove = function( x, y, buttons, modifiers )
   {
      if ( panning )
      {
         writeScroll( clamp( panSx - ( x - panX ), 0, hmax ),
                      clamp( panSy - ( y - panY ), 0, vmax ) );
         vp.update();
         return;
      }
      if ( dragging )
      {
         p1 = toImage( x, y );
         updateLive( liveText( currentMeasurement(), ( tool == 1 ) ? "circle" : "line" ) );
         vp.update();
      }
   };

   vp.onMouseRelease = function( x, y, button, buttons, modifiers )
   {
      if ( button == 4 && panning )
      {
         panning = false;
         try { vp.cursor = new Cursor( StdCursor_Cross ); } catch ( e ) {}
         return;
      }
      if ( button == 1 && dragging )
      {
         dragging = false;
         p1 = toImage( x, y );
         var m = currentMeasurement();
         if ( m.lengthPx >= 0.5 )
         {
            self.measureCount++;
            var it = { n: self.measureCount, kind: ( tool == 1 ) ? "circle" : "line",
                       x0: p0.x, y0: p0.y, x1: p1.x, y1: p1.y, m: m,
                       color: PALETTE[ ( self.measureCount - 1 ) % PALETTE.length ] };
            history.push( it );
            dirty = true;
            refreshList();
            updateLive( liveText( m, it.kind ) );
            report( it, params );
         }
         haveLine = false;
         vp.update();
      }
   };

   vp.onMouseWheel = function( x, y, delta, buttons, modifiers )
   {
      var factor = ( delta > 0 ) ? 1.25 : 0.8;
      zoomAt( factor, x, y );
   };

   function handleKey( key )
   {
      readScroll();
      var step = 40;
      if ( key == KEY_ESCAPE )
      {
         // Esc bricht nur die laufende Messung ab; Beenden nur ueber den Knopf "Messmodus beenden"
         if ( dragging || panning || haveLine ) cancelDrag();
         return true;
      }
      if ( key == KEY_ONE ) { zoomOne(); return true; }
      if ( key == KEY_F )   { fitZoom(); return true; }
      if ( key == KEY_L )      { setTool( 0 ); return true; }
      if ( key == KEY_K || key == KEY_C ) { setTool( 1 ); return true; }
      if ( key == KEY_BACK || key == KEY_DEL ) { removeLast(); return true; }
      if ( key == 0x2B || key == 0x3D ) { zoomAt( 1.25, vp.width / 2, vp.height / 2 ); return true; }
      if ( key == 0x2D || key == 0x5F ) { zoomAt( 0.8, vp.width / 2, vp.height / 2 ); return true; }
      if ( key == KEY_LEFT )   { writeScroll( clamp( sx - step, 0, hmax ), sy ); vp.update(); return true; }
      if ( key == KEY_RIGHT )  { writeScroll( clamp( sx + step, 0, hmax ), sy ); vp.update(); return true; }
      if ( key == KEY_UP )     { writeScroll( sx, clamp( sy - step, 0, vmax ) ); vp.update(); return true; }
      if ( key == KEY_DOWN )   { writeScroll( sx, clamp( sy + step, 0, vmax ) ); vp.update(); return true; }
      if ( key == KEY_PGUP )   { writeScroll( sx, clamp( sy - step * 4, 0, vmax ) ); vp.update(); return true; }
      if ( key == KEY_PGDN )   { writeScroll( sx, clamp( sy + step * 4, 0, vmax ) ); vp.update(); return true; }
      if ( key == KEY_HOME )   { writeScroll( 0, 0 ); vp.update(); return true; }
      if ( key == KEY_END )    { writeScroll( hmax, vmax ); vp.update(); return true; }
      return false;
   }

   vp.onKeyPress = function( key, modifiers ) { if ( handleKey( key ) ) return; };
   this.onKeyPress = function( key, modifiers ) { if ( handleKey( key ) ) return; };

   this.stretchCheck = new CheckBox( this );
   this.stretchCheck.text = "AutoSTF";
   this.stretchCheck.checked = true;
   this.stretchCheck.toolTip = "Automatische Bildschirmstreckung ein/aus (ohne Verlust von Zoom und Messungen).";
   this.stretchCheck.onCheck = function( checked )
   {
      var key = checked ? "on" : "off";
      try
      {
         self.statusLabel.text = "Vorschau wird berechnet …";
         CoreApplication.processEvents();
         if ( stfCache[key] != null )
            levels = stfCache[key];
         else
         {
            var newPv = rebuildFn( checked );
            levels = [ newPv.bitmap ];
            stfCache[key] = levels;
         }
         if ( !tryCache )
         {
            stfCache.on = null;
            stfCache.off = null;
         }
         pyramidOK = true;
         setTool( tool );
         vp.update();
      }
      catch ( e )
      {
         console.criticalln( "** Fehler beim Umschalten von AutoSTF: " + e );
         self.stretchCheck.checked = !checked;
         try { setTool( tool ); } catch ( e3 ) {}
      }
   };

   this.zoomLabel = new Label( this );
   this.zoomLabel.minWidth = 70;
   this.zoomLabel.textAlignment = TextAlign_Center | TextAlign_VertCenter;
   updateZoomLabel();

   this.zoomInButton = new ToolButton( this );
   this.zoomInButton.text = "+";
   this.zoomInButton.toolTip = "Vergrößern (Mausrad auf Bild)";
   this.zoomInButton.onClick = function() { zoomAt( 1.414, vp.width / 2, vp.height / 2 ); };

   this.zoomOutButton = new ToolButton( this );
   this.zoomOutButton.text = "−";
   this.zoomOutButton.toolTip = "Verkleinern";
   this.zoomOutButton.onClick = function() { zoomAt( 1 / 1.414, vp.width / 2, vp.height / 2 ); };

   this.oneButton = new ToolButton( this );
   this.oneButton.text = "1:1";
   this.oneButton.toolTip = "100 % (Originalgröße)";
   this.oneButton.onClick = function() { zoomOne(); };

   this.fitButton = new ToolButton( this );
   this.fitButton.text = "Einpassen";
   this.fitButton.toolTip = "Bild ins Fenster einpassen (Taste F)";
   this.fitButton.onClick = function() { fitZoom(); };

   // Export-Button
   this.saveButton = new PushButton( this );
   this.saveButton.text = "Bild speichern …";
   this.saveButton.toolTip = "Speichert das Bild mit allen sichtbaren Linien, Kreisen, Beschriftungen und der Legende als PNG oder JPEG.";
   this.saveButton.onClick = function()
   {
      if ( saveAnnotatedImage( levels[0], imgW, imgH, history, params, meta ) ) dirty = false;
   };

   this.editButton = new PushButton( this );
   this.editButton.text = "Eingaben ändern …";
   this.editButton.toolTip = "Öffnet den Parameter-Dialog mit den aktuellen Werten (Optik, Entfernung, Modus, Faktor).\n" +
                             "Die vorhandenen Messungen bleiben erhalten und werden mit den neuen Werten neu berechnet.";
   this.editButton.onClick = function() { editParams(); };

   // Doku-Button
   this.docButton = new PushButton( this );
   this.docButton.text = "Dokumentation";
   this.docButton.toolTip = "Öffnet die Dokumentation im PixInsight-Browser.";
   this.docButton.onClick = function() { openDocumentation(); };

   this.endButton = new PushButton( this );
   this.endButton.text = "Messmodus beenden";
   this.endButton.defaultButton = false;
   this.endButton.onClick = function() { requestEnd(); };

   var viewRow = new HorizontalSizer;
   viewRow.spacing = 6;
   viewRow.add( this.stretchCheck );
   viewRow.addSpacing( 6 );
   viewRow.add( this.zoomInButton );
   viewRow.add( this.zoomOutButton );
   viewRow.add( this.oneButton );
   viewRow.add( this.fitButton );
   viewRow.add( this.zoomLabel );
   viewRow.addStretch();
   viewRow.add( this.editButton );
   viewRow.add( this.saveButton );
   viewRow.add( this.docButton );
   viewRow.add( this.endButton );

   var toolLabel = new Label( this );
   toolLabel.text = "Werkzeug:";

   this.lineButton = new ToolButton( this );
   this.lineButton.text = "Linie";
   this.lineButton.checkable = true;
   this.lineButton.checked = true;
   this.lineButton.toolTip = "Linie: Anfangspunkt klicken, zum Endpunkt ziehen (Taste L).";
   this.lineButton.onClick = function() { setTool( 0 ); };

   this.circleButton = new ToolButton( this );
   this.circleButton.text = "Kreis (Fläche)";
   this.circleButton.checkable = true;
   this.circleButton.checked = false;
   this.circleButton.toolTip = "Kreis: Mittelpunkt klicken und zum Rand ziehen, misst Durchmesser und Fläche (Taste K).";
   this.circleButton.onClick = function() { setTool( 1 ); };

   this.labelCheck = new CheckBox( this );
   this.labelCheck.text = "Beschriftung";
   this.labelCheck.checked = true;
   this.labelCheck.toolTip = "Kurzes Ergebnis direkt an der Figur.";
   this.labelCheck.onCheck = function( checked ) { showLabels = checked; vp.update(); };

   this.legendCheck = new CheckBox( this );
   this.legendCheck.text = "Legende";
   this.legendCheck.checked = true;
   this.legendCheck.toolTip = "Alle Messungen mit Farbe und Ergebnis als Tafel links unten.";
   this.legendCheck.onCheck = function( checked ) { showLegend = checked; vp.update(); };

   this.undoButton = new PushButton( this );
   this.undoButton.text = "Letzte löschen";
   this.undoButton.toolTip = "Entfernt die letzte Messung aus der Anzeige (Entf / Rücktaste).";
   this.undoButton.onClick = function() { removeLast(); };

   this.clearButton = new PushButton( this );
   this.clearButton.text = "Alle löschen";
   this.clearButton.toolTip = "Entfernt alle Messungen aus der Anzeige (Konsolenbericht bleibt).";
   this.clearButton.onClick = function()
   {
      if ( history.length > 1 )
      {
         var mbc = new MessageBox( "Alle " + history.length + " Messungen aus der Anzeige entfernen?",
                                   TITLE, StdIcon_Question, StdButton_Yes, StdButton_No );
         if ( mbc.execute() !== StdButton_Yes ) return;
      }
      history = [];
      haveLine = false;
      updateLive( null );
      refreshList();
      vp.update();
   };

   var measureRow = new HorizontalSizer;
   measureRow.spacing = 6;
   measureRow.add( toolLabel );
   measureRow.add( this.lineButton );
   measureRow.add( this.circleButton );
   measureRow.addSpacing( 10 );
   measureRow.add( this.labelCheck );
   measureRow.add( this.legendCheck );
   measureRow.addStretch();
   measureRow.add( this.undoButton );
   measureRow.add( this.clearButton );

   this.sizer = new VerticalSizer;
   this.sizer.margin = 8;
   this.sizer.spacing = 6;
   this.sizer.add( this.headLabel );
   this.sizer.add( this.liveLabel );
   this.sizer.add( this.statusLabel );
   // Ergebnisliste rechts vom Bild
   this.resultTree = new TreeBox( this );
   this.resultTree.numberOfColumns = 5;
   this.resultTree.headerVisible = true;
   this.resultTree.rootDecoration = false;
   this.resultTree.alternateRowColor = true;
   this.resultTree.multipleSelection = true;
   this.resultTree.setHeaderText( 0, "Nr." );
   this.resultTree.setHeaderText( 1, "Art" );
   this.resultTree.setHeaderText( 2, "Winkel" );
   this.resultTree.setHeaderText( 3, "Größe" );
   this.resultTree.setHeaderText( 4, "Spanne" );
   this.resultTree.setMinWidth( 340 );
   this.resultTree.toolTip = "Alle Messungen dieser Sitzung. Zeilen anklicken (Strg/Umschalt für mehrere) und „Markierte löschen“.\n" +
                             "Spanne: nur im Sonnensystem-Modus mit Katalog-Körper (Erdnähe bis Erdferne).";

   this.delSelButton = new PushButton( this );
   this.delSelButton.text = "Markierte löschen";
   this.delSelButton.toolTip = "Entfernt die in der Liste markierten Messungen aus Anzeige und Legende (Konsolenbericht bleibt).";
   this.delSelButton.enabled = false;
   this.delSelButton.onClick = function() { removeSelected(); };

   var listLabel = new Label( this );
   listLabel.text = "Messungen";

   var listSizer = new VerticalSizer;
   listSizer.spacing = 4;
   listSizer.add( listLabel );
   listSizer.add( this.resultTree, 100 );
   listSizer.add( this.delSelButton );

   var midRow = new HorizontalSizer;
   midRow.spacing = 8;
   midRow.add( this.sb, 100 );
   midRow.add( listSizer );

   this.sizer.add( midRow, 100 );
   this.sizer.add( this.scaleHint );
   this.sizer.add( measureRow );
   this.sizer.add( viewRow );

   this.onShow = function() { fitZoom(); };
   this.onResize = function() { if ( fitMode ) fitZoom(); else { layout(); vp.update(); } };

   this.detachHandlers = function()
   {
      vp.onPaint = null;
      vp.onMousePress = null;
      vp.onMouseMove = null;
      vp.onMouseRelease = null;
      vp.onMouseWheel = null;
      vp.onKeyPress = null;
      vp.onResize = null;
      sb.onHorizontalScrollPosUpdated = null;
      sb.onVerticalScrollPosUpdated = null;
      self.onKeyPress = null;
      self.stretchCheck.onCheck = null;
      self.labelCheck.onCheck = null;
      self.legendCheck.onCheck = null;
      self.lineButton.onClick = null;
      self.circleButton.onClick = null;
      self.editButton.onClick = null;
      self.delSelButton.onClick = null;
      levels = [];
      stfCache.on = null;
      stfCache.off = null;
   };

   this.resize( 1400, 820 );
}
}

// ============================================================================
// main()
// ============================================================================
function printParamSummary( params, meta )
{
   var sc = getPixelscale( params, meta );
   console.writeln( "Modus: <b>" + ( params.mode === "solarsys" ? "Sonnensystem" : "Deepsky" ) + "</b>" );
   console.writeln( "Brennweite: " + fmt( params.focalLengthMm, 1 ) + " mm, Pixelgröße: " +
                    fmt( params.pixelSizeUm, 3 ) + " µm" +
                    ( params.resampleFactor && params.resampleFactor !== 1 ? " × Faktor " + fmt( params.resampleFactor, 2 ) +
                      " = " + fmt( params.pixelSizeUm * params.resampleFactor, 3 ) + " µm effektiv" : "" ) );
   if ( params.mode === "solarsys" )
   {
      console.writeln( "Entfernung: " + formatKm( params.distanceKm ) + " (" + formatAu( params.distanceKm / KM_PER_AU ) + ")" );
      console.writeln( "Maßstab: " + fmt( sc.arcsecPerPx, 4 ) + " ″/px, " + fmt( sc.kmPerPx, 3 ) + " km/px" );
   }
   else
   {
      console.writeln( "Entfernung: " + formatLy( params.distanceLy ) );
      console.writeln( "Maßstab: " + fmt( sc.arcsecPerPx, 4 ) + " ″/px, " + fmt( sc.lyPerPx, 7 ) + " Lj/px" );
   }
   console.writeln( "Maßstab-Quelle: <b>" + sc.source + "</b>" +
                    ( sc.astrometryArcsecPerPx ? " (Plate-Solve " + fmt( sc.astrometryArcsecPerPx, 4 ) + " ″/px, Optik " + fmt( sc.optArcsecPerPx, 4 ) + " ″/px)" : "" ) );
   if ( sc.deviationPct !== null && sc.deviationPct > SCALE_DEV_PCT )
   {
      console.warningln( "** Brennweite/Pixelgröße weichen " + fmt( sc.deviationPct, 1 ) + " % von der Plate-Solve-Skala ab." );
      var fhC = scaleFactorHint( sc.astrometryArcsecPerPx, sc.optArcsecPerPx );
      if ( fhC !== null )
         console.warningln( "** " + fhC.text );
   }
   if ( !sc.usesAstrometry && params.scaleUnverified )
      console.warningln( "** Maßstab ungeprüft: kein Plate-Solve und Pixelgröße nicht bestätigt." );
}

function main()
{
   console.show();
   console.writeln( "<b>" + TITLE + " v" + VERSION + "</b>" );

   var window = null;
   try { window = ImageWindow.activeWindow; } catch ( e ) {}
   if ( window == null || window.isNull )
   {
      console.criticalln( "*** Fehler: Es ist kein Bildfenster aktiv. Bitte zuerst ein Bild öffnen und das Script erneut starten." );
      return;
   }

   var view = window.currentView;
   if ( view == null || view.isNull )
   {
      console.criticalln( "*** Fehler: Das aktive Bildfenster hat keinen gültigen View." );
      return;
   }
   var image = view.image;
   if ( !( image.width > 0 && image.height > 0 ) )
   {
      ( new MessageBox( "Das Bild ist leer oder ungültig.", TITLE, StdIcon_Error, StdButton_Ok ) ).execute();
      return;
   }

   // 1. Metadaten lesen & Report
   var meta = readMetadata( window, view );
   printMetadataReport( meta, view );

   // 2. Parameter laden & initialisieren
   var params = loadParams();

   if ( meta.focalLength !== null && isFinite( meta.focalLength ) && meta.focalLength > 0 )
      params.focalLengthMm = meta.focalLength;
   if ( meta.effectivePixelSize !== null && isFinite( meta.effectivePixelSize ) && meta.effectivePixelSize > 0 )
      params.pixelSizeUm = meta.effectivePixelSize;

   if ( !meta.hasAstrometry && ( meta.focalLength === null || meta.effectivePixelSize === null ) )
   {
      var wmsg = "Brennweite und/oder Pixelgröße fehlen im Header – gespeicherte Werte der letzten Sitzung werden vorbelegt. Bitte prüfen.";
      meta.warnings.push( wmsg );
      console.warningln( "** Hinweis: " + wmsg );
   }

   // 3. Parameter- & Modus-Dialog
   var pd = new ParameterDialog( params, meta );
   if ( !pd.execute() )
   {
      console.writeln( "Abgebrochen." );
      return;
   }
   params = pd.values;
   saveParams( params );

   printParamSummary( params, meta );

   // 4. Bildvorschau erzeugen
   var st = null;
   var preview = null;
   try
   {
      console.writeln( "Erzeuge Bildvorschau …" );
      st = computeStretchStats( image );
      preview = buildPreview( image, st, true );
   }
   catch ( e )
   {
      console.criticalln( "*** Bildvorschau fehlgeschlagen: " + e );
      return;
   }

   // 5. Mess-Dialog
   var md = null;
   try
   {
      md = new MeasureDialog( preview, image.width, image.height, params,
                              function( autoSTF ) { return buildPreview( image, st, autoSTF ); },
                              meta );
      preview = null;
      console.writeln( "Messmodus aktiv (Werkzeuge: Taste L = Linie, Taste K = Kreisfläche; Esc bricht die laufende Messung ab)." );
      md.execute();
   }
   catch ( e )
   {
      console.criticalln( "*** Fehler im Messdialog: " + e );
   }
   finally
   {
      try { if ( md != null ) md.detachHandlers(); } catch ( e2 ) {}
   }

   console.writeln( "" );
   console.writeln( "Messmodus beendet. Messungen in dieser Sitzung: " + ( md != null ? md.measureCount : 0 ) );
   console.writeln( "Es wurden keine Bilddaten verändert." );
}

main();