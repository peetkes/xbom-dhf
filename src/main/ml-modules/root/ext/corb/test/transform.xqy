xquery version "1.0-ml";

declare variable $URI external;

declare function local:create-doc(
  $idx as xs:integer
) as document-node()
{
  let $childIdx := 1 + xdmp:random(4)
  let $childType :=  if ($idx eq 1) then "CI" else ("CI", "DS", "DASSY", "DDPT", "FIN")[$childIdx]
  let $parentIdx := 1 + xdmp:random(4)
  let $parentType := if ($idx eq 1) then null-node{} else ("CI", "DS", "DASSY", "DDPT", "FIN")[$parentIdx]
  return document {
    object-node {
      "program":"N",
      "msn": fn:format-number($idx, "00000"),
      "child": "D" || fn:format-number($idx, "00000000000"),
      "childType": $childType,
      "parent": "D" || fn:format-number(xdmp:random($idx), "00000000000"),
      "parentType": $parentType,
      "linkType": null-node{},
      "quantity": xdmp:random(100000),
      "qtyUnit": "unit",
      "msns": array-node {
        for $i in (1 to xdmp:random(10)+1)
        return xdmp:random(1000)
      }
    }
  }
};

xdmp:log("Calling Corb transform on URI: " || $URI)
,
xdmp:document-insert(
  "/test/asset/"||$URI || ".json",
  local:create-doc(xs:integer($URI)),
  map:map()
  =>map:with("collections", ("eBomLink", 'taskbot'))
)
