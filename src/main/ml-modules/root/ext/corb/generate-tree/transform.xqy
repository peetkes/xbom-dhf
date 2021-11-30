xquery version "1.0-ml";

declare variable $URI external := "1";
declare variable $BATCH-URI-DELIMITER external := ";";
declare variable $LEVEL external;

declare variable $TRANSACTION := xdmp:transaction();
declare variable $options := map:map()
=>map:with("permissions",(xdmp:permission("xbom-reader-role", "read", "object"),xdmp:permission("xbom-writer-role", "update", "object")))
=>map:with("collections", "caLink");
declare variable $level as xs:integer := xs:integer($LEVEL);

declare function local:create-content(
  $lvl as xs:integer,
  $parent as xs:string?,
  $child as xs:string
) as item()
{
    object-node{
      "level": $lvl,
      "parent": if (fn:empty($parent)) then null-node{} else fn:concat("id-", $parent),
      "child": fn:concat("id-", $child),
      "partName": "part-" || $child,
      "quantity": if (fn:empty($parent)) then 1 else xdmp:random(3)+1,
      "qtyUnit": "unit",
      "msns": array-node{
        for $i in 1 to xdmp:random(5)
        return xdmp:random(100)
      }
    }
};

xdmp:trace("xbom-transform", "generate-tree::" || $TRANSACTION || "::" || $level || "::" || $URI),
if ($level eq 0)
then (
  let $parents := fn:tokenize($URI,$BATCH-URI-DELIMITER)
  for $parent in $parents
  let $content := local:create-content($level, (), $parent)
  let $uri := fn:concat("/part/id-", $parent, ".json")
  return (
    xdmp:trace("xbom-transform", "Generating document ::" || $TRANSACTION || "::" || $parent || "::" || $level),
    xdmp:document-insert($uri, $content, $options)
  )
)
else (
  let $parents := fn:tokenize($URI,$BATCH-URI-DELIMITER)
  for $parent in $parents
  let $parent-id := fn:substring-after($parent, "id-")
  for $idx in (1 to xdmp:random(9)+1)
  let $child-id := fn:concat($parent-id,".", $idx)
  let $content := local:create-content($level, $parent-id, $child-id)
  let $uri := fn:concat("/part/id-", $child-id, ".json")
  return (
    xdmp:trace("xbom-transform", "Generating document ::" || $TRANSACTION || "::" || $child-id || "::" || $level),
    xdmp:document-insert($uri, $content, $options)
  )
)