xquery version "1.0-ml";

declare variable $URI external;
declare variable $depth as xs:integer external := 3;

declare variable $options := map:map()
=>map:with("permissions",(xdmp:permission("xbom-reader-role", "read", "object"),xdmp:permission("xbom-writer-role", "update", "object")))
=>map:with("collections", "caLink");

declare function local:part(
  $id as xs:string,
  $level as xs:integer,
  $max-level as xs:integer
) as item()*
{
  if ($level gt $max-level)
  then ()
  else (
    let $child := fn:concat("id-", $id)
    let $parent :=
      if ($level = 0)
      then ()
      else fn:string-join(fn:tokenize($id, "\.")[1 to last()-1],".")
    let $content := object-node{
      "level": $level,
      "parent": if ($level = 0) then null-node{} else fn:concat("id-", $parent),
      "child": $child,
      "partName": "part-"||$id,
      "quantity": if (fn:empty($parent)) then 1 else xdmp:random(3)+1,
      "qtyUnit": "unit",
      "msns": array-node{
        for $i in 1 to xdmp:random(5)
        return xdmp:random(100)
      }
    }
    return (
      xdmp:document-insert("/part/"|| $child || ".json", $content, $options),
      for $ch in (1 to xdmp:random(9)+1)
      return local:part(fn:concat($id, ".", $ch), $level + 1, $max-level)
    )
  )
};
xdmp:trace("xbom", "Create sample tree with " || $depth || " levels, starting with id " || $URI),
local:part($URI, 0, xs:integer($depth))