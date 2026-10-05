const fs=require("node:fs"),assert=require("node:assert/strict");
const edge=fs.readFileSync("supabase/functions/editalume-pncp-document/index.ts","utf8");

assert(edge.includes('const PNCP="https://pncp.gov.br/api/pncp"'),"Only official PNCP API base");
assert(edge.includes("MAX_PDF_BYTES=12*1024*1024"),"PDF response must be bounded");
assert(edge.includes('req.method!=="GET"'),"Bridge must stay read-only");
assert(edge.includes('action==="metadata"')&&edge.includes('action!=="document"'),"Only metadata/document actions");
assert(edge.includes('const docs=cleanDocs(await pncpJson(base+"/arquivos"))'),"Document must be resolved from official PNCP list");
assert(!edge.includes('searchParams.get("url")'),"Never accept arbitrary proxy URL");
assert(edge.includes('"https://cipri-studios.github.io"'),"Production origin allowlist");
assert(edge.includes('"http://127.0.0.1:4173"'),"Local QA origin allowlist");
console.log("PASS PNCP document bridge contract");