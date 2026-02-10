const task = process.argv[2] || "task";
const pkg = process.argv[3] || "unknown";

const message = {
  status: "ok",
  task,
  package: pkg,
  note: "Not implemented yet"
};

console.log(JSON.stringify(message, null, 2));
