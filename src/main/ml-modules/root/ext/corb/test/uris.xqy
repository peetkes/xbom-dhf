xquery version "1.0-ml";

declare variable $end external := "1";

(: Sample query that returns all URIs :)
let $uris := (1 to xs:integer($end))

return (count($uris), $uris)