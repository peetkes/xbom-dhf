function split(content, context)
{
    console.log("Split input");
    if (xdmp.nodeKind(content.value) == 'document' &&
        content.value.documentFormat == 'JSON') {
        const result = [];
        for (const doc of content.value.toObject()) {
            let uri = doc.uri;
            if (result.some(e => e.uri === uri)) {
              // skip the duplicate
              console.log("duplicate detected "+uri);
              continue;
            }
            result.push({
                uri: uri,
                value: doc.content
            });
        }
        console.log("Split input " + result.length  );
        return Sequence.from(result);
    }
    return content;
};

exports.split = split;