xquery version "1.0-ml";

declare variable $LEVEL external := "2";

declare variable $level as xs:integer := xs:integer($LEVEL);

xdmp:trace("xbom-collector", "COLLECTOR WITH LEVEL " || $level),

if ($level eq 0)
then (
  xdmp:trace("xbom-collector", "Collector init at level " || $level),
  "PROCESS-MODULE.LEVEL=" || $level,
  5,
  ("id-1","id-2","id-3","id-4","id-5")
)
else (
  let $parents := cts:values(cts:element-reference(xs:QName("child")), (), ("limit=100000"),cts:element-range-query(xs:QName("level"),"=", $level - 1))
  return (
    xdmp:trace("xbom-collector", "Collector found " || count($parents) || " docs at level " || $level - 1),
    "PROCESS-MODULE.LEVEL=" || $level,
    count($parents),
    $parents
  )
)
